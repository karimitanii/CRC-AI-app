import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadClusterOpsConfig, resolveNamespace } from '../config/clusterops-config';
import { getKubernetesClients } from '../k8s/client';
import {
  NAMESPACE_DESCRIPTION,
  buildDiagnosis,
  getEventSortTime,
  summarizeContainerStates,
} from './clusterops-tool-helpers';

const diagnosePodInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
});

export const diagnosePodTool = createTool({
  id: 'diagnose-pod',
  description:
    'Diagnose common pod failures by aggregating pod status, recent events, and recent logs.',
  inputSchema: diagnosePodInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    podName: z.string(),
    podPhase: z.string(),
    containerStates: z.array(
      z.object({
        name: z.string(),
        state: z.string(),
        reason: z.string().nullable(),
        message: z.string().nullable(),
        restartCount: z.number(),
      }),
    ),
    latestEvents: z.array(
      z.object({
        reason: z.string().nullable(),
        message: z.string().nullable(),
        type: z.string().nullable(),
      }),
    ),
    logExcerpt: z.string().nullable(),
    probableCauses: z.array(z.string()),
    recommendedChecks: z.array(z.string()),
  }),
  execute: async inputData => {
    const config = loadClusterOpsConfig();
    const namespace = resolveNamespace(config, inputData.namespace);
    const { coreApi } = getKubernetesClients(config);
    const pod = await coreApi.readNamespacedPod({
      namespace,
      name: inputData.name,
    });

    const events = await coreApi.listNamespacedEvent({
      namespace,
      fieldSelector: `involvedObject.kind=Pod,involvedObject.name=${inputData.name}`,
      limit: 20,
    });
    const latestEvents = [...(events.items ?? [])]
      .sort((a, b) => getEventSortTime(b).localeCompare(getEventSortTime(a)))
      .slice(0, 8)
      .map(event => ({
        reason: event.reason ?? null,
        message: event.message ?? null,
        type: event.type ?? null,
      }));

    let logExcerpt: string | null = null;
    const primaryContainer = pod.spec?.containers?.[0]?.name;
    try {
      logExcerpt = await coreApi.readNamespacedPodLog({
        namespace,
        name: inputData.name,
        container: primaryContainer,
        tailLines: config.logTailLines,
        timestamps: true,
      });
    } catch {
      logExcerpt = null;
    }

    const containerStates = summarizeContainerStates(pod.status?.containerStatuses ?? []);
    const { probableCauses, recommendedChecks } = buildDiagnosis(
      pod.status?.phase ?? 'Unknown',
      containerStates,
      latestEvents,
    );

    return {
      namespace,
      podName: inputData.name,
      podPhase: pod.status?.phase ?? 'Unknown',
      containerStates,
      latestEvents,
      logExcerpt,
      probableCauses,
      recommendedChecks,
    };
  },
});
