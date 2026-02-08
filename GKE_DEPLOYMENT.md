# GKE Deployment (refoza.com)

This guide deploys the app to GKE with TLS and wildcard tenant domains on `refoza.com`.

## 1) Prerequisites
- GCP project with billing enabled.
- Domain control for `refoza.com`.
- Local tools: `gcloud`, `kubectl`, `docker`.

Enable APIs:
```
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  dns.googleapis.com \
  secretmanager.googleapis.com
```

## 2) Create Artifact Registry
```
gcloud artifacts repositories create refoza \
  --repository-format=docker \
  --location=us-west1
```

## 3) Build & Push Images
```
gcloud auth configure-docker us-west1-docker.pkg.dev

docker build -t us-west1-docker.pkg.dev/refoza/refoza/backend:latest ./server
docker build \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=https://*.tenant.refoza.com/api" \
  --build-arg "NEXT_PUBLIC_SITE_HOST=default.tenant.refoza.com" \
  -t us-west1-docker.pkg.dev/refoza/refoza/frontend:latest ./next-app

docker push us-west1-docker.pkg.dev/refoza/refoza/backend:latest
docker push us-west1-docker.pkg.dev/refoza/refoza/frontend:latest
```

## 4) Cloud SQL (Postgres)
```
gcloud sql instances create refoza-postgres \
  --database-version=POSTGRES_15 \
  --region=us-west1 \
  --cpu=2 --memory=8GB \
  --storage-size=20GB

gcloud sql databases create referral_prod --instance=refoza-postgres
gcloud sql users create referral_app --instance=refoza-postgres --password=GarraDeLaElsa211$
```

## 5) GKE Cluster
```
gcloud container clusters create refoza \
  --region=us-west1 \
  --num-nodes=2 \
  --machine-type=e2-standard-2 \
  --disk-type=pd-standard \
  --disk-size=30
gcloud container clusters get-credentials refoza --region=us-west1
```

## 6) DNS (refoza.com)
- Create an Ingress, wait for the load balancer IP.
- Point these records to the IP:
  - `refoza.com`
  - `www.refoza.com`
  - `*.tenant.refoza.com`
### 6.0) Install NGINX Ingress Controller (required for nginx class)
```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
kubectl -n ingress-nginx get svc
```
Wait for the `EXTERNAL-IP` to be assigned, then continue.
### 6.1) Apply namespace + base manifests (required before checking ingress IP)
```
kubectl apply -f k8s/namespace.yaml
kubectl -n refoza apply -f k8s/configmap.yaml
kubectl -n refoza apply -f k8s/secret.example.yaml
kubectl -n refoza apply -f k8s/backend-deployment.yaml
kubectl -n refoza apply -f k8s/backend-service.yaml
kubectl -n refoza apply -f k8s/frontend-deployment.yaml
kubectl -n refoza apply -f k8s/frontend-service.yaml
kubectl -n refoza apply -f k8s/ingress.yaml
```

### 6.2) Fetch the ingress IP
```
kubectl -n refoza get ingress refoza-ingress
```

## 7) cert-manager (TLS)
```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

### Option 1: Workload Identity (no JSON keys)
Create a Google service account and bind it to the cert-manager Kubernetes service account:
```
gcloud iam service-accounts create clouddns-dns01
gcloud projects add-iam-policy-binding refoza \
  --member="serviceAccount:clouddns-dns01@refoza.iam.gserviceaccount.com" \
  --role="roles/dns.admin"

gcloud container clusters update refoza \
  --region=us-west1 \
  --workload-pool=refoza.svc.id.goog

gcloud iam service-accounts add-iam-policy-binding clouddns-dns01@refoza.iam.gserviceaccount.com \
  --member="serviceAccount:refoza.svc.id.goog[cert-manager/cert-manager]" \
  --role="roles/iam.workloadIdentityUser"

kubectl -n cert-manager annotate serviceaccount cert-manager \
  iam.gke.io/gcp-service-account=clouddns-dns01@refoza.iam.gserviceaccount.com
```

Update `k8s/cert-issuer.yaml` with your `PROJECT_ID`, then apply:
```
kubectl apply -f k8s/cert-issuer.yaml
```

## 8) App Manifests
1) Update image names in:
   - `k8s/backend-deployment.yaml`
   - `k8s/frontend-deployment.yaml`
2) Create secrets from `k8s/secret.example.yaml`:
   - Add `PUBLIC_SITE_URL` so the root domain can call `/api/auth/tenant-options`
     - Example: `PUBLIC_SITE_URL=https://www.refoza-test.com`
```
kubectl apply -f k8s/namespace.yaml
kubectl -n refoza apply -f k8s/configmap.yaml
kubectl -n refoza apply -f k8s/secret.example.yaml
kubectl -n refoza apply -f k8s/backend-serviceaccount.yaml
```
3) Apply workloads:
```
kubectl -n refoza apply -f k8s/backend-deployment.yaml
kubectl -n refoza apply -f k8s/backend-service.yaml
kubectl -n refoza apply -f k8s/frontend-deployment.yaml
kubectl -n refoza apply -f k8s/frontend-service.yaml
kubectl -n refoza apply -f k8s/ingress.yaml
kubectl -n refoza apply -f k8s/hpa.yaml
```

## 8.1) GCS bucket
Create the bucket used by the app:
```
gcloud storage buckets create gs://tenant-media --location=us-west1 --uniform-bucket-level-access
```

## 8.2) GCS access via Workload Identity
Create a GCS service account and bind it to the backend Kubernetes service account:
```
gcloud iam service-accounts create refoza-gcs
gcloud projects add-iam-policy-binding refoza \
  --member="serviceAccount:refoza-gcs@refoza.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud iam service-accounts add-iam-policy-binding refoza-gcs@refoza.iam.gserviceaccount.com \
  --member="serviceAccount:refoza.svc.id.goog[refoza/refoza-backend-sa]" \
  --role="roles/iam.workloadIdentityUser"

kubectl -n refoza annotate serviceaccount refoza-backend-sa \
  iam.gke.io/gcp-service-account=refoza-gcs@refoza.iam.gserviceaccount.com
```

## 9) Cloud SQL Auth Proxy
The backend deployment includes the Cloud SQL proxy sidecar. Set:
```
CLOUDSQL_INSTANCE_CONNECTION_NAME=PROJECT_ID:REGION:refoza-postgres
```
in `k8s/secret.example.yaml` before applying.

## 10) Migrations/Seed
Run the schema sync against Cloud SQL from a pod:
```
kubectl -n refoza exec deploy/refoza-backend -- node scripts/syncSchema.js
```

## 11) Verify
- `https://default.tenant.refoza.com/admin/login`
- `https://default.tenant.refoza.com/api/meta/tenant`
- Login and check dashboard.

---

# Updating the App on GCP (GKE)

Use this when you have new code and want to deploy it safely.

## 0) Decide what is changing
- **Backend only**: build/push backend, update backend deployment.
- **Frontend only**: build/push frontend, update frontend deployment.
- **Both**: follow all steps below.
- **Secrets/Config only**: update `k8s/secret.yaml` or `k8s/configmap.yaml`, then restart pods.

## 0.1) Always use a new version tag
Do **not** reuse the same tag (e.g., `v3`). Use `v4`, `v5`, etc.

## A) Pre-flight checks
1) Confirm current deployment images:
```
kubectl -n refoza get deploy refoza-backend -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n refoza get deploy refoza-frontend -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```
2) Confirm the tag exists in Artifact Registry:
```
gcloud artifacts docker tags list us-west1-docker.pkg.dev/refoza/refoza/backend
gcloud artifacts docker tags list us-west1-docker.pkg.dev/refoza/refoza/frontend
```

## B) Build & push new images (amd64 required for GKE)
1) Ensure buildx is ready (Apple Silicon):
```
docker buildx use refoza-builder || docker buildx create --name refoza-builder --use
docker buildx inspect --bootstrap
```
2) Build and push both images (use your new tag, example `v4`):
```
gcloud auth configure-docker us-west1-docker.pkg.dev

docker buildx build --no-cache --platform  linux/amd64 \
  -t us-west1-docker.pkg.dev/refoza/refoza/backend:v47 \
  ./server --push
    
docker buildx build --no-cache   --platform linux/amd64 \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=https://*.tenant.refoza.com" \
  --build-arg "NEXT_PUBLIC_SITE_HOST=https://*.tenant.refoza.com" \
  --build-arg "NEXT_PUBLIC_BILLING_HOST=subscription.refoza.com" \
  --build-arg "NEXT_PUBLIC_TENANT_HOST_BASE=tenant.refoza.com" \
  -t us-west1-docker.pkg.dev/refoza/refoza/frontend:v47 \
  ./next-app --push


docker buildx imagetools inspect us-west1-docker.pkg.dev/refoza/refoza/backend:v47
docker buildx imagetools inspect us-west1-docker.pkg.dev/refoza/refoza/frontend:v47
```

## C) Update the deployments to the new tag
Option 1 (recommended): update YAML and apply
1) Edit image tags in:
   - `k8s/backend-deployment.yaml`
   - `k8s/frontend-deployment.yaml`
2) Apply:
```
kubectl -n refoza apply -f k8s/backend-deployment.yaml
kubectl -n refoza apply -f k8s/frontend-deployment.yaml
```

Option 2 (quick):
```
kubectl -n refoza set image deployment/refoza-backend backend=us-west1-docker.pkg.dev/refoza/refoza/backend:v47
kubectl -n refoza set image deployment/refoza-frontend frontend=us-west1-docker.pkg.dev/refoza/refoza/frontend:v47
```

## D) Wait for rollout to complete
```
kubectl -n refoza rollout status deployment/refoza-backend
kubectl -n refoza rollout status deployment/refoza-frontend
```

### Verify the running image digest
```
kubectl -n refoza get pods -l app=refoza-frontend -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.status.containerStatuses[0].imageID}{"\n"}{end}'
kubectl -n refoza get pods -l app=refoza-backend -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.status.containerStatuses[0].imageID}{"\n"}{end}'
```
Compare the digest with:
```
docker buildx imagetools inspect us-west1-docker.pkg.dev/refoza/refoza/frontend:v47
docker buildx imagetools inspect us-west1-docker.pkg.dev/refoza/refoza/backend:v47
```

## E) Apply config/secret changes (if only env changed)
```
kubectl -n refoza apply -f k8s/configmap.yaml
kubectl -n refoza apply -f k8s/secret.yaml
kubectl -n refoza rollout restart deployment/refoza-backend
kubectl -n refoza rollout restart deployment/refoza-frontend
```

## F) Run migrations / schema sync (if DB changes)
```
kubectl -n refoza exec deploy/refoza-backend -- node scripts/syncSchema.js
```

## G) Verify deployment
```
kubectl -n refoza get pods
kubectl -n refoza get ingress refoza-ingress
```
- Open: `https://default.tenant.refoza.com/admin/login`
- Check API: `https://default.tenant.refoza.com/api/meta/tenant`

## H) Common update issues
- **Pods stuck on old code**: ensure you updated the tag (avoid `latest`), or set `imagePullPolicy: Always`.
- **CrashLoopBackOff**: check logs:
  ```
  kubectl -n refoza logs deploy/refoza-backend -c backend
  kubectl -n refoza logs deploy/refoza-frontend -c frontend
  ```
- **DB connection errors**: confirm Cloud SQL proxy sidecar and secrets are correct.
- **ErrImagePull / ImagePullBackOff**:
  - Check events:
    ```
    kubectl -n refoza get events --sort-by=.metadata.creationTimestamp | grep refoza-backend | tail -n 10
    kubectl -n refoza get events --sort-by=.metadata.creationTimestamp | grep refoza-frontend | tail -n 10
    ```
  - `...: not found` → tag does not exist. Push the tag or update deployment.
  - `no match for platform in manifest` → rebuild with `buildx --platform linux/amd64`.
- **Tag pushed but not pullable**:
  - Tags list is authoritative:
    ```
    gcloud artifacts docker tags list us-west1-docker.pkg.dev/refoza/refoza/frontend
    ```
  - If a digest exists but tag is missing, add it:
    ```
    gcloud artifacts docker tags add \
      us-west1-docker.pkg.dev/refoza/refoza/frontend@sha256:<digest> \
      us-west1-docker.pkg.dev/refoza/refoza/frontend:v3
    ```
- **CORS errors from the public site**:
  - Set `PUBLIC_SITE_URL` in backend secrets (e.g., `https://www.refoza-test.com`).
  - Restart backend after updating secrets.
- **Next.js build error: useSearchParams requires Suspense**:
  - Wrap pages using `useSearchParams()` in a `<Suspense>` boundary.
- **Update appears “not applied” after rollout**:
  - You likely **reused the same tag**. Build and push a **new tag**, update the deployment, then roll out.
  - Confirm running pod `imageID` digest (see above).
  - Hard refresh the browser to clear cached `_next/static` assets.

## I) Optional: Scale down/up to save cost
```
kubectl -n refoza scale deploy refoza-backend --replicas=0
kubectl -n refoza scale deploy refoza-frontend --replicas=0
kubectl -n ingress-nginx scale deploy ingress-nginx-controller --replicas=0
```
To resume:
```
kubectl -n refoza scale deploy refoza-backend --replicas=1
kubectl -n refoza scale deploy refoza-frontend --replicas=1
kubectl -n ingress-nginx scale deploy ingress-nginx-controller --replicas=1
```