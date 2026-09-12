import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useTvPublisher from '@/hooks/useTvPublisher';
import { tvRequest } from '@/lib/tvControl';
import { tvScene } from '../../../supabase/functions/_shared/tv.js';
import { tvInputSources } from '@/lib/tvSceneState';
import { captureProblem } from '@/lib/tvCapture';
import { readCaptureLease } from '@/lib/captureLease';

function DeviceInput({
  screenId,
  slot,
  name,
  capture,
  active,
  conflict,
  remote,
  disabled,
  onRefresh,
  allowJoin,
  setupOnly,
  presentationId,
  embedded,
  target,
  onStream,
  relayConfigured,
}) {
  const sourceName = name?.trim() || (capture === 'camera' ? 'Camera' : 'Screen share');
  const sharing = useTvPublisher(screenId, slot, {
    setupOnly,
    presentationId,
    captureKind: capture,
    deviceName: sourceName,
  });
  const [audio, setAudio] = useState(false);
  const [error, setError] = useState('');
  const video = useRef(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ownLease = remote?.session_id && readCaptureLease(screenId, slot) === remote.session_id;
  const occupied = !setupOnly && remote && !ownLease && !sharing.sessionId;
  const joinUrl = `${window.location.origin}/admin/share/${screenId}?slot=${encodeURIComponent(slot)}`;
  const screenProblem = captureProblem('screen');
  const cameraProblem = captureProblem('camera');
  const busyMessage = disabled
    ? 'Please wait for the stream update to finish.'
    : sharing.busy
      ? sharing.phase === 'choosing'
        ? 'Check the browser’s permission window.'
        : 'Connecting this source…'
      : sharing.stream
        ? sharing.phase === 'ready'
          ? 'Preview ready on this device.'
          : 'Sharing from this device.'
        : occupied
          ? `Already sharing from ${remote.device_name || 'another device'}. Choose a different input or stop that device first.`
          : conflict
            ? 'Choose the same source type for this input in every scene.'
            : '';
  const start = (kind) => {
    setError('');
    void sharing.start(kind, audio, sourceName);
  };
  useEffect(() => {
    if (video.current) video.current.srcObject = sharing.stream;
  }, [sharing.stream, target]);
  useEffect(() => {
    onStream(slot, sharing.stream);
  }, [slot, sharing.stream, onStream]);
  useEffect(() => () => onStream(slot, null), [slot, onStream]);

  // The controller stays mounted when this portal is hidden. Closing the source
  // dialog must not stop its camera or screen, or its preview on the canvas.
  if (embedded && !target) return null;
  const content = (
    <article className="device-input">
      <h4>
        {sourceName}
        <small>
          {sharing.stream
            ? sharing.phase === 'ready'
              ? 'Preview ready'
              : sharing.connected
                ? `${sharing.connected} viewing connection${sharing.connected === 1 ? '' : 's'}`
                : 'Connecting viewers'
            : remote && !setupOnly
              ? `From ${remote.device_name || 'another device'}`
              : 'Ready to connect'}
        </small>
      </h4>
      {!active && !embedded && (
        <p>This source is used in another scene. It can stay connected while you change scenes.</p>
      )}
      {conflict && (
        <p role="alert">
          This input uses different source types in your scenes. Choose one type in its scene
          settings.
        </p>
      )}
      {capture && remote && !setupOnly && remote.kind !== capture && (
        <p role="status">
          This source is currently {remote.kind === 'camera' ? 'a camera' : 'screen sharing'}. Stop
          it before changing its type.
        </p>
      )}
      {busyMessage && <p role="status">{busyMessage}</p>}
      {capture !== 'camera' && screenProblem && <p>{screenProblem}</p>}
      {capture !== 'screen' && cameraProblem && <p>{cameraProblem}</p>}
      <label className="admin-check">
        <input
          type="checkbox"
          disabled={Boolean(sharing.stream) || sharing.busy}
          checked={audio}
          onChange={(event) => setAudio(event.target.checked)}
        />
        {capture === 'camera' ? 'Include microphone audio' : 'Include shared audio'}
      </label>
      <div className="admin-actions">
        {capture !== 'camera' && (
          <button
            type="button"
            className="admin-button"
            disabled={Boolean(busyMessage || screenProblem)}
            onClick={() => start('screen')}
          >
            {ownLease && !setupOnly ? 'Restart screen sharing' : 'Share this screen'}
          </button>
        )}
        {capture !== 'screen' && (
          <button
            type="button"
            className="admin-button"
            disabled={Boolean(busyMessage || cameraProblem)}
            onClick={() => start('camera')}
          >
            {ownLease && !setupOnly ? 'Restart this camera' : 'Use this camera'}
          </button>
        )}
        {(sharing.stream || sharing.busy || (remote && !setupOnly)) && (
          <button
            type="button"
            className="admin-button"
            onClick={async () => {
              setError('');
              try {
                if (sharing.stream || sharing.busy) await sharing.stop();
                else
                  await tvRequest(
                    'stop',
                    screenId,
                    { sessionId: remote.session_id },
                    { staff: true },
                  );
                await onRefresh?.();
              } catch (failure) {
                setError(failure.message);
              }
            }}
          >
            {sharing.stream || sharing.busy ? 'Stop sharing' : 'Stop other device'}
          </button>
        )}
        {sharing.stream && !setupOnly && (
          <button
            type="button"
            className="admin-button"
            onClick={sharing.retry}
            disabled={sharing.busy}
          >
            Retry connection
          </button>
        )}
        {allowJoin && (
          <button
            type="button"
            className="admin-button"
            onClick={() => setJoinOpen(!joinOpen)}
            aria-expanded={joinOpen}
          >
            Use another device
          </button>
        )}
      </div>
      {allowJoin && joinOpen && (
        <section className="admin-panel">
          <h4>Share as {sourceName}</h4>
          <p>
            {setupOnly ? 'After you start the stream, open' : 'Open'} this link on the contributing
            phone or laptop and sign in. Joining adds this source without changing your scene or the
            other devices.
          </p>
          <label>
            Device sharing link
            <input readOnly value={joinUrl} onFocus={(event) => event.target.select()} />
          </label>
          <button
            type="button"
            className="admin-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(joinUrl);
                setCopied(true);
              } catch {
                setError('Select and copy the sharing link above.');
              }
            }}
          >
            {copied ? 'Link copied' : 'Copy device sharing link'}
          </button>
        </section>
      )}
      {sharing.stream && (
        <p className="admin-sharing-notice" role="status">
          {setupOnly
            ? 'Preview is ready. It goes live when you start the stream.'
            : 'Keep this page open while sharing.'}{' '}
          Closing this dialog keeps capture active. Refreshing this page stops capture; you can
          restart it here.
        </p>
      )}
      {sharing.stream && (
        <video
          ref={video}
          className="admin-share-preview"
          autoPlay
          muted
          playsInline
          aria-label={`${sourceName} local preview`}
        />
      )}
      {(error || sharing.message) && (
        <p role={error ? 'alert' : 'status'}>{error || sharing.message}</p>
      )}
      {embedded && (
        <p className="admin-tv-help">
          {relayConfigured === true
            ? 'Both devices need an internet connection. A relay is configured for different networks.'
            : 'Use the same Wi-Fi for testing. Guest networks may block connections; different networks may need a relay.'}
        </p>
      )}
    </article>
  );
  return embedded ? createPortal(content, target) : content;
}

export default function DeviceInputs({
  screenId,
  settings,
  savedSettings,
  inputs = [],
  disabled,
  hasDraft,
  relayConfigured,
  onRefresh,
  onlySlot,
  setupOnly = false,
  presentationId = '',
  embedded = false,
  targets = {},
  onStreamsChange,
}) {
  const localStreams = useRef({});
  const streamsCallback = useRef(onStreamsChange);
  streamsCallback.current = onStreamsChange;
  const onStream = useCallback((slot, stream) => {
    if (localStreams.current[slot] === stream || (!stream && !localStreams.current[slot])) return;
    const next = { ...localStreams.current };
    if (stream) next[slot] = stream;
    else delete next[slot];
    localStreams.current = next;
    streamsCallback.current?.(next);
  }, []);
  const sources = tvInputSources(settings).filter(
    (source) => !onlySlot || source.slot === onlySlot,
  );
  const savedSources = savedSettings ? tvInputSources(savedSettings) : sources;
  const controls = sources.map((source) => (
    <DeviceInput
      key={source.slot}
      screenId={screenId}
      {...source}
      remote={inputs.find((input) => input.slot === source.slot)}
      disabled={disabled}
      onRefresh={onRefresh}
      allowJoin={!onlySlot}
      setupOnly={
        setupOnly ||
        !savedSources.some(
          (saved) => saved.slot === source.slot && saved.capture === source.capture,
        )
      }
      presentationId={presentationId}
      embedded={embedded}
      target={targets[source.slot]}
      onStream={onStream}
      relayConfigured={relayConfigured}
    />
  ));
  if (embedded) return <>{controls}</>;
  if (!sources.length || tvScene(settings) !== 'teaching')
    return (
      <section className="admin-panel">
        <h3>Share from a device</h3>
        <p>The organiser needs to start a stream containing this camera or screen source first.</p>
      </section>
    );
  return (
    <section className="admin-panel">
      <h3>Share from a device</h3>
      <p>Choose this device’s source below. Keep this page open while sharing.</p>
      {hasDraft && (
        <p>
          New sources and layout changes need to be saved to the stream before they appear on
          displays.
        </p>
      )}
      <p>
        {relayConfigured === true
          ? 'A relay is configured for different networks. Both devices still need an internet connection.'
          : 'Use the same Wi-Fi for testing. Guest networks may block connections; different networks may need a relay.'}
      </p>
      {controls}
      <p className="admin-tv-help">
        Shared audio depends on the browser and selected tab. A phone can share its camera; screen
        sharing needs a supported desktop browser.
      </p>
    </section>
  );
}
