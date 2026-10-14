import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';

test('Backend HTTP server health check and download test', async (t) => {
  const serverProcess = spawn('node', ['dist/server.js'], {
    env: { ...process.env, PORT: '3001', TCP_PORT: '5051' },
    stdio: 'pipe',
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    // 1. Test /api/health
    const healthRes = await fetch('http://127.0.0.1:3001/api/health');
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok');

    // 2. Test /api/ping
    const pingRes = await fetch('http://127.0.0.1:3001/api/ping');
    assert.strictEqual(pingRes.status, 200);
    const pingData = await pingRes.json();
    assert.strictEqual(pingData.pong, true);

    // 3. Test /api/download?sizeMb=1
    const dlRes = await fetch('http://127.0.0.1:3001/api/download?sizeMb=1');
    assert.strictEqual(dlRes.status, 200);
    const arrayBuffer = await dlRes.arrayBuffer();
    assert.strictEqual(arrayBuffer.byteLength, 1024 * 1024);

    // 4. Test /api/upload
    const uploadPayload = Buffer.alloc(1024 * 512, 'a'); // 512 KB
    const upRes = await fetch('http://127.0.0.1:3001/api/upload', {
      method: 'POST',
      body: uploadPayload,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    assert.strictEqual(upRes.status, 200);
    const upData = await upRes.json();
    assert.strictEqual(upData.success, true);
    assert.strictEqual(upData.receivedBytes, 512 * 1024);
  } finally {
    serverProcess.kill('SIGTERM');
  }
});
