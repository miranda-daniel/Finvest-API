import { z } from 'zod';
import dotenv from 'dotenv';
import type { StringValue } from 'ms';

dotenv.config();

export interface EnvVariables {
  databaseURL: string;
  port: string;
  jwtSignature: string;
  jwtExpiresIn: StringValue;
  twelveDataApiKey: string;
  frontendUrl: string;
  redisUrl: string;
}

const envVariablesSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.string(),
  JWT_SIGNATURE: z.string(),
  JWT_EXPIRES_IN: z.string().default('1h'),
  TWELVEDATA_API_KEY: z.string(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

const envVars = envVariablesSchema.parse(process.env);

export const ENV_VARIABLES: EnvVariables = {
  databaseURL: envVars.DATABASE_URL,
  port: envVars.PORT,
  jwtSignature: envVars.JWT_SIGNATURE,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN as StringValue,
  twelveDataApiKey: envVars.TWELVEDATA_API_KEY,
  frontendUrl: envVars.FRONTEND_URL,
  redisUrl: envVars.REDIS_URL,
};
