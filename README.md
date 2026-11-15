# Wardrobe Selector

A mobile-first TypeScript application for teen wardrobe recommendations. The project is structured to support dynamic outfit rules, configurable tags, guided image cropping, and future AI-driven classification and recommendation improvements.

## Current implementation status
This repository now includes:
- a TypeScript + Node.js foundation;
- a dynamic rule configuration example;
- a recommendation engine prototype;
- an API endpoint for generating outfit suggestions;
- GitHub Actions workflow for CI;
- GitHub issue templates;
- documentation for architecture, dynamic rules, and GCP integration.

## Local development

```bash
npm install
npm run dev
```

The API exposes a basic health endpoint and a sample recommendations endpoint:

- GET /api/health
- POST /api/recommendations

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run lint
```

## Project direction

The app is designed around:
- dynamic colors, tags, and outfit rules;
- guided cropping templates for uploaded items;
- paper-doll style outfit rendering;
- Gmail authentication and protected user flows;
- GitHub-based delivery workflow and free-tier GCP deployment.

## GCP deployment preparation

The project includes a deployable Node.js app for Cloud Run with a real Docker build path and GitHub Actions deployment pipeline.

### Required secrets in GitHub
- `GCP_PROJECT_ID`
- `GCP_SERVICE_ACCOUNT_KEY`
- `GOOGLE_CLOUD_API_KEY` or `GOOGLE_CLOUD_SECRET_NAME`

### Required runtime environment variables
```bash
PORT=8080
NODE_ENV=production
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_API_KEY=your-api-key
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_MODEL=gemini-1.5-flash
```

### Cloud Run deployment
```bash
# Build the container locally
docker build -t wardrobe-selector:latest .

docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e GOOGLE_CLOUD_PROJECT_ID=your-project-id \
  -e GOOGLE_CLOUD_API_KEY=your-api-key \
  -e GOOGLE_CLOUD_ENABLED=true \
  -e GOOGLE_CLOUD_MODEL=gemini-1.5-flash \
  wardrobe-selector:latest
```

### Cloud Run smoke deployment
```bash
# Example: deploy then verify the app is answering
export CLOUD_RUN_URL=https://your-service-url.run.app
npm run cloudrun:smoke
```

The repository also includes a deployment workflow in [.github/workflows/deploy-gcp.yml](.github/workflows/deploy-gcp.yml) that builds the app, runs tests, deploys the container to Google Cloud Run, and performs a smoke test against `/api/health`.

## Main documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/dynamic-rules.md](docs/dynamic-rules.md)
- [docs/gcp-integration.md](docs/gcp-integration.md)
- [docs/ui-screen-structure.md](docs/ui-screen-structure.md)

## UI mockup

A mobile-first mockup of the main screens is available here:

- [public/ui/index.html](public/ui/index.html)

It includes the onboarding questionnaire, results screen, outfit detail view, replacement flow, and saved look ideas in a bright style consistent with the project brief.

## Future roadmap
1. catalog management UI
2. dynamic admin configuration panel
3. outfit replacement logic
4. paper-doll rendering
5. production deployment on GCP
6. AI enrichment layer
