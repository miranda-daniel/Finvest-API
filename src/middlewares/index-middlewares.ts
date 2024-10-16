import express, { Application } from 'express';
import cors from 'cors';
import helmet, { HelmetOptions } from 'helmet';
import { errorHandler } from './error-handler-middleware';
import { isProduction } from '@config/environments';

// Hetmet config by environment
const getHelmetConfig = (): HelmetOptions | undefined => {
  if (isProduction()) {
    // Secure config for production
    return undefined; // default configuration
  }

  // Helmet configuration for development environment. This is needed for Apollo Playground to work
  return {
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
};

export const preRoutesMiddleware = (app: Application) => {
  // Enable CORS
  app.use(cors());

  console.log('process.env.NODE_ENV :>> ', process.env.NODE_ENV);

  // Parse JSON request body
  app.use(express.json());

  // Parse URL-encoded request body
  app.use(express.urlencoded({ extended: true }));

  // Helmet config by environment
  const helmetConfig = getHelmetConfig();
  if (helmetConfig) {
    app.use(helmet(helmetConfig));
  } else {
    app.use(helmet());
  }
};

export const postRoutesMiddleware = (app: Application) => {
  // Error handling
  app.use(errorHandler);
};
