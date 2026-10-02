# Reusable image uploads

`src/lib/imageUpload.js` accepts a storage client and optional bucket name through
`createImageUploader(client, bucket)`. The returned async function accepts a file
and folder and returns the public URL after a successful upload.

The service preserves this website's existing JPEG/PNG/WebP formats and 8 MB limit.
It validates the declared type against the file signature, rejects invalid folder
paths, generates filenames independently of the original name, and disables
overwriting. Storage errors are propagated to the existing editor error states.
Signature checks are not malware scanning or image re-encoding. Storage policies
and bucket restrictions remain authoritative; this change does not modify them.

Admin, inline content, posters, page sections, page images, home tiles and TV preset
uploads use the same service. Profile photo previews retain synchronous validation;
the actual upload passes through the stricter shared service.

This is the compatible upload-hardening portion of the October archive work,
adapted to the current repository. The archive's older auth, roles, admin shell,
schema and CSS were deliberately not copied over the newer implementations.
No database migration or Edge Function redeployment is required for this change.
