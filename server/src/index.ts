import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './roomManager';
import { GameManager } from './gameManager';
import { setupSocketHandlers } from './socketHandlers';
import { ServerToClientEvents, ClientToServerEvents } from './types';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();

if (IS_PRODUCTION) {
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(cors({ origin: CLIENT_URL, credentials: true }));
}
app.use(express.json());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: IS_PRODUCTION ? true : CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();
const gameManager = new GameManager();

setupSocketHandlers(io, roomManager, gameManager);

app.get('/health', (_req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    rooms: stats,
  });
});

app.get('/api/rooms', (_req, res) => {
  res.json(roomManager.getPublicRooms());
});

if (IS_PRODUCTION) {
  const clientBuildPath = path.join(__dirname, '../../blockus-game/build');
  app.use(express.static(clientBuildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       Blockus Game Server v1.0.0         ║
╠══════════════════════════════════════════╣
║  Port:   ${PORT}                              ║
║  Mode:   ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}                     ║
╚══════════════════════════════════════════╝
  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  roomManager.destroy();
  io.close();
  httpServer.close();
  process.exit(0);
});
