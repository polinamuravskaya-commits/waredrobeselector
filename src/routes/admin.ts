import { Router } from 'express';

import { aiModelCatalog, defaultAiConfig } from '../config/ai.js';
import { defaultRuleConfig } from '../config/rules.js';
import type { AiConfig, CropTemplate, RuleConfig } from '../domain.js';
import { GoogleCloudAiAdapter } from '../services/googleCloudAiAdapter.js';
import { createAiService } from '../services/aiService.js';
import { ensureDefaultRuleConfig, getAiConfig, listRules, updateAiConfig, updateRuleConfig } from '../store/storeAdapter.js';

const defaultCropTemplates: CropTemplate[] = [
  {
    id: 'top-template',
    category: 'top',
    label: 'Топ / блузка',
    aspectRatio: '4:5',
    recommendedBounds: { x: 16, y: 10, width: 68, height: 60 }
  },
  {
    id: 'bottom-template',
    category: 'bottom',
    label: 'Низ / брюки',
    aspectRatio: '4:5',
    recommendedBounds: { x: 20, y: 25, width: 60, height: 60 }
  },
  {
    id: 'dress-template',
    category: 'dress',
    label: 'Платье',
    aspectRatio: '3:4',
    recommendedBounds: { x: 18, y: 8, width: 64, height: 72 }
  },
  {
    id: 'accessory-template',
    category: 'accessory',
    label: 'Аксессуар',
    aspectRatio: '1:1',
    recommendedBounds: { x: 25, y: 20, width: 50, height: 50 }
  }
];

export const adminRouter = Router();

adminRouter.get('/config/rules', async (_req, res) => {
  const rules = await listRules();
  res.json({ rules: rules[0] ?? (await ensureDefaultRuleConfig()) });
});

adminRouter.post('/config/rules', async (req, res) => {
  const payload = req.body ?? {} as Partial<RuleConfig>;

  if (!payload.label) {
    res.status(400).json({ message: 'Rule label is required' });
    return;
  }

  const nextRules = await updateRuleConfig(payload);
  res.status(201).json({ rules: nextRules });
});

adminRouter.get('/config/tags', (_req, res) => {
  res.json({
    tags: [
      { key: 'color', label: 'Color', values: defaultRuleConfig.colors },
      { key: 'season', label: 'Season', values: defaultRuleConfig.seasons },
      { key: 'event', label: 'Event', values: defaultRuleConfig.events }
    ]
  });
});

adminRouter.get('/config/ai', async (_req, res) => {
  const config = await getAiConfig();
  res.json({
    config,
    availableModels: aiModelCatalog,
    provider: 'google-cloud'
  });
});

adminRouter.post('/config/ai', async (req, res) => {
  const payload = req.body ?? {} as Partial<AiConfig>;

  if (payload.modelId && !aiModelCatalog.some((model) => model.id === payload.modelId)) {
    res.status(400).json({ message: 'Selected AI model is not available for the configured provider.' });
    return;
  }

  const nextConfig = await updateAiConfig({
    enabled: payload.enabled ?? defaultAiConfig.enabled,
    provider: 'google-cloud',
    modelId: payload.modelId ?? defaultAiConfig.modelId,
    apiKeyConfigured: payload.apiKeyConfigured ?? defaultAiConfig.apiKeyConfigured
  });

  res.status(201).json({ config: nextConfig, availableModels: aiModelCatalog });
});

adminRouter.post('/config/ai/validate', async (req, res) => {
  const payload = req.body ?? {} as Partial<AiConfig>;
  const aiService = createAiService(new GoogleCloudAiAdapter());
  const validation = aiService.validateConfig({
    ...defaultAiConfig,
    ...payload,
    provider: 'google-cloud'
  });

  res.json({
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    provider: validation.provider,
    selectedModel: validation.selectedModel
  });
});

adminRouter.get('/crop-templates', (_req, res) => {
  res.json({ templates: defaultCropTemplates });
});

adminRouter.post('/crop-templates', (req, res) => {
  const payload = req.body ?? {} as Partial<CropTemplate>;

  if (!payload.label || !payload.category) {
    res.status(400).json({ message: 'Template label and category are required' });
    return;
  }

  const template: CropTemplate = {
    id: payload.id ?? `custom-${Date.now()}`,
    category: payload.category,
    label: payload.label,
    aspectRatio: payload.aspectRatio ?? '4:5',
    recommendedBounds: payload.recommendedBounds ?? {
      x: 20,
      y: 20,
      width: 60,
      height: 60
    }
  };

  res.status(201).json({ template });
});
