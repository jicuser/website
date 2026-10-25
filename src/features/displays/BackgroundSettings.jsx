import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Image,
  Layers,
  Maximize2,
  Monitor,
  Palette,
  Pencil,
  Radio,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Type,
} from 'lucide-react';
import NormalSettings from './NormalSettings';
import TvDisplayLayoutEditor from './TvDisplayLayoutEditor';
import ScheduledScenes from './ScheduledScenes';
import TvBoardPicker from './TvBoardPicker';
import TvThemePicker from './TvThemePicker';
import TvDraftReview from './TvDraftReview';
import TvEverydaySettings from './TvEverydaySettings';
import TvFinalPreview from './TvFinalPreview';
import TvPreview from '@/components/admin/TvPreview';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { tvPresetLabel, tvEditorSections, TV_PRESET_DESCRIPTIONS } from '@/lib/tvEditorLabels';
import {
  createTvSettingsDraft,
  hasTvSettingsChanges,
  tvSettingsDraftReducer,
} from '@/lib/tvSettingsDraft';
import { restoreTvLocalDraft, serializeTvLocalDraft, tvLocalDraftKey } from '@/lib/tvLocalDraft';
import {
  TV_WORKSPACE_TABS,
  TV_EDITOR_TABS,
  nextTvWorkspaceTab,
  nextTvEditorTab,
  canPublishTvChanges,
} from './tvWorkspaceModel';
import '@/styles/tv-admin.css';
import '@/styles/tv-workspace.css';

const tabIcons = { display: Monitor, schedule: CalendarDays, settings: Settings2 };
const contentTypes = {
  times: ['Prayer times', 'Begins and Jama’ah', Clock3],
  next: ['Next prayer', 'Next congregation and countdown', Clock3],
  clock: ['Clock', 'Current time', Clock3],
  brand: ['JIC logo', 'Centre branding', Monitor],
  poster: ['Poster', 'Selected posters and announcements', Image],
  'poster-next': ['Poster', 'Selected posters and announcements', Image],
  state: ['Prayer message', 'Automatic prayer content', Type],
  text: ['Text notice', 'Custom message', Type],
  ramadan: ['Meal sponsorships', 'Published sponsorship information', CalendarDays],
};

function readLocalDraft(userId, screenId, data) {
  const key = tvLocalDraftKey(userId, screenId);
  if (!key) return null;
  try {
    return restoreTvLocalDraft(window.sessionStorage.getItem(key), { userId, screenId, data });
  } catch {
    return null;
  }
}

export default function BackgroundSettings({
  screenId,
  userId,
  data,
  currentEvents = [],
  onRefresh,
  onSwitchScreen,
  onGoLive,
}) {
  const [restored] = useState(() => readLocalDraft(userId, screenId, data));
  const [draft, dispatch] = useReducer(
    tvSettingsDraftReducer,
    null,
    () => restored?.state || createTvSettingsDraft(screenId, data),
  );
  const { form, revision, remoteChanged } = draft;
  const { saveCurrent } = useAdminSave();
  const dirty = hasTvSettingsChanges(draft);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('save');
  const inFlight = useRef(false);
  const [message, setMessage] = useState(
    restored ? 'Saved draft restored. It has not been published.' : '',
  );
  const [messageIsError, setMessageIsError] = useState(false);
  const [preset, setPreset] = useState('standby');
  const [task, setTask] = useState('display');
  const [editing, setEditing] = useState(false);
  const [editorTab, setEditorTab] = useState('layout');
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState(() =>
    restored ? JSON.stringify(restored.state.form) : null,
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState('before');
  const tabRefs = useRef({});
  const editorTabRefs = useRef({});
  const formSnapshot = JSON.stringify(form);
  const draftSaved = dirty && savedDraftSnapshot === formSnapshot;
  const localDraftChanged = savedDraftSnapshot !== null && savedDraftSnapshot !== formSnapshot;
  const locked = busy || remoteChanged;
  const canPublish = canPublishTvChanges({ dirty, busy, remoteChanged });
  const sections = tvEditorSections(screenId, form.preset_names);
  const presetName = tvPresetLabel(preset, form.preset_names);
  const savedSettings = useMemo(() => JSON.parse(draft.baseline), [draft.baseline]);
  const previewSettings = previewSaved && dirty ? savedSettings : form;
  const showingDraft = dirty && !previewSaved;
  const hall = screenId !== 'shoe-area';
  const orientation = form.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const currentLayout = form.display_layouts[orientation][preset];

  const update = (key, value) => {
    if (inFlight.current || remoteChanged) return;
    setMessage('');
    setMessageIsError(false);
    dispatch({ type: 'edit', key, value });
    if (key === 'display_layouts') {
      // Replacing or deleting timetable items also removes their fixed references.
      dispatch({
        type: 'edit',
        key: 'everyday_display',
        value: {
          ...form.everyday_display,
          persistent_layer_ids: Object.fromEntries(
            ['landscape', 'portrait'].map((orientation) => [
              orientation,
              form.everyday_display.persistent_layer_ids[orientation].filter((id) =>
                value?.[orientation]?.standby?.layers.some((layer) => layer.id === id),
              ),
            ]),
          ),
        },
      });
    }
  };

  useEffect(() => {
    if (screenId === 'shoe-area') setPreset('standby');
  }, [screenId]);
  useEffect(() => {
    dispatch({ type: 'sync', screenId, data });
  }, [screenId, data]);
  useEffect(() => {
    if (!dirty) setPreviewSaved(false);
  }, [dirty]);
  useEffect(() => {
    if (((!dirty && !localDraftChanged) || draftSaved) && !busy) return undefined;
    const protectDraft = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty, draftSaved, localDraftChanged, busy]);

  function clearLocalDraft() {
    setSavedDraftSnapshot(null);
    const key = tvLocalDraftKey(userId, screenId);
    if (!key) return true;
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function saveDraft() {
    if (inFlight.current || (!dirty && !localDraftChanged) || !userId) return false;
    try {
      if (!dirty) {
        window.sessionStorage.removeItem(tvLocalDraftKey(userId, screenId));
        setSavedDraftSnapshot(null);
        setMessage('Saved draft cleared. This display matches the published settings.');
        setMessageIsError(false);
        return true;
      }
      const value = serializeTvLocalDraft(draft, userId);
      if (!value) return false;
      window.sessionStorage.setItem(tvLocalDraftKey(userId, screenId), value);
      setSavedDraftSnapshot(JSON.stringify(form));
      setMessage('Draft saved in this browser tab. The TV has not changed.');
      setMessageIsError(false);
      return true;
    } catch {
      setMessage('This browser could not save the draft. Keep this tab open to retain your edits.');
      setMessageIsError(true);
      return false;
    }
  }

  async function save() {
    if (inFlight.current || !canPublish) return false;
    inFlight.current = true;
    setOperation('save');
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    try {
      const saved = await tvRequest(
        'save-background',
        screenId,
        { settings: form, expectedUpdatedAt: revision },
        { staff: true },
      );
      dispatch({ type: 'saved', screenId, data: saved });
      const cleared = clearLocalDraft();
      setMessage(
        cleared
          ? 'Display changes published.'
          : 'Display changes published. The old tab draft could not be removed.',
      );
      // A failed status refresh must not turn a successful publish into a failed save.
      try {
        await onRefresh();
      } catch {
        setMessage('Changes published. Current screen status could not be refreshed.');
      }
      return true;
    } catch (error) {
      setMessage(error.message);
      setMessageIsError(true);
      throw error;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  useRegisterAdminSave(
    dirty ? save : saveDraft,
    dirty || localDraftChanged,
    dirty ? 'Publish display changes' : 'Save tab draft',
    busy,
  );

  async function reload() {
    if (
      inFlight.current ||
      (dirty && !window.confirm('Discard your unsaved display changes and reload saved settings?'))
    )
      return;
    inFlight.current = true;
    setOperation('reload');
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    try {
      const next = await onRefresh();
      dispatch({ type: 'reload', screenId, data: next });
      const cleared = clearLocalDraft();
      setMessage(
        cleared
          ? 'Published settings reloaded.'
          : 'Published settings reloaded. The old tab draft could not be removed.',
      );
    } catch (error) {
      setMessage(error.message);
      setMessageIsError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function selectPreset(value) {
    setPreset(value);
    setPreviewSaved(false);
  }

  function editLayout(value = preset) {
    setPreset(value);
    setPreviewSaved(false);
    setTask('display');
    setEditing(true);
    setEditorTab('layout');
  }

  function goLive() {
    if (busy || !hall || !onGoLive) return;
    if (
      ((dirty && !draftSaved) || localDraftChanged) &&
      !window.confirm(
        'Leave unpublished display changes? Save a draft first to keep these edits in this tab.',
      )
    )
      return;
    onGoLive();
  }

  function setItemVisible(id, visible) {
    update('display_layouts', {
      ...form.display_layouts,
      [orientation]: {
        ...form.display_layouts[orientation],
        [preset]: {
          ...currentLayout,
          layers: currentLayout.layers.map((item) =>
            item.id === id ? { ...item, hidden: !visible } : item,
          ),
        },
      },
    });
  }

  function orientationControl(context) {
    return (
      <div className="tv-workspace-field">
        <span id={`tv-shape-${screenId}-${context}`}>Orientation</span>
        <div
          className="tv-workspace-segments"
          role="group"
          aria-labelledby={`tv-shape-${screenId}-${context}`}
        >
          {['landscape', 'portrait'].map((shape) => (
            <button
              key={shape}
              type="button"
              disabled={locked}
              aria-pressed={orientation === shape}
              onClick={() => update('display_orientation', shape)}
            >
              <Monitor
                size={17}
                aria-hidden="true"
                className={shape === 'portrait' ? 'tv-workspace-portrait-icon' : ''}
              />
              {shape === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function timingControls() {
    return (
      <fieldset className="tv-settings-fields" disabled={locked}>
        <legend className="sr-only">Automatic screens and timed overrides</legend>
        {hall ? (
          <div className="tv-workspace-card">
            <div className="tv-workspace-card-heading">
              <strong>Automatic screens</strong>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
            <label className="tv-workspace-field">
              <span>When to show</span>
              <select
                value={schedulePreset}
                onChange={(event) => setSchedulePreset(event.target.value)}
              >
                {sections
                  .filter((section) => section.id !== 'standby')
                  .map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
              </select>
            </label>
            <NormalSettings
              form={form}
              update={update}
              currentEvents={currentEvents}
              hall={hall}
              preset={schedulePreset}
            />
            <button
              type="button"
              className="admin-button"
              onClick={() => editLayout(schedulePreset)}
            >
              <Pencil size={16} aria-hidden="true" /> Edit this layout
            </button>
          </div>
        ) : (
          <p className="tv-workspace-notice">
            The Shoe Area uses everyday content. Set its rotation in Edit display → Content.
          </p>
        )}
        <ScheduledScenes form={form} update={update} screenId={screenId} disabled={locked} />
      </fieldset>
    );
  }

  const status = busy
    ? operation === 'reload'
      ? 'Reloading settings…'
      : 'Publishing changes…'
    : remoteChanged
      ? 'Settings changed elsewhere'
      : dirty
        ? draftSaved
          ? 'Draft saved in this tab'
          : 'Unpublished changes'
        : localDraftChanged
          ? 'Display matches published settings'
          : 'All changes published';

  return (
    <div className="stream-background-settings tv-workspace">
      <div className="tv-workspace-topline">
        <span>
          <Monitor size={16} aria-hidden="true" /> Automatic display
        </span>
        <span>
          {form.display_orientation === 'portrait' ? 'Portrait · 9:16' : 'Landscape · 16:9'}
        </span>
      </div>
      {data.presentation && (
        <p className="tv-workspace-notice">
          A presentation is active. These layouts return when it ends.
        </p>
      )}
      {remoteChanged && (
        <div className="tv-workspace-conflict" role="alert">
          <p>Settings changed elsewhere. Your draft is kept here. Reload before publishing.</p>
          <button type="button" className="admin-button" disabled={busy} onClick={reload}>
            <RefreshCw size={16} aria-hidden="true" /> Reload published settings
          </button>
        </div>
      )}
      <div
        className="tv-workspace-tabs"
        role="tablist"
        aria-label="TV screen workspace"
        onKeyDown={(event) => {
          const next = nextTvWorkspaceTab(task, event.key);
          if (!next) return;
          event.preventDefault();
          setTask(next);
          tabRefs.current[next]?.focus();
        }}
      >
        {TV_WORKSPACE_TABS.map(({ id, label }) => {
          const Icon = tabIcons[id];
          return (
            <button
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              type="button"
              role="tab"
              id={`tv-task-${screenId}-${id}`}
              aria-controls={`tv-panel-${screenId}-${id}`}
              aria-selected={task === id}
              tabIndex={task === id ? 0 : -1}
              onClick={() => setTask(id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <section
        className="tv-workspace-panel"
        id={`tv-panel-${screenId}-display`}
        role="tabpanel"
        aria-labelledby={`tv-task-${screenId}-display`}
        hidden={task !== 'display'}
        tabIndex={0}
      >
        <label className="tv-workspace-preset">
          <span>Display moment</span>
          <select
            value={preset}
            onChange={(event) => selectPreset(event.target.value)}
            disabled={busy}
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
        {editing ? (
          <div className="tv-workspace-card tv-workspace-editor">
            <div className="tv-workspace-card-heading">
              <strong>Edit display</strong>
              <button type="button" className="admin-button" onClick={() => setEditing(false)}>
                <ArrowLeft size={16} aria-hidden="true" /> Done editing
              </button>
            </div>
            <div
              className="tv-editor-tabs"
              role="tablist"
              aria-label="Edit display"
              onKeyDown={(event) => {
                const next = nextTvEditorTab(editorTab, event.key);
                if (!next) return;
                event.preventDefault();
                setEditorTab(next);
                editorTabRefs.current[next]?.focus();
              }}
            >
              {TV_EDITOR_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  ref={(node) => {
                    editorTabRefs.current[id] = node;
                  }}
                  id={`tv-editor-tab-${screenId}-${id}`}
                  aria-controls={`tv-editor-panel-${screenId}-${id}`}
                  aria-selected={editorTab === id}
                  tabIndex={editorTab === id ? 0 : -1}
                  onClick={() => setEditorTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <section
              className="tv-editor-panel"
              id={`tv-editor-panel-${screenId}-layout`}
              role="tabpanel"
              aria-labelledby={`tv-editor-tab-${screenId}-layout`}
              hidden={editorTab !== 'layout'}
              tabIndex={0}
            >
              <div className="tv-editor-layout-controls">
                {orientationControl('editor')}
                {preset === 'standby' && (
                  <TvBoardPicker
                    key={`${screenId}:${form.display_orientation}:${revision}`}
                    screenId={screenId}
                    settings={form}
                    onChange={update}
                    disabled={locked}
                  />
                )}
                <details className="tv-workspace-disclosure">
                  <summary>Colours & appearance</summary>
                  <TvThemePicker settings={form} onChange={update} disabled={locked} />
                </details>
              </div>
              <TvDisplayLayoutEditor
                screenId={screenId}
                disabled={locked}
                settings={form}
                preset={preset}
                onChange={update}
                allowBlocks={preset === 'standby'}
                titleOverride={preset === 'standby' ? 'Timetable & notices' : ''}
              />
            </section>
            <section
              className="tv-editor-panel"
              id={`tv-editor-panel-${screenId}-content`}
              role="tabpanel"
              aria-labelledby={`tv-editor-tab-${screenId}-content`}
              hidden={editorTab !== 'content'}
              tabIndex={0}
            >
              <fieldset className="tv-settings-fields" disabled={locked}>
                <legend className="sr-only">Display content</legend>
                <div className="tv-editor-content-heading">
                  <h3>Screen items</h3>
                  <span>{presetName}</span>
                </div>
                <div className="tv-editor-content-list">
                  {currentLayout.layers.map((item, index) => {
                    const [name, detail, Icon] = contentTypes[item.type] || [
                      'Content',
                      'Display item',
                      Layers,
                    ];
                    const posterNumber = currentLayout.layers
                      .slice(0, index + 1)
                      .filter((entry) => ['poster', 'poster-next'].includes(entry.type)).length;
                    const label =
                      item.type === 'poster' || item.type === 'poster-next'
                        ? `${name} ${posterNumber}`
                        : name;
                    return (
                      <label className="tv-editor-content-row" key={item.id}>
                        <span className="tv-editor-content-icon">
                          <Icon size={19} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{label}</strong>
                          <small>{item.type === 'text' && item.text ? item.text : detail}</small>
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={`Show ${label}`}
                          checked={!item.hidden}
                          onChange={(event) => setItemVisible(item.id, event.target.checked)}
                        />
                      </label>
                    );
                  })}
                  {!currentLayout.layers.length && <p>No items yet. Add an item in Layout.</p>}
                </div>
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => setEditorTab('layout')}
                >
                  <Pencil size={16} aria-hidden="true" /> Arrange or add items
                </button>
                <TvEverydaySettings
                  settings={form}
                  screenId={screenId}
                  onChange={update}
                  disabled={locked}
                />
                <details className="tv-workspace-card tv-workspace-disclosure">
                  <summary>Posters & content</summary>
                  <NormalSettings
                    form={form}
                    update={update}
                    currentEvents={currentEvents}
                    hall={hall}
                    preset="standby"
                  />
                </details>
              </fieldset>
            </section>
            <section
              className="tv-editor-panel"
              id={`tv-editor-panel-${screenId}-timing`}
              role="tabpanel"
              aria-labelledby={`tv-editor-tab-${screenId}-timing`}
              hidden={editorTab !== 'timing'}
              tabIndex={0}
            >
              {task === 'display' && editorTab === 'timing' && timingControls()}
            </section>
          </div>
        ) : (
          <div className="tv-workspace-card tv-workspace-display">
            <div className="tv-workspace-card-heading">
              <span>
                <Eye size={16} aria-hidden="true" /> Display preview
              </span>
              <span className={`tv-workspace-badge ${showingDraft ? 'is-draft' : ''}`}>
                {showingDraft ? 'Draft' : 'Published layout'}
              </span>
            </div>
            {dirty && (
              <div className="tv-workspace-compare" role="group" aria-label="Preview version">
                <button
                  type="button"
                  aria-pressed={!previewSaved}
                  onClick={() => setPreviewSaved(false)}
                >
                  Draft
                </button>
                <button
                  type="button"
                  aria-pressed={previewSaved}
                  onClick={() => setPreviewSaved(true)}
                >
                  Published
                </button>
              </div>
            )}
            <div
              className={`tv-workspace-preview ${previewSettings.display_orientation === 'portrait' ? 'is-portrait' : ''}`}
            >
              {task === 'display' && (
                <TvPreview
                  screenId={screenId}
                  label={presetName}
                  settings={previewSettings}
                  previewState={preset}
                />
              )}
            </div>
            <div className="tv-workspace-preview-actions">
              <button
                type="button"
                className="admin-button primary"
                disabled={locked}
                onClick={() => editLayout()}
              >
                <Pencil size={17} aria-hidden="true" /> Edit display
              </button>
              {hall && onGoLive && (
                <button
                  type="button"
                  className="admin-button tv-workspace-go-live"
                  disabled={busy}
                  onClick={goLive}
                >
                  <Radio size={17} aria-hidden="true" />{' '}
                  {data.presentation ? 'Manage live' : 'Go live'}
                </button>
              )}
              <button type="button" className="admin-button" onClick={() => setFullscreen(true)}>
                <Maximize2 size={17} aria-hidden="true" /> Fullscreen
              </button>
            </div>
            <p className="tv-workspace-caption">
              {TV_PRESET_DESCRIPTIONS[preset]} Preview only, not a live camera feed.
            </p>
            <dl className="tv-workspace-metadata">
              <div>
                <dt>Layout</dt>
                <dd>{presetName}</dd>
              </div>
              <div>
                <dt>Playback</dt>
                <dd>
                  {preset !== 'standby'
                    ? 'Automatic'
                    : previewSettings.everyday_display.mode === 'rotation'
                      ? 'Scene rotation'
                      : 'One scene'}
                </dd>
              </div>
              <div>
                <dt>Changes</dt>
                <dd>{dirty ? 'Unpublished' : 'Up to date'}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section
        className="tv-workspace-panel"
        id={`tv-panel-${screenId}-schedule`}
        role="tabpanel"
        aria-labelledby={`tv-task-${screenId}-schedule`}
        hidden={task !== 'schedule'}
        tabIndex={0}
      >
        {task === 'schedule' && timingControls()}
      </section>

      <section
        className="tv-workspace-panel"
        id={`tv-panel-${screenId}-settings`}
        role="tabpanel"
        aria-labelledby={`tv-task-${screenId}-settings`}
        hidden={task !== 'settings'}
        tabIndex={0}
      >
        <fieldset className="tv-settings-fields" disabled={locked}>
          <legend className="sr-only">Screen appearance and settings</legend>
          <div className="tv-workspace-card">
            <div className="tv-workspace-card-heading">
              <strong>Screen settings</strong>
              <Settings2 size={18} aria-hidden="true" />
            </div>
            {onSwitchScreen && (
              <label className="tv-workspace-field">
                <span>Screen</span>
                <select
                  value={screenId}
                  onChange={(event) => {
                    if (
                      (!dirty && !localDraftChanged) ||
                      draftSaved ||
                      window.confirm(
                        'Leave unpublished display changes? A draft you saved remains in this browser tab.',
                      )
                    )
                      onSwitchScreen(event.target.value);
                  }}
                >
                  {TV_SCREENS.map((screen) => (
                    <option key={screen.id} value={screen.id}>
                      {screen.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {orientationControl('settings')}
            <label className="tv-workspace-field">
              <span>Layout to rename</span>
              <select value={preset} onChange={(event) => selectPreset(event.target.value)}>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="tv-workspace-field">
              <span>Layout name</span>
              <input
                maxLength={40}
                value={presetName}
                onChange={(event) =>
                  update('preset_names', { ...form.preset_names, [preset]: event.target.value })
                }
              />
            </label>
          </div>
          <div className="tv-workspace-card">
            <div className="tv-workspace-card-heading">
              <strong>Colours & appearance</strong>
              <Palette size={18} aria-hidden="true" />
            </div>
            <TvThemePicker settings={form} onChange={update} disabled={locked} />
          </div>
        </fieldset>
        <button
          type="button"
          className="admin-button tv-workspace-reload"
          disabled={busy}
          onClick={reload}
        >
          <RefreshCw size={16} aria-hidden="true" /> Reload published settings
        </button>
      </section>

      {dirty && (
        <TvDraftReview
          key={screenId}
          saved={savedSettings}
          draft={form}
          screenId={screenId}
          preset={preset}
        />
      )}
      {message && (
        <p
          className={`tv-workspace-feedback ${messageIsError ? 'is-error' : ''}`}
          role={messageIsError ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <div className="tv-workspace-publish">
        <div className="tv-workspace-publish-status" role="status" aria-live="polite">
          {!dirty && !busy && !remoteChanged && <CheckCircle2 size={19} aria-hidden="true" />}
          <span>
            <strong>{status}</strong>
            <small>
              {dirty
                ? draftSaved
                  ? 'Only Publish changes updates the TV.'
                  : savedDraftSnapshot
                    ? 'New edits are not saved in this tab.'
                    : 'The TV keeps its published settings.'
                : localDraftChanged
                  ? 'Save draft to clear the older saved version.'
                  : 'Edit a layout to make changes.'}
            </small>
          </span>
        </div>
        {(dirty || editing || task !== 'display' || savedDraftSnapshot) && (
          <div className="tv-workspace-publish-actions">
            <button
              type="button"
              className="admin-button"
              disabled={(!dirty && !localDraftChanged) || busy || !userId || draftSaved}
              onClick={saveDraft}
            >
              <Save size={16} aria-hidden="true" /> Save draft
            </button>
            <button
              type="button"
              className="admin-button primary"
              disabled={!canPublish}
              onClick={() => saveCurrent().catch(() => {})}
            >
              <Send size={16} aria-hidden="true" />{' '}
              {busy && operation === 'save' ? 'Publishing…' : 'Publish changes'}
            </button>
          </div>
        )}
      </div>
      <TvFinalPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        orientation={previewSettings.display_orientation}
        title={presetName}
        previewLabel={showingDraft ? 'draft preview' : 'published layout preview'}
      >
        {fullscreen && (
          <TvPreview
            screenId={screenId}
            label={presetName}
            settings={previewSettings}
            previewState={preset}
          />
        )}
      </TvFinalPreview>
    </div>
  );
}
