import axios from 'axios';

interface ApiErrorBody {
  detail?: unknown;
  message?: unknown;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('zh-CN');
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  const message = error.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
