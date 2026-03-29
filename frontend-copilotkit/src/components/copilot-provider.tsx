'use client';

import { CopilotKit, defineToolCallRenderer } from '@copilotkit/react-core/v2';
import '@copilotkit/react-ui/v2/styles.css';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { CHAT_AGENT_ID, COPILOT_RUNTIME_URL } from '@/lib/config';

const wildcardToolRenderer = defineToolCallRenderer({
  name: '*',
  agentId: CHAT_AGENT_ID,
  render: ({ name, status, result }) => {
    const isComplete = status === 'complete';
    const isRunning = status === 'executing' || status === 'inProgress';
    const statusLabel = isComplete ? 'complete' : isRunning ? 'running' : 'pending';

    const toolResult =
      typeof result === 'string'
        ? result
        : result === undefined
          ? 'Waiting for tool result...'
          : JSON.stringify(result, null, 2);

    return (
      <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-tool-bg)] p-3 text-sm">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-text)]">{name}</span>
          <span className="inline-flex items-center gap-1">
            {isComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />
            )}
            <span>{statusLabel}</span>
          </span>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-black/25 p-2 font-mono text-xs text-[var(--color-text)]">
          {toolResult}
        </pre>
      </div>
    );
  },
});

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      credentials="include"
      showDevConsole={false}
      renderToolCalls={[wildcardToolRenderer]}
      headers={{
        'x-clusterops-user': 'user1',
      }}
    >
      {children}
    </CopilotKit>
  );
}
