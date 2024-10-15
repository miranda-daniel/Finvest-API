// In a production environment, logs should be saved in a folder on the server. Read more about this later.
const logDirectory = process.env.LOG_DIR || 'logs';

import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), customFormat),
  transports: [
    new transports.Console(),
    new transports.File({ filename: `${logDirectory}/app.log` }),
  ],
});

export default logger;
