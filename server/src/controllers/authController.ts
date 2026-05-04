import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { securityLogService } from '../services/securityLogService.js';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const user = await authService.login(username ?? '', password ?? '');
      req.session.user = user;
      res.status(200).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
      });
    } catch (error) {
      next(error);
    }
  },

  logout(req: Request, res: Response, next: NextFunction): void {
    const user = req.session.user;
    if (user) {
      void securityLogService.logAction({
        req,
        user,
        statusCode: 200,
        actionInformation: 'POST /api/auth/logout',
      });
    }

    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  },

  me(req: Request, res: Response): void {
    const user = req.session?.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    res.status(200).json(user);
  },

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await authService.getAllUsers();
      res.status(200).json(users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
      })));
    } catch (error) {
      next(error);
    }
  },
};
