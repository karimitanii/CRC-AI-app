import { CoreV1Event, V1ContainerStatus, V1Pod } from '@kubernetes/client-node';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadClusterOpsConfig, resolveNamespace } from '../config/clusterops-config';
import { getKubernetesClients } from '../k8s/client';

const NAMESPACE_DESCRIPTION =
  'Namespace to query. If omitted, CLUSTEROPS_DEFAULT_NAMESPACE is used.';

const listPodsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  labelSelector: z.string().optional().describe('Optional label selector'),
});

const getPodInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
});

const getPodEventsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
  limit: z.number().int().positive().max(50).optional().describe('Max events to return (default 10)'),
});

const getPodLogsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
  container: z.string().optional().describe('Container name for multi-container pods'),
  tailLines: z.number().int().positive().max(2000).optional().describe('Number of log lines to fetch'),
});

const listDeploymentsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
});

const diagnosePodInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
  name: z.string().min(1).describe('Pod name'),
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

export const listDeploymentsTool = createTool({
  id: 'list-deployments',
  description: 'List deployments in a namespace with availability summary.',
  inputSchema: listDeploymentsInputSchema,
  outputSchema: z.object({
    namespace: z.string(),
    deployments: z.array(
      z.object({
        name: z.string(),
        desiredReplicas: z.number(),
        availableReplicas: z.number(),
        updatedReplicas: z.number(),
      }),
    ),
  }),
  execute: async inputData => {
    const namespace = resolveNamespaceForRequest(inputData.namespace);
    const { appsApi } = getClients();
    const deploymentList = await appsApi.listNamespacedDeployment({ namespace });

    return {
      namespace,
      deployments: (deploymentList.items ?? []).map(deployment => ({
        name: deployment.metadata?.name ?? 'unknown',
        desiredReplicas: deployment.spec?.replicas ?? 0,
        availableReplicas: deployment.status?.availableReplicas ?? 0,
        updatedReplicas: deployment.status?.updatedReplicas ?? 0,
      })),
    };
  },
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

function getClients() {
  return getKubernetesClients(loadClusterOpsConfig());
}

function resolveNamespaceForRequest(requestedNamespace?: string): string {
  return resolveNamespace(loadClusterOpsConfig(), requestedNamespace);
}

function getRestartCount(statuses: V1ContainerStatus[]): number {
  return statuses.reduce((acc, status) => acc + status.restartCount, 0);
}

function summarizePod(pod: V1Pod) {
  const conditions = pod.status?.conditions ?? [];
  const statuses = pod.status?.containerStatuses ?? [];

  return {
    name: pod.metadata?.name ?? 'unknown',
    phase: pod.status?.phase ?? 'Unknown',
    reason: pod.status?.reason ?? null,
    message: pod.status?.message ?? null,
    hostIP: pod.status?.hostIP ?? null,
    podIP: pod.status?.podIP ?? null,
    nodeName: pod.spec?.nodeName ?? null,
    startTime: pod.status?.startTime?.toISOString() ?? null,
    conditions: conditions.map(condition => ({
      type: condition.type,
      status: condition.status,
      reason: condition.reason ?? null,
      message: condition.message ?? null,
    })),
    containerStatuses: summarizeContainerStates(statuses),
  };
}

function summarizeContainerStates(statuses: V1ContainerStatus[]) {
  return statuses.map(status => {
    if (status.state?.waiting) {
      return {
        name: status.name,
        ready: status.ready,
        restartCount: status.restartCount,
        state: 'waiting',
        reason: status.state.waiting.reason ?? null,
        message: status.state.waiting.message ?? null,
      };
    }

    if (status.state?.terminated) {
      return {
        name: status.name,
        ready: status.ready,
        restartCount: status.restartCount,
        state: 'terminated',
        reason: status.state.terminated.reason ?? null,
        message: status.state.terminated.message ?? null,
      };
    }

    return {
      name: status.name,
      ready: status.ready,
      restartCount: status.restartCount,
      state: 'running',
      reason: null,
      message: null,
    };
  });
}

function getEventSortTime(event: CoreV1Event): string {
  return (
    toIsoString(event.lastTimestamp) ??
    toIsoString(event.eventTime) ??
    toIsoString(event.firstTimestamp) ??
    toIsoString(event.metadata?.creationTimestamp) ??
    ''
  );
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toISOString' in value &&
    typeof (value as { toISOString: unknown }).toISOString === 'function'
  ) {
    try {
      return (value as { toISOString: () => string }).toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

function buildDiagnosis(
  podPhase: string,
  containerStates: Array<{
    state: string;
    reason: string | null;
    message: string | null;
  }>,
  latestEvents: Array<{ reason: string | null; message: string | null; type: string | null }>,
) {
  const probableCauses = new Set<string>();
  const recommendedChecks = new Set<string>();

  if (podPhase === 'Pending') {
    probableCauses.add('Pod is pending scheduling or waiting for required resources.');
    recommendedChecks.add('Check events for scheduling errors, image pull errors, or missing PVCs.');
  }

  for (const state of containerStates) {
    if (state.reason === 'CrashLoopBackOff') {
      probableCauses.add('Container is repeatedly crashing (CrashLoopBackOff).');
      recommendedChecks.add('Inspect recent logs and verify startup command, env vars, and dependencies.');
    }
    if (state.reason === 'ImagePullBackOff' || state.reason === 'ErrImagePull') {
      probableCauses.add('Container image cannot be pulled.');
      recommendedChecks.add('Verify image name/tag, registry access, and image pull secrets.');
    }
    if (state.reason === 'CreateContainerConfigError') {
      probableCauses.add('Container configuration is invalid.');
      recommendedChecks.add('Check referenced ConfigMaps, Secrets, and required environment variables.');
    }
  }

  for (const event of latestEvents) {
    if (event.reason === 'FailedScheduling') {
      probableCauses.add('Pod scheduling failed.');
      recommendedChecks.add('Review node capacity, taints/tolerations, and affinity constraints.');
    }
    if (event.reason === 'FailedMount') {
      probableCauses.add('Volume mount failed.');
      recommendedChecks.add('Check PVC/PV binding and volume access modes.');
    }
  }

  if (!probableCauses.size) {
    probableCauses.add('No obvious failure signature detected from basic signals.');
    recommendedChecks.add('Inspect full pod YAML and application logs for deeper diagnostics.');
  }

  return {
    probableCauses: Array.from(probableCauses),
    recommendedChecks: Array.from(recommendedChecks),
  };
}
