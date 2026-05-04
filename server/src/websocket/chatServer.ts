import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import session from 'express-session';
import { chatService } from '../services/chatService.js';
import type { SessionUser } from '../services/authService.js';
import '../middleware/requireAuth.js';

type ChatClient = {
  ws: WebSocket;
  user: SessionUser;
};

type IncomingChatMessage = {
  type: 'chat';
  text: string;
};

type OutgoingChatMessage =
  | {
      type: 'chat';
      userId: number;
      username: string;
      displayName: string;
      role: string;
      text: string;
      createdAt: string;
    }
  | { type: 'history'; messages: OutgoingChatMessage[] }
  | { type: 'error'; message: string }
  | { type: 'user_joined'; displayName: string }
  | { type: 'user_left'; displayName: string };

interface RequestWithSession extends IncomingMessage {
  session?: { user?: SessionUser };
}

type StoreWithGet = {
  get: (sid: string, cb: (err: unknown, session: unknown) => void) => void;
};

let chatWss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ChatClient>();

function broadcast(message: OutgoingChatMessage, exclude?: WebSocket): void {
  const payload = JSON.stringify(message);
  clients.forEach(({ ws }) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function sendTo(ws: WebSocket, message: OutgoingChatMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

async function resolveUser(
  req: IncomingMessage,
  sessionMiddleware: ReturnType<typeof session>
): Promise<SessionUser | undefined> {
  try {
    const reqWithSession = req as RequestWithSession;

    // Try cookie-based session first
    await new Promise<void>((resolve) => {
      sessionMiddleware(
        req as Parameters<typeof sessionMiddleware>[0],
        {} as Parameters<typeof sessionMiddleware>[1],
        () => resolve()
      );
    });

    if (reqWithSession.session?.user) {
      console.log('[chat] Auth via cookie, user:', reqWithSession.session.user.username);
      return reqWithSession.session.user;
    }

    // Try ?sid= query param
    const rawUrl = req.url ?? '';
    const qIndex = rawUrl.indexOf('?');
    const queryStr = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
    const params = new URLSearchParams(queryStr);
    const sid = params.get('sid');

    console.log('[chat] Cookie auth failed, trying sid from query:', sid ?? '(none)');

    if (!sid) return undefined;

    const store = (sessionMiddleware as unknown as { store?: StoreWithGet }).store;
    if (!store) {
      console.log('[chat] No session store available');
      return undefined;
    }

    return await new Promise<SessionUser | undefined>((resolve) => {
      store.get(sid, (err, sessionData) => {
        if (err) {
          console.log('[chat] store.get error:', err);
          resolve(undefined);
          return;
        }
        if (!sessionData) {
          console.log('[chat] No session found for sid:', sid);
          resolve(undefined);
          return;
        }
        const data = sessionData as { user?: SessionUser };
        console.log('[chat] Session found via sid, user:', data.user?.username ?? 'none');
        resolve(data.user);
      });
    });
  } catch (err) {
    console.error('[chat] resolveUser error:', err);
    return undefined;
  }
}

export function initializeChatWebSocketServer(
  httpServer: HttpServer,
  sessionMiddleware: ReturnType<typeof session>
): WebSocketServer {
  chatWss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });

  chatWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('[chat] New connection, url:', req.url);

    // Handle everything async but catch all errors
    void (async () => {
      try {
        const sessionUser = await resolveUser(req, sessionMiddleware);

        if (!sessionUser) {
          console.log('[chat] Rejected: no user in session');
          sendTo(ws, { type: 'error', message: 'Not authenticated. Please log in first.' });
          ws.close(1008, 'Unauthorized');
          return;
        }

        if (!sessionUser.permissions.includes('chat:write')) {
          console.log('[chat] Rejected: no chat:write permission');
          sendTo(ws, { type: 'error', message: 'You do not have permission to chat.' });
          ws.close(1008, 'Forbidden');
          return;
        }

        console.log('[chat] Accepted:', sessionUser.username);
        clients.set(ws, { ws, user: sessionUser });

        // Send history
        try {
          const history = await chatService.getHistory(50);
          sendTo(ws, {
            type: 'history',
            messages: history.map((m) => ({
              type: 'chat' as const,
              userId: m.userId,
              username: m.username,
              displayName: m.displayName,
              role: m.role,
              text: m.text,
              createdAt: m.createdAt.toISOString(),
            })),
          });
        } catch (err) {
          console.error('[chat] Failed to load history:', err);
        }

        broadcast({ type: 'user_joined', displayName: sessionUser.displayName }, ws);

        ws.on('message', (raw) => {
          void (async () => {
            try {
              const parsed = JSON.parse(raw.toString()) as IncomingChatMessage;

              if (parsed.type !== 'chat' || !parsed.text?.trim()) {
                sendTo(ws, { type: 'error', message: 'Message text cannot be empty.' });
                return;
              }

              const saved = await chatService.saveMessage(sessionUser, parsed.text);
              const outgoing: OutgoingChatMessage = {
                type: 'chat',
                userId: saved.userId,
                username: saved.username,
                displayName: saved.displayName,
                role: saved.role,
                text: saved.text,
                createdAt: saved.createdAt.toISOString(),
              };
              clients.forEach(({ ws: clientWs }) => sendTo(clientWs, outgoing));
            } catch (err) {
              console.error('[chat] message handler error:', err);
              sendTo(ws, { type: 'error', message: 'Failed to process message.' });
            }
          })();
        });

        ws.on('close', (code, reason) => {
          console.log('[chat] Disconnected:', sessionUser.username, code, reason.toString());
          clients.delete(ws);
          broadcast({ type: 'user_left', displayName: sessionUser.displayName });
        });

        ws.on('error', (err) => {
          console.error('[chat] Socket error for', sessionUser.username, ':', err.message);
          clients.delete(ws);
        });

      } catch (err) {
        console.error('[chat] Unhandled connection error:', err);
        try {
          ws.close(1011, 'Internal error');
        } catch {
          // ignore
        }
      }
    })();
  });

  chatWss.on('error', (err) => {
    console.error('[chat] WSS error:', err);
  });

  return chatWss;
}