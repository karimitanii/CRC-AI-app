const DEFAULT_MASTRA_BASE_URL = 'http://localhost:4111';
const DEFAULT_RUNTIME_URL = '/api/copilotkit';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'ClusterOps Assistant';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'clusterops_session';
export const CHAT_AGENT_ID = process.env.NEXT_PUBLIC_COPILOTKIT_AGENT ?? 'clusterops-agent';
export const COPILOT_RUNTIME_URL = process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ?? DEFAULT_RUNTIME_URL;
export const SESSION_USER = 'user1';

export function getMastraBaseUrl(): string {
  return process.env.MASTRA_BASE_URL ?? DEFAULT_MASTRA_BASE_URL;
}
