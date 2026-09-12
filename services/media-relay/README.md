# Optional external broadcast relay

This separate Node 24 + FFmpeg service accepts an authenticated operator's explicitly selected TV tab as WebM chunks and encodes H.264/AAC for up to two RTMP(S) destinations. It is not required for LAN camera viewing, WebRTC device inputs or local recording.

## Deployment

Use an always-on server/VPS with Docker, outbound access to the approved streaming platform hosts and enough CPU for one encode per destination. Build this directory's Dockerfile. Run behind an HTTPS reverse proxy; do not expose port 8787 directly to the internet. Configure:

| Variable            | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `SITE_ORIGIN`       | Exact public website origin, e.g. `https://lawngreen-kangaroo-881113.hostingersite.com`  |
| `SUPABASE_URL`      | The project's HTTPS URL                                                                  |
| `SUPABASE_ANON_KEY` | Public anon key; this service does **not** need the service-role key                     |
| `YOUTUBE_HOSTS`     | Exact comma-separated hosts approved for YouTube ingestion; defaults are in `server.mjs` |
| `TIKTOK_HOSTS`      | Exact ingestion hosts issued by the account's Live Studio; disabled when blank           |
| `MAX_SESSIONS`      | Maximum concurrent encoders, default 3                                                   |
| `PORT`              | Internal port, default 8787                                                              |

Configure HTTPS, request limits and rate limits at the reverse proxy: at most 8 MB per media request, around 10 requests/second per client with a small burst, and no caching. Set CPU/memory/process limits for the container and update the base image/FFmpeg regularly. Use a dedicated host/container user: stream keys exist in the encoder's process arguments while active and must not be exposed to other local users or process-monitoring logs.

Set website build variable `VITE_MEDIA_RELAY_URL=https://YOUR-RELAY-HOST` and rebuild. No secret belongs in a `VITE_` variable. The configured host must allow the website origin over CORS. Stream credentials are sent over HTTPS, kept in process memory only and discarded when the session stops. They are never saved in the public database, printed, or echoed in API responses.

## Operator flow

Open Admin → TV screens → selected hall → **Record or broadcast this session**. Open the TV tab, enable its audio, enter the RTMPS server and stream key, then choose the TV tab and share its audio. Confirm receiving video in YouTube/TikTok Live Studio. The site reports transport status, not proof that a platform has published the stream.

The service authenticates the Supabase user and reads their own profile under RLS for every request. Both TV and broadcasting permissions are required. A user can have one active broadcast; sessions expire after thirty seconds without media or eight hours total. Chunks are ordered and bounded. Network or encoder failure stops the output; restart explicitly. The service does not record sessions on disk.

## Validation still required before real use

Build and start the container on the chosen server, test an unlisted YouTube stream with video and audio, check disconnect/stop/revoked-permission behavior, then test the mosque's TikTok account if ingestion access is available. Neither a production relay nor a platform broadcast was started during website development.

Sources: [YouTube ingestion URLs and stream names](https://developers.google.com/youtube/v3/live/docs/liveStreams), [browser screen capture constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).
