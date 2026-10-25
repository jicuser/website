import React, { useRef } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Wallet,
} from 'lucide-react';

const sections = [
  ['progress', 'Progress & plans', ClipboardCheck],
  ['resources', 'Resources', BookOpen],
  ['attendance', 'Attendance', CalendarDays],
  ['meetings', 'Meetings', MessageSquare],
  ['work', 'Student work', FileText],
  ['fees', 'Fees', Wallet],
];

/** The panels remain mounted in Learning so changing tabs does not discard drafts. */
export default function LearningTabs({ value, onChange }) {
  const buttons = useRef({});
  return (
    <div
      className="learning-section-tabs"
      role="tablist"
      aria-label="Course sections"
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const current = sections.findIndex(
          ([id]) => buttons.current[id] === document.activeElement,
        );
        if (current < 0) return;
        const index =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? sections.length - 1
              : (current + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) %
                sections.length;
        event.preventDefault();
        onChange(sections[index][0]);
        buttons.current[sections[index][0]]?.focus();
      }}
    >
      {sections.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`learning-tab-${id}`}
          ref={(node) => {
            buttons.current[id] = node;
          }}
          aria-selected={value === id}
          aria-controls={`learning-panel-${id}`}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
