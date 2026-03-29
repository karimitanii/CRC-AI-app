'use client';

import { CopilotKit, defineToolCallRenderer } from '@copilotkit/react-core/v2';
import '@copilotkit/react-ui/v2/styles.css';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ReactNode, useState } from 'react';
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

    return <ToolCallCard name={name} statusLabel={statusLabel} isComplete={isComplete} toolResult={toolResult} />;
  },
});

function ToolCallCard({
  name,
  statusLabel,
  isComplete,
  toolResult,
}: {
  name: string;
  statusLabel: string;
  isComplete: boolean;
  toolResult: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-tool-bg)] p-3 text-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-muted)]">
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

      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {isExpanded ? 'Hide tool JSON' : 'Show tool JSON'}
      </button>

      {isExpanded ? (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-black/25 p-2 font-mono text-xs text-[var(--color-text)]">
          {toolResult}
        </pre>
      ) : null}
    </div>
  );
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={CHAT_AGENT_ID}
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
