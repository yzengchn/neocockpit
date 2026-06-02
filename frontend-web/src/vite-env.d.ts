/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BAIDU_TONGJI_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
