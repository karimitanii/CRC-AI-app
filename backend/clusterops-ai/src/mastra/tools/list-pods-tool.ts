import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  NAMESPACE_DESCRIPTION,
  getClients,
  getRestartCount,
  resolveNamespaceForRequest,
} from './clusterops-tool-helpers';

const listPodsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  labelSelector: z.string().optional().describe('Optional label selector'),
});

export const listPodsTool = createTool({
  id: 'list-pods',
  description: 'List pods in a namespace with status and restart summary.',
  inputSchema: listPodsInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    pods: z.array(
      z.object({
        name: z.string(),
        phase: z.string(),
        readyContainers: z.number(),
        totalContainers: z.number(),
        restartCount: z.number(),
        nodeName: z.string().nullable(),
        createdAt: z.string().nullable(),
      }),
    ),
  }),
  execute: async inputData => {
    const namespace = resolveNamespaceForRequest(inputData.namespace);
    const { coreApi } = getClients();
    const podList = await coreApi.listNamespacedPod({
      namespace,
      labelSelector: inputData.labelSelector,
    });

    return {
      namespace,
      pods: (podList.items ?? []).map(pod => {
        const statuses = pod.status?.containerStatuses ?? [];
        return {
          name: pod.metadata?.name ?? 'unknown',
          phase: pod.status?.phase ?? 'Unknown',
          readyContainers: statuses.filter(status => status.ready).length,
          totalContainers: statuses.length,
          restartCount: getRestartCount(statuses),
          nodeName: pod.spec?.nodeName ?? null,
          createdAt: pod.metadata?.creationTimestamp?.toISOString() ?? null,
        };
      }),
    };
  },
});
