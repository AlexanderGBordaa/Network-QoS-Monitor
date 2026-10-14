import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryFilter, MeasurementRecord } from '../types/qos';

SQLite.enablePromise(true);

const DB_NAME = 'NetworkQoS.db';
const ASYNC_STORAGE_FALLBACK_KEY = '@network_qos_measurements_v1';

class DatabaseService {
  private db: any = null;
  private isSqliteAvailable: boolean = false;

  public async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      this.isSqliteAvailable = true;

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS measurements (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          sessionToken TEXT NOT NULL,
          networkType TEXT,
          generation TEXT,
          operator TEXT,
          signalDbm INTEGER,
          signalLevel INTEGER,
          rttAvgMs REAL,
          rttMinMs REAL,
          rttMaxMs REAL,
          jitterMs REAL,
          packetLossPercent REAL,
          pingDetailsJson TEXT,
          downloadMbps REAL,
          uploadMbps REAL,
          latitude REAL,
          longitude REAL,
          accuracy REAL,
          isBackground INTEGER,
          notes TEXT
        );
      `);

      await this.db.executeSql(
        'CREATE INDEX IF NOT EXISTS idx_timestamp ON measurements(timestamp);'
      );
      await this.db.executeSql(
        'CREATE INDEX IF NOT EXISTS idx_network ON measurements(networkType);'
      );
    } catch (err) {
      console.warn('[DatabaseService] SQLite init failed, falling back to AsyncStorage:', err);
      this.isSqliteAvailable = false;
    }
  }

  public async insertMeasurement(record: MeasurementRecord): Promise<void> {
    if (this.isSqliteAvailable && this.db) {
      try {
        await this.db.executeSql(
          `INSERT INTO measurements (
            id, timestamp, sessionToken, networkType, generation, operator,
            signalDbm, signalLevel, rttAvgMs, rttMinMs, rttMaxMs, jitterMs,
            packetLossPercent, pingDetailsJson, downloadMbps, uploadMbps,
            latitude, longitude, accuracy, isBackground, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            record.id,
            record.timestamp,
            record.sessionToken,
            record.networkType,
            record.generation,
            record.operator,
            record.signalDbm,
            record.signalLevel,
            record.rttAvgMs,
            record.rttMinMs,
            record.rttMaxMs,
            record.jitterMs,
            record.packetLossPercent,
            record.pingDetailsJson,
            record.downloadMbps,
            record.uploadMbps,
            record.latitude,
            record.longitude,
            record.accuracy,
            record.isBackground ? 1 : 0,
            record.notes || '',
          ]
        );
        return;
      } catch (e) {
        console.warn('[DatabaseService] SQLite insert failed, fallback:', e);
      }
    }

    // AsyncStorage fallback
    const all = await this.getAllFromAsyncStorage();
    all.unshift(record);
    await AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(all.slice(0, 1000)));
  }

  public async getAllMeasurements(): Promise<MeasurementRecord[]> {
    if (this.isSqliteAvailable && this.db) {
      try {
        const [results] = await this.db.executeSql(
          'SELECT * FROM measurements ORDER BY timestamp DESC;'
        );
        const list: MeasurementRecord[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          const item = results.rows.item(i);
          list.push({
            ...item,
            isBackground: Boolean(item.isBackground),
          });
        }
        return list;
      } catch (e) {
        console.warn('[DatabaseService] SQLite select failed:', e);
      }
    }

    return this.getAllFromAsyncStorage();
  }

  public async getFilteredMeasurements(filter: HistoryFilter): Promise<MeasurementRecord[]> {
    const all = await this.getAllMeasurements();

    return all.filter((item) => {
      // Date filter
      if (filter.startDate && item.timestamp < filter.startDate) return false;
      if (filter.endDate && item.timestamp > filter.endDate) return false;

      // Network Type filter
      if (filter.networkType && filter.networkType !== 'ALL') {
        const target = filter.networkType.toLowerCase();
        const matchesGen = item.generation.toLowerCase().includes(target);
        const matchesType = item.networkType.toLowerCase().includes(target);
        if (!matchesGen && !matchesType) return false;
      }

      // Min Quality Dbm filter (e.g. signal >= -85 dBm)
      if (filter.minQualityDbm !== undefined && item.signalDbm < filter.minQualityDbm) {
        return false;
      }

      // Geographic Bounding Box filter
      if (filter.geoBoundingBox) {
        const { minLat, maxLat, minLng, maxLng } = filter.geoBoundingBox;
        if (
          item.latitude < minLat ||
          item.latitude > maxLat ||
          item.longitude < minLng ||
          item.longitude > maxLng
        ) {
          return false;
        }
      }

      return true;
    });
  }

  public async clearAllMeasurements(): Promise<void> {
    if (this.isSqliteAvailable && this.db) {
      await this.db.executeSql('DELETE FROM measurements;');
    }
    await AsyncStorage.removeItem(ASYNC_STORAGE_FALLBACK_KEY);
  }

  private async getAllFromAsyncStorage(): Promise<MeasurementRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}

export const databaseService = new DatabaseService();
