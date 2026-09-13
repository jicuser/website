# Talk recordings, review and publication

This optional module shares one archive between the website and Flutter app. It does not record from a visitor’s microphone or continuously run on their phone.

## Included source

- Owner recording queue: upload an authorised audio file (up to 24 MB), or request 1–60 minutes of the configured live radio. Radio capture starts when the worker claims the job, so a backlog delays capture; upload a recording when exact start timing matters.
- Server worker: bounded HTTPS download, local FFmpeg conversion, timestamped transcription, draft summary and verbatim quote candidates. The worker never publishes.
- Owner review: listen, correct transcript/summary, choose quotes, independently verify references, and explicitly publish. Quran, hadith and other attributed quotes need a human-supplied reference and HTTPS source. AI output cannot supply trusted references automatically.
- Public archive: title search, bounded pages, on-demand transcript download, audio playback, reviewed reference links and deterministic PNG quote cards. Flutter uses the existing shared audio player, including background media metadata; no second player is created.
- Private audio storage: only owners can access unpublished recordings. Published audio receives a short-lived signed URL; withdrawal prevents new URLs. Already downloaded/shared material and issued URLs cannot be instantly recalled.

## Deploy after staging checks

Apply `20260913111515_sermon_archive.sql` after the community workspace migration. Mount the website archive and owner portal supplied in `Sermons.jsx`; the Flutter archive is `SermonArchivePage(state, state.radio)`. Keep the workspace rollout flag disabled until its migrations are present.

Build the worker image from `services/sermon-worker/` and run it as a one-shot scheduled container. It claims at most one job, processes it and exits. An example scheduler can start a container every minute with a 90-minute process timeout. Do not expose the worker as a public HTTP endpoint. Limit scheduler concurrency and set provider spending limits appropriate to the organisation.

Supply server-only environment variables:

| Variable                     | Purpose                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `SUPABASE_URL`               | The existing project HTTPS URL                                                     |
| `SUPABASE_SERVICE_ROLE_KEY`  | Worker database/storage access; never a client setting                             |
| `OPENAI_API_KEY`             | Project-scoped provider credential                                                 |
| `OPENAI_SUMMARY_MODEL`       | A model available to your account with Responses structured output support         |
| `OPENAI_TRANSCRIPTION_MODEL` | Default `whisper-1`; any override must support `verbose_json` segment timestamps   |
| `RADIO_SOURCE_URL`           | Exact HTTPS direct audio endpoint configured by the operator; no user-entered URLs |

Use the new organisation’s provider accounts. Source uploads and radio capture are affirmative owner actions. Confirm the speaker’s recording/processing/publication permission before queueing. No real capture, paid provider request, source upload or publication was performed during implementation.

## Reliability and access

Jobs use `FOR UPDATE SKIP LOCKED`, a two-hour lease and lease ID checks on results. Failures back off and stop after three attempts; owners can explicitly retry. A persisted normalised recording is reused on retry, so processing does not silently switch to a later live talk. A crash before the recording checkpoint may require a new capture; transcription/provider requests may repeat after an interrupted request. Exactly-once provider billing is not promised.

The downloader rejects non-HTTPS URLs, credentials, nonstandard ports, redirects and private/reserved network destinations. DNS is resolved once and the validated address is pinned into the TLS request. FFmpeg only receives a local file and allows local file/pipe protocols. Input size, capture duration, conversion time, provider calls and database calls are bounded. Provider error bodies, keys and transcripts are not logged.

Published text and quotes are separate from processing drafts. Owner checks use active `profiles.is_owner`, not a display role or client claim. Service-only worker RPCs cannot be invoked by ordinary users. Public column grants exclude reviewer identity. Withdrawal keeps the draft available for correction. The operator should define a retention period and purge obsolete source uploads/failed drafts; no automatic deletion schedule is enabled by this migration.

## Validation and remaining live checks

`node --test tests/sermon-pipeline.test.mjs` covers URL/network restrictions, provider mocks, timestamps, verbatim quote validation, XML escaping, retry recording reuse, database permissions, leases, draft isolation, reference gates, publication and audio withdrawal. Flutter analysis covers the native archive and shared radio controller. A locally generated two-second tone was converted successfully by the real FFmpeg pipeline without recording a live source.

Still required in staging: a short consented recording through the real provider, container execution, signed playback/seek on Android and iOS, lock-screen metadata, sleeping/resuming playback, review edits and withdrawal, then deployment using the organisation’s credentials. Full automatic Quran/hadith source matching is not claimed: candidate extraction is automatic; source verification remains a separate editorial action.

## Provider references

The implementation follows [OpenAI file transcription](https://developers.openai.com/api/docs/guides/speech-to-text) for segment timestamps and [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for the Responses schema. Credentials and model availability must be verified for the account used at deployment.
