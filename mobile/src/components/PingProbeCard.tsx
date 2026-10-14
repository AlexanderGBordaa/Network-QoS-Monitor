import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HostPingStats } from '../types/qos';

interface Props {
  pingStats: HostPingStats[];
  isRunning: boolean;
}

export const PingProbeCard: React.FC<Props> = ({ pingStats, isRunning }) => {
  const getJitterColor = (jitter: number) => {
    if (jitter <= 10) return '#10B981'; // Green
    if (jitter <= 30) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getLatencyColor = (rtt: number) => {
    if (rtt <= 45) return '#10B981';
    if (rtt <= 100) return '#3B82F6';
    if (rtt <= 200) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sondas de Latencia Multi-Host (RTT & Jitter)</Text>
        {isRunning && <Text style={styles.runningBadge}>Midiendo...</Text>}
      </View>

      {pingStats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Presione "Iniciar Test de Ping" para evaluar los hosts.</Text>
        </View>
      ) : (
        pingStats.map((item) => (
          <View key={item.hostId} style={styles.hostCard}>
            <View style={styles.hostHeader}>
              <View>
                <Text style={styles.hostName}>{item.hostName}</Text>
                <Text style={styles.hostIp}>{item.host}</Text>
              </View>
              <View style={styles.lossBadge}>
                <Text style={[styles.lossText, item.packetLossPercent > 0 ? { color: '#EF4444' } : { color: '#10B981' }]}>
                  {item.packetLossPercent}% pérdida
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Promedio (RTT)</Text>
                <Text style={[styles.statValue, { color: getLatencyColor(item.avgRttMs) }]}>
                  {item.avgRttMs > 0 ? `${item.avgRttMs} ms` : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Min / Max</Text>
                <Text style={styles.statValueSec}>
                  {item.minRttMs > 0 ? `${item.minRttMs} / ${item.maxRttMs} ms` : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Jitter RFC3550</Text>
                <Text style={[styles.statValue, { color: getJitterColor(item.jitterMs) }]}>
                  {item.samples.length > 0 ? `${item.jitterMs} ms` : '--'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  runningBadge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#0369A1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  hostCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
    marginBottom: 8,
  },
  hostName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  hostIp: {
    color: '#64748B',
    fontSize: 12,
  },
  lossBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lossText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statValueSec: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
});
