# GCP integration plan

## Free-tier friendly setup
- Cloud Run for Node.js services
- Cloud Storage for uploaded garment images and processed crops
- Cloud SQL for persistent structured data
- Secret Manager for application secrets
- Cloud Build for pipeline automation
- Logging and Monitoring for health and errors

## Recommended pipeline
1. GitHub Actions runs lint, typecheck, unit tests, and build.
2. Staging deploy is triggered on merge to the main branch.
3. Production deploy is triggered on tag or release branch.
4. Health checks validate the deployed app before release is marked successful.

## Budget guards
- set quota alerts;
- use lifecycle rules for storage cleanup;
- prefer serverless over always-on compute;
- keep preview environments ephemeral.
