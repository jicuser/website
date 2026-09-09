import { supabase } from '@/lib/supabaseClient';

/**
 * Persists Itikaaf registration data.
 *
 * 1) If VITE_ITIKAAF_SHEETS_WEBHOOK_URL is set (Google Apps Script “web app” URL),
 *    rows are POSTed as JSON for append to a Google Sheet (Excel-compatible export).
 * 2) Otherwise inserts into Supabase table `itikaaf_registrations` (run SQL in /supabase/itikaaf_registrations.sql).
 *
 * Note: Canva does not provide a form/data API; use Sheets or Supabase and export CSV/XLSX from there.
 */
export async function submitItikaafRegistration(payload) {
	const webhook = import.meta.env.VITE_ITIKAAF_SHEETS_WEBHOOK_URL;

	if (webhook) {
		const res = await fetch(webhook, {
			method: 'POST',
			mode: 'cors',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || `Could not save to spreadsheet (${res.status})`);
		}
		return { destination: 'sheets' };
	}

	const { error } = await supabase.from('itikaaf_registrations').insert(payload);
	if (error) {
		throw new Error(
			error.message ||
				'Could not save registration. If using Supabase, create the table and RLS policy (see supabase/itikaaf_registrations.sql).',
		);
	}
	return { destination: 'supabase' };
}
