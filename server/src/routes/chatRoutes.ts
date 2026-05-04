import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { requireAuth, requirePermission } from '../middleware/requireAuth.js';

export const chatRoutes = Router();

chatRoutes.get('/history', requireAuth, requirePermission('chat:read'), chatController.getHistory);
