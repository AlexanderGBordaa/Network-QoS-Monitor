import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
  private channelId = 'network_qos_alerts';

  public async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: this.channelId,
        name: 'Alertas de Calidad de Red (QoS)',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
    }
  }

  public async notifyDegradation(title: string, body: string): Promise<void> {
    try {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: this.channelId,
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[NotificationService] Error displaying notification:', e);
    }
  }
}

export const notificationService = new NotificationService();
