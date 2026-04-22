import { Request, Response, NextFunction } from 'express';
import logger from '@config/logger';

const resolveLogLevel = (statusCode: number) => {
  if (statusCode >= 500) {
    return logger.error.bind(logger);
  }

  if (statusCode >= 400) {
    return logger.warn.bind(logger);
  }

  return logger.http.bind(logger);
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = resolveLogLevel(res.statusCode);
    log(`${req.method} ${req.url} ${req.ip} ${res.statusCode} - ${duration}ms`);
  });

  next();
};
