import { createLogger, format, transports } from 'winston';
import { isDevelopment } from '@config/environments';

const { combine, timestamp, printf } = format;

const logDirectory = process.env.LOG_DIR || 'logs';

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
  level: isDevelopment() ? 'debug' : 'warn',
  format: combine(timestamp(), customFormat),
  transports: [
    new transports.Console(),
    new transports.File({ filename: `${logDirectory}/app.log` }),
    new transports.File({ filename: `${logDirectory}/error.log`, level: 'error' }),
  ],
});

export default logger;
