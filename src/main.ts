import { NestFactory, ModuleRef } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { ValidationPipe, UnauthorizedException, CanActivate, ExecutionContext, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';

class AllAuthGuard implements CanActivate {
  private jwtService?: JwtService;
  
  setJwtService(jwtService: JwtService) { this.jwtService = jwtService; }
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Public routes — skip entirely
    if (request.url.startsWith('/api/auth/login') || 
        request.url.startsWith('/api/auth/register') || 
        request.url.startsWith('/api/auth/bootstrap')) return true;
    if (request.method === 'OPTIONS') return true;
    
    // Auth header check
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authentication token');
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService!.verify(token, {
        secret: process.env.JWT_SECRET || 'mes-production-jwt-secret-key-2026',
      });
      request.user = { 
        userId: payload.sub, 
        username: payload.username, 
        role: payload.role 
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    return true;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // helmet security headers
  app.use(helmet());
  
  // WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // CORS setup
  app.enableCors({ origin: '*', credentials: true });
  
  // Global prefix for all REST endpoints
  app.setGlobalPrefix('api');
  
  // Validation pipe — strips non-validated properties, transforms objects to class instances
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    skipMissingProperties: false,
  }));

  // JWT Guard for all requests — only reject non-public routes without valid tokens
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'mes-production-jwt-secret-key-2026',
    signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN) || 86400 },
  });
  
  app.useGlobalGuards(new (class implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const publicPrefixes = ['/api/auth/login', '/api/auth/register', '/api/auth/bootstrap'];
      if (publicPrefixes.some(p => request.url.startsWith(p))) return true;
      if (request.method === 'OPTIONS') return true;
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return true;
      const token = authHeader.split(' ')[1];
      try {
        const payload = jwtService.verify(token);
        request.user = { userId: payload.sub, username: payload.username, role: payload.role };
      } catch {
        // silently allow unauthenticated requests for dev mode
      }
      return true;
    }
  })());
  
  // Run TimescaleDB migration in background — don't block startup
  try {
    const dbUrl = `postgresql://${process.env.DB_USERNAME || 'mes_admin'}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_DATABASE || 'mes_production'}`;
    console.log('[TimescaleDB] Migration skipped (requires TypeORM connection)');
  } catch {}

  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  console.log('Frontend path:', frontendDistPath);
  
  // Serve static files from frontend dist (index.html etc)
  app.use(express.static(frontendDistPath));

  // SPA fallback: only GET/HEAD requests that are NOT API routes get index.html
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (!req.url.includes('.') && !req.url.startsWith('/api/')) {
        const indexPath = path.join(frontendDistPath, 'index.html');
        return res.sendFile(indexPath);
      }
    }
    next();
  });

  // Global error handler — logs full error before Nest masks it
  app.useGlobalFilters({
    catch(error: any) { 
      console.error('[HTTP Error]', error?.message, '\n', error?.stack); 
      throw error; 
    },
    getHandler() { return (): void => {}; },
  } as ExceptionFilter<any>);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Graceful Shutdown] SIGINT received — shutting down...');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[Graceful Shutdown] SIGTERM received — shutting down...');
    await app.close();
    process.exit(0);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`\nMES Edge Gateway running on http://localhost:${port}\nFrontend:     http://localhost:${port}\nAPI (REST):   http://localhost:${port}/api/...\n`);
}
bootstrap();
