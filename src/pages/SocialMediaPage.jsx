import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { ExternalLink, Play } from 'lucide-react';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import useCommunityLink from '@/hooks/useCommunityLink';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { youtubeEmbedUrl } from '@/lib/video';

export default function SocialMediaPage() {
  const whatsapp = useCommunityLink();
  const { livestream } = useHomeLiveContent();
  const [preview, setPreview] = useState(null);
  const video = youtubeEmbedUrl(livestream?.stream_url);
  return (
    <section className="jic-social-page" aria-labelledby="social-title">
      <Helmet>
        <title>Social Media | Jamatia Islamic Centre</title>
      </Helmet>
      <header className="jic-social-intro">
        <p className="jic-social-eyebrow">Stay connected</p>
        <h1 id="social-title">Our community, wherever you are.</h1>
        <p>Browse our official channels for talks, photos, reminders and news.</p>
      </header>
      <nav className="jic-social-jump" aria-label="Social channels">
        {SOCIAL_CHANNELS.map(({ id, name }) => (
          <a key={id} href={`#${id}`} data-glass="clear">
            {name}
          </a>
        ))}
        <a href="#whatsapp" data-glass="clear">
          WhatsApp
        </a>
      </nav>
      <div className="jic-social-grid">
        {SOCIAL_CHANNELS.map(({ id, name, handle, description, topics, url }) => {
          const Icon = SOCIAL_ICONS[id];
          const frame =
            id === 'facebook'
              ? `https://www.facebook.com/plugins/page.php?${new URLSearchParams({ href: url, tabs: 'timeline', width: '500', height: '480', small_header: 'true', adapt_container_width: 'true', hide_cover: 'false', show_facepile: 'false' })}`
              : id === 'youtube'
                ? video
                : null;
          return (
            <article key={id} id={id} className="jic-social-card" data-glass="frosted">
              <div className="jic-social-identity">
                <Icon width={30} height={30} aria-hidden="true" />
                <div>
                  <h2>{name}</h2>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {handle}
                  </a>
                </div>
              </div>
              <p>{description}</p>
              <ul className="jic-social-topics" aria-label={`${name} overview`}>
                {topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
              <div className="jic-social-actions">
                <a href={url} data-glass="clear" target="_blank" rel="noopener noreferrer">
                  Open {name}
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
                {frame && (
                  <button
                    type="button"
                    data-glass="clear"
                    aria-expanded={preview === id}
                    aria-controls={`${id}-preview`}
                    onClick={() => setPreview(preview === id ? null : id)}
                  >
                    <Play size={16} aria-hidden="true" />
                    {preview === id ? 'Close preview' : 'Load preview'}
                  </button>
                )}
              </div>
              {frame && preview === id && (
                <div id={`${id}-preview`} className="jic-social-preview">
                  <iframe
                    src={frame}
                    title={`${name} preview`}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <p>
                    Preview unavailable?{' '}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Open {name}
                    </a>
                    . The platform may ask you to sign in.
                  </p>
                </div>
              )}
            </article>
          );
        })}
        <article id="whatsapp" className="jic-social-card" data-glass="frosted">
          <div className="jic-social-identity">
            <WhatsAppIcon size={30} />
            <h2>WhatsApp Community</h2>
          </div>
          <p>Receive official JIC announcements and programme updates.</p>
          <a
            className="jic-community-join"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join WhatsApp <ExternalLink size={16} aria-hidden="true" />
          </a>
        </article>
      </div>
    </section>
  );
}
