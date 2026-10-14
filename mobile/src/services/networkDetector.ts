import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { PermissionsAndroid, Platform } from 'react-native';
import { NetworkStateInfo } from '../types/qos';
import { telephonyQoS } from '../native/TelephonyQoS';

class NetworkDetectorService {
  private listeners: ((state: NetworkStateInfo) => void)[] = [];
  private currentState: NetworkStateInfo = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: null,
    cellular: null,
    timestamp: Date.now(),
  };

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ];

      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any);
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);
      const fineLocationGranted = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
      return fineLocationGranted;
    } catch (e) {
      console.warn('[NetworkDetector] Error requesting permissions:', e);
      return false;
    }
  }

  public async getCurrentNetworkState(): Promise<NetworkStateInfo> {
    const netState: NetInfoState = await NetInfo.fetch();
    let cellularInfo = null;

    if (netState.type === 'cellular' || Platform.OS === 'android') {
      try {
        cellularInfo = await telephonyQoS.getTelephonyInfo();
      } catch (e) {
        console.warn('[NetworkDetector] Error getting cellular info:', e);
      }
    }

    this.currentState = {
      isConnected: Boolean(netState.isConnected),
      isInternetReachable: netState.isInternetReachable,
      type: netState.type,
      details: netState.details ? (netState.details as any) : null,
      cellular: cellularInfo,
      timestamp: Date.now(),
    };

    return this.currentState;
  }

  public startListening(onUpdate: (state: NetworkStateInfo) => void): () => void {
    this.listeners.push(onUpdate);

    // Initial fetch
    this.getCurrentNetworkState().then((s) => onUpdate(s));

    // NetInfo event listener
    const unsubscribeNetInfo = NetInfo.addEventListener(async (netState) => {
      let cellularInfo = null;
      if (netState.type === 'cellular' || Platform.OS === 'android') {
        try {
          cellularInfo = await telephonyQoS.getTelephonyInfo();
        } catch {
          cellularInfo = null;
        }
      }

      this.currentState = {
        isConnected: Boolean(netState.isConnected),
        isInternetReachable: netState.isInternetReachable,
        type: netState.type,
        details: netState.details ? (netState.details as any) : null,
        cellular: cellularInfo,
        timestamp: Date.now(),
      };

      this.notifyAll();
    });

    // Native telephony signal listener
    const signalSub = telephonyQoS.onSignalChange((signal) => {
      if (this.currentState.cellular) {
        this.currentState.cellular.signalLevel = signal.signalLevel;
        this.currentState.cellular.signalDbm = signal.signalDbm;
        this.currentState.timestamp = Date.now();
        this.notifyAll();
      }
    });

    telephonyQoS.startMonitoring();

    return () => {
      this.listeners = this.listeners.filter((l) => l !== onUpdate);
      unsubscribeNetInfo();
      if (signalSub && signalSub.remove) signalSub.remove();
      if (this.listeners.length === 0) {
        telephonyQoS.stopMonitoring();
      }
    };
  }

  private notifyAll() {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

export const networkDetector = new NetworkDetectorService();
