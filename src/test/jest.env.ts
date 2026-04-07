// Load test environment variables before any test runs.
// This ensures Jest always uses the test database regardless of how it is invoked
// (npm run test, IDE extension, npx jest, etc.).
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env.test'),
  override: true,
});
