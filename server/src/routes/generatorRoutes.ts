import { Router } from 'express';
import { generatorController } from '../controllers/generatorController.js';
import { requireAuth, requirePermission } from '../middleware/requireAuth.js';

export const generatorRoutes = Router();

generatorRoutes.use(requireAuth);

generatorRoutes.get('/status', requirePermission('statistics:read'), generatorController.status);
generatorRoutes.post('/start', requirePermission('generator:start'), generatorController.start);
generatorRoutes.post('/stop', requirePermission('generator:stop'), generatorController.stop);
