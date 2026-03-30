import { router } from './routes';
import express, { Application } from 'express';
import { expressMiddleware } from '@as-integrations/express5';
import { RegisterRoutes } from '@root/build/routes';
import { ENV_VARIABLES } from '@config/config';
import {
  postRoutesMiddleware,
  preRoutesMiddleware,
} from '@middlewares/index-middlewares';
import { errors } from '@config/errors';
import { createApolloServer, ApolloContext } from '@graphql/apolloServer';

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
      context: async () => ({
        userInfo: { userId: 1 }, // TODO: hardcoded
      }),
    })
  );
};

// After starting ApolloServer, register TSOA routes. Otherwise, TSOA would overwrite Apollo routes (/graphql).
startApolloServer().then(() => {
  // TSOA generated routes
  RegisterRoutes(app);

  // Middleware for handling errors.
  postRoutesMiddleware(app);

  // Handler 404 routes.
  app.use((req, res) => {
    console.log('Route Not Found:', req.path);
    res.status(errors.NOT_FOUND.httpCode).json(errors.NOT_FOUND);
  });

  app.listen(ENV_VARIABLES.port, () => {
    console.info('Listening on port', ENV_VARIABLES.port);
  });
});
