import type { Request, Response, NextFunction } from 'express';
import type { SessionUser } from '../services/authService.js';
import { securityLogService } from '../services/securityLogService.js';

// Extend the Express session with our user type.
// We augment the express-session SessionData interface here so TypeScript
// knows req.session.user exists throughout the whole app.
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

// Re-export SessionData so other files can import it from here if needed
export type { SessionUser };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ message: 'Not authenticated. Please log in.' });
    return;
  }
  next();
}

export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.session?.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    if (!user.permissions.includes(action)) {
      void securityLogService.markSuspicious(
        user,
        `Permission denied for ${action}`,
        `${req.method} ${req.originalUrl}`
      ).catch((err) => {
        console.error('[security-log] Failed to mark suspicious user:', err);
      });
      res.status(403).json({ message: `Permission denied: ${action}` });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.session?.user;
  if (!user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  if (user.role !== 'ADMIN') {
    void securityLogService.markSuspicious(
      user,
      'Attempted to access admin-only area',
      `${req.method} ${req.originalUrl}`
    ).catch((err) => {
      console.error('[security-log] Failed to mark suspicious user:', err);
    });
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  next();
}
