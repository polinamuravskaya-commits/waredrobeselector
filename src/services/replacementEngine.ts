import type { Accessory, ColorValue, Item, Slot } from '../domain.js';

export interface ReplacementCandidate {
  id: string;
  name: string;
  kind: 'item' | 'accessory';
  slot: Slot;
  imageUrl: string;
  color: string[];
  score: number;
}

export function findReplacementCandidates(input: {
  items: Item[];
  accessories: Accessory[];
  targetKind: 'item' | 'accessory';
  targetSlot: Slot;
  targetId: string;
  selectedColors: ColorValue[];
  season: string;
  event: string;
  limit?: number;
}): ReplacementCandidate[] {
  const selected = new Set(input.selectedColors);
  const candidates: ReplacementCandidate[] = [];

  if (input.targetKind === 'item') {
    for (const item of input.items) {
      if (item.id === input.targetId || item.slot !== input.targetSlot) continue;
      const colorScore = item.color.filter((color) => selected.has(color)).length * 15;
      const seasonScore = item.season.includes(input.season as never) ? 20 : 0;
      const eventScore = item.events.includes(input.event as never) ? 20 : 0;
      candidates.push({
        id: item.id,
        name: item.name,
        kind: 'item',
        slot: item.slot,
        imageUrl: item.imageUrl,
        color: item.color,
        score: colorScore + seasonScore + eventScore
      });
    }
  } else {
    for (const accessory of input.accessories) {
      if (accessory.id === input.targetId) continue;
      const colorScore = accessory.color.filter((color) => selected.has(color)).length * 15;
      const seasonScore = accessory.season.includes(input.season as never) ? 20 : 0;
      const eventScore = accessory.events.includes(input.event as never) ? 20 : 0;
      candidates.push({
        id: accessory.id,
        name: accessory.name,
        kind: 'accessory',
        slot: 'accessory',
        imageUrl: accessory.imageUrl,
        color: accessory.color,
        score: colorScore + seasonScore + eventScore
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 6);
}
