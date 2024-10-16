export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
};

export const isDevelopment = () => process.env.NODE_ENV === ENV.DEVELOPMENT;
export const isTest = () => process.env.NODE_ENV === ENV.TEST;
export const isProduction = () => process.env.NODE_ENV === ENV.PRODUCTION;
