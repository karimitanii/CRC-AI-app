import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  NAMESPACE_DESCRIPTION,
  getClients,
  getEventSortTime,
  resolveNamespaceForRequest,
  toIsoString,
} from './clusterops-tool-helpers';

const getPodEventsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
  limit: z.number().int().positive().max(50).optional().describe('Max events to return (default 10)'),
});

export const getPodEventsTool = createTool({
  id: 'get-pod-events',
  description: 'Get recent events for a pod, newest first.',
  inputSchema: getPodEventsInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    podName: z.string(),
    events: z.array(
      z.object({
        type: z.string().nullable(),
        reason: z.string().nullable(),
        message: z.string().nullable(),
        count: z.number().nullable(),
        firstTimestamp: z.string().nullable(),
        lastTimestamp: z.string().nullable(),
      }),
    ),
  }),
  execute: async inputData => {
    const namespace = resolveNamespaceForRequest(inputData.namespace);
    const { coreApi } = getClients();
    const events = await coreApi.listNamespacedEvent({
      namespace,
      fieldSelector: `involvedObject.kind=Pod,involvedObject.name=${inputData.name}`,
    });
    const limit = inputData.limit ?? 10;

    const sortedEvents = [...(events.items ?? [])].sort((a, b) => {
      const aTime = getEventSortTime(a);
      const bTime = getEventSortTime(b);
      return bTime.localeCompare(aTime);
    });

    return {
      namespace,
      podName: inputData.name,
      events: sortedEvents.slice(0, limit).map(event => ({
        type: event.type ?? null,
        reason: event.reason ?? null,
        message: event.message ?? null,
        count: event.count ?? null,
        firstTimestamp: toIsoString(event.firstTimestamp),
        lastTimestamp: toIsoString(event.lastTimestamp),
      })),
    };
  },
});
