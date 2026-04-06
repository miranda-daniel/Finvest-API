import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet, { HelmetOptions } from 'helmet';
import { errorHandler } from './error-handler-middleware';
import { isProduction } from '@config/environments';

// Relaxed CSP needed for Apollo Sandbox to load external scripts in development
const devHelmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    },
  },
};

export const preRoutesMiddleware = (app: Application) => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet(isProduction() ? undefined : devHelmetConfig));
};

export const postRoutesMiddleware = (app: Application) => {
  app.use(errorHandler);
};
