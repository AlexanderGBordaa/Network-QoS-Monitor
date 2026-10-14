import { ThroughputProgress, ThroughputResult } from '../types/qos';

export const DEFAULT_BACKEND_URL = 'http://10.0.2.2:3000'; // 10.0.2.2 is Android host loopback

class ThroughputEngineService {
  private isCancelled = false;

  public cancelTest() {
    this.isCancelled = true;
  }

  /**
   * Executes a complete download test measuring Mbps with real-time progress callbacks
   */
  public async runDownloadTest(
    backendUrl = DEFAULT_BACKEND_URL,
    sizeMb = 5,
    onProgress?: (progress: ThroughputProgress) => void
  ): Promise<{ mbps: number; bytes: number; durationMs: number }> {
    this.isCancelled = false;
    const downloadEndpoint = `${backendUrl.replace(/\/+$/, '')}/api/download?sizeMb=${sizeMb}&t=${Date.now()}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastBytes = 0;
      let totalExpectedBytes = sizeMb * 1024 * 1024;

      xhr.open('GET', downloadEndpoint, true);
      xhr.responseType = 'arraybuffer';
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store');

      xhr.onprogress = (event) => {
        if (this.isCancelled) {
          xhr.abort();
          reject(new Error('Test cancelado por el usuario'));
          return;
        }

        const now = Date.now();
        const elapsedTotal = Math.max(1, now - startTime);
        const currentBytes = event.loaded;
        const total = event.total > 0 ? event.total : totalExpectedBytes;

        const currentSpeedMbps = ((currentBytes * 8) / (elapsedTotal / 1000)) / 1_000_000;
        const progressPercent = Math.min(99, Math.round((currentBytes / total) * 100));

        if (onProgress) {
          onProgress({
            phase: 'download',
            progressPercent,
            currentSpeedMbps: Math.round(currentSpeedMbps * 100) / 100,
            bytesTransferred: currentBytes,
            totalBytes: total,
            elapsedMs: elapsedTotal,
          });
        }

        lastBytes = currentBytes;
      };

      xhr.onload = () => {
        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const responseBytes = xhr.response ? xhr.response.byteLength : lastBytes;
        const totalBits = responseBytes * 8;
        const finalMbps = (totalBits / (totalTimeMs / 1000)) / 1_000_000;

        if (onProgress) {
          onProgress({
            phase: 'download',
            progressPercent: 100,
            currentSpeedMbps: Math.round(finalMbps * 100) / 100,
            bytesTransferred: responseBytes,
            totalBytes: responseBytes,
            elapsedMs: totalTimeMs,
          });
        }

        resolve({
          mbps: Math.round(finalMbps * 100) / 100,
          bytes: responseBytes,
          durationMs: totalTimeMs,
        });
      };

      xhr.onerror = () => {
        reject(new Error(`Fallo de conexión al descargar de ${downloadEndpoint}`));
      };

      xhr.ontimeout = () => {
        reject(new Error('Tiempo de espera agotado al descargar'));
      };

      xhr.timeout = 25000;
      xhr.send();
    });
  }

  /**
   * Executes a complete upload test measuring Mbps with real-time progress callbacks
   */
  public async runUploadTest(
    backendUrl = DEFAULT_BACKEND_URL,
    sizeMb = 3,
    onProgress?: (progress: ThroughputProgress) => void
  ): Promise<{ mbps: number; bytes: number; durationMs: number }> {
    this.isCancelled = false;
    const uploadEndpoint = `${backendUrl.replace(/\/+$/, '')}/api/upload?t=${Date.now()}`;
    const payloadBytes = Math.round(sizeMb * 1024 * 1024);

    // Generate random binary payload
    const payload = new Uint8Array(payloadBytes);
    for (let i = 0; i < payloadBytes; i += 4096) {
      payload[i] = (i % 255);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.open('POST', uploadEndpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (this.isCancelled) {
          xhr.abort();
          reject(new Error('Test cancelado por el usuario'));
          return;
        }

        const now = Date.now();
        const elapsedTotal = Math.max(1, now - startTime);
        const currentBytes = event.loaded;
        const total = event.total > 0 ? event.total : payloadBytes;

        const currentSpeedMbps = ((currentBytes * 8) / (elapsedTotal / 1000)) / 1_000_000;
        const progressPercent = Math.min(99, Math.round((currentBytes / total) * 100));

        if (onProgress) {
          onProgress({
            phase: 'upload',
            progressPercent,
            currentSpeedMbps: Math.round(currentSpeedMbps * 100) / 100,
            bytesTransferred: currentBytes,
            totalBytes: total,
            elapsedMs: elapsedTotal,
          });
        }
      };

      xhr.onload = () => {
        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const totalBits = payloadBytes * 8;
        const finalMbps = (totalBits / (totalTimeMs / 1000)) / 1_000_000;

        if (onProgress) {
          onProgress({
            phase: 'upload',
            progressPercent: 100,
            currentSpeedMbps: Math.round(finalMbps * 100) / 100,
            bytesTransferred: payloadBytes,
            totalBytes: payloadBytes,
            elapsedMs: totalTimeMs,
          });
        }

        resolve({
          mbps: Math.round(finalMbps * 100) / 100,
          bytes: payloadBytes,
          durationMs: totalTimeMs,
        });
      };

      xhr.onerror = () => {
        reject(new Error(`Fallo de conexión al subir datos a ${uploadEndpoint}`));
      };

      xhr.ontimeout = () => {
        reject(new Error('Tiempo de espera agotado al subir'));
      };

      xhr.timeout = 25000;
      xhr.send(payload.buffer);
    });
  }

  /**
   * Orchestrates the complete throughput benchmark (Download followed by Upload)
   */
  public async runFullThroughputTest(
    backendUrl = DEFAULT_BACKEND_URL,
    downloadMb = 5,
    uploadMb = 3,
    onProgress?: (progress: ThroughputProgress) => void
  ): Promise<ThroughputResult> {
    const download = await this.runDownloadTest(backendUrl, downloadMb, onProgress);
    await new Promise((r) => setTimeout(() => r(undefined), 400)); // Pause briefly between tests
    const upload = await this.runUploadTest(backendUrl, uploadMb, onProgress);

    if (onProgress) {
      onProgress({
        phase: 'completed',
        progressPercent: 100,
        currentSpeedMbps: download.mbps,
        bytesTransferred: download.bytes + upload.bytes,
        totalBytes: download.bytes + upload.bytes,
        elapsedMs: download.durationMs + upload.durationMs,
      });
    }

    return {
      downloadMbps: download.mbps,
      uploadMbps: upload.mbps,
      downloadBytes: download.bytes,
      uploadBytes: upload.bytes,
      downloadDurationMs: download.durationMs,
      uploadDurationMs: upload.durationMs,
      serverUrl: backendUrl,
      timestamp: Date.now(),
    };
  }
}

export const throughputEngine = new ThroughputEngineService();
