import TcpSocket from 'react-native-tcp-socket';
import { HostPingStats, PingHostConfig, SinglePingSample } from '../types/qos';

export const DEFAULT_PING_HOSTS: PingHostConfig[] = [
  {
    id: 'google-dns',
    name: 'Google DNS',
    host: '8.8.8.8',
    port: 53,
    protocol: 'tcp',
  },
  {
    id: 'cloudflare-dns',
    name: 'Cloudflare DNS',
    host: '1.1.1.1',
    port: 53,
    protocol: 'tcp',
  },
  {
    id: 'backend-ref',
    name: 'QoS Reference Backend',
    host: '10.0.2.2', // Standard Android emulator loopback host, customizable
    port: 5050,
    protocol: 'tcp',
  },
];

class PingEngineService {
  /**
   * Executes a single probe to a host using TCP socket connection timing
   */
  public async probeTcpHost(host: string, port: number, timeoutMs = 2500): Promise<SinglePingSample> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;

      const client = TcpSocket.createConnection(
        {
          host,
          port,
        },
        () => {
          if (!resolved) {
            resolved = true;
            const rttMs = Date.now() - startTime;
            client.destroy();
            resolve({
              host,
              sequence: 1,
              rttMs,
              success: true,
              timestamp: Date.now(),
            });
          }
        }
      );
      client.setTimeout(timeoutMs);

      client.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          client.destroy();
          // Even if port rejects, connect RST still indicates host reachable RTT
          const rttMs = Date.now() - startTime;
          resolve({
            host,
            sequence: 1,
            rttMs: rttMs < timeoutMs ? rttMs : timeoutMs,
            success: rttMs < timeoutMs,
            error: err.message,
            timestamp: Date.now(),
          });
        }
      });

      client.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          client.destroy();
          resolve({
            host,
            sequence: 1,
            rttMs: timeoutMs,
            success: false,
            error: 'Timeout',
            timestamp: Date.now(),
          });
        }
      });
    });
  }

  /**
   * Fallback probe using HTTP HEAD request timing
   */
  public async probeHttpHost(url: string, timeoutMs = 2500): Promise<SinglePingSample> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const rttMs = Date.now() - startTime;
      return {
        host: url,
        sequence: 1,
        rttMs,
        success: true,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      const rttMs = Date.now() - startTime;
      return {
        host: url,
        sequence: 1,
        rttMs: Math.min(rttMs, timeoutMs),
        success: false,
        error: err?.message || 'Error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Runs a complete multi-packet ping session for a target host, calculating min, avg, max, and RFC 3550 jitter
   */
  public async runHostPingSession(
    target: PingHostConfig,
    packetCount = 5,
    intervalMs = 300,
    onProgress?: (stats: HostPingStats) => void
  ): Promise<HostPingStats> {
    const samples: SinglePingSample[] = [];

    const stats: HostPingStats = {
      hostId: target.id,
      hostName: target.name,
      host: target.host,
      packetsSent: 0,
      packetsReceived: 0,
      packetLossPercent: 0,
      minRttMs: 0,
      avgRttMs: 0,
      maxRttMs: 0,
      jitterMs: 0,
      samples,
      status: 'running',
    };

    if (onProgress) onProgress({ ...stats });

    for (let i = 0; i < packetCount; i++) {
      let sample: SinglePingSample;
      try {
        if (target.protocol === 'tcp') {
          sample = await this.probeTcpHost(target.host, target.port);
        } else {
          sample = await this.probeHttpHost(target.host);
        }
      } catch {
        sample = {
          host: target.host,
          sequence: i + 1,
          rttMs: 2500,
          success: false,
          error: 'Connection failed',
          timestamp: Date.now(),
        };
      }

      sample.sequence = i + 1;
      samples.push(sample);
      stats.packetsSent++;

      if (sample.success) {
        stats.packetsReceived++;
      }

      // Re-calculate statistics
      const successfulSamples = samples.filter((s) => s.success);
      if (successfulSamples.length > 0) {
        const rttValues = successfulSamples.map((s) => s.rttMs);
        stats.minRttMs = Math.min(...rttValues);
        stats.maxRttMs = Math.max(...rttValues);
        const sum = rttValues.reduce((a, b) => a + b, 0);
        stats.avgRttMs = Math.round(sum / rttValues.length);

        // RFC 3550 / RFC 1889 Jitter: mean difference between consecutive packets
        if (rttValues.length > 1) {
          let jitterSum = 0;
          for (let j = 1; j < rttValues.length; j++) {
            jitterSum += Math.abs(rttValues[j] - rttValues[j - 1]);
          }
          stats.jitterMs = Math.round(jitterSum / (rttValues.length - 1));
        } else {
          stats.jitterMs = 0;
        }
      }

      stats.packetLossPercent = Math.round(
        ((stats.packetsSent - stats.packetsReceived) / stats.packetsSent) * 100
      );

      if (onProgress) onProgress({ ...stats, samples: [...samples] });

      if (i < packetCount - 1) {
        await new Promise((resolve) => setTimeout(() => resolve(undefined), intervalMs));
      }
    }

    stats.status = stats.packetsReceived > 0 ? 'completed' : 'failed';
    return stats;
  }

  /**
   * Runs concurrent or sequential ping sessions against all configured hosts
   */
  public async runAllHostsPing(
    hosts: PingHostConfig[],
    packetCount = 4,
    onHostUpdate?: (stats: HostPingStats) => void
  ): Promise<HostPingStats[]> {
    const results: HostPingStats[] = [];
    for (const host of hosts) {
      const hostResult = await this.runHostPingSession(host, packetCount, 250, onHostUpdate);
      results.push(hostResult);
    }
    return results;
  }
}

export const pingEngine = new PingEngineService();
