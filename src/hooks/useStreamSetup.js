import { useCallback, useEffect, useRef, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { normaliseTvSettings } from '../../supabase/functions/_shared/tv.js';
import { hasSceneContent } from '../../supabase/functions/_shared/tv-scenes.js';
import { createStreamScenes, streamSettings } from '@/lib/streamWorkspace';

export default function useStreamSetup(screenId, userId) {
  const key = `jic-stream-workspace:${userId}:${screenId}`;
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [stage, setStage] = useState(2);
  const [count, setCount] = useState(1);
  const [managedId, setManagedId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(() => crypto.randomUUID());
  const [revision, setRevision] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const requestOrder = useRef(0);
  const discard = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage is optional. */
    }
  };

  const refresh = useCallback(
    async (signal) => {
      const order = ++requestOrder.current;
      const next = await tvRequest('admin', screenId, {}, { staff: true, signal });
      if (
        mounted.current &&
        !signal?.aborted &&
        !inFlight.current &&
        order === requestOrder.current
      )
        setData(next);
      return next;
    },
    [screenId],
  );

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        const next = await refresh(controller.signal);
        if (controller.signal.aborted) return;
        if (!loaded.current) {
          loaded.current = true;
          setRevision(next.updated_at);
          try {
            const draft = JSON.parse(sessionStorage.getItem(key));
            if (draft?.form && draft.stage === 3) {
              const restored = normaliseTvSettings(draft.form);
              if (restored.scenes?.length && restored.scenes.length <= 6) {
                setForm(restored);
                setCount(restored.scenes.length);
                setStage(3);
                setRevision(draft.revision || next.updated_at);
                setManagedId(draft.managedId === next.presentation?.id ? draft.managedId : null);
                setBaseline(draft.baseline || null);
                setMessage(
                  'Setup restored. If you were sharing, reopen that input to start capture again.',
                );
              }
            }
          } catch {
            /* A damaged browser draft must not block a clean setup. */
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error.message);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    poll();
    return () => {
      mounted.current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh, key]);

  useEffect(() => {
    if (!form || stage !== 3) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({ form, stage, revision, managedId, baseline }));
    } catch {
      setMessage('Your browser could not keep this draft. Save the scene before leaving.');
    }
  }, [form, stage, revision, managedId, baseline, key]);

  useEffect(() => {
    if (managedId && data && data.presentation?.id !== managedId) {
      setWorkspaceId(crypto.randomUUID());
      setManagedId(null);
      setMessage(
        'The stream ended or was replaced. Local sharing has stopped; your scene draft is kept.',
      );
    }
  }, [managedId, data]);

  const started = Boolean(managedId && data?.presentation?.id === managedId);
  const dirty = Boolean(form && JSON.stringify(form) !== JSON.stringify(baseline));
  const build = () => {
    const scenes = createStreamScenes(count);
    setForm({
      ...data.settings,
      scene_mode: 'teaching',
      class_until: '',
      scenes,
      active_scene_id: scenes[0].id,
    });
    setRevision(data.updated_at);
    setStage(3);
    setMessage('Choose the number of inputs in each scene, then press + Select input type.');
  };
  const newSetup = () => {
    discard();
    setWorkspaceId(crypto.randomUUID());
    setManagedId(null);
    setForm(null);
    setBaseline(null);
    setStage(2);
    setCount(1);
    setMessage('Clean setup ready. Saved scenes are available in the editor.');
  };
  const manageLive = () => {
    setForm(data.settings);
    setBaseline(data.settings);
    setCount(data.settings.scenes.length);
    setRevision(data.updated_at);
    setManagedId(data.presentation.id);
    setStage(3);
    setMessage('Editing the live stream. Save & update applies your changes.');
  };
  const publish = useCallback(async () => {
    if (inFlight.current || !form) return;
    const scene = form.scenes.find((item) => item.id === form.active_scene_id);
    if (!hasSceneContent(scene) && !started)
      throw new Error('Select an input type in the selected scene before starting the stream.');
    if (
      !started &&
      data.presentation &&
      !window.confirm(
        'Start a new stream? The current stream and its viewing connections will end. Saved scenes stay available.',
      )
    )
      return;
    inFlight.current = true;
    ++requestOrder.current;
    setBusy(true);
    setMessage('');
    try {
      const next = await tvRequest(
        started ? 'save' : 'new-presentation',
        screenId,
        {
          settings: streamSettings(data.settings, form),
          expectedUpdatedAt: started ? revision : data.updated_at,
        },
        { staff: true },
      );
      setData((previous) => ({
        ...previous,
        ...next,
        ...(started ? {} : { inputs: [], devices: [] }),
      }));
      setForm(next.settings);
      setBaseline(next.settings);
      setRevision(next.updated_at);
      setManagedId(next.presentation?.id || null);
      if (!next.presentation) setWorkspaceId(crypto.randomUUID());
      setMessage(
        !next.presentation
          ? 'The selected scene is clear. The background display is showing.'
          : started
            ? 'Stream updated. Connected displays are receiving your changes.'
            : 'Stream started. Connect a display with its code, or share the watching link.',
      );
      await refresh();
    } finally {
      ++requestOrder.current;
      inFlight.current = false;
      setBusy(false);
    }
  }, [form, started, data, screenId, revision, refresh]);
  async function end() {
    const next = await tvRequest(
      'normal',
      screenId,
      { expectedUpdatedAt: data.updated_at },
      { staff: true },
    );
    setData((previous) => ({ ...previous, ...next, devices: [], inputs: [] }));
    newSetup();
    setMessage('Stream ended. The display webpage is showing its background schedule.');
  }
  async function run(task) {
    if (inFlight.current) return;
    inFlight.current = true;
    ++requestOrder.current;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      setMessage(error.message);
    } finally {
      ++requestOrder.current;
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    data,
    setData,
    form,
    setForm,
    stage,
    count,
    setCount,
    started,
    dirty,
    workspaceId,
    busy,
    message,
    setMessage,
    refresh,
    build,
    newSetup,
    manageLive,
    publish,
    end,
    run,
    discard,
  };
}
