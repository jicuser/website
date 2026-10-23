import React, { useLayoutEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowUpRight, ExternalLink, Maximize2, X } from 'lucide-react';
import AboutMasthead from '@/components/about/AboutMasthead';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import useCommunityLink from '@/hooks/useCommunityLink';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';
import ImageViewer from '@/components/ImageViewer';
import { youtubeEmbedUrl } from '@/lib/video';
import { lockPageScroll } from '@/lib/pageScrollLock';
import { posterAppearsOnPage } from '@/lib/programmePlacement';
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
      <p>
        Preview content is provided by {channel.name}. It may use cookies or ask you to sign in.
      </p>
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
    .filter((p) => p.image && posterAppearsOnPage(p, '/social-media'))
    .slice(0, 3);
  const [preview, setPreview] = useState(null),
    [image, setImage] = useState(null);
  const video = youtubeEmbedUrl(livestream?.stream_url);
  return (
    <section className="about-page about-social" aria-labelledby="social-title">
      <Helmet>
        <title>Social Media | Jamatia Islamic Centre</title>
      </Helmet>
      <AboutMasthead title="Stay connected to JIC." eyebrow="A closer community" photo>
        <p>Talks, programme notices and moments from our community. Choose a channel to follow.</p>
      </AboutMasthead>
      <div className="about-channel-list">
        {SOCIAL_CHANNELS.map((channel) => {
          const Icon = SOCIAL_ICONS[channel.id];
          return (
            <article key={channel.id} id={channel.id} className="about-channel">
              <Icon width={30} height={30} aria-hidden="true" />
              <div className="about-channel-name">
                <h2>{channel.name}</h2>
                <span>{channel.handle}</span>
              </div>
              <button
                type="button"
                aria-label={`Preview ${channel.name}`}
                title={`Preview ${channel.name}`}
                onClick={() => setPreview(channel)}
              >
                <Maximize2 size={18} aria-hidden="true" />
                <span aria-hidden="true">Preview</span>
              </button>
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${channel.name}`}
                title={`Open ${channel.name}`}
              >
                <ArrowUpRight size={21} aria-hidden="true" />
                <span aria-hidden="true">Open</span>
              </a>
              <p>{channel.description}</p>
            </article>
          );
        })}
        <article id="whatsapp" className="about-channel about-channel-whatsapp">
          <WhatsAppIcon size={30} aria-hidden="true" />
          <div className="about-channel-name">
            <h2>WhatsApp</h2>
            <span>JIC Community</span>
          </div>
          <a
            className="about-channel-join"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Preview and join in WhatsApp"
            title="Join JIC on WhatsApp"
          >
            <ArrowUpRight size={21} aria-hidden="true" />
            <span aria-hidden="true">Join</span>
          </a>
          <p>Announcements and community updates, straight to your phone.</p>
        </article>
      </div>
      {posters.length > 0 && (
        <section className="about-noticeboard" aria-labelledby="social-posters-title">
          <div className="about-section-intro">
            <p className="about-eyebrow">From the noticeboard</p>
            <h2 id="social-posters-title">Around the centre</h2>
          </div>
          <div>
            {posters.map((poster) => (
              <button
                key={poster.id}
                type="button"
                onClick={() => setImage({ url: poster.image, title: poster.title })}
              >
                <img src={poster.image} alt="" loading="lazy" />
                <span>{poster.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {preview && <SocialDialog channel={preview} video={video} onClose={() => setPreview(null)} />}
      {image && <ImageViewer image={image} onClose={() => setImage(null)} />}
    </section>
  );
}
