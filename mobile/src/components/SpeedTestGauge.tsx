import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThroughputProgress, ThroughputResult } from '../types/qos';

interface Props {
  progress: ThroughputProgress;
  latestResult: ThroughputResult | null;
  isTesting: boolean;
}

export const SpeedTestGauge: React.FC<Props> = ({ progress, latestResult, isTesting }) => {
  const { phase, progressPercent, currentSpeedMbps } = progress;

  const isDownload = phase === 'download';
  const isUpload = phase === 'upload';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Test de Throughput (Ancho de Banda)</Text>

      {/* Main Speed Display */}
      <View style={styles.speedometerContainer}>
        <View style={styles.phaseIndicator}>
          <Text style={styles.phaseText}>
            {isTesting
              ? isDownload
                ? '⏬ DESCARGANDO...'
                : isUpload
                ? '⏫ SUBIENDO...'
                : 'PREPARANDO...'
              : latestResult
              ? '✅ ÚLTIMO TEST'
              : 'LISTO PARA MEDIR'}
          </Text>
        </View>

        <Text style={styles.mainSpeedNumber}>
          {isTesting
            ? currentSpeedMbps.toFixed(1)
            : latestResult
            ? latestResult.downloadMbps.toFixed(1)
            : '0.0'}
        </Text>
        <Text style={styles.unitText}>Mbps</Text>

        {/* Progress Bar */}
        {isTesting && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </View>

      {/* Summary Dual Metrics (Download & Upload) */}
      <View style={styles.dualMetrics}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Descarga</Text>
          <Text style={styles.metricValue}>
            {latestResult ? `${latestResult.downloadMbps.toFixed(1)} Mbps` : '--'}
          </Text>
          <Text style={styles.metricSub}>
            {latestResult ? `${(latestResult.downloadBytes / 1024 / 1024).toFixed(1)} MB` : ''}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Subida</Text>
          <Text style={styles.metricValue}>
            {latestResult ? `${latestResult.uploadMbps.toFixed(1)} Mbps` : '--'}
          </Text>
          <Text style={styles.metricSub}>
            {latestResult ? `${(latestResult.uploadBytes / 1024 / 1024).toFixed(1)} MB` : ''}
          </Text>
        </View>
      </View>
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
    alignItems: 'center',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  speedometerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    width: '100%',
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  phaseIndicator: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  phaseText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainSpeedNumber: {
    color: '#F8FAFC',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unitText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    marginTop: -4,
  },
  progressContainer: {
    width: '80%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0EA5E9',
  },
  dualMetrics: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#334155',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  metricSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
});
