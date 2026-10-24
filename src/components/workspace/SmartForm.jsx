import React, { useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import { visibleAnswers, visibleFields } from '@/lib/customForms';
import { formSteps, formStepProblem, reviewAnswer } from '@/lib/smartForm';
import CustomFormsFields from './CustomFormsFields';

export default function SmartForm({
  fields,
  answers,
  onAnswersChange,
  onFile,
  uploads = {},
  busy = false,
  onSubmit,
  submitLabel = 'Send response',
  preview = false,
  children,
  className = '',
  reviewContext,
  validateStep,
}) {
  const [position, setPosition] = useState(null);
  const [all, setAll] = useState(false);
  const [review, setReview] = useState(false);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState(null);
  const [previewComplete, setPreviewComplete] = useState(false);
  const heading = useRef(null);
  const element = useRef(null);
  const sending = useRef(false);
  const instance = useId();
  const steps = formSteps(fields, answers);
  const index = Math.max(
    0,
    steps.findIndex((step) => step.key === position),
  );
  const step = steps[index];
  const singleQuestion =
    !all &&
    step?.fields.length === 1 &&
    step.title === step.fields[0].label &&
    step.fields[0].type !== 'checkbox';
  const active = visibleFields(fields, answers);
  const uploading = active.some((field) => uploads[field.id]?.busy);
  const blocked = busy || uploading;
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());
  const change = (id, value) => {
    onAnswersChange(visibleAnswers(fields, { ...answers, [id]: value }));
    setProblem(null);
    setPreviewComplete(false);
  };
  function showProblem(next) {
    setProblem(next);
    setReview(false);
    if (!all)
      setPosition(
        steps.find((item) => item.fields.some((field) => field.id === next.field))?.key || null,
      );
    requestAnimationFrame(() => {
      const target = [...(element.current?.querySelectorAll('[name]') || [])].find(
        (input) => input.name === next.field,
      );
      (target || heading.current)?.focus();
    });
  }
  function check(current = active) {
    const failedUpload = current.find((field) => uploads[field.id]?.error);
    const next = failedUpload
      ? { field: failedUpload.id, message: uploads[failedUpload.id].error }
      : formStepProblem(
          fields,
          answers,
          current.filter((field) => !preview || !['file', 'image'].includes(field.type)),
        ) || validateStep?.(current, answers);
    if (next) {
      showProblem(next);
      return false;
    }
    setProblem(null);
    return true;
  }
  async function submit(event) {
    event.preventDefault();
    if (blocked || sending.current || !step) return;
    if (review) {
      if (!check()) return;
      if (preview) {
        setPreviewComplete(true);
        return;
      }
      sending.current = true;
      try {
        await onSubmit?.();
      } finally {
        sending.current = false;
      }
      return;
    }
    if (!check(all || editing ? active : step.fields)) return;
    if (all || editing || index === steps.length - 1) {
      if (!check()) return;
      setReview(true);
      setEditing(false);
    } else setPosition(steps[index + 1].key);
    focusHeading();
  }
  function edit(field) {
    setPosition(
      steps.find((item) => item.fields.some((question) => question.id === field.id))?.key || null,
    );
    setAll(false);
    setReview(false);
    setEditing(true);
    setPreviewComplete(false);
    setProblem(null);
    focusHeading();
  }
  return (
    <form
      ref={element}
      className={`workspace-card workspace-form smart-form ${className}`}
      noValidate
      onSubmit={submit}
    >
      {children}
      <div className="smart-form-progress">
        <span aria-live="polite">
          {review
            ? 'Review your answers'
            : all
              ? 'All relevant questions'
              : `Step ${index + 1} of ${steps.length}`}
        </span>
        {!review && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setAll(!all);
              setProblem(null);
              focusHeading();
            }}
          >
            {all ? 'One step at a time' : 'Show all questions'}
          </button>
        )}
      </div>
      <progress
        aria-label="Form progress"
        value={review ? steps.length + 1 : index + 1}
        max={steps.length + 1}
      />
      <h3 ref={heading} tabIndex={-1} className="smart-form-heading">
        {review
          ? 'Check before sending'
          : all
            ? 'Your response'
            : step?.fields.length === 1 && step.fields[0].type === 'checkbox'
              ? 'Your confirmation'
              : step?.title || 'Your response'}
        {!review && singleQuestion && step.fields[0].required && <span aria-hidden="true"> *</span>}
      </h3>
      {review ? (
        <>
          {reviewContext}
          <dl className="smart-form-review">
            {steps
              .flatMap((item) => item.fields)
              .map((field) => (
                <div key={field.id}>
                  <dt>{field.label}</dt>
                  <dd>{reviewAnswer(field, answers, uploads)}</dd>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => edit(field)}
                    aria-label={`Edit ${field.label}`}
                  >
                    <Pencil size={15} aria-hidden="true" /> Edit
                  </button>
                </div>
              ))}
          </dl>
        </>
      ) : (
        <fieldset disabled={busy}>
          <legend className="sr-only">{all ? 'Your response' : step?.title}</legend>
          <CustomFormsFields
            fields={all ? active : step?.fields || []}
            answers={answers}
            onChange={change}
            onFile={onFile}
            uploads={uploads}
            preview={preview}
            guided={!all}
            idPrefix={instance}
            errorField={problem?.field}
            errorId={`${instance}-error`}
            hideLabel={singleQuestion}
          />
        </fieldset>
      )}
      {problem && (
        <p id={`${instance}-error`} role="alert" className="smart-form-error">
          {problem.message}
        </p>
      )}
      <p className="workspace-meta smart-form-note">
        {review ? 'Check these answers before sending.' : 'Fields marked * are required.'}
      </p>
      {active.some((field) => ['file', 'image'].includes(field.type)) && !review && (
        <p className="workspace-meta">
          Files upload when you attach them; your response is sent after review.
        </p>
      )}
      <div className="smart-form-actions">
        {(review || (!all && index > 0)) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setProblem(null);
              setPreviewComplete(false);
              if (review) {
                setReview(false);
                setPosition(steps.at(-1)?.key || null);
              } else setPosition(steps[index - 1].key);
              focusHeading();
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
        )}
        <button
          className="smart-form-next"
          disabled={blocked || !step || previewComplete}
          type="submit"
        >
          {busy
            ? 'Sending…'
            : uploading
              ? 'Uploading…'
              : review
                ? preview
                  ? 'Finish preview'
                  : submitLabel
                : all || editing || index === steps.length - 1
                  ? 'Review answers'
                  : 'Continue'}
          {review ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      {previewComplete && <p role="status">Preview complete. No response was sent.</p>}
    </form>
  );
}
