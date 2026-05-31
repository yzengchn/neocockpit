export function getWebBaseUrl(): string {
  const configuredBaseUrl = String(import.meta.env.VITE_WEB_BASE_URL || '').trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const url = new URL(window.location.origin);
  if (url.port === '5174') {
    url.port = '5173';
  }
  return url.toString();
}

export function getWebHomeUrl(): string {
  return new URL('/', getWebBaseUrl()).toString();
}

export function getWebTaskDetailUrl(taskId: string): string {
  return new URL(`/tasks/${taskId}`, getWebBaseUrl()).toString();
}
