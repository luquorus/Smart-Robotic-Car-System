import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectMongo, closeMongo } from './mongo.js';
import { ensureIndexes } from './indexes.js';
import { startMqtt, stopOfflineDetection } from './mqtt.js';
import routes from './routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Startup
async function start() {
  try {
    // Connect MongoDB
    await connectMongo();

    // Ensure indexes
    await ensureIndexes();

    // Start MQTT
    startMqtt(io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`[Server] Listening on http://localhost:${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');
  stopOfflineDetection();
  await closeMongo();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down...');
  stopOfflineDetection();
  await closeMongo();
  process.exit(0);
});

start();

