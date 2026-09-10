import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Heart, Landmark, X } from 'lucide-react';

const BANK_DETAILS = {
  bank: 'Metro Bank',
  accountName: 'Jamatia Islamic Centre',
  sortCode: '23-05-80',
  accountNumber: '57434236',
};

export default function WonderfulDonationModal({ open, onClose }) {
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setCopied('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const copyText = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(current => current === key ? '' : current), 1800);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(key);
      window.setTimeout(() => setCopied(current => current === key ? '' : current), 1800);
    }
  };

  const copyAll = () => copyText('all', `Bank: ${BANK_DETAILS.bank}\nAccount name: ${BANK_DETAILS.accountName}\nSort code: ${BANK_DETAILS.sortCode}\nAccount number: ${BANK_DETAILS.accountNumber}`);

  const DetailCard = ({ label, value, copyKey, strongClass = 'text-base' }) => (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="jic-popup-muted block text-xs uppercase tracking-[0.12em]">{label}</span>
          <strong className={`jic-popup-title mt-1 block ${strongClass}`}>{value}</strong>
        </div>
        <button type="button" onClick={() => copyText(copyKey, value)} className="jic-popup-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" aria-label={`Copy ${label}`} title={`Copy ${label}`}>
          {copied === copyKey ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="jic-popup-overlay fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }} role="presentation">
          <motion.section initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 32, scale: 0.98 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }} role="dialog" aria-modal="true" aria-labelledby="jic-donation-title" className="jic-popup-panel relative w-full max-w-2xl overflow-y-auto rounded-t-[30px] sm:rounded-[30px]" style={{maxHeight:'calc(100dvh - 12px)'}}>

            <div className="jic-popup-divider sticky top-0 z-20 flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="flex gap-3 min-w-0">
                <div className="jic-popup-icon h-11 w-11 shrink-0 rounded-2xl"><Heart className="h-5 w-5" fill="currentColor" /></div>
                <div><p className="jic-popup-kicker">SUPPORT JIC</p><h2 id="jic-donation-title" className="jic-popup-title mt-1 text-xl font-semibold sm:text-2xl">Donate to Jamatia Islamic Centre</h2></div>
              </div>
              <button type="button" onClick={onClose} className="jic-popup-icon flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Close donation window"><X size={19} /></button>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <div className="jic-popup-surface rounded-2xl p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3"><Landmark className="mt-0.5 h-5 w-5 shrink-0" /><div><strong className="jic-popup-title block text-base">Bank transfer</strong><span className="jic-popup-muted mt-1 block text-sm leading-6">Online donation options are being worked on. For now, you can donate directly to the mosque account below.</span></div></div>
                  <button type="button" onClick={copyAll} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">{copied === 'all' ? <Check size={15} /> : <Copy size={15} />}{copied === 'all' ? 'Copied' : 'Copy all'}</button>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <DetailCard label="Bank" value={BANK_DETAILS.bank} copyKey="bank" />
                  <DetailCard label="Account name" value={BANK_DETAILS.accountName} copyKey="accountName" />
                  <DetailCard label="Sort code" value={BANK_DETAILS.sortCode} copyKey="sortCode" strongClass="text-lg tracking-[0.08em]" />
                  <DetailCard label="Account number" value={BANK_DETAILS.accountNumber} copyKey="accountNumber" strongClass="text-lg tracking-[0.08em]" />
                </div>
                <p className="jic-popup-muted mt-4 text-xs leading-5">Tap any copy icon to copy one detail, or use <strong>Copy all</strong> to copy the full bank details. Please check the account name and details carefully in your banking app before confirming your transfer.</p>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
