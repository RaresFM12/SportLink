import { Router } from 'express';
import { generatorController } from '../controllers/generatorController.js';

export const generatorRoutes = Router();

generatorRoutes.get('/status', generatorController.status);
generatorRoutes.post('/start', generatorController.start);
generatorRoutes.post('/stop', generatorController.stop);