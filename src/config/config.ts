import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export interface EnvVariables {
  port: string;
  postgressUser: string;
  postgressPassword: string;
  postgressDbName: string;
  dataBaseURL: string;
  jsonSignature: string;
}

const envVariablesSchema = z
  .object({
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    PORT: z.string(),
    DATABASE_URL: z.string(),
    JSON_SIGNATURE: z.string(),
  })
  .passthrough();

const envVars = envVariablesSchema.parse(process.env);

export const ENV_VARIABLES: EnvVariables = {
  postgressUser: envVars.POSTGRES_USER,
  postgressPassword: envVars.POSTGRES_PASSWORD,
  postgressDbName: envVars.POSTGRES_DB,
  port: envVars.PORT,
  dataBaseURL: envVars.DATABASE_URL,
  jsonSignature: envVars.JSON_SIGNATURE,
};
