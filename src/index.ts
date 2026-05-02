import { router } from './routes';
import express, { Application } from 'express';
import logger from '@config/logger';
import { expressMiddleware } from '@as-integrations/express5';
import { RegisterRoutes } from './routes/routes';
import { ENV_VARIABLES } from '@config/config';
import { postRoutesMiddleware, preRoutesMiddleware } from '@middlewares/index-middlewares';
import { errors } from '@config/errors';
import { createApolloServer, buildApolloContext, ApolloContext } from '@graphql/apolloServer';
import { startSnapshotCron } from './jobs/snapshot-job';

const app: Application = express();

preRoutesMiddleware(app);

// Routes for root and swagger
app.use('/', router);

const server = createApolloServer();

const startApolloServer = async () => {
  await server.start();

  // Apollo Server 4 requires express.json() before expressMiddleware
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware<ApolloContext>(server, {
      context: buildApolloContext,
    }),
  );
};

// After starting ApolloServer, register TSOA routes. Otherwise, TSOA would overwrite
// Apollo routes (/graphql).
startApolloServer()
  .then(() => {
    // TSOA generated routes
    RegisterRoutes(app);

    // Middleware for handling errors.
    postRoutesMiddleware(app);

    // Handler 404 routes.
    app.use((req, res) => {
      logger.warn(`Route Not Found: ${req.path}`);
      res.status(errors.NOT_FOUND.httpCode).json(errors.NOT_FOUND);
    });

    // Start daily price snapshot job (runs backfill immediately, then at 23:00 UTC)
    startSnapshotCron();

    app.listen(ENV_VARIABLES.port, () => {
      logger.info(`Listening on port ${ENV_VARIABLES.port}`);
    });
  })
  .catch((err: unknown) => {
    logger.error('Failed to start Apollo Server', err);
    process.exit(1);
  });
