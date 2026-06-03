import type { UserNotification, NotificationListResponse } from '@/types/task';

export const notificationAccent: Record<UserNotification['level'], string> = {
  info: '#22c55e',
  warning: '#f59e0b',
  error: '#f87171',
};

export const formatNotificationTime = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getNotificationTimestamp = (item: UserNotification): number => {
  const timestamp = item.created_at ? new Date(item.created_at).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const mergeNotificationsWithLocalRead = (
  items: UserNotification[],
  locallyReadItems: UserNotification[],
): UserNotification[] => {
  const byId = new Map<string, UserNotification>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  for (const item of locallyReadItems) {
    const current = byId.get(item.id);
    byId.set(item.id, {
      ...(current ?? item),
      is_read: true,
    });
  }
  return Array.from(byId.values()).sort(
    (a, b) => getNotificationTimestamp(b) - getNotificationTimestamp(a),
  );
};

export const upsertReadNotifications = (
  current: UserNotification[],
  nextItems: UserNotification[],
): UserNotification[] =>
  mergeNotificationsWithLocalRead(current, nextItems.map(item => ({ ...item, is_read: true })));

export const markNotificationsReadInCache = (
  data: NotificationListResponse | undefined,
  ids: Set<string>,
): NotificationListResponse | undefined => {
  if (!data) return data;
  let newlyReadCount = 0;
  const items = data.items.map((item) => {
    if (!ids.has(item.id)) return item;
    if (!item.is_read) newlyReadCount += 1;
    return { ...item, is_read: true };
  });
  return {
    ...data,
    items,
    unread_count: Math.max(0, data.unread_count - newlyReadCount),
  };
};
