import React from 'react';
import { Check, Clock, Lock, Plus } from 'lucide-react';
import { RAMADAN_COLOURS, ramadanStatus } from './model';

export function SponsorshipMark({ status }) {
  const Icon = { available: Plus, pending: Clock, confirmed: Check, closed: Lock }[status] || Plus;
  return <Icon size={13} strokeWidth={2} aria-hidden="true" />;
}

export default function SponsorshipKey({ kind }) {
  return (
    <div className="booking-key sponsorship-key" aria-label="Sponsorship availability">
      {['available', 'pending', 'confirmed', 'closed'].map((status) => (
        <span key={status} style={{ '--day-colour': RAMADAN_COLOURS[status] }}>
          <SponsorshipMark status={status} />
          {ramadanStatus(kind, status)}
        </span>
      ))}
    </div>
  );
}
