import { CHAT_AGENT_ID, SESSION_USER, getMastraBaseUrl } from './config';

type QueryValue = string | number | boolean | undefined;

function createMastraUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, getMastraBaseUrl());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function fetchMastraJson<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, QueryValue>,
): Promise<T> {
  const response = await fetch(createMastraUrl(path, query), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Mastra request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function defaultMemoryQuery() {
  return {
    agentId: CHAT_AGENT_ID,
    resourceId: SESSION_USER,
  };
}
