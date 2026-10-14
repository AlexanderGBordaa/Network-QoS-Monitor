import { create } from 'zustand';
import {
  GeoLocation,
  HistoryFilter,
  HostPingStats,
  MeasurementRecord,
  NetworkStateInfo,
  PingHostConfig,
  ThroughputProgress,
  ThroughputResult,
} from '../types/qos';
import { networkDetector } from '../services/networkDetector';
import { pingEngine, DEFAULT_PING_HOSTS } from '../services/pingEngine';
import { throughputEngine, DEFAULT_BACKEND_URL } from '../services/throughputEngine';
import { locationService } from '../services/locationService';
import { databaseService } from '../services/database';
import { notificationService } from '../services/notificationService';
import { backgroundService } from '../services/backgroundService';

interface QoSStoreState {
  // Live Network
  networkState: NetworkStateInfo;
  currentLocation: GeoLocation | null;

  // Ping Probes
  pingHosts: PingHostConfig[];
  activePingStats: HostPingStats[];
  isPingTesting: boolean;

  // Throughput Test
  backendUrl: string;
  downloadSizeMb: number;
  uploadSizeMb: number;
  throughputProgress: ThroughputProgress;
  latestThroughputResult: ThroughputResult | null;
  isThroughputTesting: boolean;

  // History & Filters
  history: MeasurementRecord[];
  filteredHistory: MeasurementRecord[];
  filter: HistoryFilter;

  // Background Settings
  backgroundEnabled: boolean;
  backgroundIntervalMinutes: number;

  // Actions
  initStore: () => Promise<void>;
  runPingTest: () => Promise<HostPingStats[]>;
  runThroughputTest: () => Promise<ThroughputResult | null>;
  runFullDiagnostic: () => Promise<MeasurementRecord | null>;
  cancelActiveTests: () => void;
  loadHistory: () => Promise<void>;
  setFilter: (filter: Partial<HistoryFilter>) => void;
  resetFilter: () => void;
  setBackendUrl: (url: string) => void;
  addPingHost: (host: PingHostConfig) => void;
  removePingHost: (id: string) => void;
  setBackgroundSampling: (enabled: boolean, intervalMinutes: number) => void;
  clearHistory: () => Promise<void>;
}

export const useQoSStore = create<QoSStoreState>((set, get) => ({
  networkState: {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: null,
    cellular: null,
    timestamp: Date.now(),
  },
  currentLocation: null,

  pingHosts: DEFAULT_PING_HOSTS,
  activePingStats: [],
  isPingTesting: false,

  backendUrl: DEFAULT_BACKEND_URL,
  downloadSizeMb: 5,
  uploadSizeMb: 3,
  throughputProgress: {
    phase: 'idle',
    progressPercent: 0,
    currentSpeedMbps: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    elapsedMs: 0,
  },
  latestThroughputResult: null,
  isThroughputTesting: false,

  history: [],
  filteredHistory: [],
  filter: {
    networkType: 'ALL',
  },

  backgroundEnabled: false,
  backgroundIntervalMinutes: 10,

  initStore: async () => {
    // 1. Initialize SQLite Database
    await databaseService.initDatabase();

    // 2. Initialize notifications
    await notificationService.initialize();

    // 3. Request permissions & start network listener
    await networkDetector.requestPermissions();
    networkDetector.startListening((netState) => {
      set({ networkState: netState });
    });

    // 4. Get initial location
    const loc = await locationService.getCurrentLocation();
    set({ currentLocation: loc });

    // 5. Load history
    await get().loadHistory();
  },

  loadHistory: async () => {
    const records = await databaseService.getAllMeasurements();
    const filtered = await databaseService.getFilteredMeasurements(get().filter);
    set({ history: records, filteredHistory: filtered });
  },

  setFilter: async (newFilterUpdate) => {
    const updatedFilter = { ...get().filter, ...newFilterUpdate };
    const filtered = await databaseService.getFilteredMeasurements(updatedFilter);
    set({ filter: updatedFilter, filteredHistory: filtered });
  },

  resetFilter: async () => {
    const reset = { networkType: 'ALL' };
    const filtered = await databaseService.getFilteredMeasurements(reset);
    set({ filter: reset, filteredHistory: filtered });
  },

  setBackendUrl: (url: string) => {
    set({ backendUrl: url });
  },

  addPingHost: (host: PingHostConfig) => {
    set((state) => ({ pingHosts: [...state.pingHosts, host] }));
  },

  removePingHost: (id: string) => {
    set((state) => ({ pingHosts: state.pingHosts.filter((h) => h.id !== id) }));
  },

  setBackgroundSampling: (enabled: boolean, intervalMinutes: number) => {
    backgroundService.setConfig(enabled, intervalMinutes, get().pingHosts);
    set({ backgroundEnabled: enabled, backgroundIntervalMinutes: intervalMinutes });
  },

  cancelActiveTests: () => {
    throughputEngine.cancelTest();
    set({
      isPingTesting: false,
      isThroughputTesting: false,
      throughputProgress: {
        phase: 'idle',
        progressPercent: 0,
        currentSpeedMbps: 0,
        bytesTransferred: 0,
        totalBytes: 0,
        elapsedMs: 0,
      },
    });
  },

  runPingTest: async () => {
    set({ isPingTesting: true });
    const hosts = get().pingHosts;

    // Reset ping stats in UI
    const initialStats: HostPingStats[] = hosts.map((h) => ({
      hostId: h.id,
      hostName: h.name,
      host: h.host,
      packetsSent: 0,
      packetsReceived: 0,
      packetLossPercent: 0,
      minRttMs: 0,
      avgRttMs: 0,
      maxRttMs: 0,
      jitterMs: 0,
      samples: [],
      status: 'idle',
    }));
    set({ activePingStats: initialStats });

    try {
      const results = await pingEngine.runAllHostsPing(hosts, 4, (updatedStat) => {
        set((state) => ({
          activePingStats: state.activePingStats.map((item) =>
            item.hostId === updatedStat.hostId ? updatedStat : item
          ),
        }));
      });

      set({ activePingStats: results, isPingTesting: false });
      return results;
    } catch {
      set({ isPingTesting: false });
      return [];
    }
  },

  runThroughputTest: async () => {
    set({ isThroughputTesting: true });
    const { backendUrl, downloadSizeMb, uploadSizeMb } = get();

    try {
      const result = await throughputEngine.runFullThroughputTest(
        backendUrl,
        downloadSizeMb,
        uploadSizeMb,
        (progress) => {
          set({ throughputProgress: progress });
        }
      );

      set({
        latestThroughputResult: result,
        isThroughputTesting: false,
      });

      return result;
    } catch {
      set({
        isThroughputTesting: false,
        throughputProgress: {
          phase: 'error',
          progressPercent: 0,
          currentSpeedMbps: 0,
          bytesTransferred: 0,
          totalBytes: 0,
          elapsedMs: 0,
        },
      });
      return null;
    }
  },

  runFullDiagnostic: async () => {
    const sessionToken = `session_${Date.now()}`;
    // 1. Refresh location and network
    const location = await locationService.getCurrentLocation();
    const netState = await networkDetector.getCurrentNetworkState();
    set({ currentLocation: location, networkState: netState });

    // 2. Run Ping Probes
    const pingStats = await get().runPingTest();

    // 3. Run Throughput Test
    const throughput = await get().runThroughputTest();

    // Aggregate ping metrics
    let totalAvgRtt = 0;
    let minRtt = 9999;
    let maxRtt = 0;
    let totalJitter = 0;
    let totalLoss = 0;
    let validCount = 0;

    for (const stat of pingStats) {
      if (stat.packetsReceived > 0) {
        totalAvgRtt += stat.avgRttMs;
        minRtt = Math.min(minRtt, stat.minRttMs);
        maxRtt = Math.max(maxRtt, stat.maxRttMs);
        totalJitter += stat.jitterMs;
        validCount++;
      }
      totalLoss += stat.packetLossPercent;
    }

    const rttAvgMs = validCount > 0 ? Math.round(totalAvgRtt / validCount) : 0;
    const rttMinMs = minRtt === 9999 ? 0 : minRtt;
    const rttMaxMs = maxRtt;
    const jitterMs = validCount > 0 ? Math.round(totalJitter / validCount) : 0;
    const packetLossPercent = pingStats.length > 0 ? Math.round(totalLoss / pingStats.length) : 0;

    const signalDbm = netState.cellular ? netState.cellular.signalDbm : -68;
    const signalLevel = netState.cellular ? netState.cellular.signalLevel : 3;

    const record: MeasurementRecord = {
      id: `diag_${Date.now()}`,
      timestamp: Date.now(),
      sessionToken,
      networkType: netState.cellular?.networkType || netState.type.toUpperCase(),
      generation: netState.cellular?.generation || (netState.type === 'wifi' ? 'WiFi' : 'N/A'),
      operator: netState.cellular?.operatorName || 'Red Local/WiFi',
      signalDbm,
      signalLevel,
      rttAvgMs,
      rttMinMs,
      rttMaxMs,
      jitterMs,
      packetLossPercent,
      pingDetailsJson: JSON.stringify(pingStats),
      downloadMbps: throughput ? throughput.downloadMbps : 0,
      uploadMbps: throughput ? throughput.uploadMbps : 0,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      isBackground: false,
      notes: 'Diagnóstico manual completo de QoS',
    };

    // Save to Database
    await databaseService.insertMeasurement(record);
    await get().loadHistory();

    return record;
  },

  clearHistory: async () => {
    await databaseService.clearAllMeasurements();
    set({ history: [], filteredHistory: [] });
  },
}));
