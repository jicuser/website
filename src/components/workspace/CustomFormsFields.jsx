import React from 'react';
import { fileAccept, visibleFields } from '@/lib/customForms';

export default function CustomFormsFields({
  fields,
  answers,
  onChange,
  onFile,
  uploads = {},
  preview = false,
  disabled = false,
}) {
  return visibleFields(fields, answers).map((field) => {
    const value = answers[field.id];
    const inputId = `answer-${field.id}`;
    const common = {
      id: inputId,
      name: field.id,
      disabled,
      required: field.required,
      'aria-describedby': ['file', 'image'].includes(field.type) ? `${inputId}-help` : undefined,
    };
    let input;
    if (field.type === 'checkbox') {
      input = (
        <input
          {...common}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(field.id, event.target.checked)}
        />
      );
    } else if (field.type === 'textarea') {
      input = (
        <textarea
          {...common}
          rows={4}
          maxLength={6000}
          value={value || ''}
          onChange={(event) => onChange(field.id, event.target.value)}
        />
      );
    } else if (['select', 'multiselect'].includes(field.type)) {
      const multiple = field.type === 'multiselect';
      input = (
        <select
          {...common}
          multiple={multiple}
          value={value || (multiple ? [] : '')}
          onChange={(event) =>
            onChange(
              field.id,
              multiple
                ? [...event.target.selectedOptions].map((option) => option.value)
                : event.target.value,
            )
          }
        >
          {!multiple && <option value="">Choose…</option>}
          {(field.options || []).map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else if (['image', 'file'].includes(field.type)) {
      input = (
        <>
          <input
            {...common}
            type="file"
            accept={fileAccept(field.type)}
            required={field.required && !value}
            disabled={disabled || preview}
            onChange={(event) => onFile?.(field, event.target.files?.[0])}
          />
          <span id={`${inputId}-help`} className="workspace-meta">
            {field.type === 'image'
              ? 'JPEG, PNG or WebP photograph.'
              : 'JPEG, PNG, WebP, PDF or ZIP.'}{' '}
            Up to 10 MB.
          </span>
          {uploads[field.id]?.name && (
            <span role="status">
              {uploads[field.id].busy ? 'Uploading: ' : 'Attached: '}
              {uploads[field.id].name}
            </span>
          )}
          {uploads[field.id]?.error && <span role="alert">{uploads[field.id].error}</span>}
        </>
      );
    } else {
      const type = field.type === 'phone' ? 'tel' : field.type;
      input = (
        <input
          {...common}
          type={type}
          maxLength={field.type === 'phone' ? 40 : field.type === 'email' ? 254 : 500}
          step={type === 'number' ? 'any' : undefined}
          min={type === 'number' ? -1e12 : undefined}
          max={type === 'number' ? 1e12 : undefined}
          value={value ?? ''}
          onChange={(event) =>
            onChange(
              field.id,
              type === 'number' && event.target.value !== ''
                ? Number(event.target.value)
                : event.target.value,
            )
          }
        />
      );
    }
    return (
      <div
        className={`workspace-field ${field.type === 'checkbox' ? 'custom-form-check' : ''}`}
        key={field.id}
      >
        <label htmlFor={inputId}>
          {field.label}
          {field.required && <span aria-label="required"> *</span>}
        </label>
        {input}
      </div>
    );
  });
}
