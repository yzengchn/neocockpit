export const ADMIN_QUERY_KEYS = {
  tasks: ['tasks'],
  iconDescriptions: ['icon-descriptions'],
  aiProviders: ['ai-providers'],
  imageChannels: ['image-channels'],
  users: ['admin-users'],
  creditPrices: ['admin-credit-prices'],
  downloadList: ['admin-downloads'],
  downloads: (userId?: string, taskId?: string, action?: string) => [
    'admin-downloads',
    userId,
    taskId,
    action,
  ] as const,
  downloadStats: ['admin-download-stats'],
  notifications: ['admin-notifications'],
} as const;
