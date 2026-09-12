import React, { useEffect, useRef, useState } from 'react';
import useTvPublisher from '@/hooks/useTvPublisher';
import { tvRequest } from '@/lib/tvControl';
import { tvScene } from '../../../supabase/functions/_shared/tv.js';
import { tvInputSources, inputLabel } from '@/lib/tvSceneState';
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
}) {
  const sharing = useTvPublisher(screenId, slot);
  const [audio, setAudio] = useState(false);
  const [error, setError] = useState('');
  const video = useRef(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ownLease = remote?.session_id && readCaptureLease(screenId, slot) === remote.session_id;
  const joinUrl = `${window.location.origin}/admin/share/${screenId}?slot=${encodeURIComponent(slot)}`;
  const screenProblem = captureProblem('screen');
  const cameraProblem = captureProblem('camera');
  const sourceName = inputLabel({ slot, name, capture });
  const deviceName = name?.trim() || sourceName;
  const busyMessage = disabled
    ? 'Please wait for the display update to finish.'
    : sharing.busy
      ? 'Waiting for capture to start. Check the browser’s permission window.'
      : sharing.stream
        ? 'Sharing from this device. Stop sharing before changing the source.'
        : remote && !ownLease
          ? `Already sharing from ${remote.device_name || 'another device'}. Stop that source below before using this device, or add a separate source for another camera or screen.`
          : conflict
            ? 'Choose the same source type in each scene, then save.'
            : '';
  const start = (kind) => {
    setError('');
    sharing.start(kind, audio, deviceName.trim());
  };
  useEffect(() => {
    if (video.current) video.current.srcObject = sharing.stream;
  }, [sharing.stream]);
  return (
    <article className="device-input">
      <h4>
        {sourceName}
        <small>
          {sharing.stream
            ? 'This device'
            : remote
              ? `From ${remote.device_name || 'an unnamed device'}`
              : 'Available'}
        </small>
      </h4>
      {!active && (
        <p>Used in another saved scene. Keep this feed running to use it when you switch scenes.</p>
      )}
      {conflict && (
        <p role="alert">
          This input has different source types in your scenes. Choose Camera or Screen share in its
          scene options, then save.
        </p>
      )}
      {capture && remote && remote.kind !== capture && (
        <p role="status">
          The running input uses {remote.kind === 'camera' ? 'a camera' : 'screen sharing'}. Stop
          it, then start the selected source.
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
          onChange={(e) => setAudio(e.target.checked)}
        />
        Include microphone / shared audio
      </label>
      <div className="admin-actions">
        {capture !== 'camera' && (
          <button
            className="admin-button"
            disabled={Boolean(busyMessage || screenProblem)}
            onClick={() => start('screen')}
          >
            {ownLease ? 'Restart screen sharing' : 'Share this screen'}
          </button>
        )}
        {capture !== 'screen' && (
          <button
            className="admin-button"
            disabled={Boolean(busyMessage || cameraProblem)}
            onClick={() => start('camera')}
          >
            {ownLease ? 'Restart this camera' : 'Use this camera'}
          </button>
        )}
        {(sharing.stream || remote || sharing.busy) && (
          <button
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
                await onRefresh();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            {sharing.stream || sharing.busy ? 'Stop sharing' : 'Stop other device'}
          </button>
        )}
        {sharing.stream && (
          <button
            type="button"
            className="admin-button"
            onClick={sharing.retry}
            disabled={sharing.busy}
          >
            Retry viewing connection
          </button>
        )}
      </div>
      {allowJoin && (
        <div className="admin-actions">
          <button type="button" className="admin-button" onClick={() => setJoinOpen(!joinOpen)}>
            Allow another device to join
          </button>
        </div>
      )}
      {allowJoin && joinOpen && (
        <section className="admin-panel">
          <h4>Join as {sourceName}</h4>
          <p>
            Open this link on the contributing phone or laptop and sign in with hall stream access.
            It opens sharing controls only; joining never changes your scene. Keep this page closed
            on devices that are only watching.
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
          Sharing active — keep this page open. Refreshing stops capture; you can restart it here
          without logging out.
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
      <p role="status">{error || sharing.message}</p>
    </article>
  );
}
export default function DeviceInputs({
  screenId,
  settings,
  inputs,
  disabled,
  hasDraft,
  relayConfigured,
  onRefresh,
  onlySlot,
}) {
  const sources = tvInputSources(settings).filter(
    (source) => !onlySlot || source.slot === onlySlot,
  );
  if (!sources.length || tvScene(settings) !== 'teaching')
    return (
      <section className="admin-panel">
        <h3>Share from a device</h3>
        <p>
          Add a named camera or screen source above and press Present first. Then open this hall in
          Admin on the device you want to share from.
        </p>
      </section>
    );
  return (
    <section className="admin-panel">
      <h3>Share from a device</h3>
      <p>
        Choose the named source for this device below. Its name is already saved with the scene.
        Keep this page open while sharing. Connecting a viewing screen is a separate step.
      </p>
      {hasDraft && (
        <p>
          These are the sources currently presented. You can start them now; new sources and layout
          changes need Present.
        </p>
      )}
      <p>
        {relayConfigured === true
          ? 'A relay is configured for connections between different networks. Both devices still need an internet connection.'
          : relayConfigured === false
            ? 'No relay is configured. Connect the laptop, phone and viewing display to the same Wi-Fi for testing. Guest Wi-Fi may block devices from reaching each other.'
            : 'Use the same Wi-Fi for testing. Connections between different networks may need a relay.'}
      </p>
      {sources.map((source) => (
        <DeviceInput
          key={source.slot}
          screenId={screenId}
          {...source}
          remote={inputs.find((i) => i.slot === source.slot)}
          disabled={disabled}
          onRefresh={onRefresh}
          allowJoin={!onlySlot}
        />
      ))}
      <p className="admin-tv-help">
        Screen audio depends on the browser and selected tab. A phone can share its camera;
        whole-screen sharing needs a supported desktop browser. Enable the source’s audio and turn
        off “Mute display audio” to hear it on the display.
      </p>
    </section>
  );
}
