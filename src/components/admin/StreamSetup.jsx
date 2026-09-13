import React, { useCallback, useRef, useState } from 'react';
import { TV_SCREENS } from '@/lib/tvControl';
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
import { nameProblem } from '../../../supabase/functions/_shared/tv-scenes.js';
import BackgroundSettings from '@/features/displays/BackgroundSettings';
import DeviceInputs from '@/features/displays/DeviceInputs';
import TvConnections from '@/features/displays/TvConnections';
import SessionOutput from '@/features/displays/SessionOutput';
import ActiveStreamList from '@/features/displays/ActiveStreamList';

// Portal targets contain controls only. Capture controllers stay mounted outside
// the dialog, so closing a source editor does not stop a live camera or screen.
function CaptureDock({ slot, onTarget }) {
  const attach = useCallback((node) => onTarget(slot, node), [slot, onTarget]);
  return <div className="scene-capture-dock" ref={attach} />;
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
  const [selected, setSelected] = useState(openHall || 'mens-main');
  const openWorkspace = (screenId) => {
    try {
      sessionStorage.setItem(openKey, screenId);
    } catch {
      /* Server sessions can still be recovered without browser storage. */
    }
    setSelected(screenId);
    setOpenHall(screenId);
  };
  if (openHall)
    return (
      <HallWorkspace
        key={`${user.id}:${openHall}`}
        screenId={openHall}
        userId={user.id}
        onBack={() => {
          try {
            sessionStorage.removeItem(openKey);
          } catch {
            /* Storage is optional. */
          }
          setOpenHall('');
        }}
      />
    );
  return (
    <section className="stream-setup admin-panel">
      <ActiveStreamList key={user.id} onOpen={openWorkspace} />
      <span className="admin-eyebrow stream-step-indicator jic-prompt">STEP 1 OF 3</span>
      <h2>
        <span className="jic-prompt">Choose your stream</span>
      </h2>
      <p>Choose the hall where you want to show your stream.</p>
      <label>
        Hall stream
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          {TV_SCREENS.map((screen) => (
            <option key={screen.id} value={screen.id}>
              {screen.label}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-actions">
        <button
          className="admin-button primary"
          onClick={() => openWorkspace(selected)}
        >
          Open stream setup <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function HallWorkspace({ screenId, userId, onBack }) {
  const setup = useStreamSetup(screenId, userId);
  const { data, form, stage, busy } = setup;
  const [backgroundOpen, setBackgroundOpen] = useState(false);
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
  useRegisterAdminSave(setup.publish, setup.started && setup.dirty, 'Update live layout');
  return (
    <div className="stream-setup admin-tv-editor">
      <div className="stream-setup-heading">
        <div>
          <span className="admin-eyebrow stream-step-indicator jic-prompt">
            {hall
              ? setup.started
                ? 'STREAM SESSION OPEN'
                : `STEP ${stage} OF 3`
              : 'BACKGROUND DISPLAY'}
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
                'Leave this setup? Local camera and screen sharing will stop. End the stream first if you want to save its settings.',
              )
            )
              return;
            setup.discard();
            onBack();
          }}
        >
          Choose another stream
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
            setup.setMessage('Stream ended and settings saved. Screens show the normal display.');
            setup.refresh().catch((error) => setup.setMessage(`Settings saved. ${error.message}`));
          }}
        />
      )}
      {!data ? (
        <p>Loading stream settings…</p>
      ) : (
        <>
          <details className="admin-panel stream-address">
            <summary>Display webpage address</summary>
            <p>
              Keep this permanent address open on each viewing device. Enter the six-digit code from
              its corner below after starting your stream.
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
          {hall && data.presentation && (
            <section className="admin-panel stream-live-status" aria-label="Active stream session">
              <h3>Stream session still active</h3>
              <p>
                {data.inputs?.length
                  ? 'A source is registered. Check the receiving display to confirm its picture and sound.'
                  : 'No camera or screen source is connected. If this stream uses one, reopen its input to share again.'}
              </p>
              <div className="admin-actions">
                {!setup.started && (
                  <button className="admin-button" disabled={busy} onClick={setup.manageLive}>
                    Manage current stream
                  </button>
                )}
                <button
                  className="admin-button stream-end"
                  disabled={busy}
                  aria-busy={busy && setup.operation === 'end'}
                  onClick={() => setup.run(setup.end, 'end')}
                >
                  {busy && setup.operation === 'end' ? 'Ending stream…' : 'End stream'}
                </button>
              </div>
            </section>
          )}
          {hall && stage === 2 && (
            <section className="admin-panel">
              <h3>
                <span className="jic-prompt">Name your stream</span>
              </h3>
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  const problem = nameProblem(setup.streamName, 'stream name');
                  setNameError(problem);
                  if (problem) {
                    event.currentTarget.querySelector('input')?.focus();
                    return;
                  }
                  setup.build(setup.streamName);
                }}
              >
                <p>You can change this name when saving settings after the stream ends.</p>
                <label>
                  <span className="jic-prompt">Stream name (required)</span>
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
                    Arrange inputs <span aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
            </section>
          )}
          {hall && stage === 2 && data.templates?.length > 0 && (
            <StreamSettingsLibrary
              value={data.settings}
              onChange={setup.loadSettings}
              templates={data.templates}
              savedTemplate={setup.savedTemplate}
              disabled={busy}
            />
          )}
          {hall && stage === 3 && form && (
            <>
              {setup.streamName && <h3>{setup.streamName}</h3>}
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
                      ? 'This draft is separate from the active stream.'
                      : 'Your setup is not live yet.'}
                </span>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Start a clean setup? This clears your draft and stops local sharing. End the stream first if you want to save its settings.',
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
                      disabled={busy}
                      aria-busy={busy && setup.operation === 'start'}
                      onClick={() =>
                        setup.publish().catch((error) => setup.setMessage(error.message))
                      }
                    >
                      {busy && setup.operation === 'start' ? 'Starting stream…' : 'Start stream'}
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
          {hall && data.presentation && (
            <TvConnections
              screenId={screenId}
              data={data}
              setData={setup.setData}
              onRefresh={setup.refresh}
              run={setup.run}
              busy={busy}
            />
          )}
          {hall && setup.started && <SessionOutput screenId={screenId} />}
          {(stage === 2 || !hall) && (
            <details
              className="admin-panel"
              open={!hall || backgroundOpen}
              onToggle={(event) => setBackgroundOpen(event.currentTarget.open)}
            >
              <summary>Background posters & prayer notices</summary>
              {(backgroundOpen || !hall) && (
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
