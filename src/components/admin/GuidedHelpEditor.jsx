import React, { useState } from 'react';
import { HELP_RESOURCES } from '@/content/guidedHelp';
import { guidedHelpProblem } from '@/lib/guidedHelp';
export default function GuidedHelpEditor({ value, fallback, onChange }) {
  const journey = value || fallback;
  const [selected, setSelected] = useState(journey.start);
  const question = journey.questions.find((q) => q.id === selected),
    result = journey.results.find((r) => r.id === selected);
  const nodes = [...journey.questions, ...journey.results];
  const patch = (changes) =>
    onChange({
      ...journey,
      [question ? 'questions' : 'results']: (question ? journey.questions : journey.results).map(
        (node) => (node.id === selected ? { ...node, ...changes } : node),
      ),
    });
  const problem = guidedHelpProblem(journey);
  const add = (kind) => {
    const id = `${kind}-${Date.now().toString(36)}`;
    onChange({
      ...journey,
      [kind === 'question' ? 'questions' : 'results']: [
        ...journey[kind === 'question' ? 'questions' : 'results'],
        kind === 'question'
          ? {
              id,
              title: 'New question',
              choices: [
                { id: 'yes', label: 'Yes', next: journey.results[0]?.id || journey.start },
                { id: 'unsure', label: 'Not sure', next: journey.results[0]?.id || journey.start },
              ],
            }
          : { id, title: 'New result', body: '', steps: [], resources: [] },
      ],
    });
    setSelected(id);
  };
  return (
    <details className="service-guidance-editor">
      <summary>Guided next steps · questions & results</summary>
      <p>
        Edit one step, then try the branch in the website preview. Urgent-help links remain outside
        this editor.
      </p>
      <label className="admin-check">
        <input
          type="checkbox"
          role="switch"
          checked={journey.enabled !== false}
          onChange={(e) => onChange({ ...journey, enabled: e.target.checked })}
        />
        Show guided steps
      </label>
      <label>
        Starting question
        <select
          value={journey.start}
          onChange={(e) => onChange({ ...journey, start: e.target.value })}
        >
          {journey.questions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Selected step
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {journey.questions.includes(node) ? 'Question' : 'Result'} · {node.title}
            </option>
          ))}
        </select>
      </label>
      {(question || result) && (
        <>
          <label>
            Step title
            <input
              maxLength={160}
              value={(question || result).title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          {question ? (
            <>
              {question.choices.map((choice, index) => (
                <div className="guidance-choice-editor" key={choice.id}>
                  <label>
                    Answer {index + 1}
                    <input
                      maxLength={120}
                      value={choice.label}
                      onChange={(e) =>
                        patch({
                          choices: question.choices.map((item, i) =>
                            i === index ? { ...item, label: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Go to
                    <select
                      value={choice.next}
                      onChange={(e) =>
                        patch({
                          choices: question.choices.map((item, i) =>
                            i === index ? { ...item, next: e.target.value } : item,
                          ),
                        })
                      }
                    >
                      {nodes
                        .filter((node) => node.id !== question.id)
                        .map((node) => (
                          <option value={node.id} key={node.id}>
                            {journey.questions.includes(node) ? 'Question' : 'Result'} ·{' '}
                            {node.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="admin-button"
                    disabled={question.choices.length <= 2}
                    onClick={() =>
                      patch({ choices: question.choices.filter((_, i) => i !== index) })
                    }
                  >
                    Remove answer {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="admin-button"
                disabled={question.choices.length >= 6}
                onClick={() =>
                  patch({
                    choices: [
                      ...question.choices,
                      {
                        id: `answer-${Date.now()}`,
                        label: '',
                        next: journey.results[0]?.id || journey.start,
                      },
                    ],
                  })
                }
              >
                Add answer
              </button>
            </>
          ) : (
            <>
              <label>
                Helpful result
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={result.body}
                  onChange={(e) => patch({ body: e.target.value })}
                />
              </label>
              <label>
                Checklist · one step per line
                <textarea
                  rows={3}
                  value={result.steps.join('\n')}
                  onChange={(e) => patch({ steps: e.target.value.split('\n').slice(0, 8) })}
                />
              </label>
              <details>
                <summary>Resource links</summary>
                {Object.entries(HELP_RESOURCES).map(([id, resource]) => (
                  <label key={id} className="admin-check">
                    <input
                      type="checkbox"
                      checked={result.resources.includes(id)}
                      onChange={(e) =>
                        patch({
                          resources: e.target.checked
                            ? [...result.resources, id]
                            : result.resources.filter((key) => key !== id),
                        })
                      }
                    />
                    {resource.title}
                  </label>
                ))}
              </details>
            </>
          )}
          <button
            type="button"
            className="admin-button"
            disabled={selected === journey.start}
            onClick={() => {
              onChange({
                ...journey,
                questions: journey.questions.filter((q) => q.id !== selected),
                results: journey.results.filter((r) => r.id !== selected),
              });
              setSelected(journey.start);
            }}
          >
            Remove this step
          </button>
        </>
      )}
      <div className="admin-actions">
        <button
          className="admin-button"
          type="button"
          disabled={journey.questions.length >= 10}
          onClick={() => add('question')}
        >
          Add question
        </button>
        <button
          className="admin-button"
          type="button"
          disabled={journey.results.length >= 16}
          onClick={() => add('result')}
        >
          Add result
        </button>
        <button
          className="admin-button"
          type="button"
          onClick={() => {
            onChange(fallback);
            setSelected(fallback.start);
          }}
        >
          Restore standard guidance
        </button>
      </div>
      <p role={problem ? 'alert' : 'status'}>{problem || 'Every branch reaches a result.'}</p>
    </details>
  );
}
