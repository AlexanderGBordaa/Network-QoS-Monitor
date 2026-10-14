import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQoSStore } from '../store/useQoSStore';
import { PingHostConfig } from '../types/qos';

export const SettingsScreen: React.FC = () => {
  const {
    backendUrl,
    setBackendUrl,
    pingHosts,
    addPingHost,
    removePingHost,
    backgroundIntervalMinutes,
    backgroundEnabled,
    setBackgroundSampling,
  } = useQoSStore();

  const [urlInput, setUrlInput] = useState(backendUrl);
  const [newHostName, setNewHostName] = useState('');
  const [newHostIp, setNewHostIp] = useState('');
  const [newHostPort, setNewHostPort] = useState('53');
  const [intervalInput, setIntervalInput] = useState(String(backgroundIntervalMinutes));

  const handleSaveBackend = () => {
    setBackendUrl(urlInput);
    Alert.alert('Configuración Guardada', 'La URL del backend de referencia ha sido actualizada.');
  };

  const handleAddHost = () => {
    if (!newHostName.trim() || !newHostIp.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa un nombre y un host/IP.');
      return;
    }

    const host: PingHostConfig = {
      id: `host_${Date.now()}`,
      name: newHostName.trim(),
      host: newHostIp.trim(),
      port: parseInt(newHostPort, 10) || 53,
      protocol: 'tcp',
    };

    addPingHost(host);
    setNewHostName('');
    setNewHostIp('');
    Alert.alert('Host Añadido', `El host ${host.name} fue agregado a las sondas de ping.`);
  };

  const handleSaveInterval = () => {
    const mins = parseInt(intervalInput, 10);
    if (isNaN(mins) || mins < 1) {
      Alert.alert('Valor inválido', 'El intervalo debe ser al menos de 1 minuto.');
      return;
    }
    setBackgroundSampling(backgroundEnabled, mins);
    Alert.alert('Intervalo Guardado', `Frecuencia establecida en ${mins} minutos.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configuración del Sistema QoS</Text>
      <Text style={styles.subtitle}>Parámetros de sondeo, backend y alertas</Text>

      {/* Backend Reference URL Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend de Referencia (Throughput)</Text>
        <Text style={styles.fieldDesc}>
          URL base del servicio Node.js / Docker donde se ejecutan los tests de bajada y subida.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://10.0.2.2:3000"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBackend}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Background Sampling Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Muestreo Periódico en Background</Text>
        <Text style={styles.fieldDesc}>
          Frecuencia con la que se ejecutan sondas en segundo plano para alertar degradaciones.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={intervalInput}
            onChangeText={setIntervalInput}
            placeholder="10"
            keyboardType="numeric"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInterval}>
            <Text style={styles.saveBtnText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ping Hosts List Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hosts Configurados para Sondas TCP</Text>
        <Text style={styles.fieldDesc}>Hosts contra los que se evalúa latencia RTT y Jitter RFC3550.</Text>

        {pingHosts.map((h) => (
          <View key={h.id} style={styles.hostRow}>
            <View>
              <Text style={styles.hostName}>{h.name}</Text>
              <Text style={styles.hostDetail}>
                {h.host}:{h.port} ({h.protocol.toUpperCase()})
              </Text>
            </View>
            {pingHosts.length > 1 && (
              <TouchableOpacity onPress={() => removePingHost(h.id)}>
                <Text style={styles.removeText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add Host Form */}
        <View style={styles.addHostBox}>
          <Text style={styles.addHostTitle}>Agregar Nuevo Host de Ping</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Nombre (ej. DNS Secundario)"
            placeholderTextColor="#64748B"
            value={newHostName}
            onChangeText={setNewHostName}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={[styles.formInput, { flex: 2 }]}
              placeholder="Host / IP (ej. 1.0.0.1)"
              placeholderTextColor="#64748B"
              value={newHostIp}
              onChangeText={setNewHostIp}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.formInput, { flex: 1 }]}
              placeholder="Puerto"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newHostPort}
              onChangeText={setNewHostPort}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddHost}>
            <Text style={styles.addBtnText}>+ Agregar Host</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Academic Information */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>Licenciatura en Sistemas de Información</Text>
        <Text style={styles.aboutText}>Programación Móvil - 2026</Text>
        <Text style={styles.aboutText}>TP 5: Network QoS Monitor</Text>
        <Text style={styles.aboutVersion}>Versión 1.0.0 | React Native CLI Native Engine</Text>
      </View>
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
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  fieldDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  hostName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  hostDetail: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  removeText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  addHostBox: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
  },
  addHostTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#F8FAFC',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addBtn: {
    backgroundColor: '#0EA5E9',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  aboutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  aboutTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  aboutText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  aboutVersion: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
  },
});
