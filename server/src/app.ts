import 'dotenv/config';
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
import { readBearerToken, verifyAuthToken } from './services/tokenService.js';

export type SessionStore = session.Store;

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'sportlink-dev-secret-change-in-prod';
const IS_HTTPS = process.env.NODE_ENV !== 'test' &&
  (process.env.HTTPS === 'true' || Boolean(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH));
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS ?? 1000 * 60 * 15);
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ?? 'https://localhost:5173,https://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const sessionStore = new session.MemoryStore();

export const sessionMiddleware = session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  rolling: true,
  name: 'sportlink.sid',
  cookie: {
    httpOnly: true,
    secure: IS_HTTPS,
    maxAge: SESSION_IDLE_TIMEOUT_MS,
    sameSite: IS_HTTPS ? 'none' : 'lax',
  },
});

export const app = express();

app.set('trust proxy', 1);


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
  const bearerToken = readBearerToken(req.get('authorization'));
  const tokenPayload = bearerToken ? verifyAuthToken(bearerToken) : null;

  if (req.session?.user) {
    if (
      tokenPayload &&
      tokenPayload.sid === req.sessionID &&
      tokenPayload.id === req.session.user.id &&
      tokenPayload.role === req.session.user.role
    ) {
      const allowedPermissions = new Set(req.session.user.permissions);
      req.authUser = {
        ...req.session.user,
        permissions: tokenPayload.permissions.filter((permission) => allowedPermissions.has(permission)),
      };
      req.authTokenScheme = tokenPayload.scheme;
    } else {
      req.authUser = req.session.user;
    }
    next();
    return;
  }

  const headerSessionId = req.get('x-session-id');
  const sessionId = headerSessionId ?? tokenPayload?.sid;
  if (!sessionId) {
    next();
    return;
  }

  if (bearerToken && !tokenPayload && !headerSessionId) {
    next();
    return;
  }

  req.sessionStore.get(sessionId, (err: unknown, sessionData?: SessionData | null) => {
    if (err) {
      console.error('[session] Failed to load X-Session-Id:', err);
      next();
      return;
    }

    const isIdleExpired = sessionData?.lastActivityAt &&
      Date.now() - sessionData.lastActivityAt > SESSION_IDLE_TIMEOUT_MS;

    if (isIdleExpired) {
      req.sessionStore.destroy(sessionId, () => next());
      return;
    }

    if (
      sessionData?.user &&
      (!tokenPayload || (
        tokenPayload.sid === sessionId &&
        tokenPayload.id === sessionData.user.id &&
        tokenPayload.role === sessionData.user.role
      ))
    ) {
      req.session.user = sessionData.user;
      req.session.authToken = sessionData.authToken;
      req.session.lastActivityAt = sessionData.lastActivityAt;
      if (tokenPayload) {
        const allowedPermissions = new Set(sessionData.user.permissions);
        req.authUser = {
          ...sessionData.user,
          permissions: tokenPayload.permissions.filter((permission) => allowedPermissions.has(permission)),
        };
        req.authTokenScheme = tokenPayload.scheme;
      } else {
        req.authUser = sessionData.user;
      }
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

