import path from 'path';
import { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';

// swagger.json is generated to build/ by TSOA — load at runtime to avoid tsc-alias path issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerDocument: object = require(path.join(__dirname, '../swagger.json'));

export const router = Router();

router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerDocument));

router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
