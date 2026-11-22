import { Router } from 'express';

import type { Accessory, Item } from '../domain.js';
import { addAccessory, addItem, getAccessoryById, getItemById, listAccessories, listItems } from '../store/storeAdapter.js';

export const catalogRouter = Router();

catalogRouter.get('/items', async (_req, res) => {
  const items = await listItems();
  res.json({ items });
});

catalogRouter.get('/items/:id', async (req, res) => {
  const item = await getItemById(req.params.id);

  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  res.json({ item });
});

catalogRouter.post('/items', async (req, res) => {
  const payload = req.body ?? {} as Partial<Item>;

  if (!payload.name || !payload.category || !payload.slot) {
    res.status(400).json({ message: 'Item name, category and slot are required' });
    return;
  }

  const item = await addItem(payload);
  res.status(201).json({ item });
});

catalogRouter.get('/accessories', async (_req, res) => {
  const accessories = await listAccessories();
  res.json({ accessories });
});

catalogRouter.get('/accessories/:id', async (req, res) => {
  const accessory = await getAccessoryById(req.params.id);

  if (!accessory) {
    res.status(404).json({ message: 'Accessory not found' });
    return;
  }

  res.json({ accessory });
});

catalogRouter.post('/accessories', async (req, res) => {
  const payload = req.body ?? {} as Partial<Accessory>;

  if (!payload.name || !payload.type) {
    res.status(400).json({ message: 'Accessory name and type are required' });
    return;
  }

  const accessory = await addAccessory(payload);
  res.status(201).json({ accessory });
});
