import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.post('/register', authController.register);
authRoutes.post('/logout', requireAuth, authController.logout);
authRoutes.get('/me', authController.me);
authRoutes.get('/users', requireAuth, requireAdmin, authController.listUsers);

// Returns the raw session ID so the frontend can pass it
// to the WebSocket connection as ?sid=
// This is more reliable than reading document.cookie
authRoutes.get('/session-id', requireAuth, (req, res) => {
  res.json({ sid: req.get('x-session-id') ?? req.sessionID });
});
