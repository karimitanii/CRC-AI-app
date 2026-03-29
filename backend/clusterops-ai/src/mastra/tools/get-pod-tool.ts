import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { NAMESPACE_DESCRIPTION, getClients, resolveNamespaceForRequest, summarizePod } from './clusterops-tool-helpers';

const getPodInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
});

export const getPodTool = createTool({
  id: 'get-pod',
  description: 'Get detailed status for a specific pod.',
  inputSchema: getPodInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    pod: z.object({
      name: z.string(),
      phase: z.string(),
      reason: z.string().nullable(),
      message: z.string().nullable(),
      hostIP: z.string().nullable(),
      podIP: z.string().nullable(),
      nodeName: z.string().nullable(),
      startTime: z.string().nullable(),
      conditions: z.array(
        z.object({
          type: z.string(),
          status: z.string(),
          reason: z.string().nullable(),
          message: z.string().nullable(),
        }),
      ),
      containerStatuses: z.array(
        z.object({
          name: z.string(),
          ready: z.boolean(),
          restartCount: z.number(),
          state: z.string(),
          reason: z.string().nullable(),
          message: z.string().nullable(),
        }),
      ),
    }),
  }),
  execute: async inputData => {
    const namespace = resolveNamespaceForRequest(inputData.namespace);
    const { coreApi } = getClients();
    const pod = await coreApi.readNamespacedPod({
      namespace,
      name: inputData.name,
    });

    return {
      namespace,
      pod: summarizePod(pod),
    };
  },
});
