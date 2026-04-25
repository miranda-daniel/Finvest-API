import { z } from 'zod';
import dotenv from 'dotenv';
import type { StringValue } from 'ms';

dotenv.config();

export interface EnvVariables {
  databaseURL: string;
  port: string;
  jwtSignature: string;
  jwtExpiresIn: StringValue;
  frontendUrl: string;
}

const envVariablesSchema = z.looseObject({
  DATABASE_URL: z.string(),
  PORT: z.string(),
  JWT_SIGNATURE: z.string(),
  JWT_EXPIRES_IN: z.string().default('1h'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const envVars = envVariablesSchema.parse(process.env);

export const ENV_VARIABLES: EnvVariables = {
  databaseURL: envVars.DATABASE_URL,
  port: envVars.PORT,
  jwtSignature: envVars.JWT_SIGNATURE,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN as StringValue,
  frontendUrl: envVars.FRONTEND_URL,
};
