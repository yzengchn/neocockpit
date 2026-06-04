import axios from 'axios';
import type {
  Task,
  TaskActionResult,
  TaskListItem,
  MyTaskListItem,
  TaskCreate,
  TaskStats,
  TaskType,
  QueueStatus,
  OnlineResponse,
  IconDescription,
  AIProviderConfig,
  BuildTree,
  InkSignature,
  UserInfo,
  AuthTokenResponse,
  NotificationListResponse,
  TaskComment,
  TaskCommentCreate,
  TaskCommentListResponse,
  FeedbackCreate,
  FeedbackSubmitResponse,
} from '@/types/task';

const USER_TOKEN_KEY = 'aigc_user_token';
const USER_INFO_KEY = 'aigc_user_info';
const USER_SIGNATURE_KEY = 'aigc_user_signature';
const LAST_NICKNAME_KEY = 'aigc_last_nickname';

interface DownloadTicketResponse {
  url: string;
  expires_at: string;
  ttl_seconds: number;
  credits_cost: number;
  charged: boolean;
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

// ── Token interceptor: attach user token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const userToken = localStorage.getItem(USER_TOKEN_KEY);
  if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }
  return config;
});

// ── 401 interceptor: clear user token ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(USER_TOKEN_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(USER_SIGNATURE_KEY);
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Task API
// ---------------------------------------------------------------------------

export const taskApi = {
  createTask: async (data: TaskCreate): Promise<TaskActionResult> => {
    const response = await api.post<TaskActionResult>('/tasks/', data);
    return response.data;
  },

  listTasks: async (skip = 0, limit = 200, taskType?: TaskType): Promise<TaskListItem[]> => {
    const response = await api.get<TaskListItem[]>('/tasks/', {
      params: { skip, limit, ...(taskType ? { task_type: taskType } : {}) },
    });
    return response.data;
  },

  getTaskStats: async (): Promise<TaskStats> => {
    const response = await api.get<TaskStats>('/tasks/stats/summary');
    return response.data;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${taskId}`);
    return response.data;
  },

  recordTaskView: async (taskId: string): Promise<{ task_id: string; views: number }> => {
    const response = await api.post<{ task_id: string; views: number }>(`/tasks/${taskId}/view`);
    return response.data;
  },

  getQueueStatus: async (): Promise<QueueStatus> => {
    const response = await api.get<QueueStatus>('/tasks/queue/status');
    return response.data;
  },

  likeTask: async (taskId: string): Promise<{ liked: boolean }> => {
    const response = await api.post<{ liked: boolean }>(`/tasks/${taskId}/like`);
    return response.data;
  },

  listLikeRankingTasks: async (skip = 0, limit = 12): Promise<TaskListItem[]> => {
    const response = await api.get<TaskListItem[]>('/tasks/likeranking', { params: { skip, limit } });
    return response.data;
  },

  listViewRankingTasks: async (skip = 0, limit = 12): Promise<TaskListItem[]> => {
    const response = await api.get<TaskListItem[]>('/tasks/viewranking', { params: { skip, limit } });
    return response.data;
  },

  retryTask: async (taskId: string): Promise<TaskActionResult> => {
    const response = await api.post<TaskActionResult>(`/tasks/${taskId}/retry`);
    return response.data;
  },

  listMyLikedTaskIds: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/tasks/likes/mine');
    return response.data;
  },

  listMyTasks: async (skip = 0, limit = 6): Promise<{ items: MyTaskListItem[]; total: number }> => {
    const response = await api.get<{ items: MyTaskListItem[]; total: number }>('/user/tasks', { params: { skip, limit } });
    return response.data;
  },

  deleteMyTask: async (taskId: string): Promise<{ detail: string }> => {
    const response = await api.delete<{ detail: string }>(`/tasks/${taskId}`);
    return response.data;
  },

  downloadZip: async (taskId: string): Promise<DownloadTicketResponse> => {
    const response = await api.post<DownloadTicketResponse>(`/resource/${taskId}/download`);
    const link = document.createElement('a');
    link.href = response.data.url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return response.data;
  },

  getFileTree: async (taskId: string): Promise<BuildTree> => {
    const response = await api.get<BuildTree>(`/tasks/${taskId}/file-tree`);
    return response.data;
  },

  downloadPackage: async (taskId: string): Promise<string> => {
    const response = await api.post<DownloadTicketResponse>(`/resource/${taskId}/download`);
    return response.data.url;
  },

  listComments: async (
    taskId: string,
    skip = 0,
    limit = 50,
    includeMyReviewing = false,
  ): Promise<TaskCommentListResponse> => {
    const response = await api.get<TaskCommentListResponse>(`/tasks/${taskId}/comments/`, {
      params: { skip, limit, include_my_reviewing: includeMyReviewing },
    });
    return response.data;
  },

  createComment: async (taskId: string, data: TaskCommentCreate): Promise<TaskComment> => {
    const response = await api.post<TaskComment>(`/tasks/${taskId}/comments/`, data);
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Presence API
// ---------------------------------------------------------------------------

export const presenceApi = {
  register: async (): Promise<void> => {
    await api.post('/presence/register');
  },

  heartbeat: async (): Promise<void> => {
    await api.post('/presence/heartbeat');
  },

  unregister: async (): Promise<void> => {
    await api.delete('/presence/unregister');
  },

  getOnline: async (): Promise<OnlineResponse> => {
    const response = await api.get<OnlineResponse>('/presence/online');
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Icon description API (read-only for web)
// ---------------------------------------------------------------------------

export const iconDescriptionApi = {
  list: async (): Promise<IconDescription[]> => {
    const response = await api.get<IconDescription[]>('/icon-descriptions/');
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// AI Provider config API (read-only for web)
// ---------------------------------------------------------------------------

export const aiProviderApi = {
  list: async (): Promise<AIProviderConfig[]> => {
    const response = await api.get<AIProviderConfig[]>('/ai-providers/');
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Feedback API
// ---------------------------------------------------------------------------

export const feedbackApi = {
  submit: async (data: FeedbackCreate): Promise<FeedbackSubmitResponse> => {
    const response = await api.post<FeedbackSubmitResponse>('/feedback/', data);
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// User / Pen-auth API
// ---------------------------------------------------------------------------

export const userApi = {
  register: async (
    nickName: string,
    signature: InkSignature,
  ): Promise<AuthTokenResponse> => {
    const response = await api.post<AuthTokenResponse>('/user/register', {
      nick_name: nickName,
      signature,
    });
    return response.data;
  },

  login: async (nickName: string, signature: InkSignature): Promise<AuthTokenResponse> => {
    const response = await api.post<AuthTokenResponse>('/user/login', {
      nick_name: nickName,
      signature,
    });
    return response.data;
  },

  verify: async (): Promise<UserInfo> => {
    const response = await api.get<UserInfo>('/user/verify');
    return response.data;
  },

  checkNickname: async (nickName: string): Promise<boolean> => {
    try {
      const response = await api.get('/user/check-nickname', { params: { nick_name: nickName } });
      return response.data.available === true;
    } catch (e: any) {
      if (e?.response?.status === 409) return false;
      throw e;
    }
  },

  getCredits: async (): Promise<{ credits: number; prices: Array<{ action: string; price: number; label: string }> }> => {
    const res = await api.get('/user/credits');
    return res.data;
  },

  getCreditHistory: async (skip = 0, limit = 8): Promise<{ items: Array<{
    id: string; action: string; target_id: string | null;
    credits_cost: number; created_at: string | null;
  }>; total: number }> => {
    const res = await api.get<{ items: Array<{
      id: string; action: string; target_id: string | null;
      credits_cost: number; created_at: string | null;
    }>; total: number }>('/user/credit-history', { params: { skip, limit } });
    return res.data;
  },

  checkIn: async (): Promise<{ success: boolean; credits_earned: number; credits_after: number; check_date: string }> => {
    const res = await api.post('/user/check-in');
    return res.data;
  },

  getCheckInStatus: async (): Promise<{ today_checked: boolean; streak: number; checked_dates: string[]; month: string }> => {
    const res = await api.get('/user/check-in/status');
    return res.data;
  },

  getSignatureHint: async (nickName: string): Promise<{ anchors: Array<{ x: number; y: number }> | null }> => {
    const res = await api.get('/user/signature-hint', { params: { nick_name: nickName } });
    return res.data;
  },

  getCreditPrices: async (): Promise<Array<{ action: string; price: number }>> => {
    const res = await api.get('/user/credit-prices');
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Notification API
// ---------------------------------------------------------------------------

export const notificationApi = {
  list: async (): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>('/notifications/');
    return response.data;
  },

  markRead: async (notificationId: string): Promise<void> => {
    await api.post(`/notifications/${notificationId}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};

// ---------------------------------------------------------------------------
// User auth helpers
// ---------------------------------------------------------------------------

export function getUserToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function getUserInfo(): UserInfo | null {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserAuth(token: string, user: UserInfo, signature?: InkSignature): void {
  localStorage.setItem(USER_TOKEN_KEY, token);
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  if (signature) {
    localStorage.setItem(USER_SIGNATURE_KEY, JSON.stringify(signature));
  }
  // Persist last nickname so it survives logout
  if (user.nick_name) {
    localStorage.setItem(LAST_NICKNAME_KEY, user.nick_name);
  }
  window.dispatchEvent(new CustomEvent('aigc-auth-change'));
}

export function clearUserAuth(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(USER_SIGNATURE_KEY);
  window.dispatchEvent(new CustomEvent('aigc-auth-change'));
}

export function isUserLoggedIn(): boolean {
  return !!localStorage.getItem(USER_TOKEN_KEY);
}

export function getLastNickname(): string {
  try {
    return localStorage.getItem(LAST_NICKNAME_KEY) || '';
  } catch {
    return '';
  }
}

export function getStoredSignature(): InkSignature | null {
  try {
    const raw = localStorage.getItem(USER_SIGNATURE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
