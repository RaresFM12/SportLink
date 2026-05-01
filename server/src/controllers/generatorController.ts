/*import type { NextFunction, Request, Response } from 'express';
import { generatorService } from '../services/generatorService.js';

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export const generatorController = {
  start(req: Request, res: Response, next: NextFunction): void {
    try {
      const batchSize = parsePositiveInteger(req.body?.batchSize, 3);
      const intervalMs = parsePositiveInteger(req.body?.intervalMs, 4000);

      const status = generatorService.start(batchSize, intervalMs);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },

  stop(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = generatorService.stop();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },

  status(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = generatorService.getStatus();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }
};*/
import type { Request, Response, NextFunction } from 'express';
import { generatorService } from '../services/generatorService.js';

export const generatorController = {
  status(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = generatorService.getStatus();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },

  start(req: Request, res: Response, next: NextFunction): void {
    try {
      const { batchSize, intervalMs } = req.body as { batchSize?: number; intervalMs?: number };
      const status = generatorService.start(batchSize ?? 3, intervalMs ?? 4000);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },

  stop(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = generatorService.stop();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  },
};
