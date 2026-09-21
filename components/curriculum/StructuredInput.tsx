'use client';

import type { InteractionField } from '../../domain/curriculum';
import { Field } from '../design-system/Field';

type StructuredInputProps = {
  field: InteractionField;
  label: string;
  value: string;
  disabled?: boolean;
  onChange(value: string): void;
};

export function StructuredInput({ field, label, value, disabled, onChange }: StructuredInputProps) {
  if (field.input === 'single_choice') {
    return (
      <fieldset className="choice-panel">
        <legend>{label}</legend>
        <div className="choice-panel__options">
          {field.options?.map(option => <label className="choice-panel__option" key={option}>
            <input checked={value === option} disabled={disabled} name={field.id} onChange={() => onChange(option)} required={field.required} type="radio" value={option} />
            <span>{option}</span>
          </label>)}
        </div>
      </fieldset>
    );
  }
  if (field.input === 'text') {
    return <div className="field"><label className="field__label" htmlFor={field.id}>{label}</label><input className="field__control" disabled={disabled} id={field.id} name={field.id} onChange={event => onChange(event.target.value)} required={field.required} type="text" value={value} /></div>;
  }
  return <Field disabled={disabled} id={field.id} label={label} name={field.id} onChange={event => onChange(event.target.value)} required={field.required} value={value} />;
}
