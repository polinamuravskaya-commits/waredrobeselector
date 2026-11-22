import { Firestore } from '@google-cloud/firestore';

import { mockAccessories, mockCatalog } from '../data/mockCatalog.js';
import { defaultRuleConfig } from '../config/rules.js';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? 'gen-lang-client-0467142337';
const databaseId = process.env.FIRESTORE_DATABASE_ID ?? 'onesec';
const db = new Firestore({ projectId, databaseId });

async function seed(): Promise<void> {
  const batch = db.batch();

  for (const item of mockCatalog) {
    batch.set(db.collection('items').doc(item.id), {
      ...item,
      createdAt: new Date().toISOString()
    });
  }

  for (const accessory of mockAccessories) {
    batch.set(db.collection('accessories').doc(accessory.id), {
      ...accessory,
      createdAt: new Date().toISOString()
    });
  }

  batch.set(db.collection('rule_sets').doc(defaultRuleConfig.id), {
    ...defaultRuleConfig,
    payload: defaultRuleConfig,
    active: true,
    createdAt: new Date().toISOString()
  });

  await batch.commit();
  console.log(`Seeded ${mockCatalog.length} items and ${mockAccessories.length} accessories into Firestore database ${databaseId}.`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
