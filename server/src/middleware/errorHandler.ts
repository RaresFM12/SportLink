import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpErrors.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: 'An unexpected error occurred.' });
}
