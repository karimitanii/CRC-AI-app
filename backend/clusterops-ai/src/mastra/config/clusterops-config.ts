const SUPPORTED_MODES = ['auto', 'local', 'incluster'] as const;

export type ClusterOpsKubeMode = (typeof SUPPORTED_MODES)[number];

export interface ClusterOpsConfig {
  kubeMode: ClusterOpsKubeMode;
  kubeContext?: string;
  defaultNamespace: string;
  namespaceAllowlist: Set<string>;
  logTailLines: number;
}

export function loadClusterOpsConfig(env: NodeJS.ProcessEnv = process.env): ClusterOpsConfig {
  const kubeMode = parseKubeMode(env.CLUSTEROPS_KUBE_MODE);
  const defaultNamespace = (env.CLUSTEROPS_DEFAULT_NAMESPACE ?? 'clusterops-ai').trim();
  const namespaceAllowlist = parseNamespaceAllowlist(env.CLUSTEROPS_NAMESPACE_ALLOWLIST, defaultNamespace);
  const logTailLines = parsePositiveInteger(env.CLUSTEROPS_LOG_TAIL_LINES, 200);
  const kubeContext = normalizeEnvString(env.KUBE_CONTEXT) || undefined;

  return {
    kubeMode,
    kubeContext,
    defaultNamespace,
    namespaceAllowlist,
    logTailLines,
  };
}

export function resolveNamespace(config: ClusterOpsConfig, requestedNamespace?: string): string {
  const namespace = (requestedNamespace?.trim() || config.defaultNamespace).trim();

  if (!config.namespaceAllowlist.has(namespace)) {
    throw new Error(
      `Namespace '${namespace}' is not allowed. Allowed namespaces: ${Array.from(config.namespaceAllowlist).join(', ')}`,
    );
  }

  return namespace;
}

function parseKubeMode(rawMode?: string): ClusterOpsKubeMode {
  const mode = rawMode?.trim().toLowerCase() ?? 'auto';
  if (SUPPORTED_MODES.includes(mode as ClusterOpsKubeMode)) {
    return mode as ClusterOpsKubeMode;
  }

  throw new Error(
    `Invalid CLUSTEROPS_KUBE_MODE '${rawMode}'. Supported values: ${SUPPORTED_MODES.join(', ')}`,
  );
}

function parseNamespaceAllowlist(rawAllowlist: string | undefined, defaultNamespace: string): Set<string> {
  const parsed = (rawAllowlist ?? defaultNamespace)
    .split(',')
    .map(namespace => namespace.trim())
    .filter(Boolean);

  if (!parsed.length) {
    throw new Error('CLUSTEROPS_NAMESPACE_ALLOWLIST cannot be empty');
  }

  return new Set(parsed);
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but got '${rawValue}'`);
  }

  return parsed;
}

function normalizeEnvString(rawValue?: string): string {
  const trimmed = rawValue?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  const startsWithSingle = trimmed.startsWith("'");
  const endsWithSingle = trimmed.endsWith("'");
  const startsWithDouble = trimmed.startsWith('"');
  const endsWithDouble = trimmed.endsWith('"');

  if ((startsWithSingle && endsWithSingle) || (startsWithDouble && endsWithDouble)) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}
