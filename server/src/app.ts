import cors from 'cors';
import express from 'express';
import session, { type SessionData } from 'express-session';
import { eventRoutes } from './routes/eventRoutes.js';
import { statisticsRoutes } from './routes/statisticsRoutes.js';
import { generatorRoutes } from './routes/generatorRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { securityRoutes } from './routes/securityRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { actionLogger } from './middleware/actionLogger.js';
import { applyGraphQLMiddleware } from './graphql/server.js';

export type SessionStore = session.Store;

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'sportlink-dev-secret-change-in-prod';
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.134:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const sessionStore = new session.MemoryStore();

export const sessionMiddleware = session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: {
    httpOnly: false,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
  },
});

export const app = express();

app.use(cors({
  origin: CLIENT_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

app.options('*', cors({
  origin: CLIENT_ORIGINS,
  credentials: true,
}));

app.use(express.json());
app.use(sessionMiddleware);

app.use((req, _res, next) => {
  if (req.session?.user) {
    next();
    return;
  }

  const sessionId = req.get('x-session-id');
  if (!sessionId) {
    next();
    return;
  }

  req.sessionStore.get(sessionId, (err: unknown, sessionData?: SessionData | null) => {
    if (err) {
      console.error('[session] Failed to load X-Session-Id:', err);
      next();
      return;
    }

    if (sessionData?.user) {
      req.session.user = sessionData.user;
    }

    next();
  });
});

app.use(actionLogger);

app.use((req, _res, next) => {
  if (req.path.startsWith('/api/auth')) {
    console.log(`[session] ${req.method} ${req.path} | sessionID: ${req.sessionID} | user: ${req.session?.user?.username ?? 'none'}`);
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/generator', generatorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/security', securityRoutes);

export async function configureApp(): Promise<typeof app> {
  await applyGraphQLMiddleware(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
