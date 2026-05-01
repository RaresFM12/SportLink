import { Router } from 'express';
import { statisticsController } from '../controllers/statisticsController.js';

export const statisticsRoutes = Router();

statisticsRoutes.get('/', statisticsController.get);
