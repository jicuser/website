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
import SceneTemplates from '@/features/displays/SceneTemplates';
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
  if (openHall)
    return (
      <HallWorkspace
        key={openHall}
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
      <span className="admin-eyebrow">STEP 1 OF 3</span>
      <h2>Choose your stream</h2>
      <p>
        Each hall has one permanent display webpage. Build your scenes here, then start when ready.
      </p>
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
          onClick={() => {
            try {
              sessionStorage.setItem(openKey, selected);
            } catch {
              /* Keep setup usable without storage. */
            }
            setOpenHall(selected);
          }}
        >
          Next
        </button>
      </div>
    </section>
  );
}

function HallWorkspace({ screenId, userId, onBack }) {
  const setup = useStreamSetup(screenId, userId);
  const { data, form, stage, busy } = setup;
  const [backgroundOpen, setBackgroundOpen] = useState(false);
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
  useRegisterAdminSave(setup.publish, setup.started && setup.dirty, 'Save & update stream');
  return (
    <div className="stream-setup admin-tv-editor">
      <div className="stream-setup-heading">
        <div>
          <span className="admin-eyebrow">
            {hall ? `STEP ${stage} OF 3` : 'BACKGROUND DISPLAY'}
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
                'Leave this setup? Local camera and screen sharing will stop. Save any scene you want to reuse first.',
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
          {hall && stage === 2 && (
            <section className="admin-panel">
              <h3>How many scenes?</h3>
              <p>
                A scene is one arrangement of content. You can switch between scenes during the
                stream.
              </p>
              <label>
                Number of scenes
                <select
                  value={setup.count}
                  onChange={(event) => setup.setCount(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'scene' : 'scenes'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-actions">
                <button className="admin-button primary" onClick={setup.build}>
                  Next · arrange content
                </button>
              </div>
              {data.presentation && (
                <div className="stream-live-status">
                  <p>
                    A stream is already live. Building a new setup keeps it playing until you press
                    Start stream.
                  </p>
                  <button className="admin-button" onClick={setup.manageLive}>
                    Edit current stream
                  </button>
                </div>
              )}
            </section>
          )}
          {hall && stage === 3 && form && (
            <>
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
              <SceneTemplates
                screenId={screenId}
                value={form}
                onChange={setup.setForm}
                templates={data.templates}
                onRefresh={setup.refresh}
                disabled={busy}
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
                <span>
                  {setup.started
                    ? setup.dirty
                      ? 'Layout has unpublished changes.'
                      : 'This layout is live.'
                    : 'Your setup is not live yet.'}
                </span>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Start a clean setup? Save scenes you want to keep first. Local sharing will stop.',
                        )
                      )
                        setup.newSetup();
                    }}
                  >
                    New setup
                  </button>
                  <button
                    className="admin-button primary"
                    disabled={busy}
                    onClick={() =>
                      setup.publish().catch((error) => setup.setMessage(error.message))
                    }
                  >
                    {busy
                      ? 'Please wait…'
                      : setup.started
                        ? 'Save & update stream'
                        : 'Start stream'}
                  </button>
                  {setup.started && (
                    <button
                      className="admin-button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('End this stream and return to the background display?'))
                          setup.run(setup.end);
                      }}
                    >
                      End stream
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
