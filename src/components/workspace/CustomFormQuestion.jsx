import React, { useState } from 'react';
import { FIELD_TYPES } from '@/lib/customForms';
import { canMoveQuestion } from '@/lib/formBuilder';
import { Field } from './shared';

export default function CustomFormQuestion({ field, fields, index, onChange, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(!field.label);
  const patch = (value) => onChange({ ...field, ...value });
  const previous = fields
    .slice(0, index)
    .filter((item) => !item.show_when && !['image', 'file', 'multiselect'].includes(item.type));
  const parent = previous.find((item) => item.id === field.show_when?.field);
  const dependants = fields.filter((item) => item.show_when?.field === field.id);
  return (
    <details
      className="custom-question"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <span className="custom-question-number">{index + 1}</span>
        <span>
          <strong>{field.label || 'New question'}</strong>
          <small>
            {FIELD_TYPES.find(([id]) => id === field.type)?.[1]}
            {field.required ? ' · Required' : ' · Optional'}
          </small>
        </span>
      </summary>
      <div className="custom-question-body">
        <div className="workspace-grid">
          <Field label="Question label">
            <input
              value={field.label}
              maxLength={160}
              onChange={(event) => patch({ label: event.target.value })}
            />
          </Field>
          <Field label="Answer type">
            <select
              value={field.type}
              onChange={(event) => {
                const next = { ...field, type: event.target.value };
                if (['select', 'multiselect'].includes(next.type))
                  next.options = field.options || ['Yes', 'No'];
                else delete next.options;
                if (next.type !== 'number') {
                  delete next.minimum;
                  delete next.maximum;
                  delete next.integer;
                }
                onChange(next);
              }}
            >
              {FIELD_TYPES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="custom-form-check workspace-field">
          <span>Required answer</span>
          <input
            type="checkbox"
            checked={field.required === true}
            onChange={(event) => patch({ required: event.target.checked })}
          />
        </label>
        {['select', 'multiselect'].includes(field.type) && (
          <Field label="Choices (one per line)">
            <textarea
              rows={4}
              value={(field.options || []).join('\n')}
              onChange={(event) => patch({ options: event.target.value.split('\n') })}
            />
          </Field>
        )}
        <details className="custom-form-advanced">
          <summary>Help, examples & rules</summary>
          <Field label="Help text (optional)">
            <input
              maxLength={300}
              value={field.help || ''}
              onChange={(event) => patch({ help: event.target.value })}
            />
          </Field>
          {['text', 'textarea', 'email', 'phone', 'number'].includes(field.type) && (
            <Field label="Example answer (optional)">
              <input
                maxLength={160}
                value={field.placeholder || ''}
                onChange={(event) => patch({ placeholder: event.target.value })}
              />
            </Field>
          )}
          {field.type === 'number' && (
            <>
              <div className="workspace-grid">
                {['minimum', 'maximum'].map((key) => (
                  <Field
                    key={key}
                    label={`${key === 'minimum' ? 'Minimum' : 'Maximum'} answer (optional)`}
                  >
                    <input
                      type="number"
                      value={field[key] ?? ''}
                      onChange={(event) => {
                        const next = { ...field };
                        if (event.target.value === '') delete next[key];
                        else next[key] = Number(event.target.value);
                        onChange(next);
                      }}
                    />
                  </Field>
                ))}
              </div>
              <label className="custom-form-check workspace-field">
                <span>Whole number only</span>
                <input
                  type="checkbox"
                  checked={field.integer === true}
                  onChange={(event) => patch({ integer: event.target.checked })}
                />
              </label>
            </>
          )}
          <Field label="Show question">
            <select
              value={field.show_when?.field || ''}
              onChange={(event) => {
                if (!event.target.value) {
                  const next = { ...field };
                  delete next.show_when;
                  onChange(next);
                } else {
                  const chosen = previous.find((item) => item.id === event.target.value);
                  patch({
                    show_when: {
                      field: chosen.id,
                      operator: 'equals',
                      value:
                        chosen.type === 'checkbox'
                          ? true
                          : chosen.type === 'number'
                            ? 0
                            : chosen.options?.[0] || '',
                    },
                  });
                }
              }}
            >
              <option value="">Always</option>
              {previous.map((item) => (
                <option key={item.id} value={item.id}>
                  Depending on: {item.label || item.id}
                </option>
              ))}
            </select>
          </Field>
          {field.show_when && (
            <div className="workspace-grid">
              <Field label="Condition">
                <select
                  value={field.show_when.operator}
                  onChange={(event) =>
                    patch({
                      show_when: {
                        ...field.show_when,
                        operator: event.target.value,
                        ...(event.target.value === 'between'
                          ? { maximum: field.show_when.maximum ?? field.show_when.value }
                          : {}),
                      },
                    })
                  }
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Does not equal</option>
                  {parent?.type === 'number' && (
                    <option value="between">Between (inclusive)</option>
                  )}
                </select>
              </Field>
              {field.show_when.operator === 'between' && (
                <Field label="Highest matching answer">
                  <input
                    type="number"
                    value={field.show_when.maximum}
                    onChange={(event) =>
                      patch({
                        show_when: { ...field.show_when, maximum: Number(event.target.value) },
                      })
                    }
                  />
                </Field>
              )}
              <Field label="Answer to match">
                {parent?.type === 'checkbox' ? (
                  <select
                    value={String(field.show_when.value)}
                    onChange={(event) =>
                      patch({
                        show_when: { ...field.show_when, value: event.target.value === 'true' },
                      })
                    }
                  >
                    <option value="true">Confirmed</option>
                    <option value="false">Not confirmed</option>
                  </select>
                ) : (
                  <input
                    type={parent?.type === 'number' ? 'number' : 'text'}
                    value={field.show_when.value}
                    onChange={(event) =>
                      patch({
                        show_when: {
                          ...field.show_when,
                          value:
                            parent?.type === 'number'
                              ? Number(event.target.value)
                              : event.target.value,
                        },
                      })
                    }
                  />
                )}
              </Field>
            </div>
          )}
          <Field label="Field key">
            <input value={field.id} readOnly maxLength={40} />
          </Field>
          <p className="workspace-meta">
            Assigned automatically to keep responses linked to the right question.
          </p>
        </details>
        <div className="workspace-actions">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveQuestion(fields, index, -1)}
          >
            Move up
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveQuestion(fields, index, 1)}
          >
            Move down
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={fields.length === 1 || dependants.length > 0}
          >
            Remove question
          </button>
        </div>
        {dependants.length > 0 && (
          <p className="workspace-meta">
            Used by {dependants.map((item) => item.label || item.id).join(', ')}. Change their rules
            before removing this question.
          </p>
        )}
      </div>
    </details>
  );
}
