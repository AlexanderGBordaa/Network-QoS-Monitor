import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useQoSStore } from '../store/useQoSStore';
import { SpeedTestGauge } from '../components/SpeedTestGauge';
import { PingProbeCard } from '../components/PingProbeCard';

export const SpeedTestScreen: React.FC = () => {
  const {
    backendUrl,
    setBackendUrl,
    throughputProgress,
    latestThroughputResult,
    isThroughputTesting,
    activePingStats,
    isPingTesting,
    cancelActiveTests,
    runFullDiagnostic,
  } = useQoSStore();

  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  const isTesting = isThroughputTesting || isPingTesting;

  const handleStartFullTest = async () => {
    try {
      const record = await runFullDiagnostic();
      if (record) {
        Alert.alert(
          'Test Completado',
          `Resultado guardado:\nDescarga: ${record.downloadMbps} Mbps\nSubida: ${record.uploadMbps} Mbps\nRTT: ${record.rttAvgMs} ms\nJitter: ${record.jitterMs} ms`
        );
      }
    } catch (err: any) {
      Alert.alert('Error en el Test', err.message || 'Verifica que el backend esté encendido.');
    }
  };

  const handleSaveUrl = () => {
    setBackendUrl(inputUrl);
    setIsEditingUrl(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Test de Rendimiento & Throughput</Text>
      <Text style={styles.screenSubtitle}>
        Medición de latencia TCP, jitter y ancho de banda contra el backend de referencia
      </Text>

      {/* Backend Target Config */}
      <View style={styles.serverCard}>
        <View style={styles.serverRow}>
          <View style={styles.serverInfo}>
            <Text style={styles.serverLabel}>Servidor de Referencia:</Text>
            {isEditingUrl ? (
              <TextInput
                style={styles.urlInput}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://10.0.2.2:3000"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.serverValue}>{backendUrl}</Text>
            )}
          </View>

          {isEditingUrl ? (
            <TouchableOpacity style={styles.editBtn} onPress={handleSaveUrl}>
              <Text style={styles.editBtnText}>Guardar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingUrl(true)}>
              <Text style={styles.editBtnText}>Cambiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Speedometer Gauge Component */}
      <SpeedTestGauge
        progress={throughputProgress}
        latestResult={latestThroughputResult}
        isTesting={isThroughputTesting}
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isTesting ? (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelActiveTests}>
            <Text style={styles.cancelButtonText}>⏹ Detener Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={handleStartFullTest}>
            <Text style={styles.startButtonText}>🚀 INICIAR TEST COMPLETO</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Multi-Host Ping Probes */}
      <PingProbeCard pingStats={activePingStats} isRunning={isPingTesting} />
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
  screenTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  screenSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  serverCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  serverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverInfo: {
    flex: 1,
    marginRight: 10,
  },
  serverLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  serverValue: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  urlInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  editBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonContainer: {
    marginVertical: 12,
  },
  startButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
