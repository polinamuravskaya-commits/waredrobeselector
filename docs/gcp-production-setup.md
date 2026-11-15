# GCP production setup checklist

This checklist covers the real production path for the wardrobe app after the code and deployment preparation are already in place.

## 1. Create a GCP project

1. Open Google Cloud Console.
2. Create a new project or choose an existing one.
3. Enable billing for the project.
4. Note the project ID.

Example:

```bash
gcloud config set project YOUR_PROJECT_ID
```

## 2. Enable required APIs

Run:

```bash
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com
```

## 3. Create a Cloud Storage bucket

```bash
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://wardrobe-uploads-your-project
```

Set the bucket name in env:

```bash
GOOGLE_CLOUD_STORAGE_BUCKET=wardrobe-uploads-your-project
```

Optional:

```bash
gsutil uniformbucketlevelaccess set on gs://wardrobe-uploads-your-project
```

## 4. Create a service account for Cloud Run

```bash
gcloud iam service-accounts create wardrobe-run-sa \
  --project YOUR_PROJECT_ID
```

Assign minimum permissions:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member serviceAccount:wardrobe-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/run.invoker

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member serviceAccount:wardrobe-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/secretmanager.secretAccessor

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member serviceAccount:wardrobe-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/storage.objectAdmin
```

## 5. Create the Gemini API key

1. Go to Google AI Studio or Google Cloud API & Services.
2. Generate a Gemini API key.
3. Save it in Secret Manager.

```bash
gcloud secrets create google-cloud-api-key --replication-policy automatic
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add google-cloud-api-key --data-file=-
```

Then ensure the secret is mounted for Cloud Run via secret environment variables or env references.

## 6. Configure Cloud Run deployment

Example command:

```bash
gcloud run deploy wardrobe-selector \
  --image gcr.io/YOUR_PROJECT_ID/wardrobe-selector:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account wardrobe-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,PORT=8080,GOOGLE_CLOUD_PROJECT_ID=YOUR_PROJECT_ID,GOOGLE_CLOUD_STORAGE_BUCKET=wardrobe-uploads-your-project,GOOGLE_CLOUD_ENABLED=true,GOOGLE_CLOUD_MODEL=gemini-1.5-flash \
  --set-secrets GOOGLE_CLOUD_API_KEY=google-cloud-api-key:latest
```

## 7. Health check and smoke test

After deployment:

```bash
SERVICE_URL=$(gcloud run services describe wardrobe-selector --region us-central1 --format='value(status.url)')
curl -fsS "$SERVICE_URL/api/health"
```

Expected JSON includes:

```json
{
  "status": "ok",
  "service": "wardrobe-selector",
  "environment": "production"
}
```

## 8. Production security checklist

- Use Secret Manager for API keys
- Store uploaded files in Cloud Storage, not local disk
- Restrict service account permissions to minimum required
- Enable Cloud Logging and Monitoring
- Set budget alerts and quotas
- Keep admin panel behind auth
- Use Cloud Run revision traffic controls

## 9. Suggested next iteration

After this setup, the next production move is:
- protected admin auth
- PostgreSQL migration from SQLite
- structured AI metadata editing UI
- Cloud Storage signed-URL best practices
