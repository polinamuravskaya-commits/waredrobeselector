import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';

import { defaultRuleConfig } from './config/rules.js';
import { mockAccessories, mockCatalog } from './data/mockCatalog.js';
import { adminRouter } from './routes/admin.js';
import { aiRouter } from './routes/ai.js';
import { catalogRouter } from './routes/catalog.js';
import { outfitRouter } from './routes/outfits.js';
import { requireAdminAuth } from './services/auth.js';
import { buildOutfits } from './services/recommendationEngine.js';
import { isGoogleCloudStorageEnabled, uploadToGoogleCloudStorage } from './services/gcpStorage.js';

const uploadDir = path.resolve(process.cwd(), 'data', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image files are allowed.'));
      return;
    }

    callback(null, true);
  }
});

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  const distPath = path.resolve(process.cwd(), 'dist-client');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
  }

  app.get('/', (_req, res) => {
    const clientUrl = `http://localhost:${process.env.VITE_PORT ?? 5174}`;
    const distPath = path.resolve(process.cwd(), 'dist-client');
    const hasBuiltClient = fs.existsSync(path.join(distPath, 'index.html'));
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && hasBuiltClient) {
      res.sendFile(path.join(distPath, 'index.html'));
      return;
    }

    if (!isProduction) {
      res.redirect(clientUrl);
      return;
    }

    res.status(404).send('Client bundle not built yet.');
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'wardrobe-selector',
      environment: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.PORT ?? 8080),
      ruleSet: defaultRuleConfig.label,
      version: defaultRuleConfig.version,
      aiConfigured: Boolean(process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_CLOUD_SECRET_NAME || process.env.GOOGLE_CLOUD_ENABLED)
    });
  });

  app.post('/api/uploads', requireAdminAuth(), upload.single('file'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    try {
      if (isGoogleCloudStorageEnabled()) {
        const result = await uploadToGoogleCloudStorage({
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype
        });

        res.status(201).json({
          provider: 'gcs',
          url: result.url,
          filename: result.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          bucket: result.bucket
        });
        return;
      }

      const extension = path.extname(req.file.originalname) || '.png';
      const filename = `${randomUUID()}${extension}`;
      const targetPath = path.join(uploadDir, filename);
      fs.writeFileSync(targetPath, req.file.buffer);

      res.status(201).json({
        provider: 'local',
        url: `/uploads/${filename}`,
        filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ message });
    }
  });

  app.post('/api/recommendations', (req, res) => {
    const payload = req.body ?? {};

    const outfits = buildOutfits(mockCatalog, mockAccessories, {
      selectedColors: payload.selectedColors ?? ['yellow', 'pink'],
      lowerType: payload.lowerType ?? 'pants',
      temperature: payload.temperature ?? 22,
      event: payload.event ?? 'school',
      maxOutfits: payload.maxOutfits ?? 3
    });

    res.json({
      ruleSet: defaultRuleConfig.id,
      outfits
    });
  });

  app.use('/api/catalog', catalogRouter);
  app.use('/api/admin', requireAdminAuth(), adminRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/outfits', outfitRouter);

  return app;
}
