'use client';

import { TextareaHTMLAttributes, useLayoutEffect, useRef, useState } from 'react';

type FieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
};

export function Field({ id, label, help, error, style, onInput, ...textareaProps }: FieldProps) {
  const [contentHeight, setContentHeight] = useState<number>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionIds = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  function growToContent(target: HTMLTextAreaElement) {
    setContentHeight(target.scrollHeight);
  }

  useLayoutEffect(() => {
    if (textareaRef.current?.value) growToContent(textareaRef.current);
  }, []);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      {help ? <p className="field__help" id={`${id}-help`}>{help}</p> : null}
      <textarea
        className="field__control"
        id={id}
        ref={textareaRef}
        aria-describedby={descriptionIds}
        aria-invalid={error ? 'true' : undefined}
        onInput={event => {
          growToContent(event.currentTarget);
          onInput?.(event);
        }}
        style={{ ...style, height: contentHeight ? `${contentHeight}px` : style?.height, resize: 'vertical' }}
        {...textareaProps}
      />
      {error ? <p className="field__error" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}
