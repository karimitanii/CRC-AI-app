# clusterops-ai

Mastra backend for the CRC ClusterOps Assistant. It answers operational questions using live Kubernetes/OpenShift cluster data through read-only tools.

## Getting Started

Start the development server:

```shell
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/getting-started/studio). It provides an interactive UI for building and testing your agent, along with a REST API that exposes your Mastra application as a local service.

## Configuration

Set these environment variables before running:

```bash
CLUSTEROPS_KUBE_MODE=auto
CLUSTEROPS_DEFAULT_NAMESPACE=clusterops-ai
CLUSTEROPS_NAMESPACE_ALLOWLIST=clusterops-ai
CLUSTEROPS_LOG_TAIL_LINES=200
```

Local development (kubeconfig mode):

```bash
CLUSTEROPS_KUBE_MODE=local
KUBECONFIG=~/.kube/config
KUBE_CONTEXT=crc-admin
```

In-cluster deployment:

```bash
CLUSTEROPS_KUBE_MODE=incluster
```

The deployed pod must run as `serviceAccountName: clusterops-assistant` with appropriate read-only RBAC.

## Agent and tools

The backend registers one agent: `clusterops-agent` (`src/mastra/agents/clusterops-agent.ts`).

Tools:
- `list-pods`
- `get-pod`
- `get-pod-events`
- `get-pod-logs`
- `list-deployments`
- `diagnose-pod`
