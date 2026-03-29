import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadClusterOpsConfig, resolveNamespace } from '../config/clusterops-config';
import { getKubernetesClients } from '../k8s/client';
import { NAMESPACE_DESCRIPTION } from './clusterops-tool-helpers';

const getPodLogsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
  container: z.string().optional().describe('Container name for multi-container pods'),
  tailLines: z.number().int().positive().max(2000).optional().describe('Number of log lines to fetch'),
});

export const getPodLogsTool = createTool({
  id: 'get-pod-logs',
  description: 'Get recent pod logs for diagnosis.',
  inputSchema: getPodLogsInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    podName: z.string(),
    container: z.string().nullable(),
    tailLines: z.number(),
    logs: z.string(),
  }),
  execute: async inputData => {
    const config = loadClusterOpsConfig();
    const namespace = resolveNamespace(config, inputData.namespace);
    const { coreApi } = getKubernetesClients(config);
    const tailLines = inputData.tailLines ?? config.logTailLines;

    const logs = await coreApi.readNamespacedPodLog({
      namespace,
      name: inputData.name,
      container: inputData.container,
      tailLines,
      timestamps: true,
    });

    return {
      namespace,
      podName: inputData.name,
      container: inputData.container ?? null,
      tailLines,
      logs,
    };
  },
});
