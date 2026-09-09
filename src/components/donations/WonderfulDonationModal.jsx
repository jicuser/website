import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Heart, Landmark, ShieldCheck, X } from 'lucide-react';

const wonderfulUrl = import.meta.env.VITE_WONDERFUL_DONATE_URL || '';

export default function WonderfulDonationModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
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

  const openWonderful = () => {
    if (!wonderfulUrl) return;
    window.open(wonderfulUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jic-popup-overlay fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
          role="presentation"
        >
          <motion.section
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="jic-donation-title"
            className="jic-popup-panel w-full max-w-2xl overflow-hidden rounded-t-[30px] sm:rounded-[30px]"
          >
            <div className="jic-popup-divider flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="flex gap-3">
                <div className="jic-popup-icon h-11 w-11 shrink-0 rounded-2xl">
                  <Heart className="h-5 w-5" fill="currentColor" />
                </div>
                <div>
                  <p className="jic-popup-kicker">SUPPORT JIC</p>
                  <h2 id="jic-donation-title" className="jic-popup-title mt-1 text-xl font-semibold sm:text-2xl">Donate to Jamatia Islamic Centre</h2>
                </div>
              </div>
              <button type="button" onClick={onClose} className="jic-popup-icon h-10 w-10 shrink-0" aria-label="Close donation window">
                <X size={19} />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <div className="jic-popup-surface flex gap-3 rounded-2xl p-4">
                  <Landmark className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <strong className="jic-popup-title block text-sm">Pay directly from your bank</strong>
                    <span className="jic-popup-muted mt-1 block text-xs leading-5">Approve securely inside your own banking app.</span>
                  </div>
                </div>
                <div className="jic-popup-surface flex gap-3 rounded-2xl p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <strong className="jic-popup-title block text-sm">Powered by Wonderful</strong>
                    <span className="jic-popup-muted mt-1 block text-xs leading-5">JIC never sees or stores your online banking login details.</span>
                  </div>
                </div>
              </div>

              {wonderfulUrl ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/95">
                    <iframe
                      title="Donate to Jamatia Islamic Centre with Wonderful"
                      src={wonderfulUrl}
                      className="h-[58vh] min-h-[430px] w-full bg-white"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="jic-popup-muted text-xs leading-5">If your bank blocks the embedded window, continue securely on Wonderful.</p>
                    <button type="button" onClick={openWonderful} className="jic-popup-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition">
                      Open secure donation <ExternalLink size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="jic-popup-surface rounded-2xl p-5 text-sm leading-6">
                  <strong className="jic-popup-title block text-base">Wonderful is ready to connect.</strong>
                  <span className="jic-popup-muted">Add JIC's Wonderful donation-page URL as <code>VITE_WONDERFUL_DONATE_URL</code> in the website environment settings.</span>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
