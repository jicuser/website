import { useEffect } from 'react';
import { SITE } from '@/content/site';

/**
 * iOS Safari occasionally loses taps on heavily blurred/fixed header layers.
 * This bridge owns only the radio tap in capture phase and leaves normal React
 * links/buttons alone. It also exposes a stable touch target across every page.
 */
export default function HeaderInteractionBridge() {
  useEffect(() => {
    let audio = null;
    let activeButton = null;
    const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';

    const setButtonState = (button, state) => {
      if (!button) return;
      const small = button.querySelector('small');
      button.classList.toggle('is-live', state === 'playing');
      button.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
      button.setAttribute('aria-label', state === 'playing' ? 'Pause JIC Radio' : 'Play JIC Radio');
      if (small) small.textContent = state === 'error' ? 'Retry' : state === 'playing' ? 'Playing' : 'Listen';
    };

    const ensureAudio = () => {
      if (audio) return audio;
      audio = document.createElement('audio');
      audio.src = streamUrl;
      audio.preload = 'none';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      audio.addEventListener('playing', () => setButtonState(activeButton, 'playing'));
      audio.addEventListener('pause', () => setButtonState(activeButton, 'paused'));
      audio.addEventListener('ended', () => setButtonState(activeButton, 'paused'));
      audio.addEventListener('error', () => setButtonState(activeButton, 'error'));
      return audio;
    };

    const handleClick = async event => {
      const button = event.target.closest?.('.jic-radio');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      if (!streamUrl) {
        setButtonState(button, 'error');
        return;
      }
      activeButton = button;
      const player = ensureAudio();
      try {
        if (!player.paused) {
          player.pause();
          return;
        }
        player.src = streamUrl;
        player.load();
        await player.play();
      } catch {
        setButtonState(button, 'error');
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio.remove();
      }
    };
  }, []);

  return null;
}
