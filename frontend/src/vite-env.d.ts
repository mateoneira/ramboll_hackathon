/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODE?: 'internal' | 'external'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
