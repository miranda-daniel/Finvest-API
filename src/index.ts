import { router } from './routes';
import express, { Application } from 'express';
import { RegisterRoutes } from '@root/build/routes';
import { ENV_VARIABLES } from '@config/config';
import {
  postRoutesMiddleware,
  preRoutesMiddleware,
} from '@middlewares/index-middlewares';
import { errors } from '@config/errors';
import { createApolloServer } from '@graphQL/apolloServer';

const app: Application = express();

preRoutesMiddleware(app);

// Routes for root and swagger
app.use('/', router);

const server = createApolloServer();

// Start ApolloServer and apply it to Express
const startApolloServer = async () => {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
};

// After starting ApolloServer, I register TSOA routes. Otherwise, TSOA would overwrite Apollo routes (/graphQL).
startApolloServer().then(() => {
  // TSOA generated routes
  RegisterRoutes(app);

  // Middlware for handling errors.
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
