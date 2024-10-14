import express from 'express';
import { router } from './routes';
import { RegisterRoutes } from '@root/build/routes';
import { ENV_VARIABLES } from './config/config';
// import dotenv from 'dotenv';
import {
  postRoutesMiddleware,
  preRoutesMiddleware,
} from './middlewares/index-middlewares';
import { errors } from '@config/errors';

const app = express();
// dotenv.config();

preRoutesMiddleware(app);

app.use('/', router);

// TSOA generated routes
RegisterRoutes(app);

// For known routes
postRoutesMiddleware(app);

// Not found route
app.use((req, res) => {
  res.status(errors.NOT_FOUND.httpCode).json(errors.NOT_FOUND);
});

app.listen(ENV_VARIABLES.port, () => {
  console.info('Listening on port', ENV_VARIABLES.port);
});
