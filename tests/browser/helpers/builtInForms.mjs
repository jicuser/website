export const CONTACT_FORM = {
  id: '30000000-0000-4000-8000-000000000001',
  slug: 'contact-us',
  title: 'Contact Us',
  description: 'Send a message to the centre.',
  version: 1,
  schema: {
    fields: [
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'email', label: 'Email address', type: 'email', required: true },
      { id: 'question', label: 'Your message', type: 'textarea', required: true },
    ],
  },
};

export const CONTACT_RECEIPT = '30000000-0000-4000-8000-000000000002';
