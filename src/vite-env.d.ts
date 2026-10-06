/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID?: string
  readonly VITE_HUB_REPO?: string
  readonly VITE_AUTH_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
