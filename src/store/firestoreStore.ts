import { Firestore } from '@google-cloud/firestore';
import { randomUUID } from 'node:crypto';

import { defaultAiConfig, getAiModelById, getGoogleCloudApiKey, getGoogleCloudModelOverride, isGoogleCloudEnabledByEnv } from '../config/ai.js';
import { defaultRuleConfig } from '../config/rules.js';
import type { Accessory, AiConfig, Item, RuleConfig } from '../domain.js';
import { resolveGoogleCloudApiKey } from '../services/gcpSecretManager.js';

export function isFirestoreEnabled(): boolean {
  return process.env.DATA_STORE === 'firestore' || process.env.GOOGLE_CLOUD_PROJECT_ID !== undefined;
}

function getFirestore(): Firestore {
  return new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID ?? 'onesec'
  });
}

export async function seedFirestoreDefaults(): Promise<void> {
  const db = getFirestore();
  const ruleSnapshot = await db.collection('rule_sets').where('active', '==', true).limit(1).get();
  if (ruleSnapshot.empty) {
    await db.collection('rule_sets').doc(defaultRuleConfig.id).set({
      ...defaultRuleConfig,
      payload: defaultRuleConfig,
      createdAt: new Date().toISOString()
    });
  }

  const aiSnapshot = await db.collection('ai_config').limit(1).get();
  if (aiSnapshot.empty) {
    await db.collection('ai_config').doc(randomUUID()).set({
      ...defaultAiConfig,
      createdAt: new Date().toISOString()
    });
  }
}

export async function listFirestoreItems(): Promise<Item[]> {
  const db = getFirestore();
  const snapshot = await db.collection('items').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as Item);
}

export async function getFirestoreItemById(id: string): Promise<Item | undefined> {
  const db = getFirestore();
  const snapshot = await db.collection('items').doc(id).get();
  return snapshot.exists ? snapshot.data() as Item : undefined;
}

export async function addFirestoreItem(input: Partial<Item>): Promise<Item> {
  const db = getFirestore();
  const item: Item = {
    id: input.id ?? randomUUID(),
    name: input.name ?? 'Untitled item',
    category: input.category ?? 'top',
    slot: input.slot ?? 'top',
    imageUrl: input.imageUrl ?? 'https://example.invalid/placeholder.png',
    color: input.color ?? ['white'],
    pattern: input.pattern ?? 'plain',
    season: input.season ?? ['spring'],
    events: input.events ?? ['casual'],
    tags: input.tags ?? [],
    description: input.description ?? '',
    aiMetadata: input.aiMetadata
  };
  await db.collection('items').doc(item.id).set({ ...item, createdAt: new Date().toISOString() });
  return item;
}

export async function listFirestoreAccessories(): Promise<Accessory[]> {
  const db = getFirestore();
  const snapshot = await db.collection('accessories').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as Accessory);
}

export async function addFirestoreAccessory(input: Partial<Accessory>): Promise<Accessory> {
  const db = getFirestore();
  const accessory: Accessory = {
    id: input.id ?? randomUUID(),
    name: input.name ?? 'Untitled accessory',
    type: input.type ?? 'bag',
    color: input.color ?? ['white'],
    imageUrl: input.imageUrl ?? 'https://example.invalid/accessory-placeholder.png',
    season: input.season ?? ['spring'],
    events: input.events ?? ['casual'],
    description: input.description ?? ''
  };
  await db.collection('accessories').doc(accessory.id).set({ ...accessory, createdAt: new Date().toISOString() });
  return accessory;
}

export async function ensureFirestoreRuleConfig(): Promise<RuleConfig> {
  await seedFirestoreDefaults();
  const snapshot = await getFirestore().collection('rule_sets').where('active', '==', true).limit(1).get();
  if (snapshot.empty) return defaultRuleConfig;
  return snapshot.docs[0].data().payload as RuleConfig;
}

export async function listFirestoreRules(): Promise<RuleConfig[]> {
  await seedFirestoreDefaults();
  const snapshot = await getFirestore().collection('rule_sets').orderBy('version', 'desc').get();
  return snapshot.docs.map((doc) => doc.data().payload as RuleConfig);
}

export async function updateFirestoreRuleConfig(input: Partial<RuleConfig>): Promise<RuleConfig> {
  const active = await ensureFirestoreRuleConfig();
  const next: RuleConfig = {
    ...active,
    ...input,
    id: input.id ?? randomUUID(),
    version: input.version ?? active.version + 1,
    active: input.active ?? true
  };

  const db = getFirestore();
  const batch = db.batch();
  const activeSnapshot = await db.collection('rule_sets').where('active', '==', true).get();
  activeSnapshot.docs.forEach((doc) => batch.update(doc.ref, { active: false }));
  batch.set(db.collection('rule_sets').doc(next.id), {
    ...next,
    payload: next,
    active: next.active,
    createdAt: new Date().toISOString()
  });
  await batch.commit();
  return next;
}

export async function getFirestoreAiConfig(): Promise<AiConfig> {
  await seedFirestoreDefaults();
  const snapshot = await getFirestore().collection('ai_config').orderBy('createdAt', 'desc').limit(1).get();
  const row = snapshot.empty ? {} : snapshot.docs[0].data();
  const parsed = row as Partial<AiConfig>;
  const envModel = getGoogleCloudModelOverride() ?? defaultAiConfig.modelId;
  const candidateModelId = parsed.modelId ?? envModel;
  const fallbackModel = getAiModelById(candidateModelId) ?? getAiModelById(defaultAiConfig.modelId);
  const resolvedSecretApiKey = await resolveGoogleCloudApiKey();

  return {
    ...defaultAiConfig,
    ...parsed,
    enabled: Boolean(parsed.enabled ?? isGoogleCloudEnabledByEnv()),
    modelId: fallbackModel?.id ?? defaultAiConfig.modelId,
    modelLabel: fallbackModel?.label ?? defaultAiConfig.modelLabel,
    apiKeyConfigured: Boolean(getGoogleCloudApiKey() || resolvedSecretApiKey || parsed.apiKeyConfigured),
    provider: 'google-cloud'
  };
}

export async function updateFirestoreAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  const current = await getFirestoreAiConfig();
  const selectedModel = getAiModelById(input.modelId ?? current.modelId) ?? getAiModelById(defaultAiConfig.modelId)!;
  const next: AiConfig = {
    enabled: input.enabled ?? current.enabled,
    provider: 'google-cloud',
    modelId: selectedModel.id,
    modelLabel: selectedModel.label,
    apiKeyConfigured: Boolean(input.apiKeyConfigured ?? current.apiKeyConfigured ?? getGoogleCloudApiKey()),
    lastSavedAt: new Date().toISOString()
  };
  await getFirestore().collection('ai_config').doc(randomUUID()).set({ ...next, createdAt: new Date().toISOString() });
  return next;
}

export async function listFirestoreOutfits(): Promise<Array<{ id: string; name: string; items: Array<{ id: string; slot: string; kind: string; itemId: string }> }>> {
  const snapshot = await getFirestore().collection('outfits').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, name: data.name as string, items: data.items as Array<{ id: string; slot: string; kind: string; itemId: string }> };
  });
}

export async function createFirestoreOutfit(name: string, items: Array<{ slot: string; kind: string; itemId: string }>): Promise<{ id: string; name: string; items: Array<{ slot: string; kind: string; itemId: string }> }> {
  const outfitId = randomUUID();
  const outfit = { id: outfitId, name, items, createdAt: new Date().toISOString() };
  await getFirestore().collection('outfits').doc(outfitId).set(outfit);
  return { id: outfitId, name, items };
}
