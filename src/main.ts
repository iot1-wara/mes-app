import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('api');

  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  console.log('Frontend path:', frontendDistPath);
  
  // Serve static files from frontend dist (index.html etc)
  app.use(express.static(frontendDistPath));

  // SPA fallback: only GET/HEAD requests that are NOT API routes get index.html
  app.use((req, res, next) => {
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
