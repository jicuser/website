import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { INPUT_SLOTS } from '../../../supabase/functions/_shared/tv-scenes.js';
import DeviceInputs from '@/features/displays/DeviceInputs';

// Contributors get capture controls, never a scene editor or a reset action.
export default function ShareDevicePage() {
  const { screenId } = useParams();
  const [params] = useSearchParams();
  const slot = params.get('slot');
  const hall = TV_SCREENS.find((screen) => screen.id === screenId);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const valid = hall && screenId !== 'shoe-area' && INPUT_SLOTS.includes(slot);
  const refresh = useCallback(async () => {
    if (!valid) return;
    try {
      const next = await tvRequest('admin', screenId, {}, { staff: true });
      setData(next);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, [valid, screenId]);
  useEffect(() => {
    let active = true,
      timer;
    const poll = async () => {
      await refresh();
      if (active) timer = setTimeout(poll, 5000);
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  return (
    <main className="admin-console min-h-screen p-4">
      <section className="admin-panel">
        <h1>{hall?.label || 'Hall stream'} · Share from this device</h1>
        <p>
          Your source name comes from the presentation. Starting it does not change the layout or
          disconnect other devices.
        </p>
        <Link to="/admin">Back to Admin</Link>
        {!valid && (
          <p role="alert">
            This sharing link is incomplete. Ask the operator for a new device sharing link.
          </p>
        )}
        {error && (
          <p role="alert">
            {error}{' '}
            <button className="admin-button" onClick={refresh}>
              Retry
            </button>
          </p>
        )}
      </section>
      {valid && data && (
        <DeviceInputs
          screenId={screenId}
          onlySlot={slot}
          settings={data.settings}
          inputs={data.inputs || []}
          relayConfigured={data.relayConfigured}
          onRefresh={refresh}
        />
      )}
    </main>
  );
}
