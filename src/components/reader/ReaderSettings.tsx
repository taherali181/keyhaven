'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioWaveform, Check, ChevronDown, ChevronUp, CloudRain, Coffee, Flame, Headphones, PanelBottom, Palette, Plus, RotateCcw, SlidersHorizontal, Trees, Type, VolumeX, Waves, X } from 'lucide-react';
import { AmbientSound, CustomReaderTone, FontFamily, ReaderBackground, ReaderToneId, ThemeId, UserSettings } from '@/types';
import { FONTS } from '@/lib/themes';
import { CUSTOM_TONE_PREFIX, EXTRA_TONES, MAIN_TONES, RECIPE_TONES, contrastRatio, hasSceneryImage, isThemeTone, readerSurfaceProps, toneName, toneVariables } from '@/lib/reader-style';
import { DEFAULT_TYPOGRAPHY, TYPE_PRESETS, TYPE_RANGES, matchesTypography, weightName, type Typography } from '@/lib/typography';
import { SliderField } from '@/components/ui/SliderField';
import { prepareCustomScenery } from '@/lib/custom-scenery';
import { ease, fade, slideInRight, spring } from '@/lib/motion';
import { OPEN_READER_SETTINGS_EVENT } from '@/lib/reader-events';
import { DEFAULT_READER_STATS, MAX_READER_STATS, resolveReaderStats, statsForMode, type ReaderMode, type ReaderStatContext } from '@/lib/reader-stats';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type TabId = 'look' | 'type' | 'sound' | 'bar';

interface TileOption<T> { value: T; label: string; sub?: string; visual: ReactNode; visualClass?: string; visualStyle?: CSSProperties; visualTone?: string }

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'look', label: 'Appearance', icon: <Palette /> },
  { id: 'type', label: 'Typography', icon: <Type /> },
  { id: 'bar', label: 'Bottom bar', icon: <PanelBottom /> },
  { id: 'sound', label: 'Ambience', icon: <Headphones /> }
];

type TypefaceGroup = { label: string; fonts: FontFamily[] };

const FEATURED_TYPEFACES: TypefaceGroup[] = [
  { label: 'Serif', fonts: ['serif', 'source-serif'] },
  { label: 'Sans serif', fonts: ['sans', 'inter'] }
];

const MORE_TYPEFACES: TypefaceGroup[] = [
  { label: 'Serif', fonts: ['lora', 'merriweather', 'garamond', 'playfair'] },
  { label: 'Sans serif', fonts: ['plex'] },
  { label: 'Accessible', fonts: ['atkinson'] },
  { label: 'Monospace', fonts: ['jetbrains', 'jetbrains-mono'] }
];

/** Sample reader state for the bottom bar preview. */
const PREVIEW_CONTEXT = (mode: ReaderMode): ReaderStatContext => ({
  mode, isStory: false, unit: 'chapter', sectionTitle: 'Chapter IV', positionWords: 41_200, sectionStartWords: 40_000, sectionWords: 2_600,
  totalWords: 122_000, readingWpm: 240, typingWpm: 62, accuracy: 97, rawWpm: 66, elapsedSeconds: 94, bookPage: 48, bookPages: 394,
  part: 2, partCount: 14, now: new Date(2026, 0, 1, 21, 5).getTime(), sessionStartedAt: new Date(2026, 0, 1, 20, 41).getTime()
});

function BarPreview({ settings }: { settings: UserSettings }) {
  const mode: ReaderMode = settings.storyMode;
  const stats = resolveReaderStats(settings.readerStats[mode], PREVIEW_CONTEXT(mode), settings.readerBarStyle.labels);
  return <div className="rs-preview rs-bar-preview" {...readerSurfaceProps(settings)} aria-hidden="true">
    <small>Preview · {settings.readerBarPinned ? 'title bar pinned' : 'title bar hidden'}</small>
    <div className={`reader-bar glass ${settings.readerBarPinned ? '' : 'is-compact'}`} data-opacity={settings.readerBarStyle.compactOpacity} data-progress={settings.readerBarStyle.compactProgress ? 'on' : 'off'}>
      {(settings.readerBarPinned || settings.readerBarStyle.compactProgress) && <span className="pagination-progress"><span className="story-segments"><i className="is-done" /><i className="is-done" /><i className="is-current"><b style={{ transform: 'scaleX(.4)' }} /></i><i /><i /></span></span>}
      {stats.length > 0 && <span className="reader-bar-stats">{stats.map(stat => <span key={stat.id} className="reader-bar-stat"><strong>{stat.value}</strong>{stat.short && <small>{stat.short}</small>}</span>)}</span>}
    </div>
  </div>;
}

function BarSettings({ settings, onUpdateSetting }: { settings: UserSettings; onUpdateSetting: UpdateSetting }) {
  const [mode, setMode] = useState<ReaderMode>(settings.storyMode);
  const enabled = settings.readerStats[mode];
  const full = enabled.length >= MAX_READER_STATS;
  const available = statsForMode(mode);
  const ordered = [...enabled.map(id => available.find(stat => stat.id === id)!).filter(Boolean), ...available.filter(stat => !enabled.includes(stat.id))];
  const update = (ids: typeof enabled) => onUpdateSetting('readerStats', { ...settings.readerStats, [mode]: ids });
  const toggle = (id: (typeof enabled)[number]) => update(enabled.includes(id) ? enabled.filter(item => item !== id) : full ? enabled : [...enabled, id]);
  const move = (index: number, step: -1 | 1) => {
    const next = [...enabled];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    update(next);
  };
  const style = settings.readerBarStyle;

  return <>
    <TileGroup label="Title bar" hint="Also on the title bar" columns={2} value={settings.readerBarPinned ? 'pinned' : 'auto'} onChange={value => onUpdateSetting('readerBarPinned', value === 'pinned')} options={[
      { value: 'pinned', label: 'Pinned', sub: 'Always visible', visual: <span className="rs-bar-visual"><i /><em /><b /></span> },
      { value: 'auto', label: 'Auto-hide', sub: 'Shows at the top edge', visual: <span className="rs-bar-visual is-auto"><i /><em /><b /></span> }
    ]} />
    <section className="rs-group">
      <header><h3>Bar items</h3><span>{enabled.length} of {MAX_READER_STATS}</span></header>
      <div className="rs-segmented" role="radiogroup" aria-label="Bar items while">
        {(['read', 'type'] as const).map(item => <button key={item} type="button" role="radio" aria-checked={mode === item} onClick={() => setMode(item)}>{item === 'read' ? 'Reading' : 'Typing'}</button>)}
      </div>
      <ul className="rs-stat-list">
        {ordered.map(stat => {
          const index = enabled.indexOf(stat.id);
          const on = index !== -1;
          return <li key={stat.id} className={`rs-stat ${on ? 'is-on' : ''}`}>
            <label>
              <input type="checkbox" role="switch" checked={on} disabled={!on && full} aria-label={stat.label} onChange={() => toggle(stat.id)} />
              <span><strong>{stat.label}</strong><small>{stat.description}</small></span>
            </label>
            {on && <span className="rs-stat-order">
              <button type="button" aria-label={`Move ${stat.label} earlier`} disabled={index === 0} onClick={() => move(index, -1)}><ChevronUp aria-hidden="true" /></button>
              <button type="button" aria-label={`Move ${stat.label} later`} disabled={index === enabled.length - 1} onClick={() => move(index, 1)}><ChevronDown aria-hidden="true" /></button>
            </span>}
          </li>;
        })}
      </ul>
      <div className="rs-stat-footer">
        <span>{full ? `Up to ${MAX_READER_STATS} items. Turn one off to add another.` : 'Items show in this order.'}</span>
        <button type="button" className="rs-btn is-small" onClick={() => update(DEFAULT_READER_STATS[mode])}>Reset to defaults</button>
      </div>
    </section>
    <section className="rs-group">
      <header><h3>While the title bar is hidden</h3></header>
      <div className="setting-group">
        <label className="toggle-row">Show the progress line<input type="checkbox" checked={style.compactProgress} onChange={event => onUpdateSetting('readerBarStyle', { ...style, compactProgress: event.target.checked })} /></label>
        <label className="toggle-row">Show labels<input type="checkbox" checked={style.labels} onChange={event => onUpdateSetting('readerBarStyle', { ...style, labels: event.target.checked })} /></label>
      </div>
    </section>
    <TileGroup label="Hidden bar strength" columns={2} value={style.compactOpacity} onChange={value => onUpdateSetting('readerBarStyle', { ...style, compactOpacity: value })} options={[
      { value: 'soft', label: 'Soft', sub: 'Easy to glance at', visual: <span className="rs-bar-strength" data-opacity="soft"><b /></span> },
      { value: 'faint', label: 'Faint', sub: 'Barely there', visual: <span className="rs-bar-strength" data-opacity="faint"><b /></span> }
    ]} />
  </>;
}

const THEME_PREVIEWS: Record<ThemeId, { bg: string; card: string; text: string; accent: string }> = {
  // Mirrors the theme tokens in globals.css so the tile previews match the real themes.
  'reading-room': { bg: '#1d2522', card: '#171d19', text: '#f4f1e8', accent: '#a8b59c' },
  daylight: { bg: '#f4f1e8', card: '#e9e9df', text: '#1d2522', accent: '#536b54' }
};

const SCENERY: Array<{ id: ReaderBackground; label: string }> = [
  { id: 'none', label: 'Quiet atmosphere' },
  { id: 'plain', label: 'Plain' },
  { id: 'misty-mountains', label: 'Misty mountains' },
  { id: 'quiet-lake', label: 'Quiet lake' },
  { id: 'soft-forest', label: 'Soft forest' },
  { id: 'twilight-peaks', label: 'Twilight peaks' }
];

// Extra photographic scenes, tucked behind "More scenery" so the main grid stays calm.
const MORE_SCENERY: Array<{ id: ReaderBackground; label: string }> = [
  { id: 'forest-sunset', label: 'Forest sunset' },
  { id: 'cherry-blossoms', label: 'Cherry blossoms' },
  { id: 'mountain-valley', label: 'Mountain valley' },
  { id: 'alpine-lake', label: 'Alpine lake' }
];

function sceneryTile(item: { id: ReaderBackground; label: string }): TileOption<ReaderBackground> {
  return {
    value: item.id, label: item.label,
    visualClass: item.id === 'none' ? 'rs-scenery-none' : item.id === 'plain' ? 'rs-scenery-plain' : 'rs-image',
    visualStyle: hasSceneryImage(item.id) ? { backgroundImage: `url(/backgrounds/${item.id}.webp)` } : undefined,
    visual: null
  };
}

const SOUNDS: Array<{ id: AmbientSound; label: string; icon: ReactNode; style: CSSProperties }> = [
  { id: 'none', label: 'Silence', icon: <VolumeX />, style: { background: 'radial-gradient(circle at 30% 20%, #3a4038, #161a17 70%)' } },
  { id: 'rain', label: 'Rain', icon: <CloudRain />, style: { backgroundImage: 'url(/backgrounds/misty-mountains.webp)' } },
  { id: 'forest', label: 'Forest', icon: <Trees />, style: { backgroundImage: 'url(/backgrounds/soft-forest.webp)' } },
  { id: 'zen-river', label: 'River', icon: <Waves />, style: { backgroundImage: 'url(/backgrounds/quiet-lake.webp)' } },
  { id: 'fireplace', label: 'Fireplace', icon: <Flame />, style: { background: 'radial-gradient(circle at 50% 110%, #f0a04b, #9a3f16 38%, #2a120a 75%)' } },
  { id: 'cafe', label: 'Café', icon: <Coffee />, style: { background: 'radial-gradient(circle at 70% 20%, #d7b48a, #7a5236 45%, #2b1c13 85%)' } },
  { id: 'alpha-waves', label: 'Alpha waves', icon: <AudioWaveform />, style: { background: 'linear-gradient(135deg, #5d7f8f, #3b4a6b 50%, #1d2334)' } }
];

/** The preview shows real sizes, capped so very large text still fits the settings panel. */
const PREVIEW_MAX_PX = 34;

function TileGroup<T extends string | number>({ label, hint, value, options, moreOptions, moreLabel = 'More', moreCompact = false, moreFooter, onChange, columns = 3 }: { label: string; hint?: string; value: T; options: TileOption<T>[]; moreOptions?: TileOption<T>[]; moreLabel?: string; moreCompact?: boolean; moreFooter?: ReactNode; onChange: (value: T) => void; columns?: 2 | 3 | 4 }) {
  const moreId = useId();
  const selectedExtra = moreOptions?.find(option => option.value === value);
  // Open by default when the saved choice lives in the extras, so the selection is never hidden on arrival.
  const [showMore, setShowMore] = useState(Boolean(selectedExtra));

  const tile = (option: TileOption<T>) => {
    const checked = option.value === value;
    return <button key={String(option.value)} type="button" role="radio" aria-checked={checked} aria-label={option.label} className="rs-tile" onClick={() => onChange(option.value)}>
      <span className={`rs-visual ${option.visualClass ?? ''}`} style={option.visualStyle} data-reader-tone={option.visualTone} aria-hidden="true">{option.visual}</span>
      <span className="rs-label" aria-hidden="true">{option.label}{option.sub && <small>{option.sub}</small>}</span>
      <AnimatePresence>{checked && <motion.span className="rs-check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring.bouncy}><Check /></motion.span>}</AnimatePresence>
    </button>;
  };

  return <section className="rs-group">
    <header><h3>{label}</h3>{hint && <span>{hint}</span>}</header>
    <div role="radiogroup" aria-label={label}>
      <div className="rs-tiles" data-columns={columns}>{options.map(tile)}</div>
      {moreOptions && <div id={moreId} className="rs-more" data-open={showMore} inert={!showMore}>
        <div><div className="rs-tiles" data-columns={moreCompact ? undefined : columns} data-compact={moreCompact || undefined}>{moreOptions.map(tile)}{moreFooter}</div></div>
      </div>}
    </div>
    {moreOptions && <button type="button" className="rs-more-toggle" aria-expanded={showMore} aria-controls={moreId} onClick={() => setShowMore(open => !open)}>
      <span>{showMore ? 'Show less' : moreLabel}</span>
      {!showMore && selectedExtra && <em>{selectedExtra.label}</em>}
      <ChevronDown aria-hidden="true" />
    </button>}
  </section>;
}

function ToneEditor({ draft, isNew, onChange, onCancel, onSave, onDelete }: { draft: CustomReaderTone; isNew: boolean; onChange: (draft: CustomReaderTone) => void; onCancel: () => void; onSave: (tone: CustomReaderTone) => void; onDelete: () => void }) {
  const ratio = contrastRatio(draft.background, draft.text);
  const low = ratio < 4.5;
  const colorField = (key: 'background' | 'text' | 'accent', label: string) => (
    <label className="rs-field">{label}
      <span className="rs-color">
        <input type="color" value={draft[key]} aria-label={`${label} color`} onChange={event => onChange({ ...draft, [key]: event.target.value })} />
        {draft[key]}
      </span>
    </label>
  );

  return <section className="rs-tone-editor" aria-label={isNew ? 'New custom tone' : `Edit ${draft.name}`}>
    <h4>{isNew ? 'New custom tone' : 'Edit tone'}</h4>
    <div className="rs-tone-sample" style={toneVariables(draft)} aria-hidden="true">
      <span>Once upon a </span>midnight<i />dreary, <b>while I pondered</b>, weak and weary.
    </div>
    <label className="rs-field">Name
      <input type="text" value={draft.name} maxLength={24} onChange={event => onChange({ ...draft, name: event.target.value })} />
    </label>
    <div className="rs-color-fields">{colorField('background', 'Page')}{colorField('text', 'Text')}{colorField('accent', 'Accent')}</div>
    <p className={`rs-tone-contrast ${low ? 'is-low' : ''}`}>Text contrast {ratio.toFixed(1)}:1 · {low ? 'below 4.5:1, may be hard to read' : 'comfortable to read'}</p>
    <div className="rs-tone-buttons">
      {!isNew && <button type="button" className="rs-btn is-danger" onClick={onDelete}>Delete</button>}
      <span className="rs-tone-buttons-end">
        <button type="button" className="rs-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="rs-btn is-primary" disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>{isNew ? 'Save tone' : 'Save changes'}</button>
      </span>
    </div>
  </section>;
}

function Preview({ settings }: { settings: UserSettings }) {
  const font = FONTS[settings.font]?.class ?? 'font-serif';
  return <div className="rs-preview" {...readerSurfaceProps(settings)} aria-hidden="true">
    <small>Preview</small>
    <p className={font} style={{ fontSize: `${Math.min(settings.fontSize, PREVIEW_MAX_PX)}px`, fontWeight: settings.readerFontWeight, lineHeight: settings.readerLineHeight, letterSpacing: `${settings.readerLetterSpacing}em`, wordSpacing: `${settings.readerWordSpacing}em`, textAlign: settings.readerAlign, hyphens: settings.readerHyphens ? 'auto' : 'manual' }}>
      Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore.
    </p>
  </div>;
}

function TypefacePicker({ value, onChange }: { value: FontFamily; onChange: (font: FontFamily) => void }) {
  const moreId = useId();
  const selectedExtra = MORE_TYPEFACES.flatMap(group => group.fonts).find(font => font === value);
  const [showMore, setShowMore] = useState(Boolean(selectedExtra));

  const tile = (font: FontFamily) => <button key={font} type="button" role="radio" aria-checked={value === font} aria-label={FONTS[font].name} className="rs-preset rs-typeface-option" onClick={() => onChange(font)}>
    <span className={`rs-preset-aa ${FONTS[font].class}`} aria-hidden="true">Aa</span>
    <span aria-hidden="true"><strong>{FONTS[font].name}</strong><small>{FONTS[font].description}</small></span>
  </button>;

  const groups = (items: TypefaceGroup[]) => items.map(group => <div key={group.label} className="rs-typeface-group">
    <p>{group.label}</p>
    <div className="rs-presets">{group.fonts.map(tile)}</div>
  </div>);

  return <section className="rs-group">
    <header><h3>Typeface</h3><span>{FONTS[value]?.name}</span></header>
    <div id={moreId} className="rs-typeface-picker" role="radiogroup" aria-label="Typeface">
      {FEATURED_TYPEFACES.map(group => <div key={group.label} className="rs-typeface-group">
        <p>{group.label}</p>
        <div className="rs-presets">{group.fonts.map(tile)}</div>
        <div className="rs-more rs-typeface-extras" data-open={showMore} inert={!showMore}>
          <div><div className="rs-presets">{MORE_TYPEFACES.find(extra => extra.label === group.label)?.fonts.map(tile)}</div></div>
        </div>
      </div>)}
      <div className="rs-more rs-typeface-more" data-open={showMore} inert={!showMore}>
        <div>{groups(MORE_TYPEFACES.filter(group => !FEATURED_TYPEFACES.some(featured => featured.label === group.label)))}</div>
      </div>
    </div>
    <button type="button" className="rs-more-toggle" aria-expanded={showMore} aria-controls={moreId} onClick={() => setShowMore(open => !open)}>
      <span>{showMore ? 'Show fewer typefaces' : 'More typefaces'}</span>
      {!showMore && selectedExtra && <em>{FONTS[selectedExtra].name}</em>}
      <ChevronDown aria-hidden="true" />
    </button>
  </section>;
}

/** Reading-only settings: a floating trigger plus a tile-based sheet. Rendered for Stories, Quotes and Library. */
export function ReaderSettings({ settings, onUpdateSetting, onUpdateSettings, showTrigger = true, sectionLabel = 'Read' }: { settings: UserSettings; onUpdateSetting: UpdateSetting; onUpdateSettings: (patch: Partial<UserSettings>) => void; showTrigger?: boolean; sectionLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('look');
  const sceneryInput = useRef<HTMLInputElement>(null);
  const [uploadingScenery, setUploadingScenery] = useState(false);
  const [sceneryError, setSceneryError] = useState('');
  const uploadScenery = async (file: File) => {
    setUploadingScenery(true);
    setSceneryError('');
    try {
      const customScenery = await prepareCustomScenery(file);
      // Reserve enough storage before applying a change; settings persistence otherwise fails silently.
      const probeKey = `keyhaven_scenery_check_${crypto.randomUUID()}`;
      try {
        localStorage.setItem(probeKey, customScenery);
        localStorage.removeItem(probeKey);
      } catch {
        throw new Error('There is not enough browser storage to save this image.');
      }
      onUpdateSettings({ customScenery, readerBackground: 'custom' });
    } catch (error) {
      setSceneryError(error instanceof Error ? error.message : 'The image could not be saved.');
    } finally {
      setUploadingScenery(false);
    }
  };
  const customTones = settings.customTones ?? [];
  const [toneDraft, setToneDraft] = useState<{ tone: CustomReaderTone; isNew: boolean } | null>(null);
  const selectedCustom = customTones.find(tone => `${CUSTOM_TONE_PREFIX}${tone.id}` === settings.readerPaper);

  const toneTile = (id: ReaderToneId): TileOption<UserSettings['readerPaper']> => ({
    value: id, label: toneName(id), visualTone: id,
    visualStyle: isThemeTone(id) ? undefined : toneVariables(RECIPE_TONES[id as keyof typeof RECIPE_TONES]),
    visual: <><span className="rs-aa font-serif">Aa</span><span className="rs-tone-dot" /></>
  });
  const customTile = (tone: CustomReaderTone): TileOption<UserSettings['readerPaper']> => ({
    value: `${CUSTOM_TONE_PREFIX}${tone.id}`, label: tone.name, visualTone: 'custom', visualStyle: toneVariables(tone),
    visual: <><span className="rs-aa font-serif">Aa</span><span className="rs-tone-dot" /></>
  });

  const startNewTone = () => setToneDraft({ isNew: true, tone: { id: Date.now().toString(36), name: `Custom ${customTones.length + 1}`, background: '#f3eee3', text: '#2b2924', accent: '#6b7f5e' } });
  const saveTone = (tone: CustomReaderTone) => {
    const exists = customTones.some(item => item.id === tone.id);
    onUpdateSetting('customTones', exists ? customTones.map(item => item.id === tone.id ? tone : item) : [...customTones, tone]);
    onUpdateSetting('readerPaper', `${CUSTOM_TONE_PREFIX}${tone.id}`);
    setToneDraft(null);
  };
  const deleteTone = (id: string) => {
    onUpdateSetting('customTones', customTones.filter(item => item.id !== id));
    if (settings.readerPaper === `${CUSTOM_TONE_PREFIX}${id}`) onUpdateSetting('readerPaper', 'system');
    setToneDraft(null);
  };
  // While editing, the pinned preview shows the draft so colors can be judged against real text.
  const previewSettings = toneDraft
    ? { ...settings, readerPaper: `${CUSTOM_TONE_PREFIX}${toneDraft.tone.id}` as const, customTones: [...customTones.filter(item => item.id !== toneDraft.tone.id), toneDraft.tone] }
    : settings;

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.typing-input')?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Views with their own settings button (the Stories bar) open the sheet through this event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_READER_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_READER_SETTINGS_EVENT, onOpen);
  }, []);

  const look = <>
    <TileGroup label="Theme" columns={2} value={settings.theme} onChange={value => onUpdateSetting('theme', value)} options={(Object.keys(THEME_PREVIEWS) as ThemeId[]).map(id => {
      const colors = THEME_PREVIEWS[id];
      return { value: id, label: id === 'reading-room' ? 'Reading room' : 'Daylight', sub: id === 'reading-room' ? 'Dark, low glare' : 'Light, crisp', visual: <span className="rs-mini-app" style={{ background: colors.bg }}><i style={{ background: colors.card }} /><span><b style={{ background: colors.text }} /><b style={{ background: colors.text, width: '72%' }} /><b style={{ background: colors.accent, width: '38%' }} /></span></span> };
    })} />
    <TileGroup label="Page tone" columns={4} value={settings.readerPaper} onChange={value => onUpdateSetting('readerPaper', value)}
      options={[
        { value: 'system', label: 'Match theme', visualClass: 'rs-tone-auto', visual: <><span className="rs-tone-split"><i data-reader-tone="night" /><i data-reader-tone="paper" /></span><span className="rs-aa font-serif">Aa</span></> },
        ...MAIN_TONES.map(toneTile),
        ...EXTRA_TONES.slice(0, 4).map(toneTile)
      ]}
      moreOptions={[...EXTRA_TONES.slice(4).map(toneTile), ...customTones.map(customTile)]}
      moreLabel="More tones"
      moreCompact
      moreFooter={<button type="button" className="rs-tile rs-tone-add" onClick={startNewTone}><span className="rs-visual" aria-hidden="true"><Plus /></span><span className="rs-label">New tone</span></button>}
    />
    {toneDraft
      ? <ToneEditor draft={toneDraft.tone} isNew={toneDraft.isNew} onChange={tone => setToneDraft({ ...toneDraft, tone })} onCancel={() => setToneDraft(null)} onSave={saveTone} onDelete={() => deleteTone(toneDraft.tone.id)} />
      : selectedCustom && <div className="rs-tone-bar"><span>Custom tone · <strong>{selectedCustom.name}</strong></span><div><button type="button" className="rs-btn is-small" onClick={() => setToneDraft({ isNew: false, tone: selectedCustom })}>Edit</button></div></div>}
    <TileGroup label="Scenery" hint="Behind the page" columns={3} value={settings.readerBackground} onChange={value => onUpdateSetting('readerBackground', value)} options={SCENERY.map(sceneryTile)}
      moreOptions={[...MORE_SCENERY.map(sceneryTile), ...(settings.customScenery ? [{ value: 'custom' as const, label: 'Custom image', visual: null, visualClass: 'rs-image', visualStyle: { backgroundImage: `url("${settings.customScenery}")` } }] : [])]}
      moreLabel="More scenery"
      moreFooter={<button type="button" className="rs-tile" disabled={uploadingScenery} onClick={() => sceneryInput.current?.click()}><span className="rs-visual" aria-hidden="true"><Plus /></span><span className="rs-label">{uploadingScenery ? 'Saving image…' : settings.customScenery ? 'Replace image' : 'Custom image'}<small>Upload JPG, PNG, WebP</small></span></button>}
    />
    <input ref={sceneryInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload custom scenery" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadScenery(file); }} />
    {sceneryError && <p className="rs-hint" role="alert">{sceneryError}</p>}
    {settings.customScenery && <div className="rs-tone-bar"><span>Your uploaded image</span><button type="button" className="rs-btn is-small" disabled={uploadingScenery} onClick={() => onUpdateSettings({ customScenery: undefined, ...(settings.readerBackground === 'custom' ? { readerBackground: 'none' } : {}) })}>Remove image</button></div>}
    <div className="setting-group rs-motion">
      <label className="toggle-row">Background motion<input type="checkbox" checked={settings.ambientMotion} onChange={event => onUpdateSetting('ambientMotion', event.target.checked)} /></label>
      <p className="rs-hint">Floating motes and drifting scenery. Leave off for the lightest, coolest-running pages.</p>
    </div>
    {hasSceneryImage(settings.readerBackground) && <div className="setting-group rs-sliders">
      <label>Readability veil<input type="range" min="55" max="95" value={settings.readerOverlay} onChange={event => onUpdateSetting('readerOverlay', Number(event.target.value))} /></label>
      <label>Soft focus<input type="range" min="0" max="8" value={settings.readerBlur} onChange={event => onUpdateSetting('readerBlur', Number(event.target.value))} /></label>
    </div>}
  </>;

  type SliderKey = keyof typeof TYPE_RANGES;
  const typeSlider = (key: SliderKey, label: string, format: (value: number) => string, hint?: string) => (
    <SliderField label={label} value={settings[key]} {...TYPE_RANGES[key]} defaultValue={DEFAULT_TYPOGRAPHY[key]} format={format} hint={hint} visual={key === 'fontSize' ? 'size' : key === 'readerFontWeight' ? 'weight' : undefined} onChange={value => onUpdateSetting(key, value)} />
  );
  const applyTypography = (values: Typography) => onUpdateSettings(values);
  const signed = (value: number, digits: number) => `${value > 0 ? '+' : ''}${value.toFixed(digits)} em`;

  const typography = <>
    {sectionLabel === 'Read' && <section className="rs-group">
      <header><h3>Page layout</h3><span>Reading mode</span></header>
      <div className="rs-presets" role="group" aria-label="Page layout">
        {(['single', 'spread'] as const).map(value => <button key={value} type="button" className="rs-preset" aria-pressed={(settings.readerPageLayout ?? 'single') === value} onClick={() => onUpdateSetting('readerPageLayout', value)}>
          <span className="rs-page-diagram" aria-hidden="true"><i />{value === 'spread' && <i />}</span>
          <span><strong>{value === 'single' ? 'One page' : 'Two pages'}</strong><small>{value === 'single' ? 'A focused column' : 'Side by side'}</small></span>
        </button>)}
      </div>
      <p className="kh-slider-hint">Two pages use one page on narrow screens.</p>
    </section>}
    <section className="rs-group">
      <header><h3>Presets</h3><span>Sets every option below</span></header>
      <div className="rs-presets">
        {TYPE_PRESETS.map(preset => <button key={preset.id} type="button" className="rs-preset" aria-pressed={matchesTypography(settings, preset.values)} onClick={() => applyTypography(preset.values)}>
          <span className={`rs-preset-aa ${FONTS[preset.values.font].class}`} style={{ fontWeight: preset.values.readerFontWeight }} aria-hidden="true">Aa</span>
          <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
        </button>)}
      </div>
    </section>

    <TypefacePicker value={settings.font} onChange={font => onUpdateSetting('font', font)} />

    <section className="rs-group">
      <header><h3>Size and weight</h3><span>Double-click a slider to reset it</span></header>
      <div className="rs-fields">
        {typeSlider('fontSize', 'Text size', value => `${value} px`)}
        {typeSlider('readerFontWeight', 'Weight', value => `${value} · ${weightName(value)}`)}
      </div>
    </section>

    <section className="rs-group">
      <header><h3>Spacing</h3></header>
      <div className="rs-fields">
        {typeSlider('readerLineHeight', 'Line spacing', value => `${value.toFixed(2)}×`)}
        {typeSlider('readerLetterSpacing', 'Letter spacing', value => signed(value, 3))}
        {typeSlider('readerWordSpacing', 'Word spacing', value => signed(value, 2))}
        <div className="kh-slider">
          <div className="kh-slider-head"><span className="rs-field-label">Paragraph spacing</span></div>
          <div className="rs-segmented" role="radiogroup" aria-label="Paragraph spacing">
            {([[0, 'None'], [1, 'One line'], [2, 'Two lines']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={settings.readerParagraphSpacing === value} onClick={() => onUpdateSetting('readerParagraphSpacing', value)}>{label}</button>)}
          </div>
          <p className="kh-slider-hint">Space between paragraphs on reading pages.</p>
        </div>
      </div>
    </section>

    <section className="rs-group">
      <header><h3>Layout</h3></header>
      <div className="rs-fields">
        <div className="rs-presets" role="group" aria-label="Column width presets">
          {([
            { value: 640, label: 'Wide margins', column: '42%' },
            { value: 780, label: 'Balanced', column: '60%' },
            { value: 940, label: 'Slim margins', column: '78%' },
            { value: 1400, label: 'Edge to edge', column: '94%' }
          ] as const).map(option => <button key={option.value} type="button" className="rs-preset" aria-pressed={settings.readerWidth === option.value} onClick={() => onUpdateSetting('readerWidth', option.value)}>
            <span className="rs-preset-aa rs-width-preview" aria-hidden="true"><span className="rs-frame" style={{ '--col': option.column } as CSSProperties}><i /><i /><i /><i /></span></span>
            <span><strong>{option.label}</strong><small>{option.value === TYPE_RANGES.readerWidth.max ? 'Full available width' : `${option.value} px`}</small></span>
          </button>)}
        </div>
        {typeSlider('readerWidth', 'Column width', value => value === TYPE_RANGES.readerWidth.max ? 'Edge to edge' : `${value} px`, 'Narrower columns are easier to follow. The maximum fills the available width with a small edge margin.')}
        <div className="kh-slider">
          <div className="kh-slider-head"><span className="rs-field-label">Alignment</span></div>
          <div className="rs-segmented" role="radiogroup" aria-label="Alignment">
            {(['left', 'justify'] as const).map(value => <button key={value} type="button" role="radio" aria-checked={settings.readerAlign === value} onClick={() => onUpdateSetting('readerAlign', value)}>{value === 'left' ? 'Left' : 'Justified'}</button>)}
          </div>
        </div>
        <div className="setting-group">
          <label className="toggle-row">Hyphenate long words<input type="checkbox" checked={settings.readerHyphens} onChange={event => onUpdateSetting('readerHyphens', event.target.checked)} /></label>
        </div>
        <p className="kh-slider-hint">Alignment and hyphenation shape reading pages. While typing, every word stays whole on its line.</p>
      </div>
    </section>

    <button type="button" className="rs-btn rs-reset" onClick={() => applyTypography(DEFAULT_TYPOGRAPHY)}><RotateCcw aria-hidden="true" />Reset typography for {sectionLabel}</button>
  </>;

  const sound = <>
    <TileGroup label="Background sound" hint="Plays while you read" columns={3} value={settings.ambientSound} onChange={value => onUpdateSetting('ambientSound', value)} options={SOUNDS.map(item => ({
      value: item.id, label: item.label, visualClass: 'rs-sound', visualStyle: item.style,
      visual: <>{item.icon}{settings.ambientSound === item.id && item.id !== 'none' && <span className="rs-eq"><i /><i /><i /></span>}</>
    }))} />
    {settings.ambientSound !== 'none' && <div className="setting-group rs-sliders">
      <label>Volume<input type="range" min="0" max="1" step="0.05" value={settings.ambientVolume} onChange={event => onUpdateSetting('ambientVolume', Number(event.target.value))} /></label>
    </div>}
  </>;

  return <>
    {showTrigger && <motion.button type="button" className="reader-settings-trigger glass glass-pill" onClick={() => setOpen(true)} aria-label="Reading settings" title="Reading settings">
      <SlidersHorizontal /><span>Reading</span>
    </motion.button>}

    <AnimatePresence>
      {open && <motion.div key="rs-scrim" className="rs-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={close} />}
      {open && (
        <motion.aside key="rs-panel" className="rs-panel glass glass-panel" role="dialog" aria-label="Reading settings" variants={slideInRight} initial="hidden" animate="show" exit="exit">
          <div className="rs-pinned">
            <header className="rs-header">
              <h2>Settings</h2>
              <button type="button" onClick={close} aria-label="Close reading settings"><X /></button>
            </header>
            <div className="rs-tabs" role="tablist" aria-label="Reading settings sections">
              {TABS.map(item => (
                <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} aria-label={item.label} title={item.label} onClick={() => setTab(item.id)}>
                  {tab === item.id && <motion.span layoutId="rs-tab-pill" className="rs-tab-pill" transition={spring.snappy} />}
                  {item.icon}<span>{item.label}</span>
                </button>
              ))}
            </div>
            {tab === 'bar' ? <BarPreview settings={settings} /> : tab !== 'sound' && <Preview settings={previewSettings} />}
          </div>
          <div className="rs-body">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: ease.outExpo }}>
                {tab === 'look' ? look : tab === 'type' ? typography : tab === 'bar' ? <BarSettings settings={settings} onUpdateSetting={onUpdateSetting} /> : sound}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  </>;
}
