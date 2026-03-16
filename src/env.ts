/**
 * Cloudflare Workers environment bindings.
 * These are injected at runtime by the Workers platform.
 */
export interface Env {
  GEMINI_API_KEY: string;
  USE_MOCK_LLM?: string;
  ACTOR_KIT_HOST: string;
  ACTOR_KIT_SECRET: string;
  SESSION_JWT_SECRET: string;
  [key: string]: unknown;
}
