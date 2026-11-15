import type { ColorValue, EventType, RuleConfig, Season } from '../domain.js';

export const defaultRuleConfig: RuleConfig = {
  id: 'default-rule-set',
  label: 'Default wardrobe recommendation rules',
  version: 1,
  active: true,
  colors: ['red', 'orange', 'yellow', 'green', 'blue', 'turquoise', 'purple', 'pink', 'blush', 'white', 'black', 'brown', 'beige', 'polka', 'stripe'],
  seasons: ['spring', 'summer', 'autumn', 'winter'],
  events: ['school', 'walk', 'club', 'party', 'casual'],
  lowerTypeCompatibility: {
    pants: ['top', 'outerwear', 'shoes', 'bag'],
    skirt: ['top', 'outerwear', 'shoes', 'bag'],
    dress: ['shoes', 'bag', 'accessory']
  },
  weights: {
    color: 35,
    season: 25,
    event: 20,
    category: 20
  }
};

export const allColors: ColorValue[] = defaultRuleConfig.colors as ColorValue[];

export const seasonByTemperature = (temp: number): Season => {
  if (temp >= 26) return 'summer';
  if (temp >= 16) return 'spring';
  if (temp >= 8) return 'autumn';
  return 'winter';
};

export const eventMatrix: Record<EventType, Record<string, number>> = {
  school: { casual: 3, formal: 1, playful: 2 },
  walk: { casual: 4, sporty: 2, playful: 3 },
  club: { vivid: 4, trendy: 3, bold: 5 },
  party: { festive: 5, elegant: 4, bold: 4 },
  casual: { relaxed: 5, simple: 4, playful: 3 }
};
