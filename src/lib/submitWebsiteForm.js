import { supabase } from '@/lib/supabaseClient';

export async function submitWebsiteForm(kind, payload) {
  const { data, error } = await supabase.functions.invoke('submit-form', {
    body: { kind, payload },
  });
  if (error) {
    let message;
    try {
      message = (await error.context?.json())?.error;
    } catch {
      /* Gateway errors may not be JSON. */
    }
    throw new Error(
      message || 'Your form could not be saved. Please try again or contact the centre.',
    );
  }
  if (!data?.ok) throw new Error(data?.error || 'Your form could not be saved.');
}
