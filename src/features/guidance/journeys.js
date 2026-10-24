/** Public navigation guidance. Answers stay in component memory; no submission or tracking. */
const link = (label, to) => ({ label, to });
const choice = (label, next, description) => ({ label, next, description });
const question = (title, choices) => ({ title, choices });
const result = (title, body, steps, links) => ({ title, body, steps, links });
const contact = link('Contact the centre', '/contact');
const programmes = link('View published programmes', '/education/programmes');
export const HELP_RESOURCES = {
  wellbeing: link('NHS mental health information', 'https://www.nhs.uk/mental-health/'),
  urgent: link(
    'NHS urgent help',
    'https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/',
  ),
  safety: link(
    'Specialist domestic abuse support',
    'https://www.gov.uk/guidance/domestic-abuse-how-to-get-help',
  ),
  cv: link(
    'National Careers Service: write a CV',
    'https://nationalcareers.service.gov.uk/careers-advice/cv-sections',
  ),
  careers: link('National Careers Service', 'https://nationalcareers.service.gov.uk/'),
  practical: link('Find local council support', 'https://www.gov.uk/find-local-council'),
};

const educationNodes = {
  start: question('Who is the learning for?', [
    choice('A child', 'child'),
    choice('An adult', 'adult'),
    choice('I’m not sure', 'explore'),
  ]),
  child: question('What would you like to do?', [
    choice('Explore Madrassah classes', 'classes'),
    choice('Apply for a place', 'enrol'),
    choice('Find parent information', 'parents'),
  ]),
  adult: result(
    'Find an adult class',
    'Compare the published courses before choosing where to register.',
    [
      'Check the subject, level and teaching times.',
      'Read the fees and any entry requirements shown.',
      'Ask the team if the page does not show current availability.',
    ],
    [link('Browse adult classes', '/education/courses'), programmes],
  ),
  classes: result(
    'Explore Madrassah learning',
    'Start with the classes page for children’s learning at JIC.',
    [
      'Check which class matches the learner’s age and experience.',
      'Confirm the timetable and fees with the Madrassah.',
      'Enrol when you are ready; an application does not confirm a place.',
    ],
    [
      link('Madrassah classes', '/madrassah/classes-courses'),
      link('Contact Madrassah', '/madrassah/contact'),
    ],
  ),
  enrol: result(
    'Prepare for pupil enrolment',
    'You can review the learning options before sending an application.',
    [
      'Have the parent or guardian contact details ready.',
      'Check class times and any information requested by the enrolment page.',
      'Wait for the team to confirm a place.',
    ],
    [
      link('Open pupil enrolment', '/madrassah/enrolment'),
      link('Review classes first', '/madrassah/classes-courses'),
    ],
  ),
  parents: result(
    'Information for parents',
    'Find class information and published Madrassah policies.',
    [
      'Use student information for the next steps.',
      'Ask Madrassah staff about your child’s particular class.',
    ],
    [
      link('Student information', '/madrassah/student-portal'),
      link('Madrassah policies', '/madrassah/policies'),
    ],
  ),
  explore: result(
    'Explore learning at JIC',
    'Look through current programmes, then ask which class would suit you.',
    [
      'Compare the subject, audience and schedule.',
      'Check any published registration instructions.',
    ],
    [programmes, contact],
  ),
};

const supportNodes = {
  start: question('What would help today?', [
    choice('Wellbeing or feeling overwhelmed', 'wellbeing'),
    choice('Food, housing or money worries', 'practical'),
    choice('Grief or bereavement', 'grief'),
    choice('Meeting people', 'connection'),
    choice('Safety or abuse concerns', 'safety'),
    choice('I’d rather browse', 'browse'),
  ]),
  wellbeing: result(
    'Find wellbeing information',
    'The NHS explains mental health support and how to access it.',
    ['Open the NHS guidance to explore support options.', 'Use urgent help if you need help now.'],
    [HELP_RESOURCES.wellbeing, HELP_RESOURCES.urgent],
  ),
  practical: result(
    'Find practical assistance',
    'Your local council can explain the support available in your area.',
    [
      'Choose your council using your postcode on GOV.UK.',
      'Look for the relevant food, housing or money support.',
      'Check the provider’s current criteria before applying.',
    ],
    [HELP_RESOURCES.practical],
  ),
  grief: question('What do you need next?', [
    choice('Arrange a Janazah', 'arrangements'),
    choice('Prepare to attend the prayer', 'prayer'),
    choice('Support with bereavement', 'bereavement'),
  ]),
  arrangements: result(
    'Speak to the centre about arrangements',
    'For a time-sensitive Janazah enquiry, call the office directly. You do not need to complete these questions first.',
    [
      'Share a family contact and any arrangements already made.',
      'Confirm the date and location with the team before sharing them.',
    ],
    [link('Janazah contacts & arrangements', '/funerals')],
  ),
  prayer: result(
    'Prepare for the Janazah prayer',
    'Open the existing prayer guide to follow the recitations.',
    [],
    [link('Read the Janazah guide', '/worship/janazah-guide')],
  ),
  bereavement: result(
    'Support through bereavement',
    'Use the NHS information to explore support with grief and loss.',
    [],
    [
      link(
        'NHS bereavement information',
        'https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/',
      ),
    ],
  ),
  connection: result(
    'Find a way to connect',
    'Browse published gatherings or explore volunteering at the centre.',
    [
      'Choose something that fits your interests and available time.',
      'Check its current schedule before visiting.',
    ],
    [programmes, link('Explore volunteering', '/get-involved/volunteer')],
  ),
  safety: result(
    'Get specialist safety support',
    'If someone is in immediate danger, call 999. You can access specialist support directly without contacting JIC.',
    [
      'Use the GOV.UK directory for domestic abuse support.',
      'If using this device is unsafe, use a safer device when possible.',
    ],
    [HELP_RESOURCES.safety, HELP_RESOURCES.urgent],
  ),
  browse: result(
    'Browse help directly',
    'Choose a resource for the support you need.',
    [],
    [HELP_RESOURCES.wellbeing, HELP_RESOURCES.practical, programmes],
  ),
};

const careersNodes = {
  start: question('What would you like to work on?', [
    choice('CV & interviews', 'preparation'),
    choice('Finding work', 'work'),
    choice('Training', 'training'),
    choice('Apprenticeships', 'apprenticeship'),
    choice('I’m not sure yet', 'explore'),
  ]),
  preparation: question('What would you like help with?', [
    choice('My CV', 'cv'),
    choice('An interview', 'interview'),
  ]),
  cv: question('Where are you starting?', [
    choice('I need my first CV', 'first-cv'),
    choice('I have a CV to improve', 'update-cv'),
  ]),
  'first-cv': result(
    'Build your first CV',
    'Start with a short outline. You can use examples from education, volunteering and practical projects.',
    [
      'List your contact details, education and experience.',
      'Add skills with a short example of how you used each one.',
      'Check the job requirements, spelling and contact details.',
    ],
    [HELP_RESOURCES.cv],
  ),
  'update-cv': result(
    'Tailor your CV to one role',
    'Use a specific job description to decide what to emphasise.',
    [
      'Put the most relevant experience and achievements first.',
      'Update recent responsibilities and remove outdated information.',
      'Read it through and check your contact details.',
    ],
    [HELP_RESOURCES.cv],
  ),
  interview: result(
    'Prepare for your interview',
    'Build a small set of examples you can explain clearly.',
    [
      'Read the job description and research the employer.',
      'Practise explaining a task, what you did and the outcome.',
      'Prepare questions and check the time, location or joining link.',
    ],
    [
      link(
        'National Careers Service: interviews',
        'https://nationalcareers.service.gov.uk/careers-advice/interview-advice',
      ),
    ],
  ),
  work: result(
    'Take the next step towards work',
    'Start with one type of role and a manageable application plan.',
    [
      'Compare job descriptions to identify the skills employers ask for.',
      'Tailor your CV and keep track of applications.',
      'Use official careers advice to explore unfamiliar roles.',
    ],
    [HELP_RESOURCES.careers, link('Find a job on GOV.UK', 'https://www.gov.uk/find-a-job')],
  ),
  training: result(
    'Compare training routes',
    'Look at the skills, entry requirements and time needed before applying.',
    [
      'Compare courses and apprenticeships for your chosen role.',
      'Check fees, funding and eligibility with the provider.',
      'Confirm the current closing date and how to apply.',
    ],
    [
      link('Find a course', 'https://nationalcareers.service.gov.uk/find-a-course'),
      link('Find an apprenticeship', 'https://www.gov.uk/apply-apprenticeship'),
    ],
  ),
  apprenticeship: result(
    'Find an apprenticeship',
    'Compare opportunities and check the requirements before applying.',
    [
      'Check the role, location, entry requirements and training provided.',
      'Confirm the closing date and application instructions.',
      'Prepare a CV that shows your relevant skills and experience.',
    ],
    [link('Find an apprenticeship on GOV.UK', 'https://www.gov.uk/apply-apprenticeship')],
  ),
  explore: result(
    'Explore your skills and interests',
    'The National Careers Service can help you compare roles and decide on a next step.',
    [
      'Note the tasks you enjoy and the skills you want to develop.',
      'Explore two or three roles and compare their training routes.',
    ],
    [HELP_RESOURCES.careers],
  ),
};

export const GUIDED_JOURNEYS = {
  hub: {
    title: 'Find the right place',
    description: 'Choose what you need and we’ll point you towards the next step.',
    nodes: {
      start: question('What brings you to JIC?', [
        choice('Worship or prayer times', 'worship'),
        choice('Learning', 'learning'),
        choice('Marriage or family', 'family'),
        choice('Janazah or bereavement', 'funeral'),
        choice('Support or practical help', 'support'),
        choice('Skills or work', 'careers'),
        choice('Activities or volunteering', 'community'),
        choice('Hiring the hall', 'hall'),
      ]),
      worship: result(
        'Worship & prayer',
        'Open a reading, guide or the current timetable.',
        [],
        [link('Worship resources', '/worship'), link('Salah times', '/prayer-times')],
      ),
      learning: educationNodes.explore,
      family: result(
        'Marriage & family',
        'Find Nikah preparation and the appropriate next step for family questions.',
        [],
        [
          link('Explore marriage & family', '/services/marriage-family'),
          link('Nikah arrangements', '/services/nikah'),
        ],
      ),
      funeral: supportNodes.arrangements,
      support: result(
        'Support & wellbeing',
        'Find practical help and support options.',
        [],
        [link('Find the right help', '/services/support')],
      ),
      careers: result(
        'Skills & careers',
        'Get a practical starting point for CVs, work, interviews or training.',
        [],
        [link('Explore skills & careers', '/services/skills-careers')],
      ),
      community: result(
        'Take part at JIC',
        'See published activities or ways to help.',
        [],
        [
          programmes,
          link('Volunteering', '/get-involved/volunteer'),
          link('Youth activities', '/youth'),
        ],
      ),
      hall: result(
        'Check the hall',
        'See published venue details and choose a date on the calendar. The team confirms all arrangements.',
        [],
        [link('View the hall & calendar', '/services/hall-booking')],
      ),
    },
  },
  education: {
    title: 'Help me choose learning',
    description: 'Find the right class or enrolment route.',
    nodes: educationNodes,
  },
  support: {
    title: 'Find the right help',
    description: 'Choose a topic to find support.',
    sensitive: true,
    nodes: supportNodes,
  },
  careers: {
    title: 'Find your next career step',
    description: 'CVs, interviews, work and training in one place.',
    nodes: careersNodes,
  },
  family: {
    title: 'Marriage & family support',
    description: 'Choose your need to see the relevant next steps.',
    sensitive: true,
    nodes: {
      start: question('What are you looking for?', [
        choice('Arrange a Nikah', 'nikah'),
        choice('Prepare for marriage', 'prepare'),
        choice('A family or parenting question', 'family'),
        choice('Relationship difficulties or separation', 'relationship'),
        choice('Safety or abuse concerns', 'safety'),
      ]),
      nikah: result(
        'Plan your Nikah',
        'Review the ceremony steps before deciding whether to enquire.',
        [
          'Have a preferred date and approximate guest numbers ready.',
          'Ask the office about requirements, witnesses and costs.',
          'Wait for confirmation before treating a date as booked.',
        ],
        [
          link('Nikah steps & enquiry', '/services/nikah'),
          link('Hall details', '/services/hall-booking'),
        ],
      ),
      prepare: result(
        'Prepare for marriage',
        'Write down the questions you want to discuss before making arrangements.',
        [
          'Consider expectations, responsibilities and practical plans together.',
          'Ask the Imam about religious questions and any preparation sessions currently available.',
        ],
        [contact, link('Nikah arrangements', '/services/nikah')],
      ),
      family: result(
        'Find the appropriate person to ask',
        'For a religious or parenting question, ask the office how to arrange a conversation with the Imam. Availability must be confirmed.',
        [
          'Start with the general topic; you do not need to send private family details through a general enquiry.',
          'Ask how any personal information will be handled before sharing it.',
        ],
        [contact, link('Madrassah information', '/madrassah')],
      ),
      relationship: result(
        'Choose the right kind of support',
        'Religious guidance, relationship support and legal advice are different services. Ask what support is currently available before sharing personal details.',
        [
          'Ask the Imam about religious questions.',
          'For legal questions, use a qualified adviser.',
          'For safety or abuse concerns, use specialist support directly.',
        ],
        [HELP_RESOURCES.safety, contact],
      ),
      safety: supportNodes.safety,
    },
  },
  worship: {
    title: 'Help me find a reading or guide',
    description: 'Go straight to the resource you need.',
    nodes: {
      start: question('What would you like to open?', [
        choice('Adhkar & du’as', 'adhkar'),
        choice('Qur’an', 'quran'),
        choice('Learn or refresh Salah', 'salah'),
        choice('Janazah prayer', 'janazah'),
        choice('Dala’il al-Khayrat', 'dalail'),
      ]),
      adhkar: result(
        'Read Adhkar',
        'Use the reader for Arabic, transliteration and meaning.',
        [],
        [link('Open Adhkar', '/worship/daily-duas')],
      ),
      quran: result(
        'Read Qur’an',
        'Choose a surah and continue at your own pace.',
        [],
        [link('Open the Qur’an reader', '/worship/quran')],
      ),
      salah: result(
        'Open the Salah guide',
        'Use the existing guide and ask the Imam about anything you are unsure of.',
        [],
        [
          link('Read the Salah guide', '/worship/prayer-guide'),
          link('Salah times', '/prayer-times'),
        ],
      ),
      janazah: supportNodes.prayer,
      dalail: result(
        'Dala’il al-Khayrat at JIC',
        'Find programme information and contact the centre about reading sessions.',
        [],
        [link('Programme information', '/worship/dalail-al-khayrat')],
      ),
    },
  },
  funeral: {
    title: 'Help with your next step',
    description: 'Contacts are always available without answering questions.',
    nodes: {
      start: question('What do you need help with?', [
        choice('Making arrangements', 'arrange'),
        choice('Attending the Janazah prayer', 'prayer'),
        choice('Bereavement support', 'grief'),
      ]),
      arrange: result(
        'Speak to the office',
        'For time-sensitive arrangements, call the office. You do not need every detail ready.',
        [
          'Have a family contact and any funeral director details to hand.',
          'Ask the team to confirm the date, location and any costs.',
        ],
        [link('View the enquiry options', '#enquire')],
      ),
      prayer: supportNodes.prayer,
      grief: supportNodes.bereavement,
    },
  },
  nikah: {
    title: 'Help me plan my Nikah',
    description: 'Find the relevant information before making an enquiry.',
    nodes: {
      start: question('Where are you with your plans?', [
        choice('I’m starting to plan', 'prepare'),
        choice('I want to ask about a date', 'date'),
        choice('I need my certificate', 'certificate'),
      ]),
      prepare: result(
        'Prepare your first conversation',
        'Start with your preferred date, guest numbers and questions about the ceremony.',
        [
          'Ask about availability, requirements, witnesses and costs.',
          'Check hall arrangements separately if needed.',
          'Wait for the office to confirm the booking.',
        ],
        [
          link('See the preparation checklist', '#prepare'),
          link('Explore the hall', '/services/hall-booking'),
        ],
      ),
      date: result(
        'Ask the team about your date',
        'A preferred date is an enquiry until the office confirms it.',
        [
          'Have an alternative date ready if possible.',
          'Include approximate guest numbers and whether you need the hall.',
        ],
        [link('Open enquiry options', '#enquire')],
      ),
      certificate: result(
        'Find your issued certificate',
        'When your record has been issued online, it is available through your JIC account.',
        [],
        [link('Open my certificates', '/portal?next=%2Faccount%2Fcertificates')],
      ),
    },
  },
  volunteer: {
    title: 'Find a way to help',
    description: 'Explore how your time or skills could help the centre.',
    nodes: {
      start: question('What would you like to offer?', [
        choice('Help at activities or events', 'events'),
        choice('A practical or professional skill', 'skills'),
        choice('Fundraising support', 'fundraise'),
        choice('I’m not sure yet', 'explore'),
      ]),
      events: result(
        'Ask about helping at activities',
        'Current roles and any checks will be confirmed by the team.',
        [
          'Note when you are usually available.',
          'Ask about the role, responsibilities and who will support you.',
        ],
        [link('Ask about volunteering', '/get-involved/volunteer#enquire'), programmes],
      ),
      skills: result(
        'Offer your skills',
        'You can start with a brief description of what you can help with.',
        [
          'Mention a skill and an example of using it.',
          'Include the time you can offer.',
          'Agree the work with the team before starting.',
        ],
        [link('Ask about volunteering', '/get-involved/volunteer#enquire')],
      ),
      fundraise: result(
        'Support a community campaign',
        'Explore existing campaigns or create your own fundraiser.',
        [],
        [link('View campaigns', '/fundraise'), link('Start a fundraiser', '/fundraise/new')],
      ),
      explore: result(
        'Explore ways to take part',
        'Browse published activities and ask where help is currently needed.',
        [],
        [programmes, link('Ways to help', '/get-involved')],
      ),
    },
  },
  youth: {
    title: 'Find something to take part in',
    description: 'Explore activities, learning and volunteering.',
    nodes: {
      start: question('What interests you?', [
        choice('Learning', 'learning'),
        choice('Activities & gatherings', 'activities'),
        choice('Volunteering', 'volunteer'),
        choice('I’tikaf', 'itikaf'),
      ]),
      learning: educationNodes.explore,
      activities: result(
        'See what’s on',
        'Published programmes show the current details.',
        [
          'Check the age group, dates and location.',
          'Read any registration or parent/guardian consent requirements.',
        ],
        [programmes],
      ),
      volunteer: result(
        'Explore volunteering',
        'Ask about suitable roles, supervision and any checks before taking part.',
        [],
        [link('Ways to volunteer', '/get-involved/volunteer')],
      ),
      itikaf: result(
        'Read the I’tikaf registration details',
        'Check the requirements and current registration information before applying.',
        [],
        [link('I’tikaf registration', '/youth/itikaf')],
      ),
    },
  },
  hall: {
    title: 'Help me plan a hall enquiry',
    description: 'Check what you need before choosing a date.',
    nodes: {
      start: question('What would you like to check?', [
        choice('Dates & availability', 'dates'),
        choice('Capacity, facilities or costs', 'details'),
        choice('A hall for my Nikah', 'nikah'),
      ]),
      dates: result(
        'Choose a date on the calendar',
        'The calendar shows published status. Your booking is only confirmed by the office.',
        [
          'Select a day to view its current status.',
          'Include a preferred time and approximate guest numbers in your enquiry.',
        ],
        [link('Open the calendar', '#hall-date-heading')],
      ),
      details: result(
        'Check the venue details',
        'Read any published capacity and facilities above the calendar. Ask the office for anything not listed.',
        [
          'Confirm the layout, accessibility and facilities you need.',
          'Ask for the total cost and booking conditions before committing.',
        ],
        [contact],
      ),
      nikah: result(
        'Coordinate the ceremony and the hall',
        'A Nikah enquiry does not reserve the hall.',
        [
          'Check the hall date and ceremony arrangements separately.',
          'Confirm both arrangements with the office.',
        ],
        [
          link('Open the hall calendar', '#hall-date-heading'),
          link('Nikah guidance', '/services/nikah'),
        ],
      ),
    },
  },
};

export const GUIDANCE_PAGES = {
  support: {
    title: 'Support & Wellbeing',
    intro: 'Find practical help, wellbeing information and ways to connect.',
    journey: 'support',
    links: [HELP_RESOURCES.wellbeing, HELP_RESOURCES.practical, programmes],
  },
  family: {
    title: 'Marriage & Family',
    intro: 'Nikah, preparation and family questions in one place.',
    journey: 'family',
    links: [
      link('Arrange a Nikah', '/services/nikah'),
      link('Hall hire', '/services/hall-booking'),
      link('My certificates', '/portal?next=%2Faccount%2Fcertificates'),
    ],
  },
  careers: {
    title: 'Skills & Careers',
    intro: 'Find a useful next step for work or learning.',
    journey: 'careers',
    links: [HELP_RESOURCES.cv, HELP_RESOURCES.careers],
    note: 'Guidance and external resources. For JIC activities, see the published programmes.',
  },
};

/** Short topic labels are separate from the question and result copy. */
export const GUIDANCE_TOPICS = {
  careers: [
    {
      label: 'CV & interviews',
      icon: 'cv',
      node: 'preparation',
      description: 'Start a CV, improve an existing one or prepare for an interview.',
    },
    {
      label: 'Find work',
      icon: 'work',
      node: 'work',
      description: 'Find roles, plan applications and explore careers advice.',
    },
    {
      label: 'Training',
      icon: 'learning',
      node: 'training',
      description: 'Compare courses, skills and training routes.',
    },
    {
      label: 'Apprenticeships',
      icon: 'skills',
      node: 'apprenticeship',
      description: 'Explore opportunities and prepare to apply.',
    },
  ],
  support: [
    {
      label: 'Wellbeing',
      icon: 'wellbeing',
      node: 'wellbeing',
      description: 'Find trusted information about wellbeing and accessing support.',
    },
    {
      label: 'Practical help',
      icon: 'practical',
      node: 'practical',
      description: 'Find help with food, housing or money worries.',
    },
    {
      label: 'Bereavement',
      icon: 'grief',
      node: 'grief',
      description: 'Find support with grief, Janazah arrangements or the prayer.',
    },
    {
      label: 'Meet people',
      icon: 'people',
      node: 'connection',
      description: 'Explore gatherings, activities and volunteering.',
    },
    {
      label: 'Safety concerns',
      icon: 'safety',
      node: 'safety',
      description: 'Go directly to specialist safety and domestic abuse support.',
    },
    {
      label: 'Browse help',
      icon: 'browse',
      node: 'browse',
      description: 'Choose a trusted resource without answering any questions.',
    },
  ],
  family: [
    {
      label: 'Nikah',
      icon: 'wellbeing',
      node: 'nikah',
      description: 'Review the ceremony steps and practical arrangements.',
    },
    {
      label: 'Marriage preparation',
      icon: 'learning',
      node: 'prepare',
      description: 'Prepare your questions and find the next step.',
    },
    {
      label: 'Family & parenting',
      icon: 'people',
      node: 'family',
      description: 'Find an appropriate starting point for family questions.',
    },
    {
      label: 'Relationships',
      icon: 'grief',
      node: 'relationship',
      description: 'Find information for relationship difficulties or separation.',
    },
    {
      label: 'Safety concerns',
      icon: 'safety',
      node: 'safety',
      description: 'Access specialist support directly.',
    },
  ],
};

/** Validate branches at build/test time; no executable rules are accepted from CMS. */
export function validateJourney(journey) {
  const errors = [];
  const walk = (id, ancestors = []) => {
    const node = journey.nodes[id];
    if (!node) {
      errors.push(`Missing node: ${id}`);
      return;
    }
    if (ancestors.includes(id)) {
      errors.push(`Cycle: ${id}`);
      return;
    }
    if (!node.title) errors.push(`Missing title: ${id}`);
    if (node.choices) {
      if (!node.choices.length) errors.push(`Empty question: ${id}`);
      node.choices.forEach((option) => walk(option.next, [...ancestors, id]));
    } else if (!node.links?.length && !node.steps?.length) errors.push(`Empty result: ${id}`);
  };
  walk('start');
  return [...new Set(errors)];
}
