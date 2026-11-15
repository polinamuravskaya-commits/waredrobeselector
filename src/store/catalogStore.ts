import { randomUUID } from 'node:crypto';

import { defaultAiConfig, getAiModelById, getGoogleCloudApiKey, getGoogleCloudModelOverride, isGoogleCloudEnabledByEnv } from '../config/ai.js';
import { defaultRuleConfig } from '../config/rules.js';
import { allSql, ensureDatabaseReady, getSql, runSql } from '../db/database.js';
import type { Accessory, AiConfig, ColorValue, Item, RuleConfig } from '../domain.js';
import { resolveGoogleCloudApiKey } from '../services/gcpSecretManager.js';

function normalizeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function parseColors(raw: string | null): ColorValue[] {
  if (!raw) return [];
  return raw.split(',').filter(Boolean) as ColorValue[];
}

function serializeArray(values: string[] | ColorValue[]): string {
  return values.join(',');
}

function parseAiMetadata(raw: string | null): Item['aiMetadata'] | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Item['aiMetadata'];
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function serializeAiMetadata(value: Item['aiMetadata'] | undefined): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

async function ensureTagRecords(tagValues: string[], category: string): Promise<string[]> {
  if (tagValues.length === 0) {
    return [];
  }

  const ids: string[] = [];

  for (const tagValue of tagValues) {
    const normalized = tagValue.trim();
    if (!normalized) continue;

    const existing = await getSql<{ id: string }>(
      'SELECT id FROM tags WHERE name = ? AND category = ?',
      [normalized, category]
    );

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const id = randomUUID();
    await runSql('INSERT INTO tags (id, name, category) VALUES (?, ?, ?)', [id, normalized, category]);
    ids.push(id);
  }

  return ids;
}

async function attachItemTags(itemId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;

  const tagIds = await ensureTagRecords(tags, 'item');

  for (const tagId of tagIds) {
    await runSql('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)', [itemId, tagId]);
  }
}

async function attachAccessoryTags(accessoryId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;

  const tagIds = await ensureTagRecords(tags, 'accessory');

  for (const tagId of tagIds) {
    await runSql('INSERT OR IGNORE INTO accessory_tags (accessory_id, tag_id) VALUES (?, ?)', [accessoryId, tagId]);
  }
}

async function readItemTags(itemId: string): Promise<string[]> {
  const rows = await allSql<{ name: string }>(
    `SELECT t.name FROM tags t
     INNER JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = ?`,
    [itemId]
  );

  return rows.map((row) => row.name);
}

async function readAccessoryTags(accessoryId: string): Promise<string[]> {
  const rows = await allSql<{ name: string }>(
    `SELECT t.name FROM tags t
     INNER JOIN accessory_tags at ON at.tag_id = t.id
     WHERE at.accessory_id = ?`,
    [accessoryId]
  );

  return rows.map((row) => row.name);
}

export async function listItems(): Promise<Item[]> {
  await ensureDatabaseReady();

  const rows = await allSql<{
    id: string;
    name: string;
    category: Item['category'];
    slot: Item['slot'];
    image_url: string | null;
    color: string | null;
    pattern: Item['pattern'];
    season: string | null;
    events: string | null;
    description: string | null;
    ai_metadata: string | null;
  }>(`SELECT * FROM items ORDER BY created_at DESC`);

  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    slot: row.slot,
    imageUrl: row.image_url ?? 'https://example.invalid/placeholder.png',
    color: parseColors(row.color),
    pattern: row.pattern ?? 'plain',
    season: normalizeArray((row.season ? row.season.split(',') : []) as Item['season']),
    events: normalizeArray((row.events ? row.events.split(',') : []) as Item['events']),
    tags: await readItemTags(row.id),
    description: row.description ?? '',
    aiMetadata: parseAiMetadata(row.ai_metadata)
  })));
}

export async function getItemById(id: string): Promise<Item | undefined> {
  await ensureDatabaseReady();

  const row = await getSql<{
    id: string;
    name: string;
    category: Item['category'];
    slot: Item['slot'];
    image_url: string | null;
    color: string | null;
    pattern: Item['pattern'];
    season: string | null;
    events: string | null;
    description: string | null;
    ai_metadata: string | null;
  }>('SELECT * FROM items WHERE id = ?', [id]);

  if (!row) return undefined;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    slot: row.slot,
    imageUrl: row.image_url ?? 'https://example.invalid/placeholder.png',
    color: parseColors(row.color),
    pattern: row.pattern ?? 'plain',
    season: normalizeArray((row.season ? row.season.split(',') : []) as Item['season']),
    events: normalizeArray((row.events ? row.events.split(',') : []) as Item['events']),
    tags: await readItemTags(row.id),
    description: row.description ?? '',
    aiMetadata: parseAiMetadata(row.ai_metadata)
  };
}

export async function addItem(input: Partial<Item>): Promise<Item> {
  await ensureDatabaseReady();

  const itemId = input.id ?? randomUUID();
  const item: Item = {
    id: itemId,
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

  await runSql(
    `INSERT INTO items (id, name, category, slot, image_url, color, pattern, season, events, description, ai_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.name,
      item.category,
      item.slot,
      item.imageUrl,
      serializeArray(item.color),
      item.pattern ?? 'plain',
      serializeArray(item.season.map((season) => season.toString())),
      serializeArray(item.events.map((event) => event.toString())),
      item.description,
      serializeAiMetadata(item.aiMetadata)
    ]
  );

  await attachItemTags(item.id, item.tags);
  return item;
}

export async function listAccessories(): Promise<Accessory[]> {
  await ensureDatabaseReady();

  const rows = await allSql<{
    id: string;
    name: string;
    type: Accessory['type'];
    color: string | null;
    image_url: string | null;
    season: string | null;
    events: string | null;
    description: string | null;
  }>(`SELECT * FROM accessories ORDER BY created_at DESC`);

  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    color: parseColors(row.color),
    imageUrl: row.image_url ?? 'https://example.invalid/accessory-placeholder.png',
    season: normalizeArray((row.season ? row.season.split(',') : []) as Accessory['season']),
    events: normalizeArray((row.events ? row.events.split(',') : []) as Accessory['events']),
    description: row.description ?? '',
    tags: await readAccessoryTags(row.id)
  } as Accessory & { tags?: string[] })));
}

export async function getAccessoryById(id: string): Promise<Accessory | undefined> {
  await ensureDatabaseReady();

  const row = await getSql<{
    id: string;
    name: string;
    type: Accessory['type'];
    color: string | null;
    image_url: string | null;
    season: string | null;
    events: string | null;
    description: string | null;
  }>('SELECT * FROM accessories WHERE id = ?', [id]);

  if (!row) return undefined;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: parseColors(row.color),
    imageUrl: row.image_url ?? 'https://example.invalid/accessory-placeholder.png',
    season: normalizeArray((row.season ? row.season.split(',') : []) as Accessory['season']),
    events: normalizeArray((row.events ? row.events.split(',') : []) as Accessory['events']),
    description: row.description ?? '',
    tags: await readAccessoryTags(row.id)
  } as Accessory & { tags?: string[] };
}

export async function addAccessory(input: Partial<Accessory>): Promise<Accessory> {
  await ensureDatabaseReady();

  const accessoryId = input.id ?? randomUUID();
  const accessory: Accessory & { tags?: string[] } = {
    id: accessoryId,
    name: input.name ?? 'Untitled accessory',
    type: input.type ?? 'bag',
    color: input.color ?? ['white'],
    imageUrl: input.imageUrl ?? 'https://example.invalid/accessory-placeholder.png',
    season: input.season ?? ['spring'],
    events: input.events ?? ['casual'],
    description: input.description ?? '',
    tags: []
  };

  await runSql(
    `INSERT INTO accessories (id, name, type, color, image_url, season, events, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      accessory.id,
      accessory.name,
      accessory.type,
      serializeArray(accessory.color),
      accessory.imageUrl,
      serializeArray(accessory.season.map((season) => season.toString())),
      serializeArray(accessory.events.map((event) => event.toString())),
      accessory.description
    ]
  );

  await attachAccessoryTags(accessory.id, accessory.tags ?? []);
  return accessory as Accessory;
}

export async function ensureDefaultRuleConfig(): Promise<RuleConfig> {
  await ensureDatabaseReady();

  const existing = await getSql<{ id: string; payload: string }>(
    'SELECT id, payload FROM rule_sets WHERE active = 1 ORDER BY version DESC LIMIT 1'
  );

  if (existing) {
    return JSON.parse(existing.payload) as RuleConfig;
  }

  const nextRuleConfig = { ...defaultRuleConfig };
  await runSql(
    'INSERT INTO rule_sets (id, label, payload, version, active) VALUES (?, ?, ?, ?, ?)',
    [nextRuleConfig.id, nextRuleConfig.label, JSON.stringify(nextRuleConfig), nextRuleConfig.version, 1]
  );

  return nextRuleConfig;
}

export async function listRules(): Promise<RuleConfig[]> {
  await ensureDatabaseReady();

  const rows = await allSql<{ id: string; label: string; payload: string; version: number; active: number }>(
    'SELECT * FROM rule_sets ORDER BY version DESC, created_at DESC'
  );

  return rows.map((row) => ({
    ...JSON.parse(row.payload),
    id: row.id,
    label: row.label,
    version: row.version,
    active: Boolean(row.active)
  }));
}

export async function updateRuleConfig(input: Partial<RuleConfig>): Promise<RuleConfig> {
  await ensureDatabaseReady();

  const activeRule = await ensureDefaultRuleConfig();
  const nextRule: RuleConfig = {
    ...activeRule,
    ...input,
    id: input.id ?? randomUUID(),
    version: input.version ?? activeRule.version + 1,
    active: input.active ?? true
  };

  await runSql(
    'INSERT INTO rule_sets (id, label, payload, version, active) VALUES (?, ?, ?, ?, ?)',
    [nextRule.id, nextRule.label, JSON.stringify(nextRule), nextRule.version, nextRule.active ? 1 : 0]
  );

  return nextRule;
}

export async function getAiConfig(): Promise<AiConfig> {
  await ensureDatabaseReady();

  const row = await getSql<{ payload: string }>(
    'SELECT payload FROM ai_config ORDER BY created_at DESC LIMIT 1'
  );

  if (!row) {
    const next = { ...defaultAiConfig };
    await runSql('INSERT INTO ai_config (id, payload) VALUES (?, ?)', [randomUUID(), JSON.stringify(next)]);
    return next;
  }

  const parsed = JSON.parse(row.payload) as Partial<AiConfig>;
  const envModel = getGoogleCloudModelOverride() ?? defaultAiConfig.modelId;
  const candidateModelId = parsed.modelId ?? envModel;
  const fallbackModel = getAiModelById(candidateModelId) ?? getAiModelById(defaultAiConfig.modelId);
  const resolvedSecretApiKey = await resolveGoogleCloudApiKey();
  const apiKeyConfigured = Boolean(getGoogleCloudApiKey() || resolvedSecretApiKey || parsed.apiKeyConfigured);

  return {
    ...defaultAiConfig,
    ...parsed,
    enabled: Boolean(parsed.enabled ?? isGoogleCloudEnabledByEnv()),
    modelId: fallbackModel?.id ?? defaultAiConfig.modelId,
    modelLabel: fallbackModel?.label ?? defaultAiConfig.modelLabel,
    apiKeyConfigured,
    provider: 'google-cloud'
  };
}

export async function updateAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  await ensureDatabaseReady();

  const current = await getAiConfig();
  const selectedModel = getAiModelById(input.modelId ?? current.modelId) ?? getAiModelById(defaultAiConfig.modelId)!;

  const nextConfig: AiConfig = {
    enabled: input.enabled ?? current.enabled,
    provider: 'google-cloud',
    modelId: selectedModel.id,
    modelLabel: selectedModel.label,
    apiKeyConfigured: Boolean(input.apiKeyConfigured ?? current.apiKeyConfigured ?? getGoogleCloudApiKey()),
    lastSavedAt: new Date().toISOString()
  };

  await runSql('INSERT INTO ai_config (id, payload) VALUES (?, ?)', [randomUUID(), JSON.stringify(nextConfig)]);
  return nextConfig;
}

export async function listOutfits(): Promise<Array<{ id: string; name: string; items: Array<{ id: string; slot: string; kind: string; itemId: string }> }>> {
  await ensureDatabaseReady();

  const rows = await allSql<{ id: string; name: string; slot: string; kind: string; item_id: string; position: number }>(
    `SELECT o.id, o.name, oi.slot, oi.kind, oi.item_id, oi.position
     FROM outfits o
     LEFT JOIN outfit_items oi ON oi.outfit_id = o.id
     ORDER BY o.created_at DESC, oi.position ASC`
  );

  const grouped = new Map<string, { id: string; name: string; items: Array<{ id: string; slot: string; kind: string; itemId: string }> }>();

  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, { id: row.id, name: row.name, items: [] });
    }

    const outfit = grouped.get(row.id)!;
    if (row.item_id) {
      outfit.items.push({ id: row.id, slot: row.slot, kind: row.kind, itemId: row.item_id });
    }
  }

  return [...grouped.values()];
}

export async function createOutfit(name: string, items: Array<{ slot: string; kind: string; itemId: string }>): Promise<{ id: string; name: string; items: Array<{ slot: string; kind: string; itemId: string }> }> {
  await ensureDatabaseReady();

  const outfitId = randomUUID();
  await runSql('INSERT INTO outfits (id, name) VALUES (?, ?)', [outfitId, name]);

  for (const [index, item] of items.entries()) {
    const itemId = randomUUID();
    await runSql(
      'INSERT INTO outfit_items (id, outfit_id, slot, kind, item_id, position) VALUES (?, ?, ?, ?, ?, ?)',
      [itemId, outfitId, item.slot, item.kind, item.itemId, index]
    );
  }

  return {
    id: outfitId,
    name,
    items
  };
}
