import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
let scriptPromise;
function loadWidget() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(new Error('Security check could not load. Please try again.'));
      };
      document.head.appendChild(script);
    });
  return scriptPromise;
}
const HumanCheck = forwardRef(function HumanCheck(_, ref) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const started = useRef(Date.now()),
    token = useRef(''),
    trap = useRef(null),
    container = useRef(null),
    widget = useRef(null);
  useEffect(() => {
    if (!siteKey) return undefined;
    let active = true;
    loadWidget()
      .then((api) => {
        if (!active || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey: siteKey,
          action: 'public_form',
          size: 'flexible',
          callback: (value) => {
            token.current = value;
            setError('');
          },
          'expired-callback': () => {
            token.current = '';
          },
          'error-callback': () => {
            token.current = '';
            setError('Security check could not complete. Please try again.');
          },
        });
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
      token.current = '';
      if (widget.current != null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, revision]);
  useImperativeHandle(
    ref,
    () => ({
      proof() {
        if (error) throw new Error(error);
        if (siteKey && !token.current) throw new Error('Please complete the security check.');
        return {
          started_at: started.current,
          website: trap.current?.value || '',
          captcha_token: token.current,
        };
      },
      reset() {
        token.current = '';
        if (widget.current != null) window.turnstile?.reset(widget.current);
      },
    }),
    [siteKey, error],
  );
  return (
    <div className="human-check">
      <label
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        Leave blank
        <input ref={trap} name="website_url" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      {siteKey && <div ref={container} />}
      {error && (
        <p role="alert">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setRevision((x) => x + 1);
            }}
          >
            Try again
          </button>
        </p>
      )}
    </div>
  );
});
export default HumanCheck;
