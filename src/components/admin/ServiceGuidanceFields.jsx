import React from 'react';
import { guidanceQuestions } from '@/lib/serviceGuidance';

export default function ServiceGuidanceFields({ value, journey, onChange }) {
  const questions = Array.isArray(value) ? value : guidanceQuestions(undefined, journey.faqs);
  const patch = (index, values) =>
    onChange(questions.map((item, offset) => (offset === index ? { ...item, ...values } : item)));
  return (
    <details className="service-guidance-editor">
      <summary>Guided help questions · {questions.length}</summary>
      <p>Visitors choose a question and see the answer before opening an enquiry form.</p>
      {questions.map((item, index) => (
        <details key={index} name="service-guidance-question">
          <summary>
            {item.question || `Question ${index + 1}`}
            {item.enabled === false ? ' · Hidden' : ''}
          </summary>
          <label className="admin-check">
            <input
              type="checkbox"
              role="switch"
              checked={item.enabled !== false}
              onChange={(event) => patch(index, { enabled: event.target.checked })}
            />
            Show this question
          </label>
          <label>
            Question
            <input
              maxLength={160}
              value={item.question}
              onChange={(event) => patch(index, { question: event.target.value })}
            />
          </label>
          <label>
            Helpful answer
            <textarea
              rows={3}
              maxLength={2000}
              value={item.answer}
              onChange={(event) => patch(index, { answer: event.target.value })}
            />
          </label>
          <button
            className="admin-button"
            type="button"
            onClick={() => onChange(questions.filter((_, offset) => offset !== index))}
          >
            Remove question
          </button>
        </details>
      ))}
      <button
        type="button"
        className="admin-button"
        disabled={questions.length >= 8}
        onClick={() => onChange([...questions, { question: '', answer: '', enabled: true }])}
      >
        Add guidance question
      </button>
    </details>
  );
}
