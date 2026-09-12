import { useCallback, useEffect, useRef, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { normaliseTvSettings } from '../../supabase/functions/_shared/tv.js';
import { hasSceneContent, nameProblem } from '../../supabase/functions/_shared/tv-scenes.js';
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
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [savedTemplate, setSavedTemplate] = useState(null);
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
            if (draft?.pendingSave?.settings?.scenes?.length) setPendingSave(draft.pendingSave);
            if (draft?.form && draft.stage === 3) {
              setSavedTemplate(draft.savedTemplate || null);
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
    if (!loaded.current) return;
    try {
      if ((!form || stage !== 3) && !pendingSave) {
        sessionStorage.removeItem(key);
        return;
      }
      sessionStorage.setItem(
        key,
        JSON.stringify({ form, stage, revision, managedId, baseline, savedTemplate, pendingSave }),
      );
    } catch {
      setMessage('Your browser could not keep this draft. Save the scene before leaving.');
    }
  }, [form, stage, revision, managedId, baseline, savedTemplate, pendingSave, key]);

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
  const build = (names) => {
    const scenes = createStreamScenes(count).map((scene, index) => ({
      ...scene,
      name: (names[index] || '').trim(),
    }));
    const problem = scenes.map((scene) => nameProblem(scene.name, 'scene name')).find(Boolean);
    if (problem) {
      setMessage(problem);
      return;
    }
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
  const loadSettings = (settings, template = null) => {
    setSavedTemplate(template);
    setStage(3);
    setWorkspaceId(crypto.randomUUID());
    setForm(settings);
    setCount(settings.scenes.length);
    setMessage('Stream settings loaded. Reconnect camera and screen inputs when ready.');
  };
  const newSetup = () => {
    discard();
    setSavedTemplate(null);
    setPendingSave(null);
    setWorkspaceId(crypto.randomUUID());
    setManagedId(null);
    setForm(null);
    setBaseline(null);
    setStage(2);
    setCount(1);
    setMessage('Clean setup ready. Saved scenes are available in the editor.');
  };
  const manageLive = () => {
    setSavedTemplate(null);
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
    const namingProblem = form.scenes
      .map((item) => nameProblem(item.name, 'scene name'))
      .find(Boolean);
    if (namingProblem) throw new Error(namingProblem);
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
  }, [form, started, data, screenId, revision]);
  async function end() {
    const snapshot = { settings: structuredClone(form || data.settings), template: savedTemplate };
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
    count,
    setCount,
    started,
    dirty,
    workspaceId,
    busy,
    operation,
    message,
    setMessage,
    savedTemplate,
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
