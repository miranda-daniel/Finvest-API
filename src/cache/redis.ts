// Singleton Redis client. Shared across the app — import `redis` wherever cache access is needed.
// lazyConnect: connection is established on first use, not at import time.
// maxRetriesPerRequest: retries each failed command up to 3 times before throwing.
import Redis from 'ioredis';
import { ENV_VARIABLES } from '@config/config';

export const redis = new Redis(ENV_VARIABLES.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});
