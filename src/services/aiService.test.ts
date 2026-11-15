import test from 'node:test';
import assert from 'node:assert/strict';

import {AiService, createAiService} from './aiService.js';
import {GoogleCloudAiAdapter} from './googleCloudAiAdapter.js';

const validConfig = {
  enabled: true,
  provider: 'google-cloud' as const,
  modelId: 'gemini-1.5-flash',
  modelLabel: 'Gemini 1.5 Flash',
  apiKeyConfigured: true,
  lastSavedAt: new Date().toISOString()
};

test('ai service rejects a disabled provider before execution', async () => {
  const service = createAiService(new GoogleCloudAiAdapter());
  const result = await service.execute({
    operation: 'classification',
    modelId: 'gemini-1.5-flash',
    imageUrl: '/uploads/example.png'
  }, { ...validConfig, enabled: false });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'disabled');
});

test('ai service validates model availability and rejects invalid model ids', async () => {
  const service = createAiService(new GoogleCloudAiAdapter());
  const validation = await service.validateConfig({
    ...validConfig,
    modelId: 'unknown-model'
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('model')));
});

test('google cloud adapter executes in safe stub mode when api key is not configured', async () => {
  const adapter = new GoogleCloudAiAdapter();
  const result = await adapter.execute({
    operation: 'crop',
    modelId: 'gemini-1.5-flash',
    imageUrl: '/uploads/example.png'
  }, {
    enabled: true,
    provider: 'google-cloud',
    modelId: 'gemini-1.5-flash',
    modelLabel: 'Gemini 1.5 Flash',
    apiKeyConfigured: false
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'not-configured');
  assert.match(result.message, /key|configured/i);
});

test('ai service returns success for configured google cloud model when fetch succeeds', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GOOGLE_CLOUD_API_KEY;
  process.env.GOOGLE_CLOUD_API_KEY = 'fake-test-key';

  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{
      content: {
        parts: [{ text: 'A light summer denim outfit works well.' }]
      }
    }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const service = createAiService(new GoogleCloudAiAdapter());
    const result = await service.execute({
      operation: 'generation',
      modelId: 'gemini-1.5-flash',
      prompt: 'Create a summer look suggestion',
      imageUrl: '/uploads/example.png'
    }, {
      ...validConfig,
      enabled: true,
      apiKeyConfigured: true
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.equal(result.provider, 'google-cloud');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) {
      delete process.env.GOOGLE_CLOUD_API_KEY;
    } else {
      process.env.GOOGLE_CLOUD_API_KEY = previousKey;
    }
  }
});

export { AiService };
