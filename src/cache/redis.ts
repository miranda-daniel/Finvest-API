import Redis from 'ioredis';
import { ENV_VARIABLES } from '@config/config';

export const redis = new Redis(ENV_VARIABLES.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});
