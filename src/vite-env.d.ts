/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full API endpoint URL, e.g. https://skills.lc/api/v1/skills/search */
  readonly VITE_SKILLS_API_URL: string
  /** API Key for authentication (sk_live_xxxxx) */
  readonly VITE_SKILLS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
