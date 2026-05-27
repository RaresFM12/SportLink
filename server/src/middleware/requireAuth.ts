import type { Request, Response, NextFunction } from 'express';
import type { SessionUser } from '../services/authService.js';
import { securityLogService } from '../services/securityLogService.js';

const IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS ?? 1000 * 60 * 15);

// Extend the Express session with our user type.
// We augment the express-session SessionData interface here so TypeScript
// knows req.session.user exists throughout the whole app.
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    authToken?: string;
    lastActivityAt?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SessionUser;
      authTokenScheme?: string;
    }
  }
}

// Re-export SessionData so other files can import it from here if needed
export type { SessionUser };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ message: 'Not authenticated. Please log in.' });
    return;
  }

  const now = Date.now();
  if (req.session.lastActivityAt && now - req.session.lastActivityAt > IDLE_TIMEOUT_MS) {
    req.session.destroy(() => {
      res.status(401).json({ message: 'Session expired due to inactivity.' });
    });
    return;
  }

  req.session.lastActivityAt = now;
  req.authUser ??= req.session.user;
  req.session.touch();
  next();
}

export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authUser ?? req.session?.user;
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

export function requireAnyPermission(actions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authUser ?? req.session?.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    if (!actions.some((action) => user.permissions.includes(action))) {
      void securityLogService.markSuspicious(
        user,
        `Permission denied for one of: ${actions.join(', ')}`,
        `${req.method} ${req.originalUrl}`
      ).catch((err) => {
        console.error('[security-log] Failed to mark suspicious user:', err);
      });
      res.status(403).json({ message: `Permission denied: ${actions.join(' or ')}` });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.authUser ?? req.session?.user;
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
