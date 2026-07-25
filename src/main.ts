import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { ValidationPipe, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';

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

  // CORS first — must be before helmet so OPTIONS preflight responses include proper headers
  app.enableCors({ origin: '*', credentials: true });
  app.use(helmet());
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

  // Register the globally injected AuthGuard — it gets JwtService from auth.module (single source of truth)
  app.useGlobalGuards(app.get(AuthGuard));

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
  const httpServer = await app.listen(port);
  
  // Register raw WebSocket server after HTTP (no Socket.IO, plain ws for frontend compatibility)
  const { EventGateway } = await import('./events/edge-gateway.service');
  EventGateway.listen(httpServer);
  
  console.log(`\nMES Edge Gateway running on http://localhost:${port}\nFrontend:     http://localhost:${port}\nAPI (REST):   http://localhost:${port}/api/...\nSwagger:      http://localhost:${port}/api/docs\n`);
}
bootstrap();
