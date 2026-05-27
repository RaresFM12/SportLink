import type { NextFunction, Request, Response } from 'express';
import { securityLogService } from '../services/securityLogService.js';

export function actionLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const user = req.authUser ?? req.session?.user;
    if (!user) return;

    void securityLogService.logAction({
      req,
      user,
      statusCode: res.statusCode,
    }).catch((err) => {
      console.error('[security-log] Failed to persist action:', err);
    });
  });

  next();
}
