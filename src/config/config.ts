import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export interface EnvVariables {
  databaseURL: string;
  port: string;
  jwtSignature: string;
  jwtExpiresIn: string;
}

const envVariablesSchema = z.looseObject({
  DATABASE_URL: z.string(),
  PORT: z.string(),
  JWT_SIGNATURE: z.string(),
  JWT_EXPIRES_IN: z.string().default('1h'),
});

const envVars = envVariablesSchema.parse(process.env);

export const ENV_VARIABLES: EnvVariables = {
  databaseURL: envVars.DATABASE_URL,
  port: envVars.PORT,
  jwtSignature: envVars.JWT_SIGNATURE,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN,
};
