export function safeWebUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function youtubeVideoId(raw) {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      !['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
    )
      return null;
    const id =
      url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : url.searchParams.get('v') ||
          (/^\/(?:live|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : null);
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(raw) {
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
