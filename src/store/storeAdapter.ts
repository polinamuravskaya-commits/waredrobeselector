import type { Accessory, AiConfig, Item, RuleConfig } from '../domain.js';
import * as sqliteStore from './catalogStore.js';
import * as firestoreStore from './firestoreStore.js';

export function isFirestoreStoreEnabled(): boolean {
  return process.env.DATA_STORE === 'firestore';
}

export async function listItems(): Promise<Item[]> {
  return isFirestoreStoreEnabled() ? firestoreStore.listFirestoreItems() : sqliteStore.listItems();
}

export async function getItemById(id: string): Promise<Item | undefined> {
  return isFirestoreStoreEnabled() ? firestoreStore.getFirestoreItemById(id) : sqliteStore.getItemById(id);
}

export async function addItem(input: Partial<Item>): Promise<Item> {
  return isFirestoreStoreEnabled() ? firestoreStore.addFirestoreItem(input) : sqliteStore.addItem(input);
}

export async function listAccessories(): Promise<Accessory[]> {
  return isFirestoreStoreEnabled() ? firestoreStore.listFirestoreAccessories() : sqliteStore.listAccessories();
}

export async function getAccessoryById(id: string): Promise<Accessory | undefined> {
  return isFirestoreStoreEnabled()
    ? (await firestoreStore.listFirestoreAccessories()).find((accessory) => accessory.id === id)
    : sqliteStore.getAccessoryById(id);
}

export async function addAccessory(input: Partial<Accessory>): Promise<Accessory> {
  return isFirestoreStoreEnabled() ? firestoreStore.addFirestoreAccessory(input) : sqliteStore.addAccessory(input);
}

export async function ensureDefaultRuleConfig(): Promise<RuleConfig> {
  return isFirestoreStoreEnabled() ? firestoreStore.ensureFirestoreRuleConfig() : sqliteStore.ensureDefaultRuleConfig();
}

export async function listRules(): Promise<RuleConfig[]> {
  return isFirestoreStoreEnabled() ? firestoreStore.listFirestoreRules() : sqliteStore.listRules();
}

export async function updateRuleConfig(input: Partial<RuleConfig>): Promise<RuleConfig> {
  return isFirestoreStoreEnabled() ? firestoreStore.updateFirestoreRuleConfig(input) : sqliteStore.updateRuleConfig(input);
}

export async function getAiConfig(): Promise<AiConfig> {
  return isFirestoreStoreEnabled() ? firestoreStore.getFirestoreAiConfig() : sqliteStore.getAiConfig();
}

export async function updateAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  return isFirestoreStoreEnabled() ? firestoreStore.updateFirestoreAiConfig(input) : sqliteStore.updateAiConfig(input);
}

export async function listOutfits(): Promise<Array<{ id: string; name: string; items: Array<{ id: string; slot: string; kind: string; itemId: string }> }>> {
  return isFirestoreStoreEnabled() ? firestoreStore.listFirestoreOutfits() : sqliteStore.listOutfits();
}

export async function createOutfit(name: string, items: Array<{ slot: string; kind: string; itemId: string }>): Promise<{ id: string; name: string; items: Array<{ slot: string; kind: string; itemId: string }> }> {
  return isFirestoreStoreEnabled() ? firestoreStore.createFirestoreOutfit(name, items) : sqliteStore.createOutfit(name, items);
}
