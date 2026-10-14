import { MeasurementRecord } from '../types/qos';
import { Share, Alert } from 'react-native';

class ExportService {
  /**
   * Generates a CSV string representation of measurement records
   */
  public generateCsv(records: MeasurementRecord[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'Date_ISO',
      'Network_Type',
      'Generation',
      'Operator',
      'Signal_dBm',
      'Signal_Level_0_4',
      'RTT_Avg_ms',
      'RTT_Min_ms',
      'RTT_Max_ms',
      'Jitter_ms',
      'Packet_Loss_Percent',
      'Download_Mbps',
      'Upload_Mbps',
      'Latitude',
      'Longitude',
      'Accuracy_meters',
      'Is_Background',
      'Notes',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      r.timestamp,
      `"${new Date(r.timestamp).toISOString()}"`,
      `"${r.networkType}"`,
      `"${r.generation}"`,
      `"${r.operator}"`,
      r.signalDbm,
      r.signalLevel,
      r.rttAvgMs,
      r.rttMinMs,
      r.rttMaxMs,
      r.jitterMs,
      r.packetLossPercent,
      r.downloadMbps,
      r.uploadMbps,
      r.latitude,
      r.longitude,
      r.accuracy,
      r.isBackground ? 1 : 0,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Generates a formatted JSON string representation
   */
  public generateJson(records: MeasurementRecord[]): string {
    const exportData = {
      exportTimestamp: Date.now(),
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      measurements: records,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Shares or copies export data to system share sheet or clipboard
   */
  public async shareExport(format: 'csv' | 'json', records: MeasurementRecord[]): Promise<void> {
    if (records.length === 0) {
      Alert.alert('Exportar', 'No hay registros en el historial para exportar.');
      return;
    }

    const content = format === 'csv' ? this.generateCsv(records) : this.generateJson(records);

    try {
      await Share.share({
        title: `Exportación QoS (${format.toUpperCase()})`,
        message: content,
      });
    } catch {
      // Fallback
      Alert.alert('Exportación Lista', `Se han generado ${records.length} registros en formato ${format.toUpperCase()}.`);
    }
  }
}

export const exportService = new ExportService();
