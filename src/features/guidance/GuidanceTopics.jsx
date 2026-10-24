import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import GuidancePanel from './GuidancePanel';
import { GUIDANCE_TOPICS } from './journeys';

const icons = {
  cv: FileText,
  work: Briefcase,
  learning: GraduationCap,
  skills: Wrench,
  wellbeing: Heart,
  practical: Home,
  grief: Leaf,
  people: Users,
  safety: ShieldCheck,
  browse: BookOpen,
};

export default function GuidanceTopics({ journeyId }) {
  const topics = GUIDANCE_TOPICS[journeyId];
  const [selected, setSelected] = useState(0);
  const [guiding, setGuiding] = useState(false);
  const startButton = useRef(null);
  const detailsId = useId();
  const topic = topics[selected];
  useEffect(() => {
    const clear = () => {
      setSelected(0);
      setGuiding(false);
    };
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  return (
    <section className="guidance-topics" aria-label="Choose a topic">
      <div className="guidance-topic-choices" role="group" aria-label="Topics">
        {topics.map(({ label, icon, node }, index) => {
          const Icon = icons[icon] || Compass;
          return (
            <button
              key={node}
              type="button"
              aria-pressed={selected === index}
              aria-controls={detailsId}
              onClick={() => {
                setSelected(index);
                setGuiding(false);
              }}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="guidance-topic-detail" id={detailsId}>
        {guiding ? (
          <GuidancePanel
            journeyId={journeyId}
            initialNode={topic.node}
            defaultOpen
            onClose={() => {
              setGuiding(false);
              requestAnimationFrame(() => startButton.current?.focus());
            }}
          />
        ) : (
          <>
            <h2>{topic.label}</h2>
            <p>{topic.description}</p>
            <button
              ref={startButton}
              type="button"
              className="guidance-start"
              onClick={() => setGuiding(true)}
            >
              Guide me <ArrowRight size={17} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
