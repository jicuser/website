import { readFileSync, readdirSync } from 'node:fs';

const directory = new URL('../../supabase/migrations/', import.meta.url);
export const funeralMigration = readFileSync(
  new URL(
    readdirSync(directory).find((file) => file.endsWith('_funeral_booking_questions.sql')),
    directory,
  ),
  'utf8',
);
export const funeralSchema = JSON.parse(funeralMigration.split('$schema$')[1]);
export const funeralForm = {
  slug: 'funeral-enquiry',
  title: 'Arrange a funeral',
  version: 2,
  description:
    'Tell us what you need. Our team will contact you to confirm availability, costs and arrangements.',
  schema: funeralSchema,
};
