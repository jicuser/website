/** Approved links only: editors select a resource rather than entering a URL. */
export const HELP_RESOURCES = {
  living: {
    title: 'Birmingham cost of living support',
    href: 'https://www.birmingham.gov.uk/info/50274/cost_of_living_support',
    provider: 'Birmingham City Council',
    reviewed: '2026-10-24',
  },
  health: {
    title: 'NHS urgent mental health help',
    href: 'https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/',
    provider: 'NHS',
    reviewed: '2026-10-24',
  },
  safety: {
    title: 'Domestic abuse: how to get help',
    href: 'https://www.gov.uk/guidance/domestic-abuse-how-to-get-help',
    provider: 'GOV.UK',
    reviewed: '2026-10-24',
  },
  cv: {
    title: 'Build or improve your CV',
    href: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections',
    provider: 'National Careers Service',
    reviewed: '2026-10-24',
  },
  interview: {
    title: 'Prepare for an interview',
    href: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice',
    provider: 'National Careers Service',
    reviewed: '2026-10-24',
  },
  skills: {
    title: 'Explore your skills and careers',
    href: 'https://nationalcareers.service.gov.uk/discover-your-skills-and-careers',
    provider: 'National Careers Service',
    reviewed: '2026-10-24',
  },
  careers: {
    title: 'Careers advice and job profiles',
    href: 'https://nationalcareers.service.gov.uk/',
    provider: 'National Careers Service',
    reviewed: '2026-10-24',
  },
  adult: { title: 'Adult classes at JIC', to: '/education/courses' },
  child: { title: 'Madrassah classes & parent information', to: '/madrassah' },
  enrol: { title: 'Choose an enrolment route', to: '/education/enrolment' },
  funeral: { title: 'Janazah contacts & guidance', to: '/funerals' },
  nikah: { title: 'Nikah preparation & enquiries', to: '/services/nikah' },
  volunteer: { title: 'Volunteering at JIC', to: '/get-involved/volunteer' },
};
const choice = (id, label, next = id) => ({ id, label, next });
const result = (id, title, body, steps, resources) => ({ id, title, body, steps, resources });
export const GUIDED_HELP = {
  '/services/support': {
    enabled: true,
    start: 'need',
    questions: [
      {
        id: 'need',
        title: 'What would help you today?',
        choices: [
          choice('practical', 'Food, bills or practical help'),
          choice('wellbeing', 'Wellbeing support'),
          choice('family', 'A family or bereavement matter'),
          choice('unsure', 'I’m not sure'),
        ],
      },
      {
        id: 'family',
        title: 'Which information would be useful?',
        choices: [
          choice('bereavement', 'Janazah or bereavement'),
          choice('marriage', 'Nikah information'),
          choice('safe', 'Safety or abuse concerns'),
          choice('unsure', 'Something else / not sure'),
        ],
      },
    ],
    results: [
      result(
        'practical',
        'Find practical support in Birmingham',
        'The council directory brings together local support. Check the provider’s current eligibility and contact details before applying.',
        [
          'Choose the type of help you need.',
          'Read the provider’s requirements before sharing personal documents.',
        ],
        ['living'],
      ),
      result(
        'wellbeing',
        'Find the right health support',
        'Use the NHS resource for urgent mental health help and ways to access care. This website does not assess symptoms or provide counselling.',
        [],
        ['health'],
      ),
      result(
        'bereavement',
        'Speak to the funeral team',
        'Open JIC’s funeral guidance for the office contact and practical preparation.',
        [],
        ['funeral'],
      ),
      result(
        'marriage',
        'Prepare for a Nikah enquiry',
        'Read the ceremony information and preparation checklist before requesting a date.',
        [],
        ['nikah'],
      ),
      result(
        'safe',
        'Find specialist help',
        'Use the government resource to find specialist support. Do not put sensitive details into a general centre enquiry.',
        [],
        ['safety'],
      ),
      result(
        'unsure',
        'Start with the information you need',
        'These resources explain the help available. JIC does not currently offer a confidential support-case submission on this page.',
        [],
        ['living', 'health', 'safety'],
      ),
    ],
  },
  '/services/skills-careers': {
    enabled: true,
    start: 'task',
    questions: [
      {
        id: 'task',
        title: 'What would you like to work on?',
        choices: [
          choice('cv-stage', 'My CV'),
          choice('interview', 'An interview'),
          choice('direction', 'Skills or a career direction'),
          choice('learning', 'Classes at JIC'),
          choice('unsure', 'I’m not sure'),
        ],
      },
      {
        id: 'cv-stage',
        title: 'Where are you with your CV?',
        choices: [
          choice('first-cv', 'Starting my first CV'),
          choice('update-cv', 'Updating a CV'),
          choice('first-cv-unsure', 'Not sure', 'first-cv'),
        ],
      },
    ],
    results: [
      result(
        'first-cv',
        'Build a first CV',
        'Use the National Careers Service guide as you put your CV together.',
        [
          'List education, experience and skills, including volunteering.',
          'Add a short introduction that fits the work you want.',
          'Check dates, spelling and contact details.',
        ],
        ['cv'],
      ),
      result(
        'update-cv',
        'Make your CV fit the role',
        'Work from the advert for the job you want.',
        [
          'Match your examples to the skills requested.',
          'Add recent experience and achievements.',
          'Remove outdated details and check the final version.',
        ],
        ['cv'],
      ),
      result(
        'interview',
        'Prepare a few clear examples',
        'Use the interview guide to practise and plan ahead.',
        [
          'Read the job description and employer’s website.',
          'Choose examples of work, learning or volunteering.',
          'Check the time, location or video link.',
        ],
        ['interview'],
      ),
      result(
        'direction',
        'Explore your next step',
        'An external skills assessment and job profiles can help you explore options.',
        [],
        ['skills', 'careers'],
      ),
      result(
        'learning',
        'Find published classes',
        'Browse current adult learning and course details. Registration is available where a course has a published form.',
        [],
        ['adult'],
      ),
      result(
        'unsure',
        'Explore skills, learning and work',
        'Start with a skills assessment or browse careers information. JIC is not advertising vacancies or a CV-review appointment service here.',
        [],
        ['skills', 'careers', 'adult'],
      ),
    ],
  },
  '/education': {
    enabled: true,
    start: 'learner',
    questions: [
      {
        id: 'learner',
        title: 'Who is the learning for?',
        choices: [
          choice('child', 'A child'),
          choice('adult', 'An adult'),
          choice('unsure', 'Not sure where to start'),
        ],
      },
    ],
    results: [
      result(
        'child',
        'Explore Madrassah',
        'Read the published class and parent information before applying.',
        [],
        ['child', 'enrol'],
      ),
      result(
        'adult',
        'Find an adult class',
        'Open a course for its current details, schedule and registration status.',
        [],
        ['adult'],
      ),
      result(
        'unsure',
        'Compare the learning routes',
        'You can browse classes without creating an account or submitting an application.',
        [],
        ['child', 'adult'],
      ),
    ],
  },
};
