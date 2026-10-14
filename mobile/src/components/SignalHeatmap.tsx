import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Circle, Heatmap, PROVIDER_DEFAULT } from 'react-native-maps';
import { GeoLocation, MeasurementRecord } from '../types/qos';

interface Props {
  measurements: MeasurementRecord[];
  currentLocation: GeoLocation | null;
  mapType?: 'standard' | 'satellite' | 'terrain';
}

export const SignalHeatmap: React.FC<Props> = ({
  measurements,
  currentLocation,
  mapType = 'standard',
}) => {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = {
    latitude: currentLocation?.latitude ?? (measurements[0]?.latitude || -27.4514),
    longitude: currentLocation?.longitude ?? (measurements[0]?.longitude || -58.9866),
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Convert measurements to heatmap points weighted by signal quality (normalized 0 to 1)
  const heatmapPoints = measurements.map((m) => {
    // Convert -120..-50 dBm to 0.1..1.0 weight
    const weight = Math.min(1.0, Math.max(0.1, (m.signalDbm + 120) / 70));
    return {
      latitude: m.latitude,
      longitude: m.longitude,
      weight,
    };
  });

  const getMarkerColor = (signalDbm: number) => {
    if (signalDbm >= -80) return '#10B981'; // Good (Green)
    if (signalDbm >= -98) return '#F59E0B'; // Moderate (Amber)
    return '#EF4444'; // Poor (Red)
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Heatmap overlay if measurements exist */}
        {heatmapPoints.length >= 2 && (
          <Heatmap
            points={heatmapPoints}
            radius={40}
            opacity={0.65}
            gradient={{
              colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
              startPoints: [0.1, 0.4, 0.7, 1.0],
              colorMapSize: 256,
            }}
          />
        )}

        {/* Detailed Markers for each measurement point */}
        {measurements.map((m) => (
          <React.Fragment key={m.id}>
            <Circle
              center={{ latitude: m.latitude, longitude: m.longitude }}
              radius={Math.max(15, m.accuracy || 20)}
              fillColor={getMarkerColor(m.signalDbm) + '33'}
              strokeColor={getMarkerColor(m.signalDbm)}
              strokeWidth={1}
            />
            <Marker
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={`${m.generation} (${m.operator})`}
              description={`Señal: ${m.signalDbm} dBm | RTT: ${m.rttAvgMs} ms | Bajada: ${m.downloadMbps} Mbps`}
              pinColor={getMarkerColor(m.signalDbm)}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* QoS Quality Legend */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Calidad de Cobertura QoS</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Excelente (&gt; -80 dBm)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Aceptable (-80 a -98)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Débil (&lt; -98 dBm)</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  legendCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1E293BEE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  legendTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
});
