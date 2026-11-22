import { Router } from 'express';

import type { OutfitItem, Slot } from '../domain.js';
import { listItems, listAccessories, createOutfit, listOutfits } from '../store/storeAdapter.js';
import { findReplacementCandidates } from '../services/replacementEngine.js';

export const outfitRouter = Router();

outfitRouter.get('/', async (_req, res) => {
  const outfits = await listOutfits();
  res.json({ outfits });
});

outfitRouter.get('/replacements', async (req, res) => {
  const targetKind = req.query.kind === 'accessory' ? 'accessory' : 'item';
  const targetSlot = String(req.query.slot ?? '') as Slot;
  const targetId = String(req.query.itemId ?? req.query.targetId ?? '');
  const selectedColors = String(req.query.colors ?? '').split(',').filter(Boolean) as any[];
  const season = String(req.query.season ?? 'spring');
  const event = String(req.query.event ?? 'casual');

  if (!targetId || !targetSlot) {
    res.status(400).json({ message: 'targetId and slot are required' });
    return;
  }

  const [items, accessories] = await Promise.all([listItems(), listAccessories()]);
  const replacements = findReplacementCandidates({
    items,
    accessories,
    targetKind,
    targetSlot,
    targetId,
    selectedColors,
    season,
    event,
    limit: 6
  });

  res.json({ replacements });
});

outfitRouter.post('/replace', (req, res) => {
  const payload = req.body ?? {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const targetId = typeof payload.targetId === 'string' ? payload.targetId : '';
  const replacementId = typeof payload.replacementId === 'string' ? payload.replacementId : '';
  const replacementKind = payload.replacementKind === 'accessory' ? 'accessory' : 'item';

  if (!targetId || !replacementId) {
    res.status(400).json({ message: 'targetId and replacementId are required' });
    return;
  }

  const nextItems = items.map((item: OutfitItem) => {
    if (item.itemId === targetId || item.id === targetId) {
      return { id: replacementId, itemId: replacementId, slot: item.slot, kind: replacementKind };
    }
    return item;
  });

  res.json({ items: nextItems });
});

outfitRouter.post('/', async (req, res) => {
  const payload = req.body ?? {};

  if (!payload.name || !Array.isArray(payload.items)) {
    res.status(400).json({ message: 'Outfit name and items array are required' });
    return;
  }

  const outfit = await createOutfit(payload.name, payload.items);
  res.status(201).json({ outfit });
});
