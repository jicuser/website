import React, { useEffect, useState } from 'react';
import { clockInputParts, clockInputValue, normalizeClock } from '@/lib/clockTime';
import '@/styles/clock-time-input.css';

export default function ClockTimeInput({
  value = '',
  onChange,
  disabled,
  'aria-label': label = 'Time',
}) {
  const [parts, setParts] = useState(() => clockInputParts(value));
  useEffect(() => setParts((current) => clockInputParts(value, current.period)), [value]);
  const update = (next) => {
    setParts(next);
    onChange(clockInputValue(next.clock, next.period));
  };
  const invalid = Boolean(parts.clock && !normalizeClock(`${parts.clock} ${parts.period}`));
  return (
    <span className="clock-time-input" role="group" aria-label={`${label}, 12-hour clock`}>
      <input
        type="text"
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder="h:mm"
        autoComplete="off"
        spellCheck={false}
        maxLength={11}
        disabled={disabled}
        value={parts.clock}
        onChange={(event) => {
          const entered = event.target.value;
          update(
            /(?:AM|PM)\s*$/i.test(entered) && normalizeClock(entered)
              ? clockInputParts(entered)
              : { ...parts, clock: entered },
          );
        }}
      />
      <select
        aria-label={`${label} AM or PM`}
        disabled={disabled}
        value={parts.period}
        onChange={(event) => update({ ...parts, period: event.target.value })}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </span>
  );
}
