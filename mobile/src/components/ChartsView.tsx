import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { MeasurementRecord } from '../types/qos';

interface Props {
  records: MeasurementRecord[];
}

export const ChartsView: React.FC<Props> = ({ records }) => {
  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = 160;
  const padding = 28;

  // Take the most recent 12 measurements in chronological order (left to right)
  const data = records.slice(0, 12).reverse();

  if (data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Se requieren al menos 2 mediciones en el historial para trazar series temporales.
        </Text>
      </View>
    );
  }

  // --- 1. Latency Series (RTT ms) ---
  const rttValues = data.map((d) => d.rttAvgMs || 0);
  const maxRtt = Math.max(...rttValues, 50);
  const rttPoints = data
    .map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (d.rttAvgMs / maxRtt) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // --- 2. Throughput Series (Download Mbps) ---
  const dlValues = data.map((d) => d.downloadMbps || 0);
  const maxDl = Math.max(...dlValues, 10);
  const dlPoints = data
    .map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (d.downloadMbps / maxDl) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.wrapper}>
      {/* Chart 1: Latency (RTT) */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Serie Temporal: Latencia RTT Promedio</Text>
          <Text style={styles.metricBadgeRtt}>ms</Text>
        </View>

        <Svg width={chartWidth} height={chartHeight}>
          {/* Background Grid */}
          <Line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#475569" strokeWidth={1} />

          {/* RTT Curve */}
          <Polyline points={rttPoints} fill="none" stroke="#38BDF8" strokeWidth={3} />

          {/* Data points */}
          {data.map((d, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
            const y = chartHeight - padding - (d.rttAvgMs / maxRtt) * (chartHeight - padding * 2);
            return (
              <Circle key={d.id} cx={x} cy={y} r={4} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1.5} />
            );
          })}

          {/* Axis Labels */}
          <SvgText x={padding} y={padding - 6} fill="#94A3B8" fontSize={10}>{Math.round(maxRtt)} ms</SvgText>
          <SvgText x={padding} y={chartHeight - padding + 16} fill="#94A3B8" fontSize={10}>0 ms</SvgText>
        </Svg>
      </View>

      {/* Chart 2: Throughput (Download Mbps) */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Serie Temporal: Throughput de Descarga</Text>
          <Text style={styles.metricBadgeSpeed}>Mbps</Text>
        </View>

        <Svg width={chartWidth} height={chartHeight}>
          {/* Background Grid */}
          <Line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#475569" strokeWidth={1} />

          {/* Speed Curve */}
          <Polyline points={dlPoints} fill="none" stroke="#10B981" strokeWidth={3} />

          {/* Data points */}
          {data.map((d, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
            const y = chartHeight - padding - (d.downloadMbps / maxDl) * (chartHeight - padding * 2);
            return (
              <Circle key={d.id} cx={x} cy={y} r={4} fill="#059669" stroke="#FFFFFF" strokeWidth={1.5} />
            );
          })}

          {/* Axis Labels */}
          <SvgText x={padding} y={padding - 6} fill="#94A3B8" fontSize={10}>{Math.round(maxDl)} Mbps</SvgText>
          <SvgText x={padding} y={chartHeight - padding + 16} fill="#94A3B8" fontSize={10}>0 Mbps</SvgText>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  metricBadgeRtt: {
    color: '#38BDF8',
    backgroundColor: '#0C4A6E',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricBadgeSpeed: {
    color: '#34D399',
    backgroundColor: '#064E3B',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyContainer: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
});
