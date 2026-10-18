import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, Check } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';

const paths = [
  {
    id: 'children',
    label: 'For children',
    title: 'A thoughtful start for young learners',
    description:
      'Explore Madrassah learning, ask about the right group for your child and take the next step with our team.',
    points: [
      'Qur’an reading and recitation',
      'Islamic knowledge and everyday practice',
      'Enrolment guidance from the Madrassah',
    ],
    to: '/madrassah',
    action: 'Explore the Madrassah',
    icon: GraduationCap,
  },
  {
    id: 'adults',
    label: 'For adults',
    title: 'Make time for your learning',
    description:
      'Find classes, talks and opportunities to deepen your understanding. Check the current programme and ask which sessions are right for you.',
    points: [
      'Current classes and gatherings',
      'Programme details in one place',
      'A clear way to enquire or enrol',
    ],
    to: '/education/courses',
    action: 'Explore adult classes',
    icon: BookOpen,
  },
];

export default function LearningJourney() {
  const { getContent } = useContent();
  const available = paths.filter((item) => isPageVisible(getContent, item.to));
  const [selected, setSelected] = useState('children');
  const tabs = useRef([]);
  const current = available.find((item) => item.id === selected) || available[0];
  if (!current) return null;
  const Icon = current.icon;
  function move(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % available.length;
    else if (event.key === 'ArrowLeft') next = (index + available.length - 1) % available.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = available.length - 1;
    else return;
    event.preventDefault();
    setSelected(available[next].id);
    tabs.current[next]?.focus();
  }
  return (
    <section
      className="jic-experience jic-learning-experience"
      aria-labelledby="home-learning-title"
    >
      <div className="jic-experience-heading">
        <span className="jic-section-label">
          <BookOpen size={15} aria-hidden="true" /> Learning at JIC
        </span>
        <h2 id="home-learning-title">
          Learning for every <em>stage of life.</em>
        </h2>
        <p>A first lesson. A deeper understanding. A place to keep growing.</p>
      </div>
      <div className="jic-learning-layout">
        <div className="jic-learning-copy">
          <div className="jic-choice-tabs" role="tablist" aria-label="Choose your learning path">
            {available.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`learning-tab-${item.id}`}
                aria-selected={current.id === item.id}
                aria-controls="home-learning-panel"
                tabIndex={current.id === item.id ? 0 : -1}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                onClick={() => setSelected(item.id)}
                onKeyDown={(event) => move(event, index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            id="home-learning-panel"
            role="tabpanel"
            aria-labelledby={`learning-tab-${current.id}`}
          >
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <ul className="jic-feature-points">
              {current.points.map((point) => (
                <li key={point}>
                  <Check size={17} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <Link className="jic-text-link" to={current.to}>
              {current.action} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="jic-learning-visual" aria-hidden="true">
          <div className="jic-visual-orbit" />
          <div className="jic-learning-notebook">
            <div className="jic-notebook-top">
              <span>JIC · Learning</span>
              <BookOpen size={20} />
            </div>
            <div className="jic-notebook-symbol">
              <Icon size={42} strokeWidth={1.3} />
            </div>
            <strong>
              {current.label === 'For children'
                ? 'Small steps.\nLasting foundations.'
                : 'Room to learn.\nSpace to grow.'}
            </strong>
            <span className="jic-notebook-rule" />
            {current.points.slice(0, 2).map((point) => (
              <p key={point}>
                <Check size={14} />
                {point}
              </p>
            ))}
          </div>
          <div className="jic-visual-note">
            <HeartHandshake size={21} />
            <span>
              Find your next step<small>With guidance from our team</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
