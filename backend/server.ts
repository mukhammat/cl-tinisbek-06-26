/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressInstance = app.getHttpAdapter().getInstance();

  // Use body parsers
  expressInstance.use(express.json());

  // Mount Vite development server or serve production fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    expressInstance.use((req: any, res: any, next: any) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressInstance.use(express.static(distPath));
    expressInstance.get('*', (req, res, next) => {
      // Avoid intercepting Nest's controller routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  await app.listen(PORT, '0.0.0.0');
  console.log(`NestJS server running on http://localhost:${PORT}`);
}

bootstrap();
