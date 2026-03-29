'use client';

import {
  CopilotChat,
} from '@copilotkit/react-core/v2';
import { LogOut, MessageSquarePlus } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CHAT_AGENT_ID } from '@/lib/config';
import { ThreadSummary, ThreadsResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ChatPageClient() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);

  const refreshThreads = useCallback(async (selectNewest = false) => {
    setLoadingThreads(true);
    setThreadError(null);
    try {
      const response = await fetch('/api/mastra/threads', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as ThreadsResponse;
      setThreads(data.threads ?? []);

      if (selectNewest && data.threads?.[0]) {
        setActiveThreadId(data.threads[0].id);
      } else if (!activeThreadId && data.threads?.[0]) {
        setActiveThreadId(data.threads[0].id);
      }
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : 'Failed to load threads');
    } finally {
      setLoadingThreads(false);
    }
  }, [activeThreadId]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  async function createThread() {
    const response = await fetch('/api/mastra/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const created = (await response.json()) as ThreadSummary;
    setThreads(prev => [created, ...prev]);
    setActiveThreadId(created.id);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const activeThread = useMemo(
    () => threads.find(thread => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <aside className="relative w-80 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 bg-[radial-gradient(circle,_rgba(238,0,0,0.25)_0%,_transparent_70%)]" />
        <h1 className="mb-1 text-xl font-semibold tracking-wide text-[var(--color-accent)]">
          ClusterOps Assistant
        </h1>
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">CopilotKit Runtime</p>

        <button
          type="button"
          onClick={() => void createThread()}
          className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)]/15 px-3 py-2 text-sm font-medium hover:bg-[var(--color-accent)]/30"
        >
          <MessageSquarePlus className="h-4 w-4" />
          + New Chat
        </button>

        <div className="space-y-2 overflow-y-auto pb-4">
          {loadingThreads ? (
            <p className="text-sm text-[var(--color-muted)]">Loading chats...</p>
          ) : null}
          {threads.map(thread => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveThreadId(thread.id)}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left text-sm transition',
                activeThreadId === thread.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/60',
              )}
            >
              <p className="truncate font-medium">{thread.title || 'Untitled chat'}</p>
              <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                {new Date(thread.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
          {!loadingThreads && threads.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No chats yet.</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        {threadError ? (
          <div className="border-b border-[var(--color-border)] bg-red-950/40 px-4 py-2 text-sm text-red-200">
            {threadError}
          </div>
        ) : null}

        {!activeThread ? (
          <div className="flex flex-1 items-center justify-center px-8 text-center text-[var(--color-muted)]">
            Select a chat or create a new one.
          </div>
        ) : (
          <>
            <header className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-4">
              <h2 className="text-lg font-semibold">{activeThread.title || 'Untitled chat'}</h2>
              <p className="text-xs text-[var(--color-muted)]">
                Reasoning and tool results are shown inline during execution.
              </p>
            </header>

            <section className="copilot-chat-shell flex min-h-0 flex-1 p-4">
              <CopilotChat
                key={activeThread.id}
                className="h-full w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-chat)] shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
                agentId={CHAT_AGENT_ID}
                threadId={activeThread.id}
                messageView={{
                  className: 'px-5 py-5',
                  assistantMessage: {
                    className:
                      'mb-4 mr-auto max-w-[min(100%,980px)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3',
                    children: ({
                      toolCallsView,
                      markdownRenderer,
                      toolbarVisible,
                      toolbar,
                    }: {
                      toolCallsView: ReactNode;
                      markdownRenderer: ReactNode;
                      toolbarVisible?: boolean;
                      toolbar: ReactNode;
                    }) => (
                      <>
                        {toolCallsView}
                        <div className="mt-2">{markdownRenderer}</div>
                        {toolbarVisible ? <div className="mt-2">{toolbar}</div> : null}
                      </>
                    ),
                  },
                  userMessage: {
                    className:
                      'mb-4 ml-auto max-w-[min(100%,760px)]',
                    children: ({
                      messageRenderer,
                      toolbar,
                    }: {
                      messageRenderer: ReactNode;
                      toolbar: ReactNode;
                    }) => (
                      <>
                        <div className="ml-auto">{messageRenderer}</div>
                        <div>{toolbar}</div>
                      </>
                    ),
                  },
                  reasoningMessage: {
                    className:
                      'mb-3 mr-auto max-w-[min(100%,980px)] rounded-lg border border-dashed border-[var(--color-border)] bg-[#111827] px-3 py-2 text-[var(--color-muted)]',
                  },
                }}
                input={{
                  className: 'border-t border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3',
                  textArea: {
                    className:
                      'min-h-[52px] rounded-xl border border-[var(--color-border)] bg-[#0d1420] px-4 py-3 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]',
                    placeholder: 'Ask about pods, deployments, events, or diagnostics...',
                  },
                  sendButton: {
                    className:
                      'h-11 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:brightness-110',
                  },
                  addMenuButton: HiddenElement,
                  startTranscribeButton: HiddenElement,
                  cancelTranscribeButton: HiddenElement,
                  finishTranscribeButton: HiddenElement,
                  disclaimer: HiddenElement,
                }}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function HiddenElement() {
  return null;
}
