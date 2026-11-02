/** Interest is a request for information, never an enrolment or a payment. */
export function interestQuestions() {
  return [
    { id: 'course_interest', label: 'Which class or subject interests you?', type: 'text', required: true },
    { id: 'availability', label: 'When could you usually attend?', type: 'select', required: false,
      options: ['Weekday daytime', 'Weekday evening', 'Weekend', 'Flexible'] },
    { id: 'experience', label: 'What is your current level?', type: 'select', required: false,
      options: ['New to the subject', 'Some experience', 'More experienced', 'Not sure'] },
    { id: 'name', label: 'Your name (adult or parent/guardian)', type: 'text', required: true },
    { id: 'email', label: 'Email address', type: 'email', required: true },
  ];
}

export function classInterestDraft() {
  return {
    description: 'Tell us which class interests you and when you could attend. This is an expression of interest, not a confirmed place or a payment request. JIC will contact you about availability.',
    schema: { fields: interestQuestions() },
  };
}
