// Bound the complete operation, including SDK calls that cannot accept a signal.
export function withRequestTimeout(
  operation,
  { signal, timeoutMs = 15000, message = 'The connection timed out. Please retry.' } = {},
) {
  const controller = new AbortController();
  let timer;
  let abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => {
      const error = new DOMException('Request cancelled.', 'AbortError');
      reject(error);
      controller.abort(error);
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => {
      const error = new DOMException(message, 'TimeoutError');
      reject(error);
      controller.abort(error);
    }, timeoutMs);
  });
  const work = Promise.resolve().then(() => {
    if (controller.signal.aborted) throw controller.signal.reason;
    return operation(controller.signal);
  });
  return Promise.race([work, cancelled]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  });
}
