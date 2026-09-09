The secure user-management Edge Function lives in `supabase/functions/manage-user/index.ts`.
Deploy it with the Supabase CLI after the production schema is installed:

  supabase functions deploy manage-user

Supabase automatically provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to deployed functions.
Only a logged-in `super_admin` can invite a user or change a user's role through this function.
Never expose the service-role key in Vite/React environment variables.
