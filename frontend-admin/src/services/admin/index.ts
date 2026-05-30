/**
 * Admin API — 管理端专用接口
 *
 * 所有请求自动附加 admin token（由 api.ts 拦截器根据 /api/admin/ 前缀判断）。
 * 后端对应路由均 require_admin 鉴权。
 *
 * 路由前缀：
 *   /api/admin/tasks/     — 任务管理
 *   /api/admin/providers/ — AI 提供商管理
 *   /api/admin/icons/     — 图标描述管理
 *   /api/admin/users/     — 用户管理
 *   /api/admin/downloads/ — 下载记录
 *   /api/admin/notifications/ — 通知发布管理
 */
import { api } from '@/services/api';
import type {
  UserAdmin,
  UserAdminUpdate,
  SignatureView,
  AIProviderConfig,
  AIProviderConfigCreate,
  AIProviderConfigUpdate,
  IconDescription,
  IconDescriptionCreate,
  IconDescriptionUpdate,
  CreditLogItem,
  CreditStats,
  CreditPrice,
  CreditPriceUpdate,
  CreditPriceCreate,
  ImageChannel,
  ImageChannelCreate,
  ImageChannelUpdate,
  NotificationItem,
  NotificationCreate,
  NotificationUpdate,
} from '@/types/task';

// ── 任务管理 ──────────────────────────────────────────────────────────────

export const adminTaskApi = {
  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/admin/tasks/${taskId}`);
  },
};

// ── AI 提供商管理 ──────────────────────────────────────────────────────────

export const adminProviderApi = {
  listAll: async (): Promise<AIProviderConfig[]> => {
    const res = await api.get<AIProviderConfig[]>('/admin/providers/');
    return res.data;
  },

  create: async (data: AIProviderConfigCreate): Promise<AIProviderConfig> => {
    const res = await api.post<AIProviderConfig>('/admin/providers/', data);
    return res.data;
  },

  update: async (id: string, data: AIProviderConfigUpdate): Promise<AIProviderConfig> => {
    const res = await api.put<AIProviderConfig>(`/admin/providers/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/providers/${id}`);
  },
};

// ── 图标描述管理 ──────────────────────────────────────────────────────────

export const adminIconApi = {
  listAll: async (): Promise<IconDescription[]> => {
    const res = await api.get<IconDescription[]>('/admin/icons/');
    return res.data;
  },

  create: async (data: IconDescriptionCreate): Promise<IconDescription> => {
    const res = await api.post<IconDescription>('/admin/icons/', data);
    return res.data;
  },

  update: async (id: string, data: IconDescriptionUpdate): Promise<IconDescription> => {
    const res = await api.put<IconDescription>(`/admin/icons/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/icons/${id}`);
  },
};

// ── 用户管理 ──────────────────────────────────────────────────────────────

export const adminUserApi = {
  listUsers: async (skip = 0, limit = 50): Promise<UserAdmin[]> => {
    const res = await api.get<UserAdmin[]>('/admin/users/list', { params: { skip, limit } });
    return res.data;
  },

  viewSignature: async (userId: string): Promise<SignatureView> => {
    const res = await api.get<SignatureView>(`/admin/users/${userId}/signature`);
    return res.data;
  },

  updateUser: async (userId: string, data: UserAdminUpdate): Promise<UserAdmin> => {
    const res = await api.put<UserAdmin>(`/admin/users/${userId}`, data);
    return res.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },

  recharge: async (userId: string, amount: number): Promise<UserAdmin> => {
    const res = await api.post<UserAdmin>(`/admin/users/${userId}/recharge`, { amount });
    return res.data;
  },
};


// ── 下载记录管理 ──────────────────────────────────────────────────────────

export const adminDownloadApi = {
  list: async (skip = 0, limit = 50, userId?: string, taskId?: string, action?: string): Promise<CreditLogItem[]> => {
    const res = await api.get<CreditLogItem[]>('/admin/downloads/list', {
      params: { skip, limit, ...(userId ? { user_id: userId } : {}), ...(taskId ? { task_id: taskId } : {}), ...(action ? { action } : {}) },
    });
    return res.data;
  },

  stats: async (): Promise<CreditStats> => {
    const res = await api.get<CreditStats>('/admin/downloads/stats');
    return res.data;
  },
};


// ── 积分单价管理 ──────────────────────────────────────────────────────────

export const adminCreditPriceApi = {
  list: async (): Promise<CreditPrice[]> => {
    const res = await api.get<CreditPrice[]>('/admin/credit-prices/');
    return res.data;
  },

  update: async (id: string, data: CreditPriceUpdate): Promise<CreditPrice> => {
    const res = await api.put<CreditPrice>(`/admin/credit-prices/${id}`, data);
    return res.data;
  },

  create: async (data: CreditPriceCreate): Promise<CreditPrice> => {
    const res = await api.post<CreditPrice>('/admin/credit-prices/', data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/credit-prices/${id}`);
  },
};


// ── 渠道管理 ──────────────────────────────────────────────────────────────

export const adminChannelApi = {
  listAll: async (provider?: string): Promise<ImageChannel[]> => {
    const res = await api.get<ImageChannel[]>('/admin/channels/', {
      params: { ...(provider ? { provider } : {}) },
    });
    return res.data;
  },

  create: async (data: ImageChannelCreate): Promise<ImageChannel> => {
    const res = await api.post<ImageChannel>('/admin/channels/', data);
    return res.data;
  },

  update: async (id: string, data: ImageChannelUpdate): Promise<ImageChannel> => {
    const res = await api.put<ImageChannel>(`/admin/channels/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/channels/${id}`);
  },
};


// ── 通知发布管理 ──────────────────────────────────────────────────────────

export const adminNotificationApi = {
  listAll: async (): Promise<NotificationItem[]> => {
    const res = await api.get<NotificationItem[]>('/admin/notifications/');
    return res.data;
  },

  create: async (data: NotificationCreate): Promise<NotificationItem> => {
    const res = await api.post<NotificationItem>('/admin/notifications/', data);
    return res.data;
  },

  update: async (id: string, data: NotificationUpdate): Promise<NotificationItem> => {
    const res = await api.put<NotificationItem>(`/admin/notifications/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/notifications/${id}`);
  },
};
