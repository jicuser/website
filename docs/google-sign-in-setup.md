# Google sign-in for JIC

The production project's public Auth settings were checked on 18 October 2026:
`external.google` is `false`; email sign-in is enabled. The website already checks
this setting and starts Google OAuth only when the provider is enabled.

## Connect the provider

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), use
   JIC's organisation-owned project and create or select an OAuth **Web application**
   client. Configure the consent screen for Jamatia Islamic Centre and the intended
   public audience. Request only `openid`, email and profile scopes.
2. Add these authorised JavaScript origins:
   - `https://jicmasjid.org`
   - `https://www.jicmasjid.org`
3. Add this exact authorised redirect URI:
   `https://pwhtguaevhlnzytneemp.supabase.co/auth/v1/callback`
4. Open [Google provider settings for the production project](https://supabase.com/dashboard/project/pwhtguaevhlnzytneemp/auth/providers?provider=Google).
   Enter the web client ID and client secret there, enable Google, and save. Keep
   the client secret out of the repository, browser environment and chat.
5. In [Supabase URL configuration](https://supabase.com/dashboard/project/pwhtguaevhlnzytneemp/auth/url-configuration),
   check that the Site URL is `https://jicmasjid.org` and the redirect allowlist
   permits `https://jicmasjid.org/portal` and `https://jicmasjid.org/portal**` for
   the portal's `next` query. The application restricts that query to known local
   account destinations and canonicalises www returns to the apex domain.

## Verify

- Confirm the public `/auth/v1/settings` response reports `external.google: true`.
- Open `/portal` and use **Continue with Google** with a real consenting account.
  Confirm the consent screen identifies JIC and the return goes to JIC, rather
  than a hosting provider's login screen.
- Repeat from `/portal?next=%2Faccount%2Fcertificates` and confirm the expected
  account destination. Existing account activation and staff permissions still apply.
- Verify a public account outside Google's test-user list can sign in once the
  Google app has the appropriate production audience configuration.

The current connected tools can inspect the project and its public provider
availability, but do not expose Auth provider configuration or Google Cloud
OAuth client management. No provider settings were changed by this UI release.

Reference: [Supabase Google sign-in setup](https://supabase.com/docs/guides/auth/social-login/auth-google).
