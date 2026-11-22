import { useEffect, useMemo, useState } from 'react';

const colorPalette = ['red', 'orange', 'yellow', 'green', 'blue', 'turquoise', 'purple', 'pink', 'blush', 'white', 'black', 'brown', 'beige', 'polka', 'stripe'];
const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
const events = ['school', 'walk', 'club', 'party', 'casual'] as const;
const lowerTypes = ['pants', 'skirt', 'dress'] as const;

const seasonTemperatureMap: Record<(typeof seasons)[number], number> = {
  spring: 18,
  summer: 28,
  autumn: 12,
  winter: 5
};

type Season = (typeof seasons)[number];
type Event = (typeof events)[number];
type LowerType = (typeof lowerTypes)[number];

type OutfitItem = {
  id: string;
  slot: string;
  kind: 'item' | 'accessory';
  itemId?: string;
};

type OutfitResponse = {
  id: string;
  name: string;
  items: OutfitItem[];
  score: number;
  matchedTags: string[];
};

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  slot: string;
  imageUrl: string;
  color: string[];
  season: string[];
  events: string[];
  description: string;
  tags: string[];
};

type CatalogAccessory = {
  id: string;
  name: string;
  type: string;
  color: string[];
  imageUrl: string;
  season: string[];
  events: string[];
  description: string;
};

type AdminTagGroup = {
  key: string;
  label: string;
  values: string[];
};

type CropTemplate = {
  id: string;
  category: string;
  label: string;
  aspectRatio: string;
  recommendedBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type AiModelOption = {
  id: string;
  label: string;
  model: string;
  description: string;
  capabilities: string[];
};

const defaultForm = {
  selectedColors: ['yellow', 'pink'],
  lowerType: 'pants' as LowerType,
  season: 'spring' as Season,
  event: 'school' as Event,
  maxOutfits: 3
};

const defaultAdminForm = {
  entityType: 'item' as 'item' | 'accessory',
  name: '',
  category: 'top' as string,
  slot: 'top' as string,
  imageUrl: '',
  color: 'pink',
  season: 'spring' as Season,
  event: 'school' as Event,
  tags: 'soft, daily',
  description: ''
};

const normalizeAiCategory = (value: string): string | undefined => {
  const category = value.trim().toLowerCase();
  if (['top', 'bottom', 'dress', 'accessory'].includes(category)) {
    return category;
  }

  return undefined;
};

const normalizeAiSeason = (value: string): Season | undefined => {
  const season = value.trim().toLowerCase();
  return seasons.includes(season as Season) ? (season as Season) : undefined;
};

const normalizeAiEvent = (value: string): Event | undefined => {
  const event = value.trim().toLowerCase();
  return events.includes(event as Event) ? (event as Event) : undefined;
};

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [accessories, setAccessories] = useState<CatalogAccessory[]>([]);
  const [adminTags, setAdminTags] = useState<AdminTagGroup[]>([]);
  const [cropTemplates, setCropTemplates] = useState<CropTemplate[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [aiConfig, setAiConfig] = useState({ enabled: false, provider: 'google-cloud', modelId: 'gemini-1.5-flash', modelLabel: 'Gemini 1.5 Flash' });
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [adminStatus, setAdminStatus] = useState<string>('');
  const [aiAnalysisSummary, setAiAnalysisSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacementOptions, setReplacementOptions] = useState<CatalogItem[]>([]);
  const [replacementTarget, setReplacementTarget] = useState<OutfitItem | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);
  const [replacementLoading, setReplacementLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog/items').then((res) => res.json()),
      fetch('/api/catalog/accessories').then((res) => res.json()),
      fetch('/api/admin/config/tags').then((res) => res.json()),
      fetch('/api/admin/crop-templates').then((res) => res.json()),
      fetch('/api/admin/config/ai').then((res) => res.json())
    ])
      .then(([itemsPayload, accessoriesPayload, tagsPayload, templatesPayload, aiPayload]) => {
        setCatalog(itemsPayload.items ?? []);
        setAccessories(accessoriesPayload.accessories ?? []);
        setAdminTags(tagsPayload.tags ?? []);
        setCropTemplates(templatesPayload.templates ?? []);
        setAiModels(aiPayload.availableModels ?? []);
        setAiConfig(aiPayload.config ?? { enabled: false, provider: 'google-cloud', modelId: 'gemini-1.5-flash', modelLabel: 'Gemini 1.5 Flash' });
      })
      .catch(() => {
        setError('Не удалось загрузить каталог или конфиг админки.');
      });
  }, []);

  const selectedOutfit = useMemo(
    () => outfits.find((outfit) => outfit.id === selectedOutfitId) ?? outfits[0] ?? null,
    [outfits, selectedOutfitId]
  );

  const outfitComposition = useMemo(() => {
    if (!selectedOutfit) return [];

    return selectedOutfit.items.map((itemRef) => {
      const source = itemRef.kind === 'item'
        ? catalog.find((entry) => entry.id === itemRef.itemId || entry.id === itemRef.id)
        : accessories.find((entry) => entry.id === itemRef.itemId || entry.id === itemRef.id);

      return {
        ...itemRef,
        label: source?.name ?? 'Unknown item'
      };
    });
  }, [selectedOutfit, catalog, accessories]);

  const replacementComposition = useMemo(() => {
    if (!replacementTarget) return [];

    return replacementTarget.kind === 'item'
      ? catalog.filter((item) => item.slot === 'bottom' || item.category === 'dress')
      : accessories.filter((item) => item.slot === 'bottom' || item.category === 'dress');
  }, [replacementTarget, catalog, accessories]);

  const toggleColor = (color: string) => {
    setForm((current) => {
      const exists = current.selectedColors.includes(color as never);
      const selected = exists
        ? current.selectedColors.filter((value) => value !== color)
        : [...current.selectedColors, color as never];

      return { ...current, selectedColors: selected.slice(0, 7) };
    });
  };

  const submitRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          temperature: seasonTemperatureMap[form.season]
        })
      });

      if (!response.ok) {
        throw new Error('Рекомендации не загрузились');
      }

      const payload = await response.json();
      const nextOutfits = payload.outfits ?? [];
      setOutfits(nextOutfits);
      setSelectedOutfitId(nextOutfits[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const saveSelection = async () => {
    if (!selectedOutfit) return;
    setLinkLoading(true);
    try {
      await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedOutfit.name,
          items: selectedOutfit.items,
          score: selectedOutfit.score,
          matchedTags: selectedOutfit.matchedTags
        })
      });
    } finally {
      setLinkLoading(false);
    }
  };

  const applyAiAnalysisToForm = (analysis: Record<string, unknown> | undefined) => {
    if (!analysis) return;

    const classification = (analysis.classification ?? {}) as Record<string, unknown>;
    const crop = (analysis.crop ?? {}) as Record<string, unknown>;
    const summary = typeof analysis.summary === 'string' ? analysis.summary : '';

    if (adminForm.entityType === 'item') {
      const category = normalizeAiCategory(typeof classification.category === 'string' ? classification.category : '');
      if (category) {
        setAdminForm((current) => ({
          ...current,
          category,
          slot: category === 'top' ? 'top' : category === 'bottom' ? 'bottom' : 'dress'
        }));
      }
    }

    const primaryColor = Array.isArray(classification.color) && classification.color.length > 0
      ? String(classification.color[0])
      : typeof classification.color === 'string'
        ? classification.color
        : '';

    if (primaryColor) {
      setAdminForm((current) => ({ ...current, color: primaryColor }));
    }

    const primarySeason = Array.isArray(classification.season) && classification.season.length > 0
      ? String(classification.season[0])
      : typeof classification.season === 'string'
        ? classification.season
        : '';

    const normalizedSeason = normalizeAiSeason(primarySeason);
    if (normalizedSeason) {
      setAdminForm((current) => ({ ...current, season: normalizedSeason }));
    }

    const primaryEvent = Array.isArray(classification.event) && classification.event.length > 0
      ? String(classification.event[0])
      : typeof classification.event === 'string'
        ? classification.event
        : '';

    const normalizedEvent = normalizeAiEvent(primaryEvent);
    if (normalizedEvent) {
      setAdminForm((current) => ({ ...current, event: normalizedEvent }));
    }

    const aiSummary = summary || (typeof crop.rationale === 'string' ? crop.rationale : '');
    if (aiSummary) {
      setAiAnalysisSummary(aiSummary);
      setAdminForm((current) => ({
        ...current,
        description: current.description || aiSummary
      }));
    }
  };

  const analyzeUploadedImage = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'classification',
          imageUrl,
          metadata: {
            source: 'admin-upload',
            entityType: adminForm.entityType
          }
        })
      });

      if (!response.ok) {
        throw new Error('AI-анализ не сработал');
      }

      const payload = await response.json();
      const resultData = payload?.result?.data ?? payload?.data ?? {};
      applyAiAnalysisToForm(resultData);

      if (payload?.result?.status === 'not-configured' || payload?.result?.status === 'disabled') {
        setAdminStatus('Фото загружено. AI не активен: добавьте модель и ключ Google Cloud.');
        return;
      }

      setAdminStatus('AI-классификация применена к форме');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось выполнить AI-анализ';
      setAdminStatus(message);
    }
  };

  const onAdminImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Не удалось загрузить фото');
      }

      const payload = await uploadResponse.json();
      const nextImageUrl = payload.url ?? '';
      setAdminForm((current) => ({ ...current, imageUrl: nextImageUrl }));
      setAdminStatus(`Фото загружено: ${payload.filename ?? 'image'}`);
      if (nextImageUrl) {
        await analyzeUploadedImage(nextImageUrl);
      }
    } catch (err) {
      setAdminStatus(err instanceof Error ? err.message : 'Не удалось загрузить фото');
    }
  };

  const submitAdminItem = async () => {
    const trimmedName = adminForm.name.trim();
    if (!trimmedName) {
      setAdminStatus('Введите название вещи');
      return;
    }

    if (!adminForm.imageUrl) {
      setAdminStatus('Сначала загрузите фото вещи');
      return;
    }

    const tags = adminForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = adminForm.entityType === 'item'
      ? {
          name: trimmedName,
          category: adminForm.category,
          slot: adminForm.slot,
          imageUrl: adminForm.imageUrl || 'https://example.invalid/uploaded-item.png',
          color: [adminForm.color],
          season: [adminForm.season],
          events: [adminForm.event],
          tags,
          description: adminForm.description || 'Uploaded via admin panel.'
        }
      : {
          name: trimmedName,
          type: adminForm.slot || 'bag',
          imageUrl: adminForm.imageUrl || 'https://example.invalid/uploaded-accessory.png',
          color: [adminForm.color],
          season: [adminForm.season],
          events: [adminForm.event],
          description: adminForm.description || 'Accessory uploaded via admin panel.'
        };

    try {
      const response = await fetch(
        adminForm.entityType === 'item' ? '/api/catalog/items' : '/api/catalog/accessories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось сохранить вещь');
      }

      const saved = await response.json();
      setAdminStatus(`Сохранено: ${saved.item?.name ?? saved.accessory?.name ?? 'новый элемент'}`);
      setAdminForm({ ...defaultAdminForm, entityType: adminForm.entityType });
      setImagePreview('');
    } catch (err) {
      setAdminStatus(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const selectedTemplate = cropTemplates.find((template) => template.category === adminForm.category) ?? cropTemplates[0];

  const saveAiConfig = async () => {
    try {
      const response = await fetch('/api/admin/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: aiConfig.enabled,
          provider: 'google-cloud',
          modelId: aiConfig.modelId,
          apiKeyConfigured: true
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить AI-конфиг');
      }

      const payload = await response.json();
      setAiConfig(payload.config ?? aiConfig);
      setAdminStatus(`ИИ: ${payload.config?.enabled ? 'включено' : 'выключено'} · ${payload.config?.modelLabel ?? aiConfig.modelLabel}`);
    } catch (err) {
      setAdminStatus(err instanceof Error ? err.message : 'Не удалось сохранить AI-конфиг');
    }
  };

  const requestReplacementOptions = async (item: OutfitItem) => {
    setReplacementTarget(item);
    setSelectedReplacementId(null);
    setReplacementLoading(true);

    try {
      const params = new URLSearchParams({
        kind: item.kind,
        slot: item.slot,
        itemId: item.itemId ?? item.id,
        colors: form.selectedColors.join(','),
        season: form.season,
        event: form.event
      });
      const response = await fetch(`/api/outfits/replacements?${params.toString()}`);
      if (!response.ok) throw new Error('Не удалось загрузить варианты замены');
      const payload = await response.json();
      setReplacementOptions(payload.replacements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить варианты замены');
    } finally {
      setReplacementLoading(false);
    }
  };

  const applyReplacement = async () => {
    if (!selectedOutfit || !replacementTarget || !selectedReplacementId) return;
    setReplacementLoading(true);

    try {
      const response = await fetch('/api/outfits/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedOutfit.items,
          targetId: replacementTarget.itemId ?? replacementTarget.id,
          replacementId: selectedReplacementId,
          replacementKind: replacementTarget.kind
        })
      });
      if (!response.ok) throw new Error('Не удалось применить замену');

      const payload = await response.json();
      setOutfits((current) => current.map((outfit) =>
        outfit.id === selectedOutfit.id ? { ...outfit, items: payload.items } : outfit
      ));
      setReplacementOptions([]);
      setReplacementTarget(null);
      setSelectedReplacementId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить замену');
    } finally {
      setReplacementLoading(false);
    }
  };

  const cancelReplacement = () => {
    setReplacementOptions([]);
    setReplacementTarget(null);
    setSelectedReplacementId(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <small>Style match</small>
            <strong>Wardrobe</strong>
          </div>
        </div>
        <button type="button" className="ghost-button">Saved</button>
      </header>

      <main className="screen-stack">
        <section className="panel questionnaire">
          <div className="section-head">
            <span className="badge yellow">Mood</span>
            <h1>Что сегодня хочется надеть?</h1>
          </div>

          <div className="field-group">
            <label>Цвета</label>
            <div className="color-grid">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-dot ${color} ${form.selectedColors.includes(color as never) ? 'active' : ''}`}
                  onClick={() => toggleColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div className="field-group two-col">
            <div>
              <label>Низ</label>
              <div className="segment-group">
                {lowerTypes.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${form.lowerType === value ? 'selected' : ''}`}
                    onClick={() => setForm((current) => ({ ...current, lowerType: value }))}
                  >
                    {value === 'pants' ? 'Брюки' : value === 'skirt' ? 'Юбка' : 'Платье'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Сезон</label>
              <div className="segment-group season-group">
                {seasons.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${form.season === value ? 'selected' : ''}`}
                    onClick={() => setForm((current) => ({ ...current, season: value }))}
                  >
                    {value === 'spring' ? 'Весна' : value === 'summer' ? 'Лето' : value === 'autumn' ? 'Осень' : 'Зима'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Событие</label>
            <div className="segment-group wrap">
              {events.map((event) => (
                <button
                  key={event}
                  type="button"
                  className={`chip ${form.event === event ? 'selected' : ''}`}
                  onClick={() => setForm((current) => ({ ...current, event }))}
                >
                  {event === 'school' ? 'Школа' : event === 'walk' ? 'Прогулка' : event === 'club' ? 'Кружок' : event === 'party' ? 'Вечеринка' : 'Повседневно'}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="button" className="primary-button" onClick={submitRecommendation} disabled={loading}>
            {loading ? 'Собираем образы...' : 'Показать 3 образа'}
          </button>
        </section>

        <section className="panel results">
          <div className="section-head row">
            <div>
              <span className="badge fuchsia">{outfits.length || 3} looks</span>
              <h2>Подходящие образы</h2>
            </div>
            <button type="button" className="ghost-button small">Изменить</button>
          </div>

          {outfits.length === 0 ? (
            <p className="placeholder">Нажмите “Показать 3 образа”, чтобы выбрать образы по вашему настроению.</p>
          ) : (
            outfits.map((outfit) => (
              <article
                key={outfit.id}
                className={`outfit-card ${selectedOutfit?.id === outfit.id ? 'active' : ''}`}
                onClick={() => setSelectedOutfitId(outfit.id)}
              >
                <div className="mini-doll">
                  <div className="doll-body" />
                  <div className="layer top yellow" />
                  <div className="layer bottom blue" />
                  <div className="layer accessory pink" />
                </div>
                <div className="outfit-meta">
                  <div className="meta-row">
                    <strong>{outfit.name}</strong>
                    <span>{Math.round(outfit.score)}%</span>
                  </div>
                  <p>{outfit.matchedTags.length ? `Подходит по: ${outfit.matchedTags.join(', ')}` : 'Подходит по сезону и событию.'}</p>
                  <div className="tag-row">
                    {outfit.matchedTags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <button type="button" className="link-button">Посмотреть</button>
                </div>
              </article>
            ))
          }
        </section>

        <section className="panel detail">
          <div className="section-head row">
            <div>
              <span className="badge turquoise">Look</span>
              <h2>{selectedOutfit ? selectedOutfit.name : 'Выберите образ'}</h2>
            </div>
            <button type="button" className="ghost-button small" onClick={saveSelection} disabled={linkLoading || !selectedOutfit}>
              {linkLoading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>

          <div className="doll-stage">
            <div className="doll-body large" />
            <div className="layer top yellow large" />
            <div className="layer bottom blue large" />
            <div className="layer accessory pink large" />
          </div>

          <div className="item-list">
            {outfitComposition.length === 0 ? (
              <p className="placeholder">Список вещей появится после выбора образа.</p>
            ) : (
              outfitComposition.map((item, index) => (
                <div className="item-card" key={`${item.kind}-${item.id}-${index}`}>
                  <div className="item-thumb" />
                  <div>
                    <strong>{item.kind === 'item' ? 'Элемент' : 'Аксессуар'}</strong>
                    <small>{item.label}</small>
                  </div>
                  <button type="button" className="mini-button" onClick={() => requestReplacementOptions(item)}>Заменить</button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel replacement">
          <div className="section-head row">
            <div>
              <span className="badge yellow">Swap</span>
              <h2>Выберите новый низ</h2>
            </div>
            <button type="button" className="ghost-button small" onClick={cancelReplacement}>Отмена</button>
          </div>

          <div className="replacement-grid">
            {replacementOptions.map((item) => (
              <div key={item.id} className={`replacement-item ${selectedReplacementId === item.id ? 'selected' : ''}`} onClick={() => setSelectedReplacementId(item.id)}>
                <div className="mini-swatch" style={{ background: item.color.includes('blue') ? 'linear-gradient(135deg, #8ec9ff, #4b8ef7)' : item.color.includes('pink') ? 'linear-gradient(135deg, #ffc3de, #ff7ac7)' : 'linear-gradient(135deg, #f4dfcf, #d3aa8d)' }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>

          <button type="button" className="primary-button" onClick={applyReplacement} disabled={replacementLoading || !selectedReplacementId}>
            {replacementLoading ? 'Применяем...' : 'Применить замену'}
          </button>
        </section>

        <section className="panel admin-panel">
          <div className="section-head row">
            <div>
              <span className="badge turquoise">Admin</span>
              <h2>Добавить вещь</h2>
            </div>
          </div>

          <div className="admin-layout">
            <div className="admin-form">
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-button ${adminForm.entityType === 'item' ? 'selected' : ''}`}
                  onClick={() => setAdminForm((current) => ({ ...current, entityType: 'item', category: 'top', slot: 'top' }))}
                >
                  Вещь
                </button>
                <button
                  type="button"
                  className={`toggle-button ${adminForm.entityType === 'accessory' ? 'selected' : ''}`}
                  onClick={() => setAdminForm((current) => ({ ...current, entityType: 'accessory', category: 'accessory', slot: 'bag' }))}
                >
                  Аксессуар
                </button>
              </div>

              <label className="admin-field">
                <span>Название</span>
                <input
                  value={adminForm.name}
                  onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например: Яркая блузка"
                />
              </label>

              <div className="admin-row two-col">
                <label className="admin-field">
                  <span>Категория</span>
                  <select
                    value={adminForm.category}
                    onChange={(event) => setAdminForm((current) => ({ ...current, category: event.target.value, slot: event.target.value === 'accessory' ? 'bag' : current.slot }))}
                  >
                    {adminForm.entityType === 'item' ? (
                      <>
                        <option value="top">top</option>
                        <option value="bottom">bottom</option>
                        <option value="dress">dress</option>
                      </>
                    ) : (
                      <option value="accessory">accessory</option>
                    )}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Слот</span>
                  <select
                    value={adminForm.slot}
                    onChange={(event) => setAdminForm((current) => ({ ...current, slot: event.target.value }))}
                  >
                    {adminForm.entityType === 'item' ? (
                      <>
                        <option value="top">top</option>
                        <option value="bottom">bottom</option>
                        <option value="dress">dress</option>
                      </>
                    ) : (
                      <>
                        <option value="bag">bag</option>
                        <option value="bracelet">bracelet</option>
                        <option value="earrings">earrings</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              <div className="admin-row two-col">
                <label className="admin-field">
                  <span>Цвет</span>
                  <select value={adminForm.color} onChange={(event) => setAdminForm((current) => ({ ...current, color: event.target.value }))}>
                    {colorPalette.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Сезон</span>
                  <select value={adminForm.season} onChange={(event) => setAdminForm((current) => ({ ...current, season: event.target.value as Season }))}>
                    {seasons.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-row two-col">
                <label className="admin-field">
                  <span>Событие</span>
                  <select value={adminForm.event} onChange={(event) => setAdminForm((current) => ({ ...current, event: event.target.value as Event }))}>
                    {events.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Теги</span>
                  <input
                    value={adminForm.tags}
                    onChange={(event) => setAdminForm((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="soft, daily"
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Описание</span>
                <textarea
                  value={adminForm.description}
                  onChange={(event) => setAdminForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  placeholder="Описание вещи"
                />
              </label>

              <label className="upload-field">
                <span>Фото вещи</span>
                <input type="file" accept="image/*" onChange={onAdminImageChange} />
              </label>

              <div className="admin-actions">
                <button type="button" className="primary-button small-button" onClick={submitAdminItem}>Добавить</button>
              </div>

              <div className="ai-settings">
                <div className="ai-toggle-row">
                  <strong>AI-помощник</strong>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={aiConfig.enabled}
                      onChange={(event) => setAiConfig((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    <span>Включить</span>
                  </label>
                </div>

                <label className="admin-field">
                  <span>Модель Google Cloud</span>
                  <select
                    value={aiConfig.modelId}
                    onChange={(event) => {
                      const selected = aiModels.find((model) => model.id === event.target.value);
                      setAiConfig((current) => ({
                        ...current,
                        modelId: event.target.value,
                        modelLabel: selected?.label ?? current.modelLabel
                      }));
                    }}
                  >
                    {aiModels.map((model) => (
                      <option key={model.id} value={model.id}>{model.label}</option>
                    ))}
                  </select>
                </label>

                <div className="admin-actions">
                  <button type="button" className="ghost-button small-button" onClick={saveAiConfig}>Сохранить AI</button>
                </div>
              </div>

              {adminStatus ? <p className="admin-status">{adminStatus}</p> : null}
              {aiAnalysisSummary ? <p className="admin-status subtle">AI summary: {aiAnalysisSummary}</p> : null}
            </div>

            <div className="crop-preview-panel">
              <div className="crop-header">
                <strong>Шаблон обрезки</strong>
                <span>{selectedTemplate ? selectedTemplate.label : 'Template'}</span>
              </div>

              <div className="crop-stage">
                {imagePreview ? (
                  <img src={imagePreview} alt="uploaded preview" />
                ) : (
                  <div className="crop-placeholder">Загрузите фото</div>
                )}
                {selectedTemplate ? (
                  <div
                    className="crop-overlay"
                    style={{
                      left: `${selectedTemplate.recommendedBounds.x}%`,
                      top: `${selectedTemplate.recommendedBounds.y}%`,
                      width: `${selectedTemplate.recommendedBounds.width}%`,
                      height: `${selectedTemplate.recommendedBounds.height}%`
                    }}
                  />
                ) : null}
              </div>

              <div className="template-list">
                {cropTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`template-pill ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => setAdminForm((current) => ({ ...current, category: template.category, slot: template.category === 'accessory' ? 'bag' : current.slot }))}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-list">
            {adminTags.length === 0 ? (
              <p className="placeholder">Загрузка тегов…</p>
            ) : (
              adminTags.map((group) => (
                <div key={group.key} className="admin-group">
                  <strong>{group.label}</strong>
                  <div className="admin-values">
                    {group.values.map((value) => (
                      <span key={`${group.key}-${value}`} className="admin-chip">{value}</span>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </section>
      </main>
    </div>
  );
}
