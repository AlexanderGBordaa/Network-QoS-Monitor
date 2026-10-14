import { networkDetector } from './networkDetector';
import { pingEngine, DEFAULT_PING_HOSTS } from './pingEngine';
import { locationService } from './locationService';
import { databaseService } from './database';
import { notificationService } from './notificationService';
import { MeasurementRecord, PingHostConfig } from '../types/qos';

class BackgroundQoSService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isEnabled = false;
  private intervalMinutes = 10;
  private pingHosts: PingHostConfig[] = DEFAULT_PING_HOSTS;

  public setConfig(enabled: boolean, intervalMinutes: number, hosts?: PingHostConfig[]) {
    this.isEnabled = enabled;
    this.intervalMinutes = Math.max(1, intervalMinutes);
    if (hosts) this.pingHosts = hosts;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.isEnabled) {
      this.startSamplingLoop();
    }
  }

  public async performSampling(isManual = false): Promise<MeasurementRecord | null> {
    try {
      const netState = await networkDetector.getCurrentNetworkState();
      const location = await locationService.getCurrentLocation();

      // Quick ping probe (2 packets per host)
      const pingResults = await pingEngine.runAllHostsPing(this.pingHosts.slice(0, 2), 2);

      let totalAvgRtt = 0;
      let totalMinRtt = 9999;
      let totalMaxRtt = 0;
      let totalJitter = 0;
      let totalLoss = 0;
      let validHosts = 0;

      for (const res of pingResults) {
        if (res.packetsReceived > 0) {
          totalAvgRtt += res.avgRttMs;
          totalMinRtt = Math.min(totalMinRtt, res.minRttMs);
          totalMaxRtt = Math.max(totalMaxRtt, res.maxRttMs);
          totalJitter += res.jitterMs;
          validHosts++;
        }
        totalLoss += res.packetLossPercent;
      }

      const avgRtt = validHosts > 0 ? Math.round(totalAvgRtt / validHosts) : 999;
      const minRtt = totalMinRtt === 9999 ? 0 : totalMinRtt;
      const maxRtt = totalMaxRtt;
      const avgJitter = validHosts > 0 ? Math.round(totalJitter / validHosts) : 0;
      const avgLoss = Math.round(totalLoss / pingResults.length);

      const signalDbm = netState.cellular ? netState.cellular.signalDbm : -70;
      const signalLevel = netState.cellular ? netState.cellular.signalLevel : 3;

      const record: MeasurementRecord = {
        id: `meas_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        sessionToken: 'bg-sample',
        networkType: netState.cellular?.networkType || netState.type.toUpperCase(),
        generation: netState.cellular?.generation || (netState.type === 'wifi' ? 'WiFi' : 'N/A'),
        operator: netState.cellular?.operatorName || 'Red Local/WiFi',
        signalDbm,
        signalLevel,
        rttAvgMs: avgRtt,
        rttMinMs: minRtt,
        rttMaxMs: maxRtt,
        jitterMs: avgJitter,
        packetLossPercent: avgLoss,
        pingDetailsJson: JSON.stringify(pingResults),
        downloadMbps: 0, // background doesn't consume large throughput data
        uploadMbps: 0,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isBackground: !isManual,
        notes: isManual ? 'Muestreo manual puntual' : 'Muestreo periódico en segundo plano',
      };

      await databaseService.insertMeasurement(record);

      // Check degradation triggers
      this.evaluateDegradationAlert(record);

      return record;
    } catch (e) {
      console.warn('[BackgroundQoSService] Sampling error:', e);
      return null;
    }
  }

  private evaluateDegradationAlert(record: MeasurementRecord) {
    const reasons: string[] = [];

    if (record.packetLossPercent >= 40) {
      reasons.push(`Pérdida de paquetes crítica (${record.packetLossPercent}%)`);
    }
    if (record.rttAvgMs > 350) {
      reasons.push(`Latencia muy elevada (${record.rttAvgMs} ms)`);
    }
    if (record.jitterMs > 100) {
      reasons.push(`Jitter inestable (${record.jitterMs} ms)`);
    }
    if (record.signalDbm < -115 && record.signalDbm > -999) {
      reasons.push(`Nivel de señal crítico (${record.signalDbm} dBm)`);
    }

    if (reasons.length > 0) {
      notificationService.notifyDegradation(
        '⚠️ Alerta de Degradación de Red',
        `Se detectó deterioro en la conexión: ${reasons.join(', ')}`
      );
    }
  }

  private startSamplingLoop() {
    const intervalMs = this.intervalMinutes * 60 * 1000;
    // Initial sample
    this.performSampling(false);

    this.timerId = setInterval(() => {
      this.performSampling(false);
    }, intervalMs);
  }
}

export const backgroundService = new BackgroundQoSService();
