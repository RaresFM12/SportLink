import { Router } from 'express';
import { securityController } from '../controllers/securityController.js';
import { requireAdmin, requireAuth, requirePermission } from '../middleware/requireAuth.js';

export const securityRoutes = Router();

securityRoutes.get(
  '/observations',
  requireAuth,
  requireAdmin,
  requirePermission('user:manage'),
  securityController.observationList
);

securityRoutes.get(
  '/logs',
  requireAuth,
  requireAdmin,
  requirePermission('user:manage'),
  securityController.recentLogs
);

securityRoutes.get(
  '/ai-status',
  requireAuth,
  requireAdmin,
  requirePermission('user:manage'),
  securityController.aiStatus
);
