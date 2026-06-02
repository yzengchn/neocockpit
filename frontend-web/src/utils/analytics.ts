const BAIDU_TONGJI_ID = import.meta.env.VITE_BAIDU_TONGJI_ID?.trim();

type BaiduTongjiCommand = [string, ...Array<string | number | boolean | undefined>];

declare global {
  interface Window {
    _hmt?: BaiduTongjiCommand[];
  }
}

let initialized = false;
let lastTrackedPath = '';

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const normalizePagePath = (path: string) => {
  const normalizedPath = path.trim() || '/';
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

export const initBaiduTongji = () => {
  if (!canUseDOM() || !BAIDU_TONGJI_ID || initialized) {
    return;
  }

  initialized = true;
  window._hmt = window._hmt || [];

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-baidu-tongji-id="${BAIDU_TONGJI_ID}"]`,
  );

  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://hm.baidu.com/hm.js?${encodeURIComponent(BAIDU_TONGJI_ID)}`;
  script.dataset.baiduTongjiId = BAIDU_TONGJI_ID;

  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
};

export const trackBaiduTongjiPageView = (path: string) => {
  if (!canUseDOM() || !BAIDU_TONGJI_ID) {
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
