import React, { useEffect, useId, useState } from 'react';
import {
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
  const detailsId = useId();
  const topic = topics[selected];
  useEffect(() => {
    const clear = () => {
      setSelected(0);
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
              }}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="guidance-topic-detail" id={detailsId}>
        <GuidancePanel
          key={topic.node}
          journeyId={journeyId}
          initialNode={topic.node}
          defaultOpen
        />
      </div>
    </section>
  );
}
