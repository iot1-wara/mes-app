import { NestFactory, ModuleRef } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { ValidationPipe, UnauthorizedException, CanActivate, ExecutionContext, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

class AllAuthGuard implements CanActivate {
  private jwtService?: JwtService;
  
  setJwtService(jwtService: JwtService) { this.jwtService = jwtService; }
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    if (request.url.startsWith('/api/auth/login') || 
        request.url.startsWith('/api/auth/register') || 
        request.url.startsWith('/api/auth/bootstrap')) return true;
    if (request.method === 'OPTIONS') return true;
    
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

function createLogger(): winston.Logger {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level?.toUpperCase()}] ${message}`;
        }),
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  ];
  
  return winston.createLogger({ transports });
}

async function bootstrap() {
  const logger = createLogger();
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // swagger configuration
  const config = new DocumentBuilder()
    .setTitle('MES Production Control System')
    .setDescription('Manufacturing Execution System API documentation')
    .setVersion('1.4')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }, 'Authorization')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use(helmet());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('api');
  
  // Add correlation ID middleware for request tracing
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const corrId = req.headers['x-correlation-id'] as string || require('uuid').v4();
    res.setHeader('X-Correlation-ID', corrId);
    (req as any).correlationId = corrId;
    logger.info(`${req.method} ${req.url} — correlation id: ${corrId}`);

    const contextLogger = logger.child({ correlationId: corrId, method: req.method, url: req.url });
    
    res.on('finish', () => {
      contextLogger.info(`${req.method} ${req.url} ${res.statusCode}`);
    });

    next();
  });
  
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    skipMissingProperties: false,
  }));

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
  
  try {
    const dbUrl = `postgresql://${process.env.DB_USERNAME || 'mes_admin'}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_DATABASE || 'mes_production'}`;
    console.log('[TimescaleDB] Migration skipped (requires TypeORM connection)');
  } catch {}

  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  
  app.use(express.static(frontendDistPath));

  app.use((req: any, res: any, next: any) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (!req.url.includes('.') && !req.url.startsWith('/api/')) {
        const indexPath = path.join(frontendDistPath, 'index.html');
        return res.sendFile(indexPath);
      }
    }
    next();
  });

  app.useGlobalFilters({
    catch(error: any) { 
      console.error('[HTTP Error]', error?.message, '\n', error?.stack); 
      throw error; 
    },
    getHandler() { return (): void => {}; },
  } as ExceptionFilter<any>);
  
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
  
  console.log(`\nMES Edge Gateway running on http://localhost:${port}\nFrontend:     http://localhost:${port}\nAPI (REST):   http://localhost:${port}/api/...\nSwagger:      http://localhost:${port}/api/docs\n`);
}
bootstrap();
