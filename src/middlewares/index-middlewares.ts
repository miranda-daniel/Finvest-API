import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './error-handler-middleware';

export const preRoutesMiddleware = (app: Application) => {
  // Enable cors
  app.use(cors());

  // Parse json request body
  app.use(express.json());

  // Parse urlencoded request body
  app.use(express.urlencoded({ extended: true }));

  // Set security HTTP headers
  app.use(helmet());
};

export const postRoutesMiddleware = (app: Application) => {
  // Error handling
  app.use(errorHandler);
};
