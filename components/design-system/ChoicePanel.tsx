'use client';

import { KeyboardEvent, useState } from 'react';

type ChoicePanelProps = { legend: string; name: string; options: readonly string[]; defaultValue?: string };

export function ChoicePanel({ legend, name, options, defaultValue }: ChoicePanelProps) {
  const [value, setValue] = useState(defaultValue);

  function chooseWithArrow(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction || options.length === 0) return;
    event.preventDefault();
    const nextIndex = (index + direction + options.length) % options.length;
    const nextValue = options[nextIndex];
    setValue(nextValue);
    document.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"][value="${CSS.escape(nextValue)}"]`)?.focus();
  }

  return (
    <fieldset className="choice-panel">
      <legend>{legend}</legend>
      <div className="choice-panel__options">
        {options.map(option => (
          <label className="choice-panel__option" key={option}>
            <input
              checked={value === option}
              name={name}
              onChange={() => setValue(option)}
              onKeyDown={event => chooseWithArrow(event, options.indexOf(option))}
              type="radio"
              value={option}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
