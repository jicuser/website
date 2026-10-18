import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useAuth } from '@/context/AuthContext';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
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
          <p>Choose the screen you want to update.</p>
        </div>
        <button className="admin-button" disabled={loading} onClick={() => load()}>
          {loading ? 'Checking…' : 'Refresh status'}
        </button>
      </div>
      {message && (
        <p className="stream-feedback" role="status">
          {message}
        </p>
      )}
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
                  <span className="content-status">
                    {data
                      ? presenting
                        ? 'Presentation active'
                        : 'Automatic display'
                      : loading
                        ? 'Checking…'
                        : 'Status unavailable'}
                  </span>
                </div>
                {state?.error && <small>Could not read live status</small>}
              </div>
              {presenting && <p>Automatic displays return when the presentation ends.</p>}
              <div className="admin-actions">
                <button
                  className="admin-button primary"
                  onClick={() => onOpen(screen.id, false, true)}
                >
                  Edit automatic display
                </button>
                {screen.id !== 'shoe-area' &&
                  (presenting ? (
                    <button
                      className="admin-button primary"
                      onClick={() => onOpen(screen.id, false, false)}
                    >
                      Manage live presentation
                    </button>
                  ) : (
                    <button className="admin-button" onClick={() => onOpen(screen.id, true, false)}>
                      Quick present
                    </button>
                  ))}
                {screen.id !== 'shoe-area' && !presenting && (
                  <details className="tv-screen-more">
                    <summary>More options</summary>
                    <button
                      className="admin-button"
                      onClick={() => onOpen(screen.id, false, false)}
                    >
                      Presentation setup
                    </button>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default function StreamSetup({ registerBack }) {
  const { user } = useAuth();
  const [openHall, setOpenHall] = useState('');
  const [quickStart, setQuickStart] = useState(false);
  const [backgroundOnly, setBackgroundOnly] = useState(false);
  const closeWorkspace = useCallback(() => {
    setQuickStart(false);
    setBackgroundOnly(false);
    setOpenHall('');
    window.scrollTo({ top: 0 });
  }, []);
  const openWorkspace = (screenId, quick = false, background = false) => {
    setQuickStart(quick);
    setBackgroundOnly(background);
    setOpenHall(screenId);
    window.scrollTo({ top: 0 });
  };
  const switchScreen = (screenId) => {
    setOpenHall(screenId);
    window.scrollTo({ top: 0 });
  };
  if (openHall)
    return (
      <HallWorkspace
        key={`${user.id}:${openHall}`}
        screenId={openHall}
        userId={user.id}
        quickStart={quickStart}
        backgroundOnly={backgroundOnly}
        onSwitchScreen={switchScreen}
        onBack={closeWorkspace}
        registerBack={registerBack}
      />
    );
  return (
    <section className="stream-setup">
      <ScreenOverview onOpen={openWorkspace} />
    </section>
  );
}

function HallWorkspace({
  screenId,
  userId,
  quickStart,
  backgroundOnly,
  onSwitchScreen,
  onBack,
  registerBack,
}) {
  const setup = useStreamSetup(screenId, userId, {
    presentationWorkspace: !backgroundOnly && screenId !== 'shoe-area',
  });
  const { data, form, stage, busy } = setup;
  const { dirty, saving } = useAdminSave();
  const leaveRef = useRef(null);
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

  leaveRef.current = () => {
    if (busy || saving) return;
    if (backgroundOnly || !hall) {
      if (dirty && !window.confirm('Discard unsaved display changes and return to screens?'))
        return;
    } else if (form) {
      if (
        !window.confirm(
          'Leave this setup and discard unpublished changes? Local camera and screen sharing will stop. An active presentation will remain running.',
        )
      )
        return;
      setup.discard();
    }
    onBack();
  };
  useEffect(() => {
    registerBack?.(() => leaveRef.current());
    return () => registerBack?.(null);
  }, [registerBack]);

  useRegisterAdminSave(
    setup.publish,
    !backgroundOnly && setup.started && setup.dirty,
    'Update live layout',
  );
  return (
    <div className="stream-setup admin-tv-editor">
      <div className="stream-setup-heading">
        <div>
          {!backgroundOnly && (
            <span className="admin-eyebrow stream-step-indicator jic-prompt">
              {hall
                ? setup.started
                  ? 'PRESENTATION LIVE'
                  : quickStart
                    ? 'QUICK PRESENT'
                    : 'PRESENTATION SETUP'
                : 'AUTOMATIC DISPLAY'}
            </span>
          )}
          <h2>{screen.label}</h2>
        </div>
        <button
          className="admin-button"
          disabled={busy || saving}
          onClick={() => leaveRef.current()}
        >
          Back to screens
        </button>
      </div>
      {setup.message && (!backgroundOnly || !data) && (
        <p className="stream-feedback" role="status">
          {setup.message}
        </p>
      )}
      {!backgroundOnly && setup.pendingSave && (
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
            setup.setMessage(
              'Presentation ended and settings saved. Screens return to their automatic display.',
            );
            setup.refresh().catch((error) => setup.setMessage(`Settings saved. ${error.message}`));
          }}
        />
      )}
      {!data ? (
        <p>Loading screen settings…</p>
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
          {!quickStart && !backgroundOnly && (
            <details className="admin-panel stream-address">
              <summary>Display webpage address</summary>
              <p>
                Keep this permanent address open on each viewing device. Enter the six-digit code
                from its corner below after starting your presentation.
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
            </details>
          )}
          {hall && !backgroundOnly && data.presentation && (
            <section
              className="admin-panel stream-live-status"
              aria-label="Active presentation session"
            >
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
                initialMode={quickStart ? 'simple' : 'advanced'}
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
          {(backgroundOnly || !hall) && (
            <BackgroundSettings
              screenId={screenId}
              data={data}
              currentEvents={currentEvents}
              onRefresh={setup.refresh}
              onSwitchScreen={onSwitchScreen}
            />
          )}
        </>
      )}
    </div>
  );
}
