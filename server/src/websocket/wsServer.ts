import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

type GeneratorBroadcastMessage =
  | {
      type: 'generator-batch-created';
      payload: {
        batchSize: number;
        totalEvents: number;
      };
    }
  | {
      type: 'generator-status';
      payload: {
        running: boolean;
      };
    };

let webSocketServer: WebSocketServer | null = null;

function sendToClient(client: WebSocket, message: GeneratorBroadcastMessage): void {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

export function initializeWebSocketServer(httpServer: HttpServer): WebSocketServer {
  webSocketServer = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  webSocketServer.on('connection', (socket) => {
    sendToClient(socket, {
      type: 'generator-status',
      payload: { running: false }
    });
  });

  return webSocketServer;
}

export function broadcastWebSocketMessage(message: GeneratorBroadcastMessage): void {
  if (!webSocketServer) {
    return;
  }

  webSocketServer.clients.forEach((client) => {
    sendToClient(client, message);
  });
}