import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { CellularInfo } from '../types/qos';

const { TelephonyQoS } = NativeModules;

export interface TelephonyPermissions {
  locationGranted: boolean;
  phoneStateGranted: boolean;
}

const DEFAULT_CELLULAR_INFO: CellularInfo = {
  operatorName: 'No Celular / WiFi',
  simOperatorName: 'N/A',
  mcc: '000',
  mnc: '00',
  isRoaming: false,
  simState: 0,
  generation: 'WiFi',
  networkType: 'WiFi/Ethernet',
  signalDbm: -70,
  signalLevel: 3,
  rsrp: -95,
  rsrq: -10,
  sinr: 15,
};

class TelephonyQoSService {
  private eventEmitter: NativeEventEmitter | null = null;
  private isAvailable: boolean = false;

  constructor() {
    if (Platform.OS === 'android' && TelephonyQoS) {
      this.isAvailable = true;
      this.eventEmitter = new NativeEventEmitter(TelephonyQoS);
    }
  }

  public async getTelephonyInfo(): Promise<CellularInfo> {
    if (!this.isAvailable) {
      return DEFAULT_CELLULAR_INFO;
    }

    try {
      const data = await TelephonyQoS.getNetworkTelephonyInfo();
      return {
        operatorName: data.operatorName || 'Desconocido',
        simOperatorName: data.simOperatorName || 'Desconocido',
        mcc: data.mcc || '',
        mnc: data.mnc || '',
        isRoaming: !!data.isRoaming,
        simState: data.simState ?? 1,
        generation: data.generation || 'Desconocido',
        networkType: data.networkType || 'Desconocido',
        signalDbm: typeof data.signalDbm === 'number' ? data.signalDbm : -85,
        signalLevel: typeof data.signalLevel === 'number' ? data.signalLevel : 2,
        rsrp: typeof data.rsrp === 'number' ? data.rsrp : -999,
        rsrq: typeof data.rsrq === 'number' ? data.rsrq : -999,
        sinr: typeof data.sinr === 'number' ? data.sinr : -999,
      };
    } catch (err) {
      console.warn('[TelephonyQoS] Error fetching telephony info, using default fallback:', err);
      return DEFAULT_CELLULAR_INFO;
    }
  }

  public async checkPermissions(): Promise<TelephonyPermissions> {
    if (!this.isAvailable) {
      return { locationGranted: true, phoneStateGranted: true };
    }
    try {
      return await TelephonyQoS.checkPermissions();
    } catch {
      return { locationGranted: false, phoneStateGranted: false };
    }
  }

  public async startMonitoring(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await TelephonyQoS.startSignalMonitoring();
    } catch (e) {
      console.warn('[TelephonyQoS] startSignalMonitoring failed:', e);
      return false;
    }
  }

  public async stopMonitoring(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await TelephonyQoS.stopSignalMonitoring();
    } catch (e) {
      console.warn('[TelephonyQoS] stopSignalMonitoring failed:', e);
      return false;
    }
  }

  public onSignalChange(callback: (signal: { signalLevel: number; signalDbm: number }) => void) {
    if (!this.eventEmitter) return { remove: () => {} };
    return this.eventEmitter.addListener('onSignalStrengthChanged', (data: any) => {
      callback(data);
    });
  }
}

export const telephonyQoS = new TelephonyQoSService();
