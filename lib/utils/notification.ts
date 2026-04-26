import type { NotificationSettings } from '@/types/app';

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: 'cleanmate', icon: icon ?? '/icons/icon-192.png' });
  } catch {
    // ignore
  }
}

export function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quiet_hours_enabled) return false;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = settings.quiet_hours_start.split(':').map(Number);
  const [eH, eM] = settings.quiet_hours_end.split(':').map(Number);
  const start = sH * 60 + sM;
  const end = eH * 60 + eM;
  if (start < end) return currentMin >= start && currentMin < end;
  // crosses midnight
  return currentMin >= start || currentMin < end;
}

export function shouldNotify(settings: NotificationSettings, channel: keyof NotificationSettings): boolean {
  if (!settings.enabled) return false;
  if (isInQuietHours(settings)) return false;
  return Boolean(settings[channel]);
}
