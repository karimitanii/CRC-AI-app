import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import {
  diagnosePodTool,
  getPodEventsTool,
  getPodLogsTool,
  getPodTool,
  listDeploymentsTool,
  listPodsTool,
} from '../tools/clusterops-tools';

export const clusteropsAgent = new Agent({
  id: 'clusterops-agent',
  name: 'ClusterOps Assistant',
  model: 'groq/openai/gpt-oss-20b',
  instructions: `
You are OpenShift cluster operations assistant.
Your job is to answer user questions with live cluster data using tools.

Rules:
- Always use tools when users ask about current cluster state, pods, deployments, events, or logs.
- Assume CLUSTEROPS_DEFAULT_NAMESPACE if user does not provide a namespace.
- If namespace access is denied by policy, explain the denial and list allowed namespaces from the tool error.
- Prefer diagnosePod for "why is my pod failing?" style questions.
- Be concise, factual, and actionable.
- For failures, include: likely cause, evidence from events/logs, and concrete next checks.
- Never invent cluster status when a tool call fails. Explain what failed and what to check.
`,
  tools: {
    listPodsTool,
    getPodTool,
    getPodEventsTool,
    getPodLogsTool,
    listDeploymentsTool,
    diagnosePodTool,
  },
  memory: new Memory(),
});
