import { Router } from 'express';

import { createOutfit, listOutfits } from '../store/catalogStore.js';

export const outfitRouter = Router();

outfitRouter.get('/', async (_req, res) => {
  const outfits = await listOutfits();
  res.json({ outfits });
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
