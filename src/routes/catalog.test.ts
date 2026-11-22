import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { createApp } from '../app.js';
import { getGoogleCloudStorageBucketName, isGoogleCloudStorageEnabled } from '../services/gcpStorage.js';

async function requestJson(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return {
      status: response.status,
      body: await response.json()
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('root route redirects to the client in development', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'http://localhost:5174');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test('catalog items endpoint returns the wardrobe catalog', async () => {
  const response = await requestJson('/api/catalog/items');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.items));
  assert.ok(response.body.items.length >= 1);
});

test('admin rules endpoint returns the active rule config', async () => {
  const response = await requestJson('/api/admin/config/rules');

  assert.equal(response.status, 200);
  assert.ok(response.body.rules);
  assert.equal(response.body.rules.active, true);
});

test('admin route can create a new rule config version', async () => {
  const response = await requestJson('/api/admin/config/rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      label: 'Updated rules',
      active: true,
      colors: ['pink', 'blue', 'white'],
      seasons: ['spring', 'summer'],
      events: ['school', 'walk'],
      weights: {
        color: 40,
        season: 20,
        event: 20,
        category: 20
      }
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.rules.label, 'Updated rules');
  assert.ok(response.body.rules.version >= 1);
});

test('admin crop templates endpoint lists default templates', async () => {
  const response = await requestJson('/api/admin/crop-templates');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.templates));
  assert.ok(response.body.templates.length >= 1);
  assert.ok(response.body.templates[0].category);
});

test('admin routes require credentials when admin auth is enabled', async () => {
  const previousUsername = process.env.ADMIN_USERNAME;
  const previousPassword = process.env.ADMIN_PASSWORD;

  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'secret';

  try {
    const unauthorized = await requestJson('/api/admin/config/rules');
    assert.equal(unauthorized.status, 401);

    const encoded = Buffer.from('admin:secret').toString('base64');
    const authorized = await requestJson('/api/admin/config/rules', {
      headers: {
        Authorization: `Basic ${encoded}`
      }
    });

    assert.equal(authorized.status, 200);
    assert.ok(authorized.body.rules);
  } finally {
    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }
  }
});

test('admin routes accept a JWT bearer token when configured', async () => {
  const previousJwtSecret = process.env.ADMIN_JWT_SECRET;
  const previousUsername = process.env.ADMIN_USERNAME;
  const previousPassword = process.env.ADMIN_PASSWORD;

  process.env.ADMIN_JWT_SECRET = 'super-secret-admin-key';
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;

  try {
    const unauthorized = await requestJson('/api/admin/config/rules');
    assert.equal(unauthorized.status, 401);

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET!).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${signature}`;

    const response = await requestJson('/api/admin/config/rules', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    assert.equal(response.status, 200);
    assert.ok(response.body.rules);
  } finally {
    if (previousJwtSecret === undefined) {
      delete process.env.ADMIN_JWT_SECRET;
    } else {
      process.env.ADMIN_JWT_SECRET = previousJwtSecret;
    }

    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }
  }
});

test('gcp storage settings can be read from environment before upload', () => {
  const previousBucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  const previousProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  process.env.GOOGLE_CLOUD_STORAGE_BUCKET = 'demo-wardrobe-bucket';
  process.env.GOOGLE_CLOUD_PROJECT_ID = 'demo-project';

  try {
    assert.equal(getGoogleCloudStorageBucketName(), 'demo-wardrobe-bucket');
    assert.equal(isGoogleCloudStorageEnabled(), true);
  } finally {
    if (previousBucket === undefined) {
      delete process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    } else {
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET = previousBucket;
    }

    if (previousProjectId === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT_ID;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT_ID = previousProjectId;
    }
  }
});

test('uploads endpoint stores a real image file and returns a public URL', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as { port: number };
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake image bytes')], { type: 'image/png' }), 'test-upload.png');

    const response = await fetch(`http://127.0.0.1:${port}/api/uploads`, {
      method: 'POST',
      body: form
    });

    assert.equal(response.status, 201);
    assert.ok(response.headers.get('content-type')?.includes('application/json'));
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.ok(typeof response.url === 'string');
    assert.ok((await response.json()).url.includes('/uploads/'));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test('admin ai config exposes selectable Google Cloud models and default toggle state', async () => {
  const response = await requestJson('/api/admin/config/ai');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.availableModels));
  assert.ok(response.body.availableModels.length >= 1);
  assert.equal(response.body.config.provider, 'google-cloud');
  assert.equal(response.body.config.enabled, false);
  assert.ok(response.body.config.modelId);
});

test('ai analysis endpoint returns a safe gated response for classification requests', async () => {
  const response = await requestJson('/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation: 'classification',
      imageUrl: '/uploads/example.png',
      prompt: 'Classify the clothing piece'
    })
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.result);
  assert.ok(['disabled', 'not-configured', 'stubbed', 'invalid'].includes(response.body.result.status));
});

test('ai classification route returns structured classification metadata', async () => {
  const response = await requestJson('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'classification',
      imageUrl: '/uploads/test.png',
      prompt: 'Classify this clothing piece',
      metadata: { source: 'manual-preview' }
    })
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.result);
  assert.ok(response.body.result.data || response.body.result.message);
});

test('catalog accepts a new item through the admin flow', async () => {
  const response = await requestJson('/api/catalog/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Admin New Blouse',
      category: 'top',
      slot: 'top',
      imageUrl: 'https://example.invalid/admin-blouse.png',
      color: ['pink', 'white'],
      season: ['spring', 'summer'],
      events: ['school', 'party'],
      tags: ['soft', 'fresh'],
      description: 'Blouse uploaded via admin panel.'
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.item.name, 'Admin New Blouse');
  assert.equal(response.body.item.slot, 'top');
});

test('catalog item stores ai metadata when provided', async () => {
  const response = await requestJson('/api/catalog/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'AI Metadata Blouse',
      category: 'top',
      slot: 'top',
      imageUrl: '/uploads/metadata-test.png',
      color: ['pink'],
      season: ['spring'],
      events: ['school'],
      tags: ['soft'],
      aiMetadata: {
        classification: {
          category: 'top',
          confidence: 0.93
        },
        crop: {
          x: 10,
          y: 20,
          width: 70,
          height: 60
        }
      }
    })
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.item.aiMetadata);
  assert.equal(response.body.item.aiMetadata.classification.category, 'top');
});

test('outfit routes can create and fetch a saved outfit with items', async () => {
  const createResponse = await requestJson('/api/outfits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Checked school combo',
      items: [
        { slot: 'top', kind: 'item', itemId: 'item-top-01' },
        { slot: 'bottom', kind: 'item', itemId: 'item-bottom-01' },
        { slot: 'accessory', kind: 'accessory', itemId: 'acc-bag-01' }
      ]
    })
  });

  assert.equal(createResponse.status, 201);
  assert.ok(createResponse.body.outfit.id);

  const listResponse = await requestJson('/api/outfits');
  assert.equal(listResponse.status, 200);
  assert.ok(Array.isArray(listResponse.body.outfits));
  assert.ok(listResponse.body.outfits.length >= 1);
});
