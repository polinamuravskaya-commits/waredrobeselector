import { Router } from 'express';

import { aiModelCatalog } from '../config/ai.js';
import { createAiService } from '../services/aiService.js';
import { GoogleCloudAiAdapter } from '../services/googleCloudAiAdapter.js';
import { getAiConfig } from '../store/storeAdapter.js';

const supportedOperations = ['classification', 'crop', 'generation'] as const;

export const aiRouter = Router();

aiRouter.get('/capabilities', async (_req, res) => {
  const config = await getAiConfig();

  res.json({
    provider: 'google-cloud',
    supportedOperations,
    models: aiModelCatalog,
    config
  });
});

aiRouter.post('/analyze', async (req, res) => {
  const payload = req.body ?? {};
  const operation = supportedOperations.includes(payload.operation)
    ? payload.operation
    : 'classification';

  const config = await getAiConfig();
  const aiService = createAiService(new GoogleCloudAiAdapter());

  const result = await aiService.execute({
    operation,
    modelId: payload.modelId ?? config.modelId,
    imageUrl: payload.imageUrl,
    prompt: payload.prompt,
    metadata: payload.metadata
  }, {
    ...config,
    enabled: payload.enabled ?? config.enabled,
    apiKeyConfigured: payload.apiKeyConfigured ?? config.apiKeyConfigured
  });

  res.json({
    operation,
    supportedOperations,
    config,
    result
  });
});
