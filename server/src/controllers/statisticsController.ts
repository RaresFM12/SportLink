import type { Request, Response, NextFunction } from 'express';
import { statisticsService } from '../services/statisticsService.js';

export const statisticsController = {
  async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await statisticsService.getStatistics();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  },
};
