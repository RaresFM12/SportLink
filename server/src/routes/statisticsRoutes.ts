import { Router } from 'express';
import { statisticsController } from '../controllers/statisticsController.js';
import { requireAuth, requirePermission } from '../middleware/requireAuth.js';

export const statisticsRoutes = Router();

statisticsRoutes.get('/', requireAuth, requirePermission('statistics:read'), statisticsController.get);
