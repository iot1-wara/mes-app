import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { ValidationPipe, UnauthorizedException, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
      // No token — allow but mark as unauthenticated
      return true;  
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
      // Invalid token — log but allow request to proceed
      console.warn(`[Auth] Invalid token for ${request.url}:`, err.message);
    }
    
    return true;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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

  // JWT Guard for all requests
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'mes-production-jwt-secret-key-2026',
    signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN) || 86400 },
  });
  
  const authGuard = new AllAuthGuard();
  authGuard.setJwtService(jwtService);
  app.useGlobalGuards(authGuard);

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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`\nMES Edge Gateway running on http://localhost:${port}\nFrontend:     http://localhost:${port}\nAPI (REST):   http://localhost:${port}/api/...\n`);
}
bootstrap();
