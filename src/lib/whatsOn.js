/** Match explicit identity or the same poster asset; titles alone may describe different events. */
export function homeWhatsOn(events, posters, limit = 3) {
  const rows = events.map((event) => ({ ...event, kind: 'event', key: `event-${event.id}` }));
  for (const poster of posters) {
    const match = rows.find(
      (event) =>
        (event.source_poster_id && event.source_poster_id === poster.id) ||
        (event.poster_url && event.poster_url === poster.image),
    );
    if (match) {
      match.programmeTo = poster.to;
      continue;
    }
    rows.push({ ...poster, kind: poster.kind || 'poster', key: `poster-${poster.id}` });
  }
  return rows.slice(0, limit);
}
