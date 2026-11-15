import type { Accessory, Item } from '../domain.js';

export const mockCatalog: Item[] = [
  {
    id: 'item-top-01',
    name: 'Sunny T-shirt',
    category: 'top',
    slot: 'top',
    imageUrl: 'https://example.invalid/top-1.png',
    color: ['yellow', 'white'],
    pattern: 'plain',
    season: ['spring', 'summer'],
    events: ['school', 'walk', 'casual'],
    tags: ['bright', 'youthful', 'cotton'],
    description: 'Light cotton top with a relaxed fit.'
  },
  {
    id: 'item-top-02',
    name: 'Berry Knit',
    category: 'top',
    slot: 'top',
    imageUrl: 'https://example.invalid/top-2.png',
    color: ['pink', 'blush'],
    pattern: 'plain',
    season: ['spring', 'autumn'],
    events: ['school', 'party', 'casual'],
    tags: ['soft', 'cozy'],
    description: 'Soft knit top in a flattering lilac-pink range.'
  },
  {
    id: 'item-bottom-01',
    name: 'Coastal Denim',
    category: 'bottom',
    slot: 'bottom',
    imageUrl: 'https://example.invalid/bottom-1.png',
    color: ['blue', 'white'],
    pattern: 'plain',
    season: ['spring', 'summer', 'autumn'],
    events: ['school', 'walk', 'casual'],
    tags: ['classic', 'everyday'],
    description: 'Classic relaxed denim for daily wear.'
  },
  {
    id: 'item-bottom-02',
    name: 'Pleated Skirt',
    category: 'bottom',
    slot: 'bottom',
    imageUrl: 'https://example.invalid/bottom-2.png',
    color: ['black', 'pink'],
    pattern: 'stripe',
    season: ['spring', 'summer', 'autumn'],
    events: ['school', 'club', 'party'],
    tags: ['feminine', 'playful'],
    description: 'A light pleated skirt with a playful feel.'
  },
  {
    id: 'item-dress-01',
    name: 'Mint Day Dress',
    category: 'dress',
    slot: 'dress',
    imageUrl: 'https://example.invalid/dress-1.png',
    color: ['green', 'turquoise'],
    pattern: 'plain',
    season: ['spring', 'summer'],
    events: ['walk', 'party', 'casual'],
    tags: ['fresh', 'easy'],
    description: 'A breezy day dress with a soft pastel palette.'
  }
];

export const mockAccessories: Accessory[] = [
  {
    id: 'acc-bag-01',
    name: 'Mini Shopper',
    type: 'bag',
    color: ['beige', 'white'],
    imageUrl: 'https://example.invalid/bag-1.png',
    season: ['spring', 'summer', 'autumn'],
    events: ['school', 'walk', 'casual'],
    description: 'Minimal bag with a clean silhouette.'
  },
  {
    id: 'acc-bracelet-01',
    name: 'Sunset Bracelet',
    type: 'bracelet',
    color: ['yellow', 'orange'],
    imageUrl: 'https://example.invalid/bracelet-1.png',
    season: ['spring', 'summer'],
    events: ['party', 'club', 'casual'],
    description: 'Warm-toned bracelet for playful styling.'
  },
  {
    id: 'acc-earrings-01',
    name: 'Pearl Drops',
    type: 'earrings',
    color: ['white', 'beige'],
    imageUrl: 'https://example.invalid/earring-1.png',
    season: ['spring', 'summer', 'winter'],
    events: ['party', 'school', 'casual'],
    description: 'Pearl-inspired earrings with a clean finish.'
  }
];
