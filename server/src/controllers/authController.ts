import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { securityLogService } from '../services/securityLogService.js';
import {
  createAuthToken,
  resolveTokenPermissions,
  type PermissionTokenScheme,
} from '../services/tokenService.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, displayName, password } = req.body as {
        username?: string;
        displayName?: string;
        password?: string;
      };
      const user = await authService.register({
        username: username ?? '',
        displayName: displayName ?? '',
        password: password ?? '',
      });
      req.session.user = user;
      req.session.lastActivityAt = Date.now();
      const token = createAuthToken(user, req.sessionID);
      req.session.authToken = token;
      res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
        token,
        sid: req.sessionID,
      });
    } catch (error) {
      next(error);
    }
  },

  createToken(req: Request, res: Response): void {
    const user = req.authUser ?? req.session.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const { scheme = 'full', permissions } = req.body as {
      scheme?: PermissionTokenScheme;
      permissions?: string[];
    };
    const validSchemes: PermissionTokenScheme[] = ['full', 'read-only', 'event-management', 'admin'];
    if (!validSchemes.includes(scheme)) {
      res.status(400).json({ message: 'Unknown token permission scheme.' });
      return;
    }

    const scopedPermissions = resolveTokenPermissions(user, scheme, permissions);
    if (scheme === 'admin' && user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Admin token scheme requires an ADMIN account.' });
      return;
    }

    if (permissions?.length && scopedPermissions.length !== new Set(permissions).size) {
      res.status(403).json({ message: 'Requested token permissions exceed the current user role.' });
      return;
    }

    const token = createAuthToken(user, req.sessionID, {
      scheme,
      permissions: scopedPermissions,
    });
    res.status(201).json({
      token,
      sid: req.sessionID,
      scheme,
      permissions: scopedPermissions,
    });
  },

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body as { username?: string };
      const reset = await authService.requestPasswordReset(username ?? '');
      res.status(200).json({
        message: 'If the account exists, password reset instructions were generated.',
        ...reset,
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      await authService.resetPassword(token ?? '', password ?? '');
      res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const user = await authService.login(username ?? '', password ?? '');
      req.session.user = user;
      req.session.lastActivityAt = Date.now();
      const token = createAuthToken(user, req.sessionID);
      req.session.authToken = token;
      res.status(200).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
        token,
        sid: req.sessionID,
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

    const headerSessionId = req.get('x-session-id');

    req.session.destroy((err) => {
      if (err) return next(err);

      const finish = () => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully.' });
      };

      if (headerSessionId && headerSessionId !== req.sessionID) {
        req.sessionStore.destroy(headerSessionId, (storeErr) => {
          if (storeErr) return next(storeErr);
          finish();
        });
        return;
      }

      finish();
    });
  },

  me(req: Request, res: Response): void {
    const user = req.session?.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    const token = req.session.authToken ?? createAuthToken(user, req.sessionID);
    req.session.authToken = token;
    res.status(200).json({ ...user, token, sid: req.sessionID });
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
