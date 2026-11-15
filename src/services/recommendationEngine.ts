import { defaultRuleConfig, seasonByTemperature } from '../config/rules.js';
import type { Accessory, ColorValue, Item, Outfit, RecommendationInput, Slot } from '../domain.js';

function normalizeColorSet(colors: ColorValue[]): Set<string> {
  return new Set(colors.map((color) => color));
}

function scoreColorMatch(itemColors: ColorValue[], selectedColors: ColorValue[]): number {
  const selectedSet = normalizeColorSet(selectedColors);
  const shared = itemColors.filter((color) => selectedSet.has(color));
  return shared.length > 0 ? shared.length * 10 : 0;
}

function scoreSeasonMatch(itemSeasons: string[], season: string): number {
  return itemSeasons.includes(season) ? 20 : 0;
}

function scoreEventMatch(itemEvents: string[], event: string): number {
  return itemEvents.includes(event) ? 20 : 0;
}

export function buildOutfits(
  items: Item[],
  accessories: Accessory[],
  input: RecommendationInput
): Outfit[] {
  const season = seasonByTemperature(input.temperature);
  const selectedColors = normalizeColorSet(input.selectedColors);

  const tops = items.filter((item) => item.category === 'top' || item.category === 'outerwear');
  const bottoms = items.filter((item) => item.category === 'bottom' || (input.lowerType === 'dress' && item.category === 'dress'));
  const bags = accessories.filter((item) => item.type === 'bag');
  const jewelry = accessories.filter((item) => item.type === 'bracelet' || item.type === 'earrings' || item.type === 'ring' || item.type === 'belt');

  const candidates: Outfit[] = [];

  for (const top of tops) {
    const matchingBottoms = bottoms.filter((bottom) => {
      if (input.lowerType === 'dress') {
        return bottom.category === 'dress' || bottom.category === 'top';
      }
      return bottom.category === 'bottom';
    });

    for (const bottom of matchingBottoms) {
      const score =
        scoreColorMatch(top.color, input.selectedColors) +
        scoreColorMatch(bottom.color, input.selectedColors) +
        scoreSeasonMatch(top.season, season) +
        scoreSeasonMatch(bottom.season, season) +
        scoreEventMatch(top.events, input.event) +
        scoreEventMatch(bottom.events, input.event) +
        defaultRuleConfig.weights.color +
        defaultRuleConfig.weights.season +
        defaultRuleConfig.weights.event;

      const combinedColors = new Set([...top.color, ...bottom.color]);
      const matchedTags = [...combinedColors].filter((color) => selectedColors.has(color));

      candidates.push({
        id: `${top.id}-${bottom.id}`,
        name: `${top.name} + ${bottom.name}`,
        items: [
          { id: top.id, slot: top.slot as Slot, kind: 'item' as const },
          { id: bottom.id, slot: bottom.slot as Slot, kind: 'item' as const }
        ],
        score,
        matchedTags: [...matchedTags]
      });
    }
  }

  const packageWithAccessory = candidates.map((candidate) => {
    const bestAccessory = [...bags, ...jewelry].reduce<Accessory | undefined>((selected, accessory) => {
      if (!selected) return accessory;
      const currentScore = scoreColorMatch(accessory.color, input.selectedColors) + scoreEventMatch(accessory.events, input.event);
      const selectedScore = scoreColorMatch(selected.color, input.selectedColors) + scoreEventMatch(selected.events, input.event);
      return currentScore > selectedScore ? accessory : selected;
    }, undefined);

    if (!bestAccessory) {
      return candidate;
    }

    return {
      ...candidate,
      id: `${candidate.id}-${bestAccessory.id}`,
      name: `${candidate.name} + ${bestAccessory.name}`,
      items: [
        ...candidate.items,
        { id: bestAccessory.id, slot: 'accessory' as Slot, kind: 'accessory' as const }
      ],
      score: candidate.score + 15,
      matchedTags: [...candidate.matchedTags, ...bestAccessory.color]
    };
  });

  return packageWithAccessory
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxOutfits ?? 3);
}
