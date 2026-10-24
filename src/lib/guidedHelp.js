import { HELP_RESOURCES } from '../content/guidedHelp.js';

/** Validate the whole graph before allowing it into a public journey. */
export function guidedHelpProblem(value) {
  if (!value || !Array.isArray(value.questions) || !Array.isArray(value.results))
    return 'Add questions and results.';
  if (value.questions.length > 10 || value.results.length > 16)
    return 'Use at most 10 questions and 16 results.';
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean')
    return 'Use the guided steps switch.';
  const nodes = [...value.questions, ...value.results],
    ids = new Set();
  for (const node of nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node))
      return 'Use valid questions and results.';
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(node.id || '') || ids.has(node.id))
      return 'Each question and result needs a unique ID.';
    ids.add(node.id);
    if (typeof node.title !== 'string' || !node.title.trim() || node.title.length > 160)
      return 'Give each question and result a short title.';
  }
  if (!value.questions.some((q) => q.id === value.start)) return 'Choose a starting question.';
  for (const question of value.questions) {
    if (
      !Array.isArray(question.choices) ||
      question.choices.length < 2 ||
      question.choices.length > 6
    )
      return 'Each question needs 2–6 choices.';
    const choices = new Set();
    for (const choice of question.choices) {
      if (
        !choice ||
        typeof choice.id !== 'string' ||
        !/^[a-z][a-z0-9-]{0,63}$/.test(choice.id) ||
        choices.has(choice.id) ||
        typeof choice.label !== 'string' ||
        !choice.label.trim() ||
        choice.label.length > 120 ||
        !ids.has(choice.next)
      )
        return 'Give each choice a unique ID, a label and a valid destination.';
      choices.add(choice.id);
    }
  }
  for (const result of value.results) {
    if (
      typeof result.body !== 'string' ||
      result.body.length > 2000 ||
      !Array.isArray(result.steps) ||
      result.steps.length > 8 ||
      result.steps.some((s) => typeof s !== 'string' || s.length > 300) ||
      !Array.isArray(result.resources) ||
      result.resources.some((id) => typeof id !== 'string' || !Object.hasOwn(HELP_RESOURCES, id))
    )
      return 'Use short result text and approved resources.';
    if (!result.body.trim() && !result.steps.length && !result.resources.length)
      return 'Each result must offer a useful next step.';
  }
  const reached = new Set(),
    visiting = new Set();
  function walk(id) {
    if (visiting.has(id)) return false;
    if (reached.has(id)) return true;
    visiting.add(id);
    reached.add(id);
    const question = value.questions.find((q) => q.id === id);
    for (const choice of question?.choices || []) if (!walk(choice.next)) return false;
    visiting.delete(id);
    return true;
  }
  if (!walk(value.start)) return 'A branch loops back on itself. Every route must reach a result.';
  if (reached.size !== nodes.length) return 'Some questions or results cannot be reached.';
  return '';
}
export function readGuidedHelp(value, fallback) {
  return value && !guidedHelpProblem(value) ? value : fallback;
}
/** A new choice replaces everything after that point; no answers leave component memory. */
export function advanceGuidance(journey, trail, choiceId) {
  const current = trail.length ? trail[trail.length - 1].next : journey.start;
  const question = journey.questions.find((q) => q.id === current);
  const choice = question?.choices.find((c) => c.id === choiceId);
  return choice ? [...trail, { question: current, choice: choice.id, next: choice.next }] : trail;
}
