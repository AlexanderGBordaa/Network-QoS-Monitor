import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQoSStore } from '../store/useQoSStore';
import { SignalHeatmap } from '../components/SignalHeatmap';

export const CoverageMapScreen: React.FC = () => {
  const { filteredHistory, currentLocation, filter, setFilter } = useQoSStore();
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const filterOptions = ['ALL', '5G', '4G', 'WiFi'];

  const avgSignal =
    filteredHistory.length > 0
      ? Math.round(
          filteredHistory.reduce((acc, curr) => acc + curr.signalDbm, 0) /
            filteredHistory.length
        )
      : null;

  return (
    <View style={styles.container}>
      {/* Top Floating Control Bar */}
      <View style={styles.topBar}>
        <View style={styles.filterRow}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.filterChip,
                (filter.networkType || 'ALL') === opt && styles.filterChipActive,
              ]}
              onPress={() => setFilter({ networkType: opt })}
            >
              <Text
                style={[
                  styles.filterChipText,
                  (filter.networkType || 'ALL') === opt && styles.filterChipTextActive,
                ]}
              >
                {opt === 'ALL' ? 'Todos' : opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.statsText}>
            Puntos: <Text style={styles.statsVal}>{filteredHistory.length}</Text>
          </Text>
          {avgSignal !== null && (
            <Text style={styles.statsText}>
              Señal Promedio: <Text style={styles.statsVal}>{avgSignal} dBm</Text>
            </Text>
          )}

          <TouchableOpacity
            style={styles.mapTypeBtn}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
          >
            <Text style={styles.mapTypeBtnText}>
              {mapType === 'standard' ? '🗺️ Satélite' : '🛰️ Normal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fullscreen Map with Heatmap and Markers */}
      <SignalHeatmap
        measurements={filteredHistory}
        currentLocation={currentLocation}
        mapType={mapType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#1E293BEE',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 6,
  },
  statsText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statsVal: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  mapTypeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mapTypeBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
});
