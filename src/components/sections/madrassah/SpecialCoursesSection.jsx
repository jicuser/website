import React from 'react';
import { Award, BookOpen, GraduationCap } from 'lucide-react';
const topics = [
  [BookOpen, 'Tajweed', 'Ask about the rules of Qur’an recitation and finding a suitable class.'],
  [Award, 'Hifz', 'Discuss Qur’an memorisation, previous learning and the commitment involved.'],
  [
    GraduationCap,
    'Arabic for beginners',
    'Ask about introductory Arabic for reading and understanding Islamic texts.',
  ],
];
export default function SpecialCoursesSection() {
  return (
    <details className="jic-details-section">
      <summary>Further learning: Tajweed, Hifz & Arabic</summary>
      <div>
        <p>Availability, duration and entry requirements need confirmation with the Madrassah.</p>
        <ul className="jic-information-list">
          {topics.map(([Icon, title, description]) => (
            <li key={title}>
              <Icon size={22} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
