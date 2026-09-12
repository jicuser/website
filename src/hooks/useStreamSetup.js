import { useCallback, useEffect, useRef, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { normaliseTvSettings } from '../../supabase/functions/_shared/tv.js';
import { hasSceneContent, nameProblem } from '../../supabase/functions/_shared/tv-scenes.js';
import { createStreamScene, streamSettings } from '@/lib/streamWorkspace';

export default function useStreamSetup(screenId, userId) {
  const key = `jic-stream-workspace:${userId}:${screenId}`;
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [stage, setStage] = useState(2);
  const [managedId, setManagedId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(() => crypto.randomUUID());
  const [revision, setRevision] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [savedTemplate, setSavedTemplate] = useState(null);
  const [streamName, setStreamName] = useState('');
  const [pendingSave, setPendingSave] = useState(null);
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
            const restoredName =
              draft?.streamName ||
              draft?.savedTemplate?.name ||
              draft?.form?.scenes?.[0]?.name ||
              '';
            setStreamName(restoredName);
            if (draft?.pendingSave?.settings?.scenes?.length) setPendingSave(draft.pendingSave);
            if (draft?.form && [2, 3].includes(draft.stage)) {
              setSavedTemplate(draft.savedTemplate || null);
              const restored = normaliseTvSettings(draft.form);
              if (restored.scenes?.length && restored.scenes.length <= 6) {
                setForm(restored);
                setStage(nameProblem(restoredName, 'stream name') ? 2 : 3);
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
    if (!loaded.current) return;
    try {
      if ((!form || stage !== 3) && !pendingSave && !streamName) {
        sessionStorage.removeItem(key);
        return;
      }
      sessionStorage.setItem(
        key,
        JSON.stringify({
          form,
          stage,
          revision,
          managedId,
          baseline,
          savedTemplate,
          pendingSave,
          streamName,
        }),
      );
    } catch {
      setMessage(
        'Your browser could not keep this draft. Keep this page open; settings can be saved when ending the stream.',
      );
    }
  }, [form, stage, revision, managedId, baseline, savedTemplate, pendingSave, streamName, key]);

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
  const build = (name) => {
    const problem = nameProblem(name, 'stream name');
    if (problem) {
      setMessage(problem);
      return;
    }
    const scenes = form?.scenes || [createStreamScene()];
    setStreamName(name.trim());
    setForm({
      ...data.settings,
      ...form,
      scene_mode: 'teaching',
      class_until: '',
      scenes,
      active_scene_id: form?.active_scene_id || scenes[0].id,
    });
    setRevision(data.updated_at);
    setStage(3);
    setMessage('Choose the number of inputs in each scene, then press + Select input type.');
  };
  const loadSettings = (settings, template = null, name = template?.name || '') => {
    setSavedTemplate(template);
    setStreamName(name);
    setStage(3);
    setWorkspaceId(crypto.randomUUID());
    setForm(settings);
    setMessage('Stream settings loaded. Reconnect camera and screen inputs when ready.');
  };
  const newSetup = () => {
    discard();
    setSavedTemplate(null);
    setStreamName('');
    setPendingSave(null);
    setWorkspaceId(crypto.randomUUID());
    setManagedId(null);
    setForm(null);
    setBaseline(null);
    setStage(2);
    setMessage('Clean setup ready. Name your stream or load saved stream settings.');
  };
  const manageLive = () => {
    setSavedTemplate(null);
    setForm(data.settings);
    setBaseline(data.settings);
    setRevision(data.updated_at);
    setManagedId(data.presentation.id);
    setStage(3);
    setMessage('Editing the live stream. Update live layout applies your changes.');
  };
  const publish = useCallback(async () => {
    if (inFlight.current || !form) return;
    if (!started && nameProblem(streamName, 'stream name'))
      throw new Error(nameProblem(streamName, 'stream name'));
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
    setOperation(started ? 'save' : 'start');
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
    } finally {
      ++requestOrder.current;
      inFlight.current = false;
      setBusy(false);
      setOperation('');
    }
  }, [form, started, data, screenId, revision, streamName]);
  async function end() {
    const snapshot = {
      settings: structuredClone(streamSettings(data.settings, form || data.settings)),
      template: savedTemplate,
      name: streamName,
    };
    const next = await tvRequest(
      'normal',
      screenId,
      { expectedUpdatedAt: data.updated_at },
      { staff: true },
    );
    setData((previous) => ({ ...previous, ...next, devices: [], inputs: [] }));
    newSetup();
    setPendingSave(snapshot);
    setMessage('Stream ended. Screens are returning to the normal display.');
  }
  async function run(task, action = '') {
    if (inFlight.current) return;
    inFlight.current = true;
    ++requestOrder.current;
    setBusy(true);
    setOperation(action);
    try {
      await task();
    } catch (error) {
      setMessage(error.message);
    } finally {
      ++requestOrder.current;
      inFlight.current = false;
      setBusy(false);
      setOperation('');
    }
  }
  return {
    data,
    setData,
    form,
    setForm,
    stage,
    started,
    dirty,
    workspaceId,
    busy,
    operation,
    message,
    setMessage,
    savedTemplate,
    streamName,
    setStreamName,
    setSavedTemplate,
    pendingSave,
    setPendingSave,
    refresh,
    build,
    loadSettings,
    newSetup,
    manageLive,
    publish,
    end,
    run,
    discard,
  };
}
