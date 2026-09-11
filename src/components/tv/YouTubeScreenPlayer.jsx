import React, { useEffect, useRef, useState } from 'react';

let apiPromise;
function loadPlayerApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => fail(), 15000);
    const ready = () => {
      window.clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previous;
      resolve(window.YT);
      previous?.();
    };
    const fail = () => {
      window.clearTimeout(timeout);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
      script.remove();
      apiPromise = null;
      reject(new Error('The livestream player could not load.'));
    };
    window.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export default function YouTubeScreenPlayer({ videoId, title, muted, onUnavailable }) {
  const host = useRef(null);
  const player = useRef(null);
  const unavailable = useRef(onUnavailable);
  const mutedRef = useRef(muted);
  const [blocked, setBlocked] = useState(false);
  unavailable.current = onUnavailable;
  mutedRef.current = muted;

  useEffect(() => {
    let active = true;
    let instance;
    setBlocked(false);
    loadPlayerApi().then(YT => {
      if (!active) return;
      const target = document.createElement('div');
      host.current.textContent = '';
      host.current.appendChild(target);
      instance = new YT.Player(target, {
        videoId,
        width:'100%', height:'100%',
        playerVars:{ autoplay:1, playsinline:1, controls:1, rel:0, origin:window.location.origin },
        events:{
          onReady:event => {
            if (!active) return;
            player.current = event.target;
            event.target.getIframe().title = title || 'JIC livestream';
            // Start muted so a TV browser can play without a prior remote click.
            event.target.mute();
            if (!mutedRef.current) event.target.unMute();
            event.target.playVideo();
          },
          onStateChange:event => {
            if (!active) return;
            if (event.data === YT.PlayerState.PLAYING) setBlocked(false);
            if (event.data === YT.PlayerState.ENDED) unavailable.current('The livestream has ended.');
          },
          onError:() => { if (active) unavailable.current('The livestream is unavailable. Showing posters.'); },
          onAutoplayBlocked:() => { if (active) setBlocked(true); },
        },
      });
    }).catch(() => { if (active) unavailable.current('The livestream could not load. Showing posters.'); });
    return () => { active = false; player.current = null; instance?.destroy(); };
  }, [videoId, title]);

  useEffect(() => {
    if (!player.current) return;
    if (muted) player.current.mute(); else player.current.unMute();
  }, [muted]);

  return <div className="jic-tv-player">
    <div className="jic-tv-player-host" ref={host}/>
    {blocked && <button className="jic-tv-start-video" type="button" onClick={() => player.current?.playVideo()}>Start livestream</button>}
  </div>;
}
