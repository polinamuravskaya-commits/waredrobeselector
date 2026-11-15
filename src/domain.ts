export type ColorValue =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'turquoise'
  | 'purple'
  | 'pink'
  | 'blush'
  | 'white'
  | 'black'
  | 'brown'
  | 'beige'
  | 'polka'
  | 'stripe';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type EventType = 'school' | 'walk' | 'club' | 'party' | 'casual';
export type GarmentType = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';
export type Slot = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';

export interface TagDefinition {
  key: string;
  label: string;
  value: string;
  category: 'color' | 'pattern' | 'season' | 'event' | 'category' | 'style';
}

export interface AiClassificationMetadata {
  category?: string;
  color?: ColorValue[] | string[];
  season?: Season[] | string[];
  event?: EventType[] | string[];
  confidence?: number;
  summary?: string;
}

export interface AiCropMetadata {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rationale?: string;
  summary?: string;
}

export interface AiGenerationMetadata {
  summary?: string;
  tags?: string[];
  recommendations?: string[];
}

export interface ItemAiMetadata {
  classification?: AiClassificationMetadata;
  crop?: AiCropMetadata;
  generation?: AiGenerationMetadata;
  provider?: string;
  model?: string;
  analyzedAt?: string;
  source?: string;
}

export interface Item {
  id: string;
  name: string;
  category: GarmentType;
  slot: Slot;
  imageUrl: string;
  color: ColorValue[];
  pattern?: 'polka' | 'stripe' | 'plain';
  season: Season[];
  events: EventType[];
  tags: string[];
  description: string;
  aiMetadata?: ItemAiMetadata;
}

export interface Accessory {
  id: string;
  name: string;
  type: 'ring' | 'bag' | 'bracelet' | 'earrings' | 'belt' | 'sunglasses';
  color: ColorValue[];
  imageUrl: string;
  season: Season[];
  events: EventType[];
  description: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: Array<{ id: string; slot: Slot; kind: 'item' | 'accessory' }>;
  score: number;
  matchedTags: string[];
}

export interface RecommendationInput {
  selectedColors: ColorValue[];
  lowerType: 'pants' | 'skirt' | 'dress';
  temperature: number;
  event: EventType;
  maxOutfits?: number;
}

export interface RuleConfig {
  id: string;
  label: string;
  version: number;
  active: boolean;
  colors: ColorValue[];
  seasons: Season[];
  events: EventType[];
  lowerTypeCompatibility: Record<string, string[]>;
  weights: {
    color: number;
    season: number;
    event: number;
    category: number;
  };
}

export interface CropTemplate {
  id: string;
  category: GarmentType;
  label: string;
  aspectRatio: string;
  recommendedBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type AiProvider = 'google-cloud';

export interface AiModelDefinition {
  id: string;
  provider: AiProvider;
  label: string;
  model: string;
  capabilities: Array<'classification' | 'crop' | 'generation'>;
  description: string;
  defaultEnabled: boolean;
}

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  modelId: string;
  modelLabel: string;
  apiKeyConfigured: boolean;
  lastSavedAt?: string | null;
}
