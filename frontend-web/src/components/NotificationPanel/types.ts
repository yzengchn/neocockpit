import type { UserNotification } from '@/types/task';

export interface NotificationPanelProps {
  items: UserNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (item: UserNotification) => void;
  onMarkAllRead: () => void;
  onOpenLink: (item: UserNotification) => void;
}
