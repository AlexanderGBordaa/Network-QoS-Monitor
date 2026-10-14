import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { GeoLocation } from '../types/qos';

// Default fallback coordinates (Resistencia / Corrientes or Buenos Aires coordinates for testing)
const FALLBACK_LOCATION: GeoLocation = {
  latitude: -27.4514,
  longitude: -58.9866,
  accuracy: 10,
  altitude: 50,
  timestamp: Date.now(),
};

class LocationService {
  private lastKnownLocation: GeoLocation = FALLBACK_LOCATION;

  public async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación para QoS',
          message: 'Se requiere ubicación para georreferenciar las mediciones y construir el mapa de cobertura.',
          buttonNeutral: 'Preguntar después',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Aceptar',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  public async getCurrentLocation(): Promise<GeoLocation> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('[LocationService] Permission not granted, using last known or fallback');
      return this.lastKnownLocation;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const loc: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          };
          this.lastKnownLocation = loc;
          resolve(loc);
        },
        (error) => {
          console.warn('[LocationService] getCurrentPosition error, using fallback:', error.message);
          resolve(this.lastKnownLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000,
          forceRequestLocation: true,
        }
      );
    });
  }

  public getLastKnownLocation(): GeoLocation {
    return this.lastKnownLocation;
  }
}

export const locationService = new LocationService();
