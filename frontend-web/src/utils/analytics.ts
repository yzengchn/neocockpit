type BaiduTongjiCommand = [string, ...Array<string | number | boolean | undefined>];

declare global {
  interface Window {
    _hmt?: BaiduTongjiCommand[];
  }
}

let initialized = false;
let lastTrackedPath = '';

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const getBaiduTongjiId = () => {
  return (import.meta.env.VITE_BAIDU_TONGJI_ID || '').trim();
};

const normalizePagePath = (path: string) => {
  const normalizedPath = path.trim() || '/';
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

export const initBaiduTongji = () => {
  const baiduTongjiId = getBaiduTongjiId();
  if (!canUseDOM() || !baiduTongjiId || initialized) {
    return;
  }

  initialized = true;
  window._hmt = window._hmt || [];

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-baidu-tongji-id="${baiduTongjiId}"]`,
  );

  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://hm.baidu.com/hm.js?${encodeURIComponent(baiduTongjiId)}`;
  script.dataset.baiduTongjiId = baiduTongjiId;

  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
};

export const trackBaiduTongjiPageView = (path: string) => {
  if (!canUseDOM() || !getBaiduTongjiId()) {
    return;
  }

  const pagePath = normalizePagePath(path);
  if (pagePath === lastTrackedPath) {
    return;
  }

  lastTrackedPath = pagePath;
  window._hmt = window._hmt || [];
  window._hmt.push(['_trackPageview', pagePath]);
};
