import type { NextFunction, Request, Response } from 'express';
import { securityLogService } from '../services/securityLogService.js';

export const securityController = {
  async observationList(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await securityLogService.listObservationUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  async recentLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit ?? 100);
      const logs = await securityLogService.listRecentLogs(
        Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 100
      );
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  },

  async aiStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await securityLogService.getAiStatus();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },
};
