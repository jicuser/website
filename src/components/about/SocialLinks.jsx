import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import useCommunityLink from '@/hooks/useCommunityLink';

export default function SocialLinks() {
  const whatsapp = useCommunityLink();
  return (
    <nav className="about-social-links" aria-label="JIC social channels">
      {[...SOCIAL_CHANNELS, { id: 'whatsapp', name: 'WhatsApp', url: whatsapp }].map((channel) => {
        const Icon = channel.id === 'whatsapp' ? WhatsAppIcon : SOCIAL_ICONS[channel.id];
        return (
          <a
            key={channel.id}
            id={channel.id}
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon width={22} height={22} size={22} aria-hidden="true" />
            {channel.name}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
