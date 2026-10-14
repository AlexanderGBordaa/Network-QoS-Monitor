import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQoSStore } from '../store/useQoSStore';
import { ChartsView } from '../components/ChartsView';
import { exportService } from '../services/exportService';
import { MeasurementRecord } from '../types/qos';

export const HistoryScreen: React.FC = () => {
  const { filteredHistory, filter, setFilter, clearHistory } = useQoSStore();
  const [showCharts, setShowCharts] = useState(false);

  const filterOptions = ['ALL', '5G', '4G', '3G', 'WiFi'];

  const handleExportCsv = async () => {
    await exportService.shareExport('csv', filteredHistory);
  };

  const handleExportJson = async () => {
    await exportService.shareExport('json', filteredHistory);
  };

  const handleConfirmClear = () => {
    Alert.alert(
      'Borrar Historial',
      '¿Estás seguro de que deseas eliminar todas las mediciones almacenadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const renderItem = ({ item }: { item: MeasurementRecord }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <Text style={styles.genBadge}>{item.generation}</Text>
          <Text style={styles.operatorText}>{item.operator}</Text>
          {item.isBackground && <Text style={styles.bgBadge}>BG</Text>}
        </View>
        <Text style={styles.timestampText}>
          {new Date(item.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>RTT / Jitter</Text>
          <Text style={styles.statVal}>
            {item.rttAvgMs} ms <Text style={styles.subVal}>({item.jitterMs}j)</Text>
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Bajada / Subida</Text>
          <Text style={styles.statVal}>
            {item.downloadMbps > 0 ? `${item.downloadMbps} / ${item.uploadMbps}` : '--'}
            <Text style={styles.subVal}> Mbps</Text>
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Señal</Text>
          <Text style={[styles.statVal, { color: item.signalDbm > -85 ? '#10B981' : '#F59E0B' }]}>
            {item.signalDbm} dBm
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.geoText}>
          📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} (±{Math.round(item.accuracy)}m)
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Filter and Controls Bar */}
      <View style={styles.controlsBar}>
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
                  styles.filterText,
                  (filter.networkType || 'ALL') === opt && styles.filterTextActive,
                ]}
              >
                {opt === 'ALL' ? 'Todos' : opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, showCharts && styles.toggleBtnActive]}
            onPress={() => setShowCharts(!showCharts)}
          >
            <Text style={styles.toggleBtnText}>
              {showCharts ? '📋 Ver Listado' : '📈 Ver Gráficos'}
            </Text>
          </TouchableOpacity>

          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportJson}>
              <Text style={styles.exportBtnText}>JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content: Charts or FlatList */}
      {showCharts ? (
        <View style={{ paddingHorizontal: 16 }}>
          <ChartsView records={filteredHistory} />
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay mediciones registradas con este filtro.</Text>
            </View>
          }
          ListFooterComponent={
            filteredHistory.length > 0 ? (
              <TouchableOpacity style={styles.clearBtn} onPress={handleConfirmClear}>
                <Text style={styles.clearBtnText}>🗑️ Borrar Historial</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  controlsBar: {
    padding: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
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
  filterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#0284C7',
  },
  toggleBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  exportBtn: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genBadge: {
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bgBadge: {
    backgroundColor: '#475569',
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  operatorText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  timestampText: {
    color: '#64748B',
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  subVal: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '400',
  },
  cardFooter: {
    marginTop: 4,
  },
  geoText: {
    color: '#64748B',
    fontSize: 11,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
