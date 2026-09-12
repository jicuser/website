import React, { useEffect, useRef, useState } from 'react';
import useTvPublisher from '@/hooks/useTvPublisher';
import { tvRequest } from '@/lib/tvControl';
import { tvScene } from '../../../supabase/functions/_shared/tv.js';
import { tvInputSources } from '@/lib/tvSceneState';

function DeviceInput({ screenId, slot, capture, active, conflict, remote, disabled, onRefresh }) {
  const sharing = useTvPublisher(screenId, slot);
  const [audio, setAudio] = useState(false);
  const [error, setError] = useState('');
  const video = useRef(null);
  const canShareScreen = Boolean(navigator.mediaDevices?.getDisplayMedia);
  const canUseCamera = Boolean(navigator.mediaDevices?.getUserMedia);
  useEffect(() => {
    if (video.current) video.current.srcObject = sharing.stream;
  }, [sharing.stream]);
  return (
    <article className="device-input">
      <h4>
        {slot.replace('input-', 'Input ')} ·{' '}
        {capture === 'camera'
          ? 'Device camera'
          : capture === 'screen'
            ? 'Screen share'
            : 'Device source'}{' '}
        <small>
          {sharing.stream
            ? 'This device'
            : remote
              ? `${remote.kind === 'camera' ? 'Camera' : 'Screen'} · another device`
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
      {capture !== 'camera' && !canShareScreen && (
        <p>
          This browser cannot share its screen. Open this hall in a supported laptop browser to
          share a tab or screen. On this phone, choose a Device camera source instead.
        </p>
      )}
      {capture !== 'screen' && !canUseCamera && (
        <p>
          Camera capture is unavailable in this browser. Open the HTTPS admin page in Safari or
          Chrome and allow camera access.
        </p>
      )}
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
            disabled={
              disabled ||
              sharing.busy ||
              Boolean(sharing.stream) ||
              Boolean(remote) ||
              conflict ||
              !canShareScreen
            }
            onClick={() => sharing.start('screen', audio)}
          >
            Share this screen
          </button>
        )}
        {capture !== 'screen' && (
          <button
            className="admin-button"
            disabled={
              disabled ||
              sharing.busy ||
              Boolean(sharing.stream) ||
              Boolean(remote) ||
              conflict ||
              !canUseCamera
            }
            onClick={() => sharing.start('camera', audio)}
          >
            Use this camera
          </button>
        )}
        {(sharing.stream || remote || sharing.busy) && (
          <button
            className="admin-button"
            onClick={async () => {
              try {
                if (sharing.stream || sharing.busy) await sharing.stop();
                else
                  await tvRequest(
                    'stop',
                    screenId,
                    { sessionId: remote.session_id },
                    { staff: true },
                  );
                onRefresh();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Stop input
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
          aria-label={`${slot} local preview`}
        />
      )}
      <p role="status">{error || sharing.message}</p>
    </article>
  );
}
export default function DeviceInputs({ screenId, settings, inputs, disabled, onRefresh }) {
  const sources = tvInputSources(settings);
  if (!sources.length || tvScene(settings) !== 'teaching') return null;
  return (
    <section className="admin-panel">
      <h3>Device inputs</h3>
      <p>
        On the laptop, choose one input for its screen. On the phone, sign in, open this hall and
        choose a different input for its camera. Keep both pages open.
      </p>
      {disabled && <p>Save Class / Teach and the device sources before starting them.</p>}
      {sources.map((source) => (
        <DeviceInput
          key={source.slot}
          screenId={screenId}
          {...source}
          remote={inputs.find((i) => i.slot === source.slot)}
          disabled={disabled}
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
