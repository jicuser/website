/** Merge records only when they share a poster identity; recurring event dates stay distinct. */
export function programmeFeed(events, posters) {
  const used = new Set();
  const items = events.map((event) => {
    const poster = posters.find(
      (item) =>
        item.id === event.source_poster_id || (event.poster_url && item.image === event.poster_url),
    );
    if (poster) used.add(poster.id);
    return {
      ...poster,
      ...event,
      id: `event:${event.id}`,
      title: event.title,
      image: event.poster_url || poster?.image,
      isEvent: true,
      to: event.registration_url || poster?.to || '',
      schedule: poster?.schedule || '',
    };
  });
  return [
    ...items,
    ...posters
      .filter((item) => !used.has(item.id))
      .map((item) => ({ ...item, id: `poster:${item.id}` })),
  ];
}
