import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { NAMESPACE_DESCRIPTION, getClients, resolveNamespaceForRequest } from './clusterops-tool-helpers';

const listDeploymentsInputSchema = z.object({
  namespace: z.string().optional().describe(NAMESPACE_DESCRIPTION),
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
