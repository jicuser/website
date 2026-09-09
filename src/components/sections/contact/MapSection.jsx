import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { SITE } from '@/content/site';

const MapSection = () => {
  const query = encodeURIComponent(`Jamatia Islamic Centre, ${SITE.address.line1}, ${SITE.address.line2}`);
  return <>
    <div className="mb-5 flex items-center gap-2">
      <MapPin className="h-6 w-6 text-primary" />
      <h2 className="text-2xl font-bold">Find Us</h2>
    </div>
    <div className="overflow-hidden rounded-2xl border">
      <iframe
        src={`https://www.google.com/maps?q=${query}&output=embed`}
        width="100%"
        height="340"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        title="Jamatia Islamic Centre location"
      />
    </div>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{SITE.address.line1}<br/>{SITE.address.line2}</p>
      <a className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer">Open in Maps <ExternalLink size={14}/></a>
    </div>
  </>;
};

export default MapSection;
