import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';

export const eventRoutes = Router();

eventRoutes.get('/', eventController.getAll);
eventRoutes.get('/:id', eventController.getById);
eventRoutes.post('/', eventController.create);
eventRoutes.put('/:id', eventController.update);
eventRoutes.delete('/:id', eventController.remove);
eventRoutes.post('/:id/join', eventController.join);
eventRoutes.post('/:id/leave', eventController.leave);
