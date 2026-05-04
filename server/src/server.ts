import http from 'http';
import { configureApp, sessionMiddleware } from './app.js';
import { initializeWebSocketServer } from './websocket/wsServer.js';
import { initializeChatWebSocketServer } from './websocket/chatServer.js';
import { connectMongo } from './lib/mongo.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  console.log('Starting SportLink server...');

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await connectMongo();

  console.log('Configuring Express app...');
  const app = await configureApp();

  const httpServer = http.createServer(app);

  // Generator WebSocket
  initializeWebSocketServer(httpServer);

  // Chat WebSocket
  initializeChatWebSocketServer(httpServer, sessionMiddleware);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SportLink server     → http://0.0.0.0:${PORT}`);
    console.log(`SportLink GraphQL    → http://0.0.0.0:${PORT}/graphql`);
    console.log(`SportLink WS/gen     → ws://0.0.0.0:${PORT}/ws`);
    console.log(`SportLink WS/chat    → ws://0.0.0.0:${PORT}/ws/chat`);
  });
}

main().catch((err) => {
  console.error('=== SERVER FAILED TO START ===');
  console.error(err);
  process.exit(1);
});