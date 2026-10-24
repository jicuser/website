import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingQuestions, bookingPayload } from '../src/features/nikah/booking.js';
import {
  readNikahVenue,
  venueImageUrl,
  NIKAH_AREAS,
  VENUE_PHOTO_LIMIT,
} from '../src/features/nikah/venue.js';
import { formSteps, formStepProblem } from '../src/lib/smartForm.js';

const schema = {
  fields: [
    { id: 'name', type: 'text', label: 'Your name', required: true },
    { id: 'email', type: 'email', label: 'Email', required: true },
    { id: 'preferred_date', type: 'date', label: 'Preferred date' },
    { id: 'message', type: 'textarea', label: 'How can we help?', required: true },
  ],
};
const answers = {
  name: 'Example visitor',
  email: 'visitor@example.test',
  preferred_date: '2027-03-20',
  message: 'Please confirm arrangements.',
};

test('Nikah and hall questions keep the published rules, branch by booking and store a single enquiry', () => {
  const questions = bookingQuestions(schema.fields, 'both');
  assert.equal(formSteps(questions.fields)[0].fields[0].id, 'preferred_date');
  assert.ok(questions.extra.some((field) => field.id === 'jic_booking_spaces'));
  assert.ok(
    !bookingQuestions(schema.fields, 'nikah').extra.some(
      (field) => field.id === 'jic_booking_spaces',
    ),
  );
  for (const field of schema.fields)
    assert.equal(
      questions.fields.find((item) => item.id === field.id),
      field,
    );
  const payload = bookingPayload(
    schema,
    {
      ...answers,
      jic_booking_guests: 80,
      jic_booking_spaces: ['Ladies’ hall', 'Kitchen & serving area'],
    },
    'both',
  );
  assert.deepEqual(Object.keys(payload).sort(), Object.keys(answers).sort());
  assert.equal(payload.preferred_date, answers.preferred_date);
  assert.match(
    payload.message,
    /^Booking: Nikah & hall\nApproximate number of guests: 80\nWhich spaces would you like\?: Ladies’ hall, Kitchen & serving area\n\nPlease confirm arrangements\.$/,
  );
  assert.equal(
    bookingPayload(schema, answers, 'hall').message,
    'Booking: Hall only\n\nPlease confirm arrangements.',
  );
  assert.deepEqual(bookingPayload(schema, answers, undefined), answers);
});

test('booking questions reject invalid answers and never weaken mandatory published questions', () => {
  const questions = bookingQuestions(schema.fields, 'nikah');
  for (const value of [-1, 0, 2.5, '80']) {
    assert.throws(
      () => bookingPayload(schema, { ...answers, jic_booking_guests: value }, 'nikah'),
      /Check Approximate/,
    );
    assert.ok(formStepProblem(questions.fields, { ...answers, jic_booking_guests: value }));
  }
  assert.throws(
    () => bookingPayload(schema, { ...answers, email: '' }, 'both'),
    /Email is required/,
  );
  assert.throws(
    () => bookingPayload(schema, { ...answers, message: '' }, 'both'),
    /How can we help\? is required/,
  );
  assert.throws(
    () => bookingPayload(schema, { ...answers, jic_booking_spaces: ['Unknown room'] }, 'both'),
    /Check Which/,
  );
  assert.throws(
    () => bookingPayload(schema, { ...answers, preferred_date: '2027-02-30' }, 'both'),
    /Check Preferred/,
  );
  assert.throws(
    () => bookingPayload(schema, { ...answers, message: 'x'.repeat(6000) }, 'nikah'),
    /Check How/,
  );
});

test('customised forms retain branches and do not duplicate guest fields or exceed the field limit', () => {
  const fields = [
    ...schema.fields,
    { id: 'attendees', type: 'number', label: 'Guests', required: true },
    { id: 'access', type: 'select', label: 'Access help?', options: ['Yes', 'No'] },
    {
      id: 'access_details',
      type: 'text',
      label: 'Access details',
      show_when: { field: 'access', operator: 'equals', value: 'Yes' },
    },
  ];
  assert.ok(
    !bookingQuestions(fields, 'both').extra.some((field) => field.id === 'jic_booking_guests'),
  );
  const payload = bookingPayload(
    { fields },
    {
      ...answers,
      attendees: 40,
      access: 'No',
      access_details: 'Stale private answer',
      jic_booking_spaces: ['Men’s hall'],
    },
    'both',
  );
  assert.ok(!JSON.stringify(payload).includes('Stale private answer'));
  const full = [
    ...schema.fields,
    ...Array.from({ length: 36 }, (_, i) => ({
      id: `extra_${i}`,
      type: 'text',
      label: `Extra ${i}`,
    })),
  ];
  assert.equal(bookingQuestions(full, 'both').fields.length, 40);
  assert.equal(bookingQuestions(full, 'both').extra.length, 0);
  assert.throws(
    () =>
      bookingPayload(
        { fields: schema.fields.filter((field) => field.type !== 'textarea') },
        answers,
        'both',
      ),
    /contact the centre/,
  );
});

test('venue data only accepts bounded real image URLs and keeps each photo category separate', () => {
  for (const raw of [null, 'broken JSON', [], '{}']) {
    const venue = readNikahVenue(raw);
    assert.deepEqual(
      Object.keys(venue),
      NIKAH_AREAS.map((area) => area.id),
    );
    assert.ok(
      Object.values(venue).every(
        (area) => area.visible && area.photos.length === 0 && !area.description,
      ),
    );
  }
  for (const value of [
    'javascript:alert(1)',
    'data:image/svg+xml,x',
    '//example.test/a.jpg',
    'https://user:password@example.test/a.jpg',
    '/\\example.test/a.jpg',
    'http://example.test/a.jpg',
  ])
    assert.equal(venueImageUrl(value), '');
  const venue = readNikahVenue({
    parking: {
      visible: false,
      description: 'x'.repeat(1500),
      photos: Array.from({ length: 9 }, (_, i) => ({
        url: `/parking-${i}.jpg`,
        alt: 'a'.repeat(300),
      })),
    },
    decorations: {
      photos: [
        { url: 'javascript:alert(1)' },
        { url: 'https://example.test/real.jpg', alt: 'Previous setup' },
      ],
    },
  });
  assert.equal(venue.parking.visible, false);
  assert.equal(venue.parking.description.length, 1200);
  assert.equal(venue.parking.photos.length, VENUE_PHOTO_LIMIT);
  assert.equal(venue.parking.photos[0].alt.length, 200);
  assert.deepEqual(venue.decorations.photos, [
    { url: 'https://example.test/real.jpg', alt: 'Previous setup' },
  ]);
  assert.equal(venue.mens_hall.photos.length, 0);
});
