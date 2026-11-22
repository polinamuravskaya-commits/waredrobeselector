import test from 'node:test';
import assert from 'node:assert/strict';

import type { Item, Accessory } from '../domain.js';
import { findReplacementCandidates } from './replacementEngine.js';

const item = (id: string, name: string, slot: Item['slot'], color: Item['color']): Item => ({
  id,
  name,
  category: slot === 'bottom' ? 'bottom' : 'top',
  slot,
  imageUrl: `/images/${id}.png`,
  color,
  season: ['spring'],
  events: ['casual'],
  tags: [],
  description: ''
});

test('replacement engine only returns candidates in the same slot', () => {
  const replacements = findReplacementCandidates({
    items: [
      item('bottom-a', 'Blue jeans', 'bottom', ['blue']),
      item('top-a', 'Pink top', 'top', ['pink']),
      item('bottom-b', 'Pink skirt', 'bottom', ['pink'])
    ],
    accessories: [] as Accessory[],
    targetKind: 'item',
    targetSlot: 'bottom',
    targetId: 'bottom-a',
    selectedColors: ['pink'],
    season: 'spring',
    event: 'casual'
  });

  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].id, 'bottom-b');
  assert.equal(replacements[0].slot, 'bottom');
});

test('replacement engine excludes the currently selected item', () => {
  const replacements = findReplacementCandidates({
    items: [item('bottom-a', 'Blue jeans', 'bottom', ['blue'])],
    accessories: [],
    targetKind: 'item',
    targetSlot: 'bottom',
    targetId: 'bottom-a',
    selectedColors: ['blue'],
    season: 'spring',
    event: 'casual'
  });

  assert.equal(replacements.length, 0);
});
