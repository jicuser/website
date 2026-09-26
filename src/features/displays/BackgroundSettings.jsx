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
      <p>This is what the screen shows when no presentation is active.</p>
      <div className="tv-standby-preview-heading">
        <strong>Live layout preview</strong>
        <span>Landscape 16:9</span>
      </div>
      <TvPreview screenId={screenId} label={data.label} settings={form} />
      <p className="workspace-meta">Layout editor is the next control: it will let each screen use landscape or portrait and let timetable, posters, clock and notices be positioned visually.</p>
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
            setMessage('Standby display saved.');
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving…' : 'Save standby display'}
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
        Reload standby settings
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
