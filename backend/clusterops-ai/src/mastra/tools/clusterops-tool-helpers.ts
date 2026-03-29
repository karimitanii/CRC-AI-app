import { CoreV1Event, V1ContainerStatus, V1Pod } from '@kubernetes/client-node';
import { loadClusterOpsConfig, resolveNamespace } from '../config/clusterops-config';
import { getKubernetesClients } from '../k8s/client';

export const NAMESPACE_DESCRIPTION =
  'Namespace to query. If omitted, CLUSTEROPS_DEFAULT_NAMESPACE is used.';

export function getClients() {
  return getKubernetesClients(loadClusterOpsConfig());
}

export function resolveNamespaceForRequest(requestedNamespace?: string): string {
  return resolveNamespace(loadClusterOpsConfig(), requestedNamespace);
}

export function getRestartCount(statuses: V1ContainerStatus[]): number {
  return statuses.reduce((acc, status) => acc + status.restartCount, 0);
}

export function summarizePod(pod: V1Pod) {
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

export function summarizeContainerStates(statuses: V1ContainerStatus[]) {
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

export function getEventSortTime(event: CoreV1Event): string {
  return (
    toIsoString(event.lastTimestamp) ??
    toIsoString(event.eventTime) ??
    toIsoString(event.firstTimestamp) ??
    toIsoString(event.metadata?.creationTimestamp) ??
    ''
  );
}

export function toIsoString(value: unknown): string | null {
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

export function buildDiagnosis(
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
