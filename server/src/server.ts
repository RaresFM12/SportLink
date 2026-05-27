import fs from 'fs';
import http from 'http';
import https from 'https';
import { configureApp, sessionMiddleware, sessionStore } from './app.js';
import { initializeWebSocketServer } from './websocket/wsServer.js';
import { initializeChatWebSocketServer } from './websocket/chatServer.js';
import { connectMongo } from './lib/mongo.js';

const PORT = Number(process.env.PORT ?? 3001);
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

async function main(): Promise<void> {
  console.log('Starting SportLink server...');

  console.log('Connecting to MongoDB...');
  await connectMongo();

  console.log('Configuring Express app...');
  const app = await configureApp();

  const server = SSL_KEY_PATH && SSL_CERT_PATH
    ? https.createServer({
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    }, app)
    : http.createServer(app);

  const protocol = SSL_KEY_PATH && SSL_CERT_PATH ? 'https' : 'http';
  const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

  const generatorWss = initializeWebSocketServer();
  const chatWss = initializeChatWebSocketServer(sessionMiddleware, sessionStore);

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', `${protocol}://${req.headers.host ?? 'localhost'}`);

    if (pathname === '/ws') {
      generatorWss.handleUpgrade(req, socket, head, (ws) => {
        generatorWss.emit('connection', ws, req);
      });
      return;
    }

    if (pathname === '/ws/chat') {
      chatWss.handleUpgrade(req, socket, head, (ws) => {
        chatWss.emit('connection', ws, req);
      });
      return;
    }

    socket.destroy();
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SportLink server     -> ${protocol}://0.0.0.0:${PORT}`);
    console.log(`SportLink GraphQL    -> ${protocol}://0.0.0.0:${PORT}/graphql`);
    console.log(`SportLink WS/gen     -> ${wsProtocol}://0.0.0.0:${PORT}/ws`);
    console.log(`SportLink WS/chat    -> ${wsProtocol}://0.0.0.0:${PORT}/ws/chat`);
  });
}

main().catch((err) => {
  console.error('=== SERVER FAILED TO START ===');
  console.error(err);
  process.exit(1);
});
