import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNodeHttpEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { clusteropsAgent } from './agents/clusterops-agent';

const COPILOTKIT_CHAT_PATH = process.env.COPILOTKIT_CHAT_PATH?.trim() || '/chat';
const COPILOTKIT_RESOURCE_ID = 'user1';
const COPILOTKIT_ALLOWED_ORIGINS =
  process.env.COPILOTKIT_ALLOWED_ORIGINS
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) || ['http://localhost:3001'];

async function handleCopilotRequest(c: any) {
  const runtime = new CopilotRuntime({
    agents: MastraAgent.getLocalAgents({
      mastra: c.get('mastra'),
      resourceId: COPILOTKIT_RESOURCE_ID,
    }),
  });

  const endpointHandler = copilotRuntimeNodeHttpEndpoint({
    endpoint: COPILOTKIT_CHAT_PATH,
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    cors: {
      origin: COPILOTKIT_ALLOWED_ORIGINS.length === 1 ? COPILOTKIT_ALLOWED_ORIGINS[0] : COPILOTKIT_ALLOWED_ORIGINS,
    },
  });

  return endpointHandler(c.req.raw) as Promise<Response>;
}

const copilotKitBaseRoute = registerApiRoute(COPILOTKIT_CHAT_PATH, {
  method: 'ALL',
  handler: handleCopilotRequest,
});

const copilotKitWildcardRoute = registerApiRoute(`${COPILOTKIT_CHAT_PATH}/*`, {
  method: 'ALL',
  handler: handleCopilotRequest,
});

export const mastra = new Mastra({
  agents: {
    default: clusteropsAgent,
    clusteropsAgent,
    'clusterops-agent': clusteropsAgent,
  },
  server: {
    apiRoutes: [copilotKitBaseRoute, copilotKitWildcardRoute],
  },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    // stores observability, scores, ... into persistent file storage
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
