/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_RESET_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
