import React, { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { installPlatform, isInstalledApp, requestAppInstall } from '@/lib/appInstall';
import '@/styles/app-install.css';

export function InstallAppButton({ onClick }) {
  return (
    <button
      type="button"
      className="jic-install-button"
      onClick={() => {
        onClick?.();
        requestAppInstall();
      }}
    >
      <Download size={19} aria-hidden="true" />
      <span>Install app</span>
    </button>
  );
}

export default function AppInstall() {
  const prompt = useRef(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(() => installPlatform(window.navigator));
  const [installed, setInstalled] = useState(() => isInstalledApp(window));
  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(isInstalledApp(window));
    const ready = (event) => {
      event.preventDefault();
      prompt.current = event;
    };
    const complete = () => {
      prompt.current = null;
      setInstalled(true);
      setOpen(false);
    };
    const install = async () => {
      if (isInstalledApp(window)) return;
      trigger.current = document.activeElement;
      const event = prompt.current;
      if (event) {
        prompt.current = null;
        try {
          await event.prompt();
          const choice = await event.userChoice;
          if (choice?.outcome === 'accepted') complete();
          return;
        } catch {
          /* Fall back to browser instructions if the prompt expired. */
        }
      }
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    window.addEventListener('jic-install-app', install);
    window.addEventListener('pageshow', update);
    query.addEventListener('change', update);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', complete);
      window.removeEventListener('jic-install-app', install);
      window.removeEventListener('pageshow', update);
      query.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.appInstalled = String(installed);
    return () => {
      delete document.documentElement.dataset.appInstalled;
    };
  }, [installed]);
  useEffect(() => {
    if (!open || installed) return undefined;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    };
  }, [open, installed]);
  if (installed) return null;
  return (
    <dialog
      ref={dialog}
      className="jic-install-dialog"
      aria-labelledby="jic-install-title"
      onCancel={(event) => {
        event.preventDefault();
        setOpen(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            setOpen(false);
        }
      }}
    >
      <div className="jic-install-heading">
        <h2 id="jic-install-title">Install JIC</h2>
        <button
          type="button"
          autoFocus
          aria-label="Close install instructions"
          onClick={() => setOpen(false)}
        >
          <X size={22} />
        </button>
      </div>
      <p>Keep prayer times and your community one tap away.</p>
      <div className="jic-install-platforms" role="group" aria-label="Your device">
        {[
          ['ios', 'iPhone / iPad'],
          ['android', 'Android'],
          ['other', 'Computer'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={platform === value}
            onClick={() => setPlatform(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {platform === 'ios' ? (
        <>
          <ol>
            <li>
              Open <strong>jicmasjid.org</strong> in Safari.
            </li>
            <li>
              Tap <strong>Share</strong> (you may need to open the page menu first).
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.
            </li>
          </ol>
          <p>Opened from WhatsApp or another app? Open this page in Safari first.</p>
        </>
      ) : platform === 'android' ? (
        <>
          <ol>
            <li>
              Open <strong>jicmasjid.org</strong> in Chrome.
            </li>
            <li>
              Tap the <strong>⋮ menu</strong>.
            </li>
            <li>
              Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li>
              Confirm <strong>Install</strong> or <strong>Add</strong>.
            </li>
          </ol>
          <p>If you opened this page inside another app, open it in Chrome first.</p>
        </>
      ) : (
        <p>
          Open this site in Chrome or Edge and look for the install icon in the address bar, or
          choose the install option in the browser menu.
        </p>
      )}
    </dialog>
  );
}
