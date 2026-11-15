import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

import { defaultRuleConfig } from '../config/rules.js';
import { mockAccessories, mockCatalog } from '../data/mockCatalog.js';

const isTestRun = process.argv.some((arg) => arg.includes('--test') || arg.includes('tsx'));
const dbPath = process.env.WARDROBE_DB_PATH ?? path.resolve(
  process.cwd(),
  'data',
  isTestRun ? 'test-wardrobe.db' : 'wardrobe.db'
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

type SqlParams = Array<string | number | null | boolean>;

export function runSql<T = unknown>(sql: string, params: SqlParams = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes } as T);
    });
  });
}

export function allSql<T = unknown>(sql: string, params: SqlParams = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows as T[]);
    });
  });
}

export function getSql<T = unknown>(sql: string, params: SqlParams = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve((row ?? undefined) as T | undefined);
    });
  });
}

export async function initializeDatabase(): Promise<void> {
  await runSql(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      slot TEXT NOT NULL,
      image_url TEXT,
      color TEXT,
      pattern TEXT,
      season TEXT,
      events TEXT,
      description TEXT,
      ai_metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await runSql('ALTER TABLE items ADD COLUMN ai_metadata TEXT');
  } catch (error) {
    // SQLite may already have the column in a migrated database.
  }

  await runSql(`
    CREATE TABLE IF NOT EXISTS accessories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT,
      image_url TEXT,
      season TEXT,
      events TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (item_id, tag_id)
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS accessory_tags (
      accessory_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (accessory_id, tag_id)
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS outfit_items (
      id TEXT PRIMARY KEY,
      outfit_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      kind TEXT NOT NULL,
      item_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS rule_sets (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const itemCount = await getSql<{ count: number }>('SELECT COUNT(*) as count FROM items');
  if ((itemCount?.count ?? 0) === 0) {
    for (const item of mockCatalog) {
      await runSql(
        `INSERT INTO items (id, name, category, slot, image_url, color, pattern, season, events, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.slot,
          item.imageUrl,
          item.color.join(','),
          item.pattern ?? 'plain',
          item.season.join(','),
          item.events.join(','),
          item.description
        ]
      );
    }
  }

  const accessoryCount = await getSql<{ count: number }>('SELECT COUNT(*) as count FROM accessories');
  if ((accessoryCount?.count ?? 0) === 0) {
    for (const accessory of mockAccessories) {
      await runSql(
        `INSERT INTO accessories (id, name, type, color, image_url, season, events, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accessory.id,
          accessory.name,
          accessory.type,
          accessory.color.join(','),
          accessory.imageUrl,
          accessory.season.join(','),
          accessory.events.join(','),
          accessory.description
        ]
      );
    }
  }

  const ruleCount = await getSql<{ count: number }>('SELECT COUNT(*) as count FROM rule_sets');
  if ((ruleCount?.count ?? 0) === 0) {
    await runSql(
      'INSERT INTO rule_sets (id, label, payload, version, active) VALUES (?, ?, ?, ?, ?)',
      [defaultRuleConfig.id, defaultRuleConfig.label, JSON.stringify(defaultRuleConfig), defaultRuleConfig.version, 1]
    );
  }
}

export const databaseReady = initializeDatabase().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
  throw error;
});

export async function ensureDatabaseReady(): Promise<void> {
  await databaseReady;
}

export { db };
