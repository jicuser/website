/** Public guidance describes the enquiry process; the office confirms arrangements. */
export const SERVICE_JOURNEYS = {
  community: {
    eyebrow: 'A place to belong',
    title: 'Community support at JIC',
    intro:
      'Find an activity, offer your time or ask the centre about support. Tell us what you need so the team can help you take the next step.',
    action: 'Start a community enquiry',
    subject: 'Community support enquiry',
    steps: [
      [
        'Choose your starting point',
        'You might be looking for an activity, a volunteering opportunity or someone to speak to about support.',
      ],
      [
        'Tell the team',
        'Send a short message about what you need or the time and skills you would like to offer.',
      ],
      [
        'Agree the next step',
        'The office will explain current opportunities, availability and who can help with your enquiry.',
      ],
    ],
    checklist: [
      'Your name and the best way to reach you',
      'The activity or support you are asking about',
      'Your availability, if you would like to volunteer',
      'Any access or communication needs you want us to know',
    ],
    note: 'A short message is enough to start. Share only the details needed for your enquiry.',
    faqs: [
      [
        'Where can I see current activities?',
        'Visit the Youth and Education pages for published activities and classes. Ask the office if you are unsure which is suitable.',
      ],
      [
        'Can I offer a particular skill?',
        'Yes. Tell the team what you can help with and when you are available. They will discuss suitable opportunities and any checks required.',
      ],
      ['Do I need to sign in?', 'No. The enquiry below is open to visitors without an account.'],
    ],
    related: [
      { title: 'Youth at JIC', description: 'Explore activities and learning.', to: '/youth' },
      { title: 'Adult education', description: 'Find a class or course.', to: '/education' },
    ],
  },
  funeral: {
    eyebrow: 'Here when you need us',
    title: 'Janazah & funeral support',
    intro:
      'A clear first step at a difficult time. Speak to the centre about Janazah arrangements and the support your family needs.',
    action: 'Ask for funeral support',
    subject: 'Janazah / funeral support',
    steps: [
      [
        'Speak to the centre',
        'Tell us who to contact, where support is needed and any arrangements already in place. For a time-sensitive enquiry, call the office.',
      ],
      [
        'Agree the arrangements',
        'The team will discuss what JIC can help with and what needs to be coordinated with your funeral director. Confirm the date, location and any costs directly.',
      ],
      [
        'Share confirmed details',
        'Once arrangements are agreed, share the Janazah time and location with family. Use the prayer guide if you would like help preparing.',
      ],
    ],
    checklist: [
      'A family contact name and telephone number',
      'Where the deceased is currently being cared for',
      'Your funeral director’s details, if appointed',
      'Any proposed date, location or immediate questions',
    ],
    note: 'You do not need all these details before getting in touch.',
    faqs: [
      [
        'Do I need a JIC account?',
        'No. You can call or send the enquiry below without signing in.',
      ],
      [
        'Does sending a message confirm a Janazah time?',
        'No. Please wait for the team to confirm arrangements before sharing a time or location.',
      ],
      [
        'Can I ask about practical arrangements?',
        'Yes. Tell the office what has already been arranged and what you need help with. They can explain the support available through the centre.',
      ],
    ],
    related: [
      {
        title: 'Janazah prayer guide',
        description: 'Prepare for attending the prayer.',
        to: '/worship/janazah-guide',
      },
      {
        title: 'Prayer times',
        description: 'Today’s start and congregation times.',
        to: '/prayer-times',
      },
    ],
  },
  nikah: {
    eyebrow: 'Begin your next chapter',
    title: 'Nikah at JIC',
    intro:
      'Plan your Nikah with a clear conversation about the date, ceremony and record. Start with an enquiry, then agree the details with the team.',
    action: 'Start a Nikah enquiry',
    subject: 'Nikah enquiry',
    steps: [
      [
        'Share your plans',
        'Tell us your preferred date, approximate guest numbers and whether you would also like to ask about the hall.',
      ],
      [
        'Check the requirements',
        'The team will confirm availability, the information and witnesses needed, any charges and the arrangements for your ceremony.',
      ],
      [
        'Confirm & prepare',
        'Confirm the agreed details with the office. Ask how your Nikah record will be issued and check the spelling of names before it is prepared.',
      ],
    ],
    checklist: [
      'Your preferred date and an alternative if possible',
      'A contact name, email and telephone number',
      'Approximate number of guests',
      'Questions about the ceremony, venue or certificate',
    ],
    note: 'Please wait for confirmation before treating a date as booked.',
    faqs: [
      [
        'Can I check a date before making arrangements?',
        'Yes. Send your preferred date and any flexibility. The office will check availability with you.',
      ],
      [
        'Is hall hire included?',
        'Ask the team about hall availability, costs and what is included. A Nikah enquiry does not reserve the hall.',
      ],
      [
        'How do I get my certificate?',
        'Ask the office about your ceremony record. The certificates guide explains requesting, viewing and sharing a JIC certificate when online requests are available.',
      ],
    ],
    related: [
      {
        title: 'Certificates',
        description: 'Request, track and view your record.',
        to: '/services/certificates',
      },
      {
        title: 'Hall booking',
        description: 'Explore dates and send a venue enquiry.',
        to: '/services/hall-booking',
      },
    ],
  },
};

export const SERVICE_CARDS = [
  {
    title: 'Janazah & funeral support',
    description: 'Who to speak to, what to prepare and how arrangements are confirmed.',
    to: '/funerals',
    icon: 'heart',
    label: 'Support for your family',
  },
  {
    title: 'Nikah',
    description: 'Ask about dates, ceremony requirements and your Nikah record.',
    to: '/services/nikah',
    icon: 'rings',
    label: 'Marriage services',
  },
  {
    title: 'Hall booking',
    description: 'View the calendar, choose a date and send your event details.',
    to: '/services/hall-booking',
    icon: 'calendar',
    label: 'Gather at JIC',
  },
  {
    title: 'Certificates',
    description: 'Find the right certificate, prepare your details and follow your request.',
    to: '/services/certificates',
    icon: 'award',
    label: 'Your JIC records',
  },
  {
    title: 'Learning',
    description: 'Explore adult courses, Madrassah and the next step to enrol.',
    to: '/services/education',
    icon: 'book',
    label: 'Learn & grow',
  },
  {
    title: 'Community support',
    description: 'Explore activities, volunteering and ways to connect with the centre.',
    to: '/services/community',
    icon: 'users',
    label: 'A connected community',
  },
];
