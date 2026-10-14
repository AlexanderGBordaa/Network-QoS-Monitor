import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQoSStore } from '../store/useQoSStore';
import { MetricsCard } from '../components/MetricsCard';
import { PingProbeCard } from '../components/PingProbeCard';

export const DashboardScreen: React.FC<{ onNavigateToSpeedTest: () => void }> = ({
  onNavigateToSpeedTest,
}) => {
  const {
    networkState,
    currentLocation,
    activePingStats,
    isPingTesting,
    runPingTest,
    runFullDiagnostic,
    backgroundEnabled,
    backgroundIntervalMinutes,
    setBackgroundSampling,
    history,
  } = useQoSStore();

  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  const handleQuickDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    try {
      const result = await runFullDiagnostic();
      if (result) {
        Alert.alert(
          'Diagnóstico Finalizado',
          `Medición registrada con éxito:\n\n• Red: ${result.generation} (${result.operator})\n• Señal: ${result.signalDbm} dBm\n• RTT: ${result.rttAvgMs} ms\n• Jitter: ${result.jitterMs} ms\n• Bajada: ${result.downloadMbps} Mbps\n• Coordenadas: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo completar el diagnóstico.');
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const latestRecord = history[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.appTitle}>Network QoS Monitor</Text>
          <Text style={styles.appSubtitle}>Análisis y Mapeo de Calidad de Red Móvil</Text>
        </View>
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsText}>
            {currentLocation ? `GPS: ±${Math.round(currentLocation.accuracy)}m` : 'Buscando GPS...'}
          </Text>
        </View>
      </View>

      {/* Primary Metrics Card */}
      <MetricsCard networkState={networkState} />

      {/* Quick Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, isDiagnosticRunning && styles.disabledButton]}
          onPress={handleQuickDiagnostic}
          disabled={isDiagnosticRunning}
        >
          {isDiagnosticRunning ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>⚡ Diagnóstico Completo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onNavigateToSpeedTest}>
          <Text style={styles.secondaryButtonText}>📊 Test Throughput</Text>
        </TouchableOpacity>
      </View>

      {/* Background Sampling Toggle Card */}
      <View style={styles.bgCard}>
        <View style={styles.bgInfo}>
          <Text style={styles.bgTitle}>Muestreo en Segundo Plano</Text>
          <Text style={styles.bgSubtitle}>
            Mide QoS cada {backgroundIntervalMinutes} min y alerta degradaciones severas
          </Text>
        </View>
        <Switch
          value={backgroundEnabled}
          onValueChange={(val) => setBackgroundSampling(val, backgroundIntervalMinutes)}
          trackColor={{ false: '#334155', true: '#0EA5E9' }}
          thumbColor={backgroundEnabled ? '#FFFFFF' : '#94A3B8'}
        />
      </View>

      {/* Latency Probes Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sondas de Latencia TCP</Text>
        <TouchableOpacity
          onPress={() => runPingTest()}
          disabled={isPingTesting}
          style={styles.refreshPingsBtn}
        >
          {isPingTesting ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Text style={styles.refreshPingsText}>Actualizar</Text>
          )}
        </TouchableOpacity>
      </View>
      <PingProbeCard pingStats={activePingStats} isRunning={isPingTesting} />

      {/* Latest Measurement Summary */}
      {latestRecord && (
        <View style={styles.latestCard}>
          <Text style={styles.latestHeader}>Última Medición Registrada</Text>
          <View style={styles.latestGrid}>
            <View style={styles.latestItem}>
              <Text style={styles.latestLabel}>Fecha</Text>
              <Text style={styles.latestVal}>
                {new Date(latestRecord.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.latestItem}>
              <Text style={styles.latestLabel}>Latencia RTT</Text>
              <Text style={styles.latestVal}>{latestRecord.rttAvgMs} ms</Text>
            </View>
            <View style={styles.latestItem}>
              <Text style={styles.latestLabel}>Jitter</Text>
              <Text style={styles.latestVal}>{latestRecord.jitterMs} ms</Text>
            </View>
            <View style={styles.latestItem}>
              <Text style={styles.latestLabel}>Throughput</Text>
              <Text style={styles.latestVal}>{latestRecord.downloadMbps} Mbps</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  appTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  gpsBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gpsText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
  bgCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bgInfo: {
    flex: 1,
    marginRight: 10,
  },
  bgTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  bgSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  refreshPingsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshPingsText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  latestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  latestHeader: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  latestGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  latestItem: {
    alignItems: 'center',
  },
  latestLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  latestVal: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
});
