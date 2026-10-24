import React from 'react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

const features = [
  {
    icon: <BookOpen size={20} aria-hidden="true" />,
    title: 'Qur’an & Islamic studies',
    description:
      'Ask about Qur’an recitation, memorisation, Islamic studies and Arabic learning for your child.',
  },
  {
    icon: <GraduationCap size={20} aria-hidden="true" />,
    title: 'Find a suitable class',
    description:
      'Tell the Madrassah your child’s age and previous learning so the team can advise on the next step.',
  },
  {
    icon: <Users size={20} aria-hidden="true" />,
    title: 'Support for families',
    description:
      'Discuss any learning, access or communication needs with the team before enrolment.',
  },
];

const AboutSection = () => (
  <details className="jic-details-section">
    <summary>About our Madrassah</summary>
    <div>
      <p>
        Islamic learning for children and young people, with a focus on Qur’anic studies, Islamic
        knowledge and character. Contact the Madrassah to discuss current classes.
      </p>
      <ul className="jic-information-list">
        {features.map((feature) => (
          <li key={feature.title}>
            {feature.icon}
            <div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </details>
);

export default AboutSection;
