import { useEffect, useRef, useState } from 'react';

// Record only streams explicitly selected by the operator. Nothing is uploaded automatically.
export default function useRecording() {
  const active = useRef(null);
  const download = useRef('');
  const [state, setState] = useState({ recording: false, url: '', name: '', message: '' });
  const stop = () => {
    if (active.current?.recorder.state === 'recording') active.current.recorder.stop();
  };
  useEffect(
    () => () => {
      const current = active.current;
      if (current) {
        current.recorder.onstop = null;
        if (current.recorder.state !== 'inactive') current.recorder.stop();
        if (current.owned) current.stream.getTracks().forEach((t) => t.stop());
      }
      if (download.current) URL.revokeObjectURL(download.current);
    },
    [],
  );
  function start(stream, owned = false) {
    if (active.current) return;
    if (!window.MediaRecorder) {
      setState((s) => ({ ...s, message: 'Recording is unavailable in this browser.' }));
      if (owned) stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const mime = ['video/webm;codecs=vp8,opus', 'video/mp4', 'video/webm'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    try {
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      let bytes = 0;
      active.current = { recorder, stream, owned };
      recorder.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
        }
        // Keep mobile memory bounded; download each part before starting another recording.
        if (bytes >= 256 * 1024 * 1024 && recorder.state === 'recording') recorder.stop();
      };
      recorder.onerror = () =>
        setState((s) => ({ ...s, message: 'Recording was interrupted. Save the available part.' }));
      recorder.onstop = () => {
        if (download.current) URL.revokeObjectURL(download.current);
        const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        download.current = url;
        active.current = null;
        if (owned) stream.getTracks().forEach((t) => t.stop());
        setState({
          recording: false,
          url,
          name: `jic-session-${new Date().toISOString().replace(/[:.]/g, '-')}.${recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
          message:
            bytes >= 256 * 1024 * 1024
              ? 'Recording part is ready. Download it before starting another.'
              : 'Recording ready to download.',
        });
      };
      stream
        .getVideoTracks()
        .forEach((track) => track.addEventListener('ended', stop, { once: true }));
      recorder.start(1000);
      setState({
        recording: true,
        url: '',
        name: '',
        message: stream.getAudioTracks().length
          ? 'Recording video and audio.'
          : 'Recording video. This source has no audio track.',
      });
    } catch (error) {
      active.current = null;
      if (owned) stream.getTracks().forEach((t) => t.stop());
      setState((s) => ({ ...s, message: error.message }));
    }
  }
  async function recordTv() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      start(stream, true);
    } catch (error) {
      setState((s) => ({
        ...s,
        message: error.name === 'NotAllowedError' ? 'Recording cancelled.' : error.message,
      }));
    }
  }
  return { ...state, start, stop, recordTv };
}
