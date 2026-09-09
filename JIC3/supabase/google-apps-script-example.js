/**
 * Google Apps Script — paste into a new project, deploy as Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Bind to a Google Sheet: Extensions → Apps Script, set SPREADSHEET_ID and SHEET_NAME.
 * The deployed URL goes in VITE_ITIKAAF_SHEETS_WEBHOOK_URL in your .env
 */

const SPREADSHEET_ID = 'YOUR_SHEET_ID_FROM_URL';
const SHEET_NAME = 'Registrations';

function doPost(e) {
	try {
		const body = JSON.parse(e.postData.contents);
		const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
		if (!sheet.getLastColumn()) {
			sheet.appendRow([
				'attendee_name',
				'attendee_age',
				'attendee_address',
				'attendee_phone',
				'attendee_email',
				'emergency_contact_name',
				'emergency_contact_phone',
				'emergency_contact_relationship',
				'medical_conditions',
				'allergies',
				'medications',
				'parent_name',
				'parent_phone',
				'parent_email',
				'parent_consent_signature',
				'parent_consent_date',
				'registered_at',
			]);
		}
		sheet.appendRow([
			body.attendee_name,
			body.attendee_age,
			body.attendee_address,
			body.attendee_phone,
			body.attendee_email,
			body.emergency_contact_name,
			body.emergency_contact_phone,
			body.emergency_contact_relationship,
			body.medical_conditions,
			body.allergies,
			body.medications,
			body.parent_name,
			body.parent_phone,
			body.parent_email,
			body.parent_consent_signature,
			body.parent_consent_date,
			body.registered_at,
		]);
		return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
			ContentService.MimeType.JSON,
		);
	} catch (err) {
		return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
			.setMimeType(ContentService.MimeType.JSON)
			.setResponseCode(500);
	}
}

function doOptions() {
	return ContentService.createTextOutput('')
		.setMimeType(ContentService.MimeType.TEXT)
		.setResponseCode(204);
}
