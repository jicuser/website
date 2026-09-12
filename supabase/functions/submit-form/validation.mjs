const schemas = {
  contact: { name: [120, true], email: [254, true], question: [4000, true] },
  madrassah: { name: [120, true], email: [254, true], phone: [40], query: [4000, true] },
  itikaaf: {
    attendee_name: [120, true], attendee_address: [1000, true], attendee_phone: [40, true],
    attendee_email: [254, true], emergency_contact_name: [120, true],
    emergency_contact_phone: [40, true], emergency_contact_relationship: [120, true],
    medical_conditions: [2000], allergies: [2000], medications: [2000],
    parent_name: [120], parent_phone: [40], parent_email: [254],
    parent_consent_signature: [120], parent_consent_date: [10],
  },
};

// Whitelist fields; visitor data stays plain text and never becomes SQL or HTML.
export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid form.');
  const schema = Object.hasOwn(schemas, body.kind) ? schemas[body.kind] : null;
  const values = body.payload;
  if (!schema || !values || typeof values !== 'object' || Array.isArray(values))
    throw new Error('Invalid form.');
  const payload = {};
  for (const [key, [limit, required]] of Object.entries(schema)) {
    const raw = values[key] ?? '';
    if (typeof raw !== 'string') throw new Error('Please check the form fields.');
    const value = raw.trim();
    if ((required && !value) || value.length > limit || value.includes('\u0000'))
      throw new Error('Please complete the required fields and shorten any very long answers.');
    if (key.endsWith('email') && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new Error('Please enter a valid email address.');
    payload[key] = value;
  }
  if (body.kind === 'itikaaf') {
    const age = values.attendee_age;
    if (!Number.isInteger(age) || age < 1 || age > 120) throw new Error('Please enter a valid age.');
    payload.attendee_age = age;
    if (age >= 11 && age <= 16) {
      if (Object.keys(schema).filter((key) => key.startsWith('parent_')).some((key) => !payload[key]))
        throw new Error('Please complete the parent or guardian consent details.');
      const date = payload.parent_consent_date;
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
        throw new Error('Please enter a valid consent date.');
    }
  }
  return { kind: body.kind, payload };
}
