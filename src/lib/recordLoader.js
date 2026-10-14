import { withRequestTimeout } from './requestTimeout.js';

// A bounded, single-flight reader, independent of React and the database client.
export function createRecordLoader(
  read,
  onState,
  { interval = 15000, timeoutMs = 15000, isVisible = () => true } = {},
) {
  const controller = new AbortController();
  let state = { data: null, loading: true, error: '' };
  let timer;
  let running = false;
  let requested = false;
  const publish = (next) => {
    state = next;
    onState(state);
  };

  async function refresh() {
    if (controller.signal.aborted) return;
    if (running) {
      requested = true;
      return;
    }
    running = true;
    clearTimeout(timer);
    publish({ ...state, loading: true, error: '' });
    try {
      const data = await withRequestTimeout(read, { signal: controller.signal, timeoutMs });
      if (!controller.signal.aborted) publish({ data, loading: false, error: '' });
    } catch (error) {
      // Clear previous records on failure: access may have changed since the last read.
      if (!controller.signal.aborted)
        publish({
          data: null,
          loading: false,
          error: error?.message || 'Could not load this information. Please retry.',
        });
    } finally {
      running = false;
      if (!controller.signal.aborted) {
        if (requested) {
          requested = false;
          void refresh();
        } else if (interval)
          timer = setTimeout(() => {
            if (isVisible()) void refresh();
          }, interval);
      }
    }
  }

  return {
    refresh,
    dispose() {
      controller.abort();
      clearTimeout(timer);
    },
  };
}
