import React, { useEffect, useRef, useState } from 'react';
import useTvPublisher from '@/hooks/useTvPublisher';
import { tvRequest } from '@/lib/tvControl';
import { tvScene } from '../../../supabase/functions/_shared/tv.js';
import { tvInputSources, inputLabel } from '@/lib/tvSceneState';
import { captureProblem } from '@/lib/tvCapture';

function DeviceInput({
  screenId,
  slot,
  name,
  capture,
  active,
  conflict,
  remote,
  disabled,
  deviceName,
  onRefresh,
}) {
  const sharing = useTvPublisher(screenId, slot);
  const [audio, setAudio] = useState(false);
  const [error, setError] = useState('');
  const video = useRef(null);
  const screenProblem = captureProblem('screen');
  const cameraProblem = captureProblem('camera');
  const sourceName = inputLabel({ slot, name, capture });
  const busyMessage = disabled
    ? 'Please wait for the TV update to finish.'
    : sharing.busy
      ? 'Waiting for capture to start. Check the browser’s permission window.'
      : sharing.stream
        ? 'Sharing from this device. Stop sharing before changing the source.'
        : remote
          ? `Already sharing from ${remote.device_name || 'another device'}. Stop that source below before using this device, or add a separate source for another camera or screen.`
          : conflict
            ? 'Choose the same source type in each scene, then save.'
            : !deviceName.trim()
              ? 'Enter a name for this laptop or phone above before sharing.'
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
            Share this screen
          </button>
        )}
        {capture !== 'screen' && (
          <button
            className="admin-button"
            disabled={Boolean(busyMessage || cameraProblem)}
            onClick={() => start('camera')}
          >
            Use this camera
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
      </div>
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
}) {
  const [deviceName, setDeviceName] = useState(() => {
    try {
      return localStorage.getItem('jic-publisher-name') || '';
    } catch {
      return '';
    }
  });
  const sources = tvInputSources(settings);
  if (!sources.length || tvScene(settings) !== 'teaching')
    return (
      <section className="admin-panel">
        <h3>Share from a device</h3>
        <p>
          Add a named camera or screen source above and save Class / Teach first. Then open this
          hall in Admin on the device you want to share from.
        </p>
      </section>
    );
  return (
    <section className="admin-panel">
      <h3>Share from a device</h3>
      <p>
        Open this hall in Admin on each laptop or phone. Name the device, then start its saved
        source below. A TV connection code is for watching the output, not for sending a camera or
        screen. Keep each sharing device’s Admin page open.
      </p>
      <label>
        Name of this laptop or phone
        <input
          value={deviceName}
          maxLength={60}
          placeholder="e.g. Office laptop or Ahmed’s phone"
          onChange={(event) => {
            const name = event.target.value;
            setDeviceName(name);
            try {
              localStorage.setItem('jic-publisher-name', name);
            } catch {
              /* This session can still share. */
            }
          }}
        />
      </label>
      {hasDraft && (
        <p>
          These are the sources currently saved on the TV. You can start them now; new sources and
          layout changes need Save & update TV.
        </p>
      )}
      <p>
        {relayConfigured === true
          ? 'A relay is configured for connections between different networks. Both devices still need an internet connection.'
          : relayConfigured === false
            ? 'No relay is configured. Connect the laptop, phone and TV to the same Wi-Fi for testing. Guest Wi-Fi may block devices from reaching each other.'
            : 'Use the same Wi-Fi for testing. Connections between different networks may need a relay.'}
      </p>
      {sources.map((source) => (
        <DeviceInput
          key={source.slot}
          screenId={screenId}
          {...source}
          remote={inputs.find((i) => i.slot === source.slot)}
          disabled={disabled}
          deviceName={deviceName}
          onRefresh={onRefresh}
        />
      ))}
      <p className="admin-tv-help">
        Screen audio depends on the browser and selected tab. A phone can share its camera;
        whole-screen sharing needs a supported desktop browser. Enable the source’s audio and turn
        off “Mute TV audio” to hear it on the TV.
      </p>
    </section>
  );
}
