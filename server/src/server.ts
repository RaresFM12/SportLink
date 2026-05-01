import http from 'http';
import { configureApp } from './app.js';
import { initializeWebSocketServer } from './websocket/wsServer.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = await configureApp();
  const httpServer = http.createServer(app);

  initializeWebSocketServer(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SportLink server running on http://0.0.0.0:${PORT}`);
    console.log(`SportLink GraphQL running on http://0.0.0.0:${PORT}/graphql`);
    console.log(`SportLink websocket running on ws://0.0.0.0:${PORT}/ws`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
