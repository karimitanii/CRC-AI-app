export interface ThreadSummary {
  id: string;
  resourceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ThreadsResponse {
  threads: ThreadSummary[];
}

export interface ThreadMessagesResponse {
  uiMessages: unknown[];
}
