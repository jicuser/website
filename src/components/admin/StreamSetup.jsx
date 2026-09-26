import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';
import useStreamSetup from '@/hooks/useStreamSetup';
import { safeWebUrl } from '@/lib/video';
import { londonDate } from '@/lib/timetable';
import SceneEditor from '@/features/displays/SceneEditor';
import StreamSettingsLibrary from '@/features/displays/StreamSettingsLibrary';
import StreamSaveDialog from '@/features/displays/StreamSaveDialog';
import { hasSceneContent, nameProblem } from '../../../supabase/functions/_shared/tv-scenes.js';
import BackgroundSettings from '@/features/displays/BackgroundSettings';
import DeviceInputs from '@/features/displays/DeviceInputs';
import TvConnections from '@/features/displays/TvConnections';
import SessionOutput from '@/features/displays/SessionOutput';

// Portal targets contain controls only. Capture controllers stay mounted outside
// the dialog, so closing a source editor does not stop a live camera or screen.
function CaptureDock({ slot, onTarget }) {
  const attach = useCallback((node) => onTarget(slot, node), [slot, onTarget]);
  return <div className="scene-capture-dock" ref={attach} />;
}

function standbySummary(settings = {}) {
  const parts = [];
  if (settings.show_times) parts.push('timetable');
  if (settings.show_next) parts.push('next prayer');
  if (settings.show_clock) parts.push('clock');
  const posters = Array.isArray(settings.poster_ids) ? settings.poster_ids.length : 0;
  if (posters) parts.push(`${posters} poster${posters === 1 ? '' : 's'}`);
  if (settings.include_events) parts.push('event posters');
  return parts.length ? parts.join(' · ') : 'Blank standby layout';
}

function ScreenOverview({ onOpen }) {
  const [states, setStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setMessage('');
    const results = await Promise.allSettled(
      TV_SCREENS.map((screen) => tvRequest('admin', screen.id, {}, { staff: true, signal })),
    );
    if (signal?.aborted) return;
    const next = {};
    results.forEach((result, index) => {
      next[TV_SCREENS[index].id] =
        result.status === 'fulfilled' ? { data: result.value } : { error: result.reason?.message };
    });
    setStates(next);
    if (results.some((result) => result.status === 'rejected'))
      setMessage('Some screen status could not be checked. You can still open its controls.');
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">TV & SCREENS</span>
          <h2>Current screens</h2>
          <p>See what each screen is doing now, then manage its standby display or present.</p>
        </div>
        <button
          className="admin-button"
          disabled={loading}
          onClick={() => load()}
        >
          {loading ? 'Checking…' : 'Refresh status'}
        </button>
      </div>
      {message && <p className="stream-feedback" role="status">{message}</p>}
      <div className="tv-screen-overview-grid">
        {TV_SCREENS.map((screen) => {
          const state = states[screen.id];
          const data = state?.data;
          const presenting = Boolean(data?.presentation);
          return (
            <article className="admin-panel tv-screen-overview-card" key={screen.id}>
              <div className="tv-screen-overview-title">
                <div>
                  <strong>{screen.label}</strong>
                  <span className="content-status">{presenting ? 'Presenting' : 'Standby'}</span>
                </div>
                {state?.error && <small>Could not read live status</small>}
              </div>
              <p>
                {data
                  ? presenting
                    ? 'A presentation is active. Standby settings are kept underneath it.'
                    : `Standby: ${standbySummary(data.settings)}`
                  : loading
                    ? 'Checking current display…'
                    : 'Open the screen to manage its standby display.'}
              </p>
              {data?.settings?.prayer_enabled !== false && screen.id !== 'shoe-area' && (
                <small>Prayer sequence is automatic.</small>
              )}
              <div className="admin-actions">
                <button className="admin-button" onClick={() => onOpen(screen.id, false, true)}>
                  Standby display
                </button>
                {screen.id !== 'shoe-area' && (
                  presenting ? (
                    <button className="admin-button primary" onClick={() => onOpen(screen.id, false, false)}>
                      Manage live presentation
                    </button>
                  ) : (
                    <button className="admin-button primary" onClick={() => onOpen(screen.id, true, false)}>
                      Quick present
                    </button>
                  )
                )}
                {screen.id !== 'shoe-area' && !presenting && (
                  <button className="admin-button" onClick={() => onOpen(screen.id, false, false)}>
                    Advanced
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default function StreamSetup() {
  const { user } = useAuth();
  const openKey = `jic-stream-open:${user.id}`;
  const [openHall, setOpenHall] = useState(() => {
    try {
      const saved = sessionStorage.getItem(openKey);
      return TV_SCREENS.some((screen) => screen.id === saved) ? saved : '';
    } catch {
      return '';
    }
  });
  const [quickStart, setQuickStart] = useState(false);
  const [backgroundOnly, setBackgroundOnly] = useState(false);
  const openWorkspace = (screenId, quick = false, background = false) => {
    try {
      sessionStorage.setItem(openKey, screenId);
    } catch {
      /* Server sessions can still be recovered without browser storage. */
    }
    setQuickStart(quick);
    setBackgroundOnly(background);
    setOpenHall(screenId);
  };
  if (openHall)
    return (
      <HallWorkspace
        key={`${user.id}:${openHall}`}
        screenId={openHall}
        userId={user.id}
        quickStart={quickStart}
        backgroundOnly={backgroundOnly}
        onBack={() => {
          try {
            sessionStorage.removeItem(openKey);
          } catch {
            /* Storage is optional. */
          }
          setQuickStart(false);
          setBackgroundOnly(false);
          setOpenHall('');
        }}
      />
    );
  return (
    <section className="stream-setup">
      <ScreenOverview onOpen={openWorkspace} />
    </section>
  );
}

function HallWorkspace({ screenId, userId, quickStart, backgroundOnly, onBack }) {
  const setup = useStreamSetup(screenId, userId);
  const { data, form, stage, busy } = setup;
  const [backgroundOpen, setBackgroundOpen] = useState(backgroundOnly);
  const [nameError, setNameError] = useState('');
  const [targets, setTargets] = useState({});
  const [localStreams, setLocalStreams] = useState({});
  const targetRef = useRef({});
  const onTarget = useCallback((slot, node) => {
    if (targetRef.current[slot] === node) return;
    targetRef.current = { ...targetRef.current, [slot]: node };
    setTargets(targetRef.current);
  }, []);
  const programmes = usePosters();
  const { events } = useHomeLiveContent({ eventLimit: 50 });
  const currentEvents = events.filter(
    (event) => event.event_date >= londonDate() && safeWebUrl(event.poster_url),
  );
  const screen = TV_SCREENS.find((item) => item.id === screenId);
  const hall = screenId !== 'shoe-area';
  const url = `${window.location.origin}/tv179/${screenId}`;
  const loadBlocked = setup.started
    ? 'End the stream before loading saved settings.'
    : Object.keys(localStreams).length
      ? 'Stop local sharing before loading saved settings.'
      : '';
  const readyToPresent = hasSceneContent(
    form?.scenes.find((scene) => scene.id === form.active_scene_id),
  );

  useEffect(() => {
    if (!quickStart || !hall || !setup.data || setup.stage !== 2 || setup.form) return;
    setup.build('Quick presentation');
  }, [quickStart, hall, setup.data, setup.stage, setup.form]);

  useRegisterAdminSave(setup.publish, setup.started && setup.dirty, 'Update live layout');
  return (
    <div className="stream-setup admin-tv-editor">
      <div className="stream-setup-heading">
        <div>
          <span className="admin-eyebrow stream-step-indicator jic-prompt">
            {backgroundOnly
              ? 'STANDBY DISPLAY'
              : hall
                ? setup.started
                  ? 'PRESENTATION LIVE'
                  : quickStart
                    ? 'QUICK PRESENT'
                    : 'ADVANCED PRESENTATION'
                : 'STANDBY DISPLAY'}
          </span>
          <h2>{screen.label}</h2>
        </div>
        <button
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (
              form &&
              !window.confirm(
                'Leave this setup? Local camera and screen sharing will stop. End the presentation first if you want to save its settings.',
              )
            )
              return;
            setup.discard();
            onBack();
          }}
        >
          Choose another hall
        </button>
      </div>
      {setup.message && (
        <p className="stream-feedback" role="status">
          {setup.message}
        </p>
      )}
      {setup.pendingSave && (
        <StreamSaveDialog
          screenId={screenId}
          ended
          settings={setup.pendingSave.settings}
          template={setup.pendingSave.template}
          initialName={setup.pendingSave.name}
          onDismiss={() => setup.setPendingSave(null)}
          onEdit={(name) => {
            setup.loadSettings(setup.pendingSave.settings, setup.pendingSave.template, name);
            setup.setPendingSave(null);
          }}
          onSaved={() => {
            setup.setPendingSave(null);
            setup.setMessage('Presentation ended and settings saved. Screens return to the standby display.');
            setup.refresh().catch((error) => setup.setMessage(`Settings saved. ${error.message}`));
          }}
        />
      )}
      {!data ? (
        <p>Loading presentation settings…</p>
      ) : (
        <>
          {hall && !quickStart && !backgroundOnly && (
            <StreamSettingsLibrary
              value={data.settings}
              onChange={(settings, template) => {
                if (loadBlocked) return;
                if (
                  stage === 3 &&
                  setup.dirty &&
                  !window.confirm('Replace this unpublished draft with saved settings?')
                )
                  return;
                setup.loadSettings(settings, template);
              }}
              templates={data.templates}
              savedTemplate={setup.savedTemplate}
              disabled={busy}
              loadBlocked={loadBlocked}
            />
          )}
          {!quickStart && !backgroundOnly && <details className="admin-panel stream-address">
            <summary>Display webpage address</summary>
            <p>
              Keep this permanent address open on each viewing device. Enter the six-digit code from
              its corner below after starting your presentation.
            </p>
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
            <button
              className="admin-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setup.setMessage('Display webpage address copied.');
                } catch {
                  setup.setMessage('Select and copy the display webpage address above.');
                }
              }}
            >
              Copy address
            </button>
          </details>}
          {hall && !backgroundOnly && data.presentation && (
            <section className="admin-panel stream-live-status" aria-label="Active presentation session">
              <div className="admin-actions">
                <Radio size={18} aria-hidden="true" />
                <strong>Presentation still live</strong>
                {!setup.started && (
                  <button className="admin-button" disabled={busy} onClick={setup.manageLive}>
                    Manage current presentation
                  </button>
                )}
                <button
                  className="admin-button stream-end"
                  disabled={busy}
                  aria-busy={busy && setup.operation === 'end'}
                  onClick={() => setup.run(setup.end, 'end')}
                >
                  {busy && setup.operation === 'end' ? 'Ending…' : 'End presentation'}
                </button>
              </div>
              <details>
                <summary>Source status</summary>
                <p>
                  {data.inputs?.length
                    ? 'A source is registered. Check the receiving display to confirm its picture and sound.'
                    : 'The server session is still active, but no camera or screen source is currently connected. Reopen an input or end the presentation.'}
                </p>
              </details>
            </section>
          )}
          {hall && stage === 2 && !quickStart && !backgroundOnly && (
            <section className="admin-panel">
              <h3>
                <span className="jic-prompt">Name your presentation</span>
              </h3>
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  const problem = nameProblem(setup.streamName, 'presentation name');
                  setNameError(problem);
                  if (problem) {
                    event.currentTarget.querySelector('input')?.focus();
                    return;
                  }
                  setup.build(setup.streamName);
                }}
              >
                <p>You can change this name when saving settings after the presentation ends.</p>
                <label>
                  <span className="jic-prompt">Presentation name (required)</span>
                  <input
                    value={setup.streamName}
                    required
                    maxLength={60}
                    placeholder="e.g. Sunday Quran lesson"
                    aria-invalid={Boolean(nameError)}
                    onChange={(event) => {
                      setup.setStreamName(event.target.value);
                      setNameError('');
                    }}
                  />
                  {nameError && (
                    <small className="admin-field-error" role="alert">
                      {nameError}
                    </small>
                  )}
                </label>
                <div className="admin-actions">
                  <button className="admin-button primary" type="submit">
                    Choose input <span aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
            </section>
          )}
          {hall && stage === 2 && quickStart && !backgroundOnly && (
            <section className="admin-panel" aria-live="polite">
              <p>Preparing Quick Present…</p>
            </section>
          )}
          {hall && stage === 3 && form && !backgroundOnly && (
            <>
              {!quickStart && setup.streamName && <h3>{setup.streamName}</h3>}
              <SceneEditor
                value={form}
                onChange={setup.setForm}
                disabled={busy}
                screenId={screenId}
                previewLive={setup.started}
                localStreams={localStreams}
                renderDeviceInput={(layer) => <CaptureDock slot={layer.slot} onTarget={onTarget} />}
                posters={[
                  ...programmes,
                  ...currentEvents.map((event) => ({
                    id: `event-${event.id}`,
                    title: event.title,
                    image: event.poster_url,
                    alt: event.title,
                  })),
                ]}
              />
              <DeviceInputs
                key={setup.workspaceId}
                screenId={screenId}
                settings={form}
                savedSettings={data.settings}
                setupOnly={!setup.started}
                presentationId={setup.started ? data.presentation.id : null}
                embedded
                targets={targets}
                onStreamsChange={setLocalStreams}
                inputs={data.inputs || []}
                disabled={busy}
                relayConfigured={data.relayConfigured}
                onRefresh={setup.refresh}
              />
              <div className="stream-start-bar">
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.muted}
                    disabled={busy}
                    onChange={(event) => setup.setForm({ ...form, muted: event.target.checked })}
                  />
                  Mute display audio
                </label>
                <span className={setup.dirty || !setup.started ? 'jic-prompt' : undefined}>
                  {setup.started
                    ? setup.dirty
                      ? 'Layout has unpublished changes.'
                      : 'This layout is live.'
                    : data.presentation
                      ? 'This draft is separate from the active presentation.'
                      : 'Your setup is not live yet.'}
                </span>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Start a clean setup? This clears your draft and stops local sharing. End the presentation first if you want to save its settings.',
                        )
                      )
                        setup.newSetup();
                    }}
                  >
                    New setup
                  </button>
                  {!setup.started && (
                    <button
                      className="admin-button stream-start"
                      disabled={busy || !readyToPresent}
                      aria-busy={busy && setup.operation === 'start'}
                      onClick={() =>
                        setup.publish().catch((error) => setup.setMessage(error.message))
                      }
                    >
                      {busy && setup.operation === 'start' ? 'Starting…' : 'Start presenting'}
                    </button>
                  )}
                  {setup.started && setup.dirty && (
                    <button
                      className="admin-button primary"
                      disabled={busy}
                      onClick={() =>
                        setup.publish().catch((error) => setup.setMessage(error.message))
                      }
                    >
                      Update live layout
                    </button>
                  )}
                  {setup.started && (
                    <button
                      className="admin-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Load the latest live layout? This replaces your unpublished layout changes.',
                          )
                        )
                          setup.manageLive();
                      }}
                    >
                      Load latest live layout
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          {hall && !backgroundOnly && data.presentation && (
            <TvConnections
              screenId={screenId}
              data={data}
              setData={setup.setData}
              onRefresh={setup.refresh}
              run={setup.run}
              busy={busy}
            />
          )}
          {hall && !backgroundOnly && setup.started && <SessionOutput screenId={screenId} />}
          {(backgroundOnly || stage === 2 || !hall) && (
            <details
              className="admin-panel"
              open={backgroundOnly || !hall || backgroundOpen}
              onToggle={(event) => setBackgroundOpen(event.currentTarget.open)}
            >
              <summary>{backgroundOnly ? 'Standby display settings' : 'Standby display settings'}</summary>
              {(backgroundOnly || backgroundOpen || !hall) && (
                <BackgroundSettings
                  screenId={screenId}
                  data={data}
                  currentEvents={currentEvents}
                  onRefresh={setup.refresh}
                />
              )}
            </details>
          )}
        </>
      )}
    </div>
  );
}
