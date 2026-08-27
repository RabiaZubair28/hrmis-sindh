import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : true,
    credentials: true,
  });

  // Single-service deployment: NestJS serves the compiled Vite application.
  // __dirname is apps/api/dist at runtime, so ../../web/dist resolves to apps/web/dist.
  const webDist = join(__dirname, '../../web/dist');
  const indexFile = join(webDist, 'index.html');
  const httpServer = app.getHttpAdapter().getInstance();
  // Express is provided by @nestjs/platform-express.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');

  if (existsSync(indexFile)) {
    httpServer.use(express.static(webDist, { index: false }));

    // SPA fallback. API requests are intentionally excluded so a missing API
    // endpoint still returns Nest's normal 404 instead of index.html.
    httpServer.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
      return res.sendFile(indexFile);
    });
  }

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

bootstrap();
