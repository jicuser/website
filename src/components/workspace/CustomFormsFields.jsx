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
  guided = false,
  idPrefix = 'answer',
  errorField,
  errorId,
  hideLabel = false,
}) {
  return visibleFields(fields, answers).map((field) => {
    const value = answers[field.id];
    const inputId = `${idPrefix}-${field.id}`;
    const choiceCards =
      guided && ['select', 'multiselect'].includes(field.type) && field.options?.length <= 8;
    const common = {
      id: inputId,
      name: field.id,
      disabled,
      required: field.required,
      'aria-invalid': errorField === field.id || undefined,
      'aria-describedby':
        [
          field.help && `${inputId}-hint`,
          ['file', 'image'].includes(field.type) && `${inputId}-help`,
          errorField === field.id && errorId,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
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
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(event) => onChange(field.id, event.target.value)}
        />
      );
    } else if (choiceCards) {
      const multiple = field.type === 'multiselect';
      const selectedValues = Array.isArray(value) ? value : [];
      input = (
        <div
          className="smart-form-choices"
          role={multiple ? 'group' : 'radiogroup'}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={common['aria-describedby']}
        >
          {field.options.map((option, index) => {
            const selected = multiple ? selectedValues.includes(option) : value === option;
            return (
              <label className={selected ? 'is-selected' : ''} key={option}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={field.id}
                  id={`${inputId}-${index}`}
                  checked={selected}
                  disabled={disabled}
                  aria-invalid={common['aria-invalid']}
                  onChange={() =>
                    onChange(
                      field.id,
                      multiple
                        ? selected
                          ? selectedValues.filter((item) => item !== option)
                          : [...selectedValues, option]
                        : option,
                    )
                  }
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
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
          {(uploads[field.id]?.name || uploads[field.id]?.error) && (
            <button
              type="button"
              disabled={disabled || preview}
              aria-label={`Remove ${field.label} attachment`}
              onClick={(event) => {
                const input = event.currentTarget
                  .closest('.workspace-field')
                  ?.querySelector('input[type="file"]');
                if (input) input.value = '';
                onFile?.(field, null);
              }}
            >
              Remove attachment
            </button>
          )}
        </>
      );
    } else {
      const type = field.type === 'phone' ? 'tel' : field.type;
      input = (
        <input
          {...common}
          type={type}
          maxLength={field.type === 'phone' ? 40 : field.type === 'email' ? 254 : 500}
          step={type === 'number' ? (field.integer ? 1 : 'any') : undefined}
          min={type === 'number' ? (field.minimum ?? -1e12) : undefined}
          max={type === 'number' ? (field.maximum ?? 1e12) : undefined}
          value={value ?? ''}
          placeholder={
            field.placeholder || (field.type === 'phone' ? '07700 900000 or +44…' : undefined)
          }
          autoComplete={
            field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : undefined
          }
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
        {choiceCards ? (
          <span id={`${inputId}-label`} className={hideLabel ? 'sr-only' : 'smart-field-label'}>
            {field.label}
            {field.required && <span aria-label="required"> *</span>}
          </span>
        ) : (
          <label htmlFor={inputId} className={hideLabel ? 'sr-only' : undefined}>
            {field.label}
            {field.required && <span aria-label="required"> *</span>}
          </label>
        )}
        {input}
        {field.help && (
          <span id={`${inputId}-hint`} className="workspace-meta">
            {field.help}
          </span>
        )}
      </div>
    );
  });
}
