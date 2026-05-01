import type { Request, Response, NextFunction } from 'express';
import { statisticsService } from '../services/statisticsService.js';

export const statisticsController = {
  get(_req: Request, res: Response, next: NextFunction): void {
    try {
      const stats = statisticsService.getStatistics();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  },
};
