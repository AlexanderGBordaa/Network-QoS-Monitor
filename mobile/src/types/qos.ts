export type NetworkGeneration = '2G' | '3G' | '4G' | '5G' | 'WiFi' | 'Ethernet' | 'Desconocido' | 'None';

export interface CellularInfo {
  operatorName: string;
  simOperatorName: string;
  mcc: string;
  mnc: string;
  isRoaming: boolean;
  simState: number;
  generation: string;
  networkType: string;
  signalDbm: number;
  signalLevel: number; // 0 (poor) to 4 (excellent)
  rsrp: number;
  rsrq: number;
  sinr: number;
}

export interface NetworkStateInfo {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string; // 'wifi' | 'cellular' | 'none' | 'unknown'
  details: {
    ipAddress?: string;
    subnet?: string;
    ssid?: string | null;
    bssid?: string | null;
    frequency?: number;
    strength?: number;
    cellularGeneration?: string;
    carrier?: string;
  } | null;
  cellular: CellularInfo | null;
  timestamp: number;
}

export interface PingHostConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'tcp' | 'http';
}

export interface SinglePingSample {
  host: string;
  sequence: number;
  rttMs: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface HostPingStats {
  hostId: string;
  hostName: string;
  host: string;
  packetsSent: number;
  packetsReceived: number;
  packetLossPercent: number;
  minRttMs: number;
  avgRttMs: number;
  maxRttMs: number;
  jitterMs: number;
  samples: SinglePingSample[];
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export interface ThroughputProgress {
  phase: 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error';
  progressPercent: number; // 0 to 100
  currentSpeedMbps: number;
  bytesTransferred: number;
  totalBytes: number;
  elapsedMs: number;
}

export interface ThroughputResult {
  downloadMbps: number;
  uploadMbps: number;
  downloadBytes: number;
  uploadBytes: number;
  downloadDurationMs: number;
  uploadDurationMs: number;
  serverUrl: string;
  timestamp: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number;
  timestamp: number;
}

export interface MeasurementRecord {
  id: string;
  timestamp: number;
  sessionToken: string;
  networkType: string; // 'WiFi', '4G (LTE)', '5G NR', etc.
  generation: string;
  operator: string;
  signalDbm: number;
  signalLevel: number;
  // Latency & Jitter (Aggregated or primary host)
  rttAvgMs: number;
  rttMinMs: number;
  rttMaxMs: number;
  jitterMs: number;
  packetLossPercent: number;
  pingDetailsJson: string; // JSON string of HostPingStats[]
  // Throughput
  downloadMbps: number;
  uploadMbps: number;
  // Geolocation
  latitude: number;
  longitude: number;
  accuracy: number;
  // Background tag
  isBackground: boolean;
  notes?: string;
}

export interface HistoryFilter {
  networkType?: string; // 'ALL' | 'WiFi' | 'Cellular' | '4G' | '5G'
  startDate?: number; // timestamp
  endDate?: number;   // timestamp
  minQualityDbm?: number;
  geoBoundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}
