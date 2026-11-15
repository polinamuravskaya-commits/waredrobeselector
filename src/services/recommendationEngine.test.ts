import test from 'node:test';
import assert from 'node:assert/strict';

import { mockAccessories, mockCatalog } from '../data/mockCatalog.js';
import { buildOutfits } from './recommendationEngine.js';

test('returns top 3 outfits with dynamic color and event matching', () => {
  const outfits = buildOutfits(mockCatalog, mockAccessories, {
    selectedColors: ['yellow', 'pink'],
    lowerType: 'pants',
    temperature: 22,
    event: 'school',
    maxOutfits: 3
  });

  assert.ok(outfits.length > 0);
  assert.ok(outfits.length <= 3);
  assert.ok(outfits[0].score >= 0);
  assert.ok(outfits[0].items.length >= 2);
});
