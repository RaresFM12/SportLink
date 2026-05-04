import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
import { requireAuth, requirePermission } from '../middleware/requireAuth.js';

export const eventRoutes = Router();

eventRoutes.use(requireAuth);

eventRoutes.get('/', requirePermission('event:read'), eventController.getAll);
eventRoutes.get('/:id', requirePermission('event:read'), eventController.getById);
eventRoutes.post('/', requirePermission('event:create'), eventController.create);
eventRoutes.put('/:id', requirePermission('event:update'), eventController.update);
eventRoutes.delete('/:id', requirePermission('event:delete'), eventController.remove);
eventRoutes.post('/:id/join', requirePermission('event:join'), eventController.join);
eventRoutes.post('/:id/leave', requirePermission('event:leave'), eventController.leave);
