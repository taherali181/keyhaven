'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, Download, Focus, Keyboard, MousePointerClick, Plus, RotateCcw, Settings2, Upload, User, Volume2, X } from 'lucide-react';
import type { CaretStyle, PageAction, SwitchSound, ThemeId, UserSettings } from '@/types';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { Segmented } from '@/components/ui/Segmented';
import { SliderField } from '@/components/ui/SliderField';
import { useSidebarPinned } from '@/hooks/useSidebarPinned';
import { ease, spring } from '@/lib/motion';
import { CUSTOM_TONE_PREFIX, EXTRA_TONES, MAIN_TONES, RECIPE_TONES, toneName } from '@/lib/reader-style';
import { DEFAULT_READER_INPUT, MAX_BINDINGS, PAGE_ACTIONS, PAGE_ACTION_LABELS, RESERVED_KEYS, bindingConflicts, bindingFor, bindingLabel } from '@/lib/reader-input';
import { BACKUP_LABELS, useBackupStatus } from '@/lib/sync/status';
import { downloadBlob, exportBackupBlob, importBackupFile } from '@/lib/backup-file';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type TabId = 'general' | 'typing' | 'input' | 'sound' | 'data';

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'general', label: 'General', icon: <Settings2 /> },
  { id: 'typing', label: 'Typing', icon: <Keyboard /> },
  { id: 'input', label: 'Input', icon: <MousePointerClick /> },
  { id: 'sound', label: 'Sound', icon: <Volume2 /> },
  { id: 'data', label: 'Data', icon: <Database /> }
];

const CARETS: Array<{ value: CaretStyle; label: string }> = [
  { value: 'smooth', label: 'Smooth' }, { value: 'bar', label: 'Bar' }, { value: 'block', label: 'Block' },
  { value: 'underline', label: 'Underline' }, { value: 'glow', label: 'Glow' }
];

const SOUNDS: Array<{ value: SwitchSound; label: string }> = [
  { value: 'off', label: 'Off' }, { value: 'holy-panda', label: 'Holy Panda' }, { value: 'cherry-blue', label: 'Cherry Blue' },
  { value: 'gateron-brown', label: 'Gateron Brown' }, { value: 'cherry-red', label: 'Cherry Red' }, { value: 'typewriter', label: 'Typewriter' },
  { value: 'raindrop', label: 'Raindrop' }
];

/** Fixed shortcuts, listed so they can be found. */
const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl K', 'Open the library'],
  ['Ctrl \\', 'Pin or unpin the sidebar'],
  ['Esc', 'Restart typing, or close a panel'],
  ['Tab then Enter', 'Restart typing'],
  ['Enter', 'Next part, after finishing one']
];

export interface AppSettingsProps {
  settings: UserSettings;
  onUpdateSetting: UpdateSetting;
  onUpdateTheme: (theme: ThemeId) => void;
  onReplaceSettings: (settings: UserSettings) => void;
  onToggleZenMode: () => void;
  onOpenProfile: () => void;
  onClose: () => void;
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="rs-group">
    <header><h3>{title}</h3>{note && <span>{note}</span>}</header>
    <div className="rs-fields"><div className="setting-group">{children}</div></div>
  </section>;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-row app-toggle">
    <span><span>{label}</span>{hint && <small>{hint}</small>}</span>
    <input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
  </label>;
}

/** One page action's keys: chips to remove, and a button that listens for the next key pressed. */
function KeyRow({ action, settings, onChange }: { action: PageAction; settings: UserSettings; onChange: (keys: UserSettings['readerInput']['keys']) => void }) {
  const keys = settings.readerInput.keys;
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const keysRef = useRef(keys);
  useEffect(() => { keysRef.current = keys; });

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { setListening(false); return; }
      if (RESERVED_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) { setNote(`${bindingLabel(bindingFor(event))} can't be used here. Try another key.`); return; }
      const binding = bindingFor(event);
      const current = keysRef.current;
      const others = bindingConflicts(binding, current, action);
      const next = { ...current, [action]: [...current[action].filter(key => key !== binding), binding].slice(-MAX_BINDINGS) };
      // A key does one thing: taking it for this action removes it from any other.
      for (const other of others) next[other] = next[other].filter(key => key !== binding);
      onChange(next);
      setNote(others.length ? `${bindingLabel(binding)} moved here from ${others.map(other => PAGE_ACTION_LABELS[other].toLowerCase()).join(' and ')}.` : '');
      setListening(false);
    };
    // Capture first, so the reader and other shortcuts never see the key being recorded.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, action, onChange]);

  return <div className="app-key-row">
    <span className="app-key-action">{PAGE_ACTION_LABELS[action]}</span>
    <div className="app-key-chips">
      {keys[action].map(key => <span key={key} className="app-key-chip"><kbd>{bindingLabel(key)}</kbd>
        <button type="button" aria-label={`Remove ${bindingLabel(key)} from ${PAGE_ACTION_LABELS[action].toLowerCase()}`} onClick={() => onChange({ ...keys, [action]: keys[action].filter(item => item !== key) })}><X aria-hidden="true" /></button>
      </span>)}
      <button type="button" className={`app-key-add ${listening ? 'is-listening' : ''}`} aria-pressed={listening} onClick={() => { setNote(''); setListening(value => !value); }}>
        {listening ? 'Press a key…' : <><Plus aria-hidden="true" />Add key</>}
      </button>
    </div>
    {note && <p className="app-key-note" role="status">{note}</p>}
  </div>;
}

/** The main settings, opened from the sidebar: things that apply everywhere. Reading look and typography stay in each reader's own sheet. */
export function AppSettings({ settings, onUpdateSetting, onUpdateTheme, onReplaceSettings, onToggleZenMode, onOpenProfile, onClose }: AppSettingsProps) {
  const [tab, setTab] = useState<TabId>('general');
  const [pinned, setPinned] = useSidebarPinned();
  const backup = useBackupStatus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const input = settings.readerInput;
  const setInput = (patch: Partial<UserSettings['readerInput']>) => onUpdateSetting('readerInput', { ...input, ...patch });
  const inputDefault = JSON.stringify(input) === JSON.stringify(DEFAULT_READER_INPUT);

  const download = async () => {
    setBusy(true);
    try {
      downloadBlob(await exportBackupBlob(settings), `keyhaven-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage({ text: 'Backup file downloaded.' });
    } catch {
      setMessage({ text: 'Could not create the backup file.', error: true });
    } finally {
      setBusy(false);
    }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await importBackupFile(file);
      if (result.settings) onReplaceSettings(result.settings);
      setMessage({ text: result.added ? `Restored ${result.added} ${result.added === 1 ? 'record' : 'records'} from the backup.` : 'Everything in that backup is already here.' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not read that file.', error: true });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tones = [...MAIN_TONES, ...EXTRA_TONES];
  const general = <>
    <section className="rs-group">
      <header><h3>Page tone</h3><span>Colours every page</span></header>
      <div className="app-tones" role="radiogroup" aria-label="Page tone">
        {tones.map(id => <button key={id} type="button" role="radio" aria-checked={settings.theme === id} aria-label={toneName(id)} title={toneName(id)} className="app-tone" style={{ '--tone-bg': RECIPE_TONES[id].background, '--tone-fg': RECIPE_TONES[id].text, '--tone-accent': RECIPE_TONES[id].accent } as React.CSSProperties} onClick={() => onUpdateTheme(id)}>
          <span aria-hidden="true">Aa</span>
        </button>)}
        {(settings.customTones ?? []).map(tone => {
          const id = `${CUSTOM_TONE_PREFIX}${tone.id}` as ThemeId;
          return <button key={id} type="button" role="radio" aria-checked={settings.theme === id} aria-label={tone.name} title={tone.name} className="app-tone" style={{ '--tone-bg': tone.background, '--tone-fg': tone.text, '--tone-accent': tone.accent } as React.CSSProperties} onClick={() => onUpdateTheme(id)}>
            <span aria-hidden="true">Aa</span>
          </button>;
        })}
      </div>
    </section>
    <Group title="Sidebar">
      <div className="app-field"><span className="rs-field-label">When not in use</span>
        <Segmented label="Sidebar" layoutId="app-sidebar" value={pinned ? 'pinned' : 'auto'} options={[{ value: 'auto', label: 'Hide' }, { value: 'pinned', label: 'Keep open' }]} onChange={value => setPinned(value === 'pinned')} />
      </div>
    </Group>
    <Group title="Motion">
      <Toggle label="Background motion" hint="Slowly drifting backgrounds and floating light" checked={settings.ambientMotion} onChange={value => onUpdateSetting('ambientMotion', value)} />
    </Group>
    <Group title="Daily goals" note="Shown on your profile">
      <SliderField label="Typing" value={settings.dailyTypingGoalMinutes} min={5} max={240} step={5} defaultValue={15} format={value => `${value} min`} onChange={value => onUpdateSetting('dailyTypingGoalMinutes', value)} />
      <SliderField label="Reading" value={settings.dailyReadingGoalMinutes} min={5} max={240} step={5} defaultValue={20} format={value => `${value} min`} onChange={value => onUpdateSetting('dailyReadingGoalMinutes', value)} />
    </Group>
    <div className="app-actions">
      <button type="button" className="rs-btn" onClick={onToggleZenMode}><Focus aria-hidden="true" />Enter focus mode</button>
    </div>
  </>;

  const typing = <>
    <Group title="Caret">
      <div className="app-field"><span className="rs-field-label">Style</span>
        <GlassSelect value={settings.caretStyle} options={CARETS} onChange={value => onUpdateSetting('caretStyle', value)} />
      </div>
    </Group>
    <Group title="While typing">
      <Toggle label="Strict typing" hint="A mistake must be fixed before moving on" checked={settings.strictMode} onChange={value => onUpdateSetting('strictMode', value)} />
      <Toggle label="Show live speed" hint="Words per minute as you type" checked={settings.showLiveWpm} onChange={value => onUpdateSetting('showLiveWpm', value)} />
      <Toggle label="Show live accuracy" checked={settings.showLiveAccuracy} onChange={value => onUpdateSetting('showLiveAccuracy', value)} />
    </Group>
    <p className="settings-note">Typeface, size and colours for each section are in its own reading settings.</p>
  </>;

  const inputTab = <>
    <Group title="Turning pages" note="Read mode">
      <Toggle label="Mouse wheel turns pages" hint="One scroll, one page" checked={input.wheel} onChange={value => setInput({ wheel: value })} />
      <Toggle label="Click the page edges" hint="Left edge goes back, right edge goes forward" checked={input.clickZones} onChange={value => setInput({ clickZones: value })} />
    </Group>
    <section className="rs-group">
      <header><h3>Page keys</h3><span>A key does one thing</span></header>
      <div className="app-keys">
        {PAGE_ACTIONS.map(action => <KeyRow key={action} action={action} settings={settings} onChange={keys => setInput({ keys })} />)}
      </div>
      <button type="button" className="rs-btn app-keys-reset" disabled={inputDefault} onClick={() => onUpdateSetting('readerInput', DEFAULT_READER_INPUT)}><RotateCcw aria-hidden="true" />Reset to defaults</button>
    </section>
    <section className="rs-group">
      <header><h3>Shortcuts</h3></header>
      <dl className="app-shortcuts">
        {SHORTCUTS.map(([keys, label]) => <div key={keys}><dt>{keys.split(' then ').map((key, index) => <React.Fragment key={key}>{index > 0 && <span> then </span>}<kbd>{key}</kbd></React.Fragment>)}</dt><dd>{label}</dd></div>)}
      </dl>
    </section>
  </>;

  const sound = <>
    <Group title="Key sounds">
      <div className="app-field"><span className="rs-field-label">Switch</span>
        <GlassSelect value={settings.switchSound} options={SOUNDS} onChange={value => onUpdateSetting('switchSound', value)} />
      </div>
      <SliderField label="Volume" value={Math.round(settings.soundVolume * 100)} min={0} max={100} step={5} defaultValue={50} format={value => `${value}%`} onChange={value => onUpdateSetting('soundVolume', value / 100)} />
    </Group>
    <Group title="All sound">
      <Toggle label="Mute everything" hint="Key sounds and background ambience" checked={settings.muted} onChange={value => onUpdateSetting('muted', value)} />
    </Group>
    <p className="settings-note">Background sounds and music are under Ambience in the reading settings.</p>
  </>;

  const data = <>
    <section className="rs-group">
      <header><h3>Backup</h3></header>
      <div className="app-backup">
        <span className="app-backup-state" data-state={backup.state}>{BACKUP_LABELS[backup.state]}</span>
        <p>{backup.user ? `Signed in as ${backup.user.email}.` : 'Everything is saved in this browser. Sign in to keep it backed up and in step across devices.'}</p>
      </div>
    </section>
    <section className="rs-group">
      <header><h3>Backup file</h3><span>History, progress, shelves and settings</span></header>
      <div className="app-actions">
        <button type="button" className="rs-btn" disabled={busy} onClick={() => void download()}><Download aria-hidden="true" />Download</button>
        <button type="button" className="rs-btn" disabled={busy} onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />Restore from file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => void restore(event.target.files?.[0])} />
      </div>
      {message && <p className={`settings-note ${message.error ? 'is-error' : ''}`} role="status">{message.text}</p>}
    </section>
    <div className="app-actions">
      <button type="button" className="rs-btn" onClick={onOpenProfile}><User aria-hidden="true" />Open profile</button>
    </div>
  </>;

  const panels: Record<TabId, ReactNode> = { general, typing, input: inputTab, sound, data };

  return <div className="app-settings">
    <div className="rs-pinned">
      <header className="rs-header">
        <h2>Settings</h2>
        <button type="button" onClick={onClose} aria-label="Close settings"><X /></button>
      </header>
      <div className="rs-tabs app-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
          {tab === item.id && <motion.span layoutId="app-tab-pill" className="rs-tab-pill" transition={spring.snappy} />}
          {item.icon}<span>{item.label}</span>
        </button>)}
      </div>
    </div>
    <div className="rs-body">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" aria-label={TABS.find(item => item.id === tab)?.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: ease.outExpo }}>
          {panels[tab]}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>;
}
