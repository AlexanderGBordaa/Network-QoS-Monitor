import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NetworkStateInfo } from '../types/qos';

interface Props {
  networkState: NetworkStateInfo;
}

export const MetricsCard: React.FC<Props> = ({ networkState }) => {
  const { type, isConnected, cellular, details } = networkState;

  const isCellular = type === 'cellular' || !!cellular?.networkType;
  const operator = cellular?.operatorName || details?.carrier || 'Red WiFi / Local';
  const generation = cellular?.generation || (type === 'wifi' ? 'WiFi' : type.toUpperCase());
  const signalDbm = cellular?.signalDbm ?? -70;
  const signalLevel = cellular?.signalLevel ?? 3;

  const getSignalColor = (level: number) => {
    switch (level) {
      case 4: return '#10B981'; // Green
      case 3: return '#3B82F6'; // Blue
      case 2: return '#F59E0B'; // Amber
      case 1: return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getSignalLabel = (level: number) => {
    switch (level) {
      case 4: return 'Excelente';
      case 3: return 'Buena';
      case 2: return 'Moderada';
      case 1: return 'Débil';
      default: return 'Sin Señal';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.generationBadge}>{generation}</Text>
        </View>
        <Text style={[styles.signalStatus, { color: getSignalColor(signalLevel) }]}>
          {getSignalLabel(signalLevel)}
        </Text>
      </View>

      <Text style={styles.operatorText}>{operator}</Text>
      <Text style={styles.techSubtitle}>
        {cellular?.networkType ? `Tecnología: ${cellular.networkType}` : `Conexión: ${type.toUpperCase()}`}
      </Text>

      {/* Signal Strength Meter */}
      <View style={styles.meterContainer}>
        <View style={styles.meterInfo}>
          <Text style={styles.meterLabel}>Potencia de Señal</Text>
          <Text style={styles.meterValue}>{signalDbm !== -999 ? `${signalDbm} dBm` : 'N/A'}</Text>
        </View>
        <View style={styles.barsRow}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              style={[
                styles.signalBar,
                { height: 8 + bar * 5 },
                bar <= signalLevel
                  ? { backgroundColor: getSignalColor(signalLevel) }
                  : { backgroundColor: '#374151' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Detailed RF cellular metrics if available */}
      {isCellular && cellular && (
        <View style={styles.gridDetails}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>RSRP</Text>
            <Text style={styles.gridVal}>{cellular.rsrp !== -999 ? `${cellular.rsrp} dBm` : '--'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>RSRQ</Text>
            <Text style={styles.gridVal}>{cellular.rsrq !== -999 ? `${cellular.rsrq} dB` : '--'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>SINR</Text>
            <Text style={styles.gridVal}>{cellular.sinr !== -999 ? `${cellular.sinr} dB` : '--'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>MCC / MNC</Text>
            <Text style={styles.gridVal}>{cellular.mcc ? `${cellular.mcc}-${cellular.mnc}` : '--'}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  generationBadge: {
    backgroundColor: '#0EA5E9',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  signalStatus: {
    fontWeight: '700',
    fontSize: 13,
  },
  operatorText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  techSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  meterContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  meterInfo: {
    flex: 1,
  },
  meterLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  meterValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  signalBar: {
    width: 6,
    borderRadius: 3,
  },
  gridDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  gridItem: {
    alignItems: 'center',
  },
  gridLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  gridVal: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
