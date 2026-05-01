import cors from 'cors';
import express from 'express';
import { eventRoutes } from './routes/eventRoutes.js';
import { statisticsRoutes } from './routes/statisticsRoutes.js';
import { generatorRoutes } from './routes/generatorRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { applyGraphQLMiddleware } from './graphql/server.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Existing REST routes remain intact
app.use('/api/events', eventRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/generator', generatorRoutes);

// GraphQL endpoint — mounted async before server starts (called from server.ts)
export async function configureApp(): Promise<typeof app> {
  await applyGraphQLMiddleware(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
