import axios from 'axios';
import type {
  Task,
  TaskCreate,
  TaskStats,
  TaskType,
} from '@/types/task';
import { clearAdminToken, getAdminToken } from '@/services/adminToken';

export const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

const normalizeAdminBasePath = (value?: string): string => {
  const raw = String(value || '').trim();
  if (!raw || raw === '/' || raw === '.' || raw === './') {
    return '';
  }
  return `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const adminBasePath = normalizeAdminBasePath(window.__NEOCOCKPIT_ADMIN_BASE_PATH__)
  || normalizeAdminBasePath(import.meta.env.BASE_URL);
const adminLoginPath = adminBasePath ? `${adminBasePath}/login` : '/login';

const isInsideAdminApp = (pathname: string): boolean => {
  if (!adminBasePath) {
    return true;
  }
  return pathname === adminBasePath || pathname.startsWith(`${adminBasePath}/`);
};

// ── Token interceptor: attach admin token for all requests ────────────────
api.interceptors.request.use((config) => {
  const adminToken = getAdminToken();
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

// ── 401 interceptor: clear admin token ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminToken();
      if (isInsideAdminApp(window.location.pathname)) {
        window.location.href = adminLoginPath;
      }
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string }> => {
    const response = await api.post<{ token: string }>('/auth/login', { username, password });
    return response.data;
  },

  verify: async (token: string): Promise<boolean> => {
    const response = await api.get<{ valid: boolean }>('/auth/verify', {
      params: { token },
    });
    return response.data.valid;
  },
};

// ---------------------------------------------------------------------------
// Task API
// ---------------------------------------------------------------------------

export const taskApi = {
  createTask: async (data: TaskCreate): Promise<Task> => {
    const response = await api.post<Task>('/tasks/', data);
    return response.data;
  },

  listTasks: async (skip = 0, limit = 200, taskType?: TaskType): Promise<Task[]> => {
    const response = await api.get<Task[]>('/tasks/', {
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

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },

  retryTask: async (taskId: string): Promise<Task> => {
    const response = await api.post<Task>(`/tasks/${taskId}/retry`);
    return response.data;
  },
};
