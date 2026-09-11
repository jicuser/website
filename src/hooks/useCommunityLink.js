import { useContent } from '@/context/ContentContext';
import { communityUrl } from '@/lib/community';

export default function useCommunityLink() {
  const { getContent } = useContent();
  return communityUrl(getContent('whatsapp_community_url', ''));
}
