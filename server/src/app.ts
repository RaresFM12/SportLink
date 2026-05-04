import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { eventRoutes } from './routes/eventRoutes.js';
import { statisticsRoutes } from './routes/statisticsRoutes.js';
import { generatorRoutes } from './routes/generatorRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { applyGraphQLMiddleware } from './graphql/server.js';

export type SessionStore = session.Store;

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'sportlink-dev-secret-change-in-prod';

export const sessionMiddleware = session({
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

// HTTP requests come via Vite proxy (origin: localhost:5173)
// WebSocket connections come directly (origin: localhost:5173)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());
app.use(sessionMiddleware);

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

export async function configureApp(): Promise<typeof app> {
  await applyGraphQLMiddleware(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}