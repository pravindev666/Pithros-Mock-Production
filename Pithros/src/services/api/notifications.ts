/**
 * In-app notifications client.
 *
 * There is no email or push delivery yet — these records are the notification
 * system, and each one belongs to exactly one user.
 */

import { http } from './client';
import type { NotificationItem } from '../../types';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  notifications: AppNotification[];
  unreadCount: number;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

function kindOf(type: string): NotificationItem['type'] {
  if (type === 'tribute_pending') return 'tribute';
  if (
    type === 'provider_lead_received' ||
    type === 'lead_status_updated' ||
    type.startsWith('provider_')
  ) {
    return 'lead';
  }
  if (type.startsWith('verification_')) return 'verification';
  return 'contribution';
}

/** The shape the legacy facade (`api.getNotifications`) always returned. */
export function toLegacyNotificationItem(item: AppNotification): NotificationItem {
  return {
    id: item.id,
    type: kindOf(item.type),
    title: item.title,
    message: item.body,
    timeAgo: relativeTime(item.createdAt),
    isRead: item.readAt !== null,
  };
}

export const notificationsApi = {
  async list(): Promise<NotificationList> {
    return http.get<NotificationList>('/me/notifications');
  },

  async markRead(id: string): Promise<AppNotification> {
    return http.post<AppNotification>(`/me/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<{ updated: number }> {
    return http.post<{ updated: number }>('/me/notifications/read-all', {});
  },
};
