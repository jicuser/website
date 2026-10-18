import React, { useLayoutEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ExternalLink, Maximize2, X } from 'lucide-react';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import useCommunityLink from '@/hooks/useCommunityLink';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';
import ImageViewer from '@/components/ImageViewer';
import { youtubeEmbedUrl } from '@/lib/video';
import { lockPageScroll } from '@/lib/pageScrollLock';
import '@/styles/operations.css';
const EMBEDS = {
  tiktok:
    '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@jicmasjid" data-unique-id="jicmasjid" data-embed-type="creator" style="max-width:720px;min-width:288px"><section><a target="_blank" href="https://www.tiktok.com/@jicmasjid">@jicmasjid</a></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>',
  instagram:
    '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/jicmasjid/" data-instgrm-version="14" style="width:100%;margin:0"><a href="https://www.instagram.com/jicmasjid/" target="_blank">View JIC on Instagram</a></blockquote><script async src="https://www.instagram.com/embed.js"></script>',
  x: '<a class="twitter-timeline" data-height="680" data-dnt="true" href="https://twitter.com/jicmosque">Posts by JIC</a><script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>',
};
function SocialDialog({ channel, video, onClose }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const opener = document.activeElement;
    const node = ref.current;
    const unlock = lockPageScroll();
    node.showModal();
    return () => {
      node.close();
      unlock();
      opener?.focus({ preventScroll: true });
    };
  }, []);
  const frame =
    channel.id === 'facebook'
      ? `https://www.facebook.com/plugins/page.php?${new URLSearchParams({ href: channel.url, tabs: 'timeline', width: '500', height: '680', small_header: 'false', adapt_container_width: 'true', hide_cover: 'false', show_facepile: 'false' })}`
      : channel.id === 'youtube'
        ? video
        : null;
  return (
    <dialog
      ref={ref}
      className="ops-social-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{channel.name} preview</h2>
        <button type="button" onClick={onClose} aria-label="Close preview" autoFocus>
          <X size={23} />
        </button>
      </header>
      <p>Live content is provided by {channel.name}. It may use cookies or ask you to sign in.</p>
      <div className="ops-social-live">
        {frame ? (
          <iframe
            title={`${channel.name} live preview`}
            src={frame}
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : EMBEDS[channel.id] ? (
          <iframe
            title={`${channel.name} live preview`}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px system-ui;background:white;color:#163238}a{color:#147064}blockquote{margin:0 auto}iframe{max-width:100%}</style></head><body>${EMBEDS[channel.id]}</body></html>`}
          />
        ) : (
          <div className="ops-social-channel-cover">
            <img src="/optimized/jic-aerial-sunset.webp" alt="Jamatia Islamic Centre" />
            <h3>{channel.handle}</h3>
            <p>{channel.description}</p>
          </div>
        )}
      </div>
      <footer>
        <p>If the platform does not load here, open the channel directly.</p>
        <a className="ops-button" href={channel.url} target="_blank" rel="noopener noreferrer">
          Open {channel.name} <ExternalLink size={17} />
        </a>
      </footer>
    </dialog>
  );
}
export default function SocialMediaPage() {
  const whatsapp = useCommunityLink();
  const { livestream } = useHomeLiveContent();
  const posters = usePosters()
    .filter((p) => p.image)
    .slice(0, 3);
  const [preview, setPreview] = useState(null),
    [image, setImage] = useState(null);
  const video = youtubeEmbedUrl(livestream?.stream_url);
  return (
    <section className="jic-social-page" aria-labelledby="social-title">
      <Helmet>
        <title>Social Media | Jamatia Islamic Centre</title>
      </Helmet>
      <header className="jic-social-intro">
        <p className="jic-social-eyebrow">A closer community</p>
        <h1 id="social-title">
          Stay connected
          <br />
          to JIC.
        </h1>
        <p>Find the centre’s social channels for talks, programme notices and community news.</p>
      </header>
      <nav className="jic-social-jump" aria-label="Social channels">
        {SOCIAL_CHANNELS.map((c) => (
          <a key={c.id} href={`#${c.id}`} data-glass="clear">
            {c.name}
          </a>
        ))}
        <a href="#whatsapp" data-glass="clear">
          WhatsApp
        </a>
      </nav>
      <div className="jic-social-grid">
        {SOCIAL_CHANNELS.map((channel, index) => {
          const Icon = SOCIAL_ICONS[channel.id];
          const poster = posters[index % Math.max(posters.length, 1)];
          return (
            <article
              key={channel.id}
              id={channel.id}
              className="jic-social-card"
              data-glass="frosted"
            >
              <div className="jic-social-identity">
                <Icon width={30} height={30} aria-hidden="true" />
                <div>
                  <h2>{channel.name}</h2>
                  <a href={channel.url} target="_blank" rel="noopener noreferrer">
                    {channel.handle}
                  </a>
                </div>
              </div>
              <div className={`ops-social-card-preview ops-social-${channel.id}`}>
                <img
                  src="/optimized/jic-aerial-sunset.webp"
                  alt="Jamatia Islamic Centre"
                  loading="lazy"
                />
                <div>
                  <span>Channel overview</span>
                  <strong>{channel.topics.join(' · ')}</strong>
                  <p>{channel.description}</p>
                </div>
              </div>
              <div className="jic-social-actions">
                <button type="button" data-glass="clear" onClick={() => setPreview(channel)}>
                  <Maximize2 size={17} />{' '}
                  {channel.id === 'youtube' && !video ? 'Expand channel' : 'Load live preview'}
                </button>
                <a href={channel.url} target="_blank" rel="noopener noreferrer" data-glass="clear">
                  Open {channel.name}
                  <ExternalLink size={16} />
                </a>
              </div>
              {poster && (
                <button
                  type="button"
                  className="ops-social-poster-link"
                  onClick={() => setImage({ url: poster.image, title: poster.title })}
                >
                  <img src={poster.image} alt="" loading="lazy" />
                  <span>
                    <small>From JIC’s noticeboard</small>
                    <strong>{poster.title}</strong>
                    <span>Open full-size poster ↗</span>
                  </span>
                </button>
              )}
            </article>
          );
        })}
        <article id="whatsapp" className="jic-social-card" data-glass="frosted">
          <div className="jic-social-identity">
            <WhatsAppIcon size={30} />
            <h2>WhatsApp Community</h2>
          </div>
          <div className="ops-whatsapp-preview">
            <WhatsAppIcon size={44} />
            <strong>JIC Community</strong>
            <p>Announcements · Programmes · Community news</p>
            <span>Opens in WhatsApp.</span>
          </div>
          <p>Join the official community to receive JIC updates on your phone.</p>
          <a
            className="jic-community-join"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview and join in WhatsApp <ExternalLink size={16} />
          </a>
        </article>
      </div>
      {preview && <SocialDialog channel={preview} video={video} onClose={() => setPreview(null)} />}
      {image && <ImageViewer image={image} onClose={() => setImage(null)} />}
    </section>
  );
}
