import { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';
import { ClusterOpsConfig } from '../config/clusterops-config';

interface KubernetesClients {
  coreApi: CoreV1Api;
  appsApi: AppsV1Api;
}

let cachedClients: KubernetesClients | null = null;
let cachedSignature: string | null = null;

export function getKubernetesClients(config: ClusterOpsConfig): KubernetesClients {
  const mode = resolveKubeMode(config);
  const signature = `${mode}:${config.kubeContext ?? ''}:${process.env.KUBECONFIG ?? ''}`;

  if (cachedClients && cachedSignature === signature) {
    return cachedClients;
  }

  const kubeConfig = new KubeConfig();
  if (mode === 'incluster') {
    kubeConfig.loadFromCluster();
  } else {
    kubeConfig.loadFromDefault();
    if (config.kubeContext) {
      const availableContexts = kubeConfig.getContexts().map(context => context.name);
      const requestedContext = config.kubeContext;

      if (!availableContexts.includes(requestedContext)) {
        throw new Error(
          `Configured KUBE_CONTEXT '${requestedContext}' was not found. Available contexts: ${availableContexts.join(', ')}`,
        );
      }

      kubeConfig.setCurrentContext(requestedContext);
    }
  }

  cachedClients = {
    coreApi: kubeConfig.makeApiClient(CoreV1Api),
    appsApi: kubeConfig.makeApiClient(AppsV1Api),
  };
  cachedSignature = signature;

  return cachedClients;
}

function resolveKubeMode(config: ClusterOpsConfig): 'local' | 'incluster' {
  if (config.kubeMode === 'local' || config.kubeMode === 'incluster') {
    return config.kubeMode;
  }

  return process.env.KUBERNETES_SERVICE_HOST ? 'incluster' : 'local';
}
