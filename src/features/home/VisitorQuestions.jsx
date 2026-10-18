import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';

const questions = [
  [
    'Where can I find today’s prayer times?',
    'See the published prayer and jama’ah times on the timetable. You can also view Jummah times and the monthly timetable.',
    '/prayer-times',
    'View prayer times',
  ],
  [
    'How do I find a class for myself or my child?',
    'Explore adult classes or Madrassah learning, then contact the team to confirm the current groups, times and enrolment arrangements.',
    '/education',
    'Explore learning at JIC',
  ],
  [
    'Do I need an account to contact JIC?',
    'You can make a service enquiry without signing in.',
    '/contact',
    'Contact the office',
  ],
  [
    'Does a hall enquiry confirm my booking?',
    'An enquiry starts the conversation. The office will confirm availability, arrangements and any charges before a booking is agreed.',
    '/services/hall-booking',
    'Make a hall enquiry',
  ],
];
export default function VisitorQuestions() {
  const { getContent } = useContent();
  const visible = questions.filter(([, , to]) => isPageVisible(getContent, to));
  if (!visible.length) return null;
  return (
    <section
      className="jic-experience jic-visitor-questions"
      aria-labelledby="home-questions-title"
    >
      <div className="jic-experience-heading">
        <span className="jic-section-label">Before you visit</span>
        <h2 id="home-questions-title">
          A few questions, <em>answered.</em>
        </h2>
      </div>
      <div className="jic-question-list">
        {visible.map(([title, text, to, action]) => (
          <details key={title}>
            <summary>
              {title}
              <Plus size={20} aria-hidden="true" />
            </summary>
            <div>
              <p>{text}</p>
              <Link className="jic-text-link" to={to}>
                {action} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
