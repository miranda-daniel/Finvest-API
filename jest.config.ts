import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  resetMocks: true,
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
  globalTeardown: '<rootDir>/src/test/jest.teardown.ts',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@helpers/(.*)$': '<rootDir>/src/helpers/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@serializers/(.*)$': '<rootDir>/src/serializers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
    '^@typing/(.*)$': '<rootDir>/src/types/$1',
    '^@root/(.*)$': '<rootDir>/$1',
  },

  collectCoverage: true,
  collectCoverageFrom: [
    'src/controllers/**/*.ts',
    'src/services/**/*.ts',
    'src/serializers/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
};

export default config;
