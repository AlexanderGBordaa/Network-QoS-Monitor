import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useQoSStore } from './src/store/useQoSStore';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SpeedTestScreen } from './src/screens/SpeedTestScreen';
import { CoverageMapScreen } from './src/screens/CoverageMapScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Tab = 'dashboard' | 'speed' | 'map' | 'history' | 'settings';

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const initStore = useQoSStore((state) => state.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen onNavigateToSpeedTest={() => setActiveTab('speed')} />;
      case 'speed':
        return <SpeedTestScreen />;
      case 'map':
        return <CoverageMapScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen onNavigateToSpeedTest={() => setActiveTab('speed')} />;
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Inicio', icon: '📶' },
    { id: 'speed', label: 'Velocidad', icon: '⚡' },
    { id: 'map', label: 'Mapa', icon: '🗺️' },
    { id: 'history', label: 'Historial', icon: '📜' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contentContainer}>{renderScreen()}</View>

      {/* Modern Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
});
