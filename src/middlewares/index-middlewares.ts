import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet, { HelmetOptions } from 'helmet';
import { errorHandler } from './error-handler-middleware';
import { requestLogger } from './request-logger-middleware';
import { isProduction } from '@config/environments';

// Relaxed CSP needed for Apollo Sandbox to load external scripts in development
const devHelmetConfig: HelmetOptions = {
  // Apollo Sandbox loads many resources from apollographql.com CDN (scripts, fonts,
  // manifest, favicons). Disabling CSP in dev avoids whitelisting each one individually.
  // Production keeps the full restrictive CSP via the default helmet() call.
  contentSecurityPolicy: false,
};

export const preRoutesMiddleware = (app: Application) => {
  app.use(requestLogger);
  app.use(
    cors({
      credentials: true,
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet(isProduction() ? undefined : devHelmetConfig));
};

export const postRoutesMiddleware = (app: Application) => {
  app.use(errorHandler);
};
