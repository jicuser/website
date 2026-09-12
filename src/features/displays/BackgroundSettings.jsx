import React, { useState } from 'react';
import NormalSettings from './NormalSettings';
import TvPreview from '@/components/admin/TvPreview';
import { tvRequest } from '@/lib/tvControl';

export default function BackgroundSettings({ screenId, data, currentEvents, onRefresh }) {
  const [form, setForm] = useState(() => ({ ...data.settings, scene_mode: 'normal' }));
  const [revision, setRevision] = useState(data.updated_at);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <div className="stream-background-settings">
      <p>These posters and prayer notices show when the hall has no active stream.</p>
      <TvPreview screenId={screenId} label={data.label} settings={form} />
      <NormalSettings
        form={form}
        update={(key, value) => setForm((previous) => ({ ...previous, [key]: value }))}
        currentEvents={currentEvents}
        hall={screenId !== 'shoe-area'}
      />
      <button
        className="admin-button primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const saved = await tvRequest(
              'save-background',
              screenId,
              { settings: form, expectedUpdatedAt: revision },
              { staff: true },
            );
            setRevision(saved.updated_at);
            await onRefresh();
            setMessage('Background display saved.');
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving…' : 'Save background display'}
      </button>
      <button
        className="admin-button"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              'Load the current background settings? This replaces your unpublished background changes.',
            )
          )
            return;
          setBusy(true);
          try {
            const next = await onRefresh();
            setForm({ ...next.settings, scene_mode: 'normal' });
            setRevision(next.updated_at);
            setMessage('Current background settings loaded.');
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Load current settings
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
