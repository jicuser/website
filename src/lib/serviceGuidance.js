import { SERVICE_JOURNEYS } from '../content/serviceJourneys.js';

export const journeyForPath = (path) =>
  SERVICE_JOURNEYS[
    {
      '/funerals': 'funeral',
      '/services/nikah': 'nikah',
      '/services/community': 'community',
    }[path]
  ];
export function guidanceQuestions(value, fallback = []) {
  if (!Array.isArray(value))
    return fallback.map(([question, answer]) => ({ question, answer, enabled: true }));
  return value
    .slice(0, 8)
    .filter(
      (item) =>
        item &&
        item.enabled !== false &&
        typeof item.question === 'string' &&
        item.question.trim() &&
        typeof item.answer === 'string' &&
        item.answer.trim(),
    );
}
