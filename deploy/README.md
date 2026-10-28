# ClusterOps AI Deployment (CRC + OpenShift)

This repository now includes production-style deployment assets:

- Dockerfiles:
  - `deploy/docker/backend.Dockerfile`
  - `deploy/docker/frontend-copilotkit.Dockerfile`
- Helm chart:
  - `deploy/helm/clusterops-ai`
- GitHub Actions pipeline for self-hosted runner:
  - `.github/workflows/build-deploy-crc.yaml`

## 1) One-time cluster prerequisites (CRC)

Namespace and service account (you already created these, kept here for completeness):

```bash
oc new-project clusterops-ai
oc create serviceaccount clusterops-assistant -n clusterops-ai
oc adm policy add-role-to-user view -z clusterops-assistant -n clusterops-ai
oc adm policy add-cluster-role-to-user view -z clusterops-assistant -n clusterops-ai
```

Create image pull secret for Quay:

```bash
oc create secret docker-registry quay-registry \
  --docker-server=quay.io \
  --docker-username='<quay-username>' \
  --docker-password='<quay-token-or-password>' \
  --docker-email='devnull@example.com' \
  -n clusterops-ai
```

Create backend secret (contains model key and any future secrets):

```bash
oc create secret generic clusterops-backend-secrets \
  --from-literal=GROQ_API_KEY='<your-groq-key>' \
  -n clusterops-ai
```

## 2) Configure Helm values for CRC

Edit `deploy/helm/clusterops-ai/values-crc.yaml`:

- Set Quay org/repository names.
- Set route hosts:
  - `frontend.route.host`
  - `backend.route.host`
- Set `backend.env.COPILOTKIT_ALLOWED_ORIGINS` to your frontend route origin.

## 3) Manual deploy (first bootstrap)

```bash
oc login https://api.crc.testing:6443 --token='<token>'
oc project clusterops-ai

helm upgrade --install clusterops-ai deploy/helm/clusterops-ai \
  -n clusterops-ai \
  -f deploy/helm/clusterops-ai/values-crc.yaml \
  --set backend.image.repository='quay.io/<org>/clusterops-backend' \
  --set backend.image.tag='<tag>' \
  --set frontend.image.repository='quay.io/<org>/clusterops-frontend' \
  --set frontend.image.tag='<tag>'
```

## 4) GitHub Actions (private repo + local CRC)

Because CRC is local, use a **self-hosted runner on your laptop**.

Set these repository secrets:

- `QUAY_USERNAME`
- `QUAY_PASSWORD`
- `QUAY_ORG`
- `CRC_API_URL` (example: `https://api.crc.testing:6443`)
- `CRC_TOKEN`

Workflow path: `.github/workflows/build-deploy-crc.yaml`

## 5) Post-deploy validation

```bash
oc get deploy,svc,route -n clusterops-ai
oc get deploy clusterops-ai-backend -n clusterops-ai -o jsonpath='{.spec.template.spec.serviceAccountName}{"\n"}'
```

Expected backend service account: `clusterops-assistant`.

Then test frontend chat and run `list-pods` / `diagnose-pod` to confirm live cluster access.
