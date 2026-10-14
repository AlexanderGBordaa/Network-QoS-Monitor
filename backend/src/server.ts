import express, { Request, Response } from 'express';
import cors from 'cors';
import net from 'net';
import crypto from 'crypto';

const app = express();
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const TCP_PORT = parseInt(process.env.TCP_PORT || '5050', 10);

app.use(cors({ origin: '*' }));

// Disable ETag and caching globally for accurate network measurements
app.set('etag', false);
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Network QoS Reference Backend',
    timestamp: Date.now(),
    uptimeSeconds: Math.floor(process.uptime()),
    serverLoad: process.cpuUsage(),
    memoryUsage: process.memoryUsage(),
  });
});

// Lightweight ping endpoint for HTTP latency checks
app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({
    pong: true,
    serverTimestamp: Date.now(),
  });
});

// Pre-allocate a 1 MB buffer for fast and efficient download streaming
const CHUNK_SIZE = 64 * 1024; // 64 KB chunk
const dummyChunk = crypto.randomBytes(CHUNK_SIZE);

// Download throughput test endpoint
// Parameters:
//   sizeMb: number of MB to stream (default 5, max 50)
//   bytes: exact number of bytes (optional)
app.get('/api/download', (req: Request, res: Response) => {
  const sizeMbParam = parseFloat((req.query.sizeMb as string) || '5');
  const bytesParam = parseInt((req.query.bytes as string) || '0', 10);

  let targetBytes = bytesParam > 0 ? bytesParam : Math.round(sizeMbParam * 1024 * 1024);
  // Cap at 100 MB to avoid server memory exhaustion
  if (targetBytes <= 0 || targetBytes > 100 * 1024 * 1024) {
    targetBytes = 5 * 1024 * 1024;
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', targetBytes.toString());
  res.setHeader('X-Payload-Size-Bytes', targetBytes.toString());

  let sentBytes = 0;

  const sendNext = () => {
    let canContinue = true;
    while (canContinue && sentBytes < targetBytes) {
      const remaining = targetBytes - sentBytes;
      const chunkSize = Math.min(CHUNK_SIZE, remaining);
      const slice = chunkSize === CHUNK_SIZE ? dummyChunk : dummyChunk.subarray(0, chunkSize);
      canContinue = res.write(slice);
      sentBytes += chunkSize;
    }

    if (sentBytes >= targetBytes) {
      res.end();
    }
  };

  res.on('drain', sendNext);
  sendNext();
});

// Upload throughput test endpoint
// Accepts raw binary stream or multipart/form data
app.post('/api/upload', (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  let receivedBytes = 0;

  req.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.length;
  });

  req.on('end', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationMs = durationNs / 1_000_000;
    const durationSeconds = durationMs / 1000;

    const bits = receivedBytes * 8;
    const throughputMbps = durationSeconds > 0 ? (bits / durationSeconds) / 1_000_000 : 0;

    res.json({
      success: true,
      receivedBytes,
      durationMs: Math.round(durationMs * 100) / 100,
      serverThroughputMbps: Math.round(throughputMbps * 100) / 100,
      timestamp: Date.now(),
    });
  });

  req.on('error', (err) => {
    res.status(500).json({ error: 'Stream error', details: err.message });
  });
});

// Start HTTP Server
const httpServer = app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[QoS Backend] HTTP Server listening on http://0.0.0.0:${HTTP_PORT}`);
  console.log(`  - Health:   http://localhost:${HTTP_PORT}/api/health`);
  console.log(`  - Ping:     http://localhost:${HTTP_PORT}/api/ping`);
  console.log(`  - Download: http://localhost:${HTTP_PORT}/api/download?sizeMb=5`);
  console.log(`  - Upload:   http://localhost:${HTTP_PORT}/api/upload (POST)`);
});

// Dedicated raw TCP Echo Server for ultra-low overhead RTT & Jitter probes
const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    // Immediate echo back for accurate RTT measurement
    socket.write(data);
  });
  socket.on('error', (err) => {
    // Silently handle reset by peer
  });
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
  console.log(`[QoS Backend] TCP Echo Server listening on tcp://0.0.0.0:${TCP_PORT}`);
});

process.on('SIGTERM', () => {
  httpServer.close();
  tcpServer.close();
});
