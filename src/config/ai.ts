export type AiProvider = 'google-cloud';
export type AiCapability = 'classification' | 'crop' | 'generation';

export interface AiModelDefinition {
  id: string;
  provider: AiProvider;
  label: string;
  model: string;
  capabilities: AiCapability[];
  description: string;
  defaultEnabled: boolean;
}

export const aiModelCatalog: AiModelDefinition[] = [
  {
    id: 'gemini-1.5-flash',
    provider: 'google-cloud',
    label: 'Gemini 1.5 Flash',
    model: 'gemini-1.5-flash',
    capabilities: ['classification', 'crop', 'generation'],
    description: 'Fast and cost-effective model for image tagging and crop suggestions.',
    defaultEnabled: true
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google-cloud',
    label: 'Gemini 1.5 Pro',
    model: 'gemini-1.5-pro',
    capabilities: ['classification', 'crop', 'generation'],
    description: 'Stronger reasoning for higher-quality recommendations and description generation.',
    defaultEnabled: false
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'google-cloud',
    label: 'Gemini 2.0 Flash',
    model: 'gemini-2.0-flash',
    capabilities: ['classification', 'crop', 'generation'],
    description: 'Modern default option for activity and styling classification.',
    defaultEnabled: false
  }
];

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  modelId: string;
  modelLabel: string;
  apiKeyConfigured: boolean;
  lastSavedAt?: string | null;
}

export const defaultAiConfig: AiConfig = {
  enabled: false,
  provider: 'google-cloud',
  modelId: 'gemini-1.5-flash',
  modelLabel: 'Gemini 1.5 Flash',
  apiKeyConfigured: false,
  lastSavedAt: null
};

export function getGoogleCloudApiKey(): string | undefined {
  const value = process.env.GOOGLE_CLOUD_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  return value.trim() || undefined;
}

export function getGoogleCloudModelOverride(): string | undefined {
  const value = process.env.GOOGLE_CLOUD_MODEL ?? process.env.GEMINI_MODEL ?? '';
  return value.trim() || undefined;
}

export function isGoogleCloudEnabledByEnv(): boolean {
  const value = process.env.GOOGLE_CLOUD_ENABLED ?? process.env.GEMINI_ENABLED ?? 'false';
  return value.toLowerCase() === 'true' || value === '1';
}

export function getAiModelById(modelId: string): AiModelDefinition | undefined {
  return aiModelCatalog.find((model) => model.id === modelId);
}

export function getAiModelsByProvider(provider: AiProvider): AiModelDefinition[] {
  return aiModelCatalog.filter((model) => model.provider === provider);
}
