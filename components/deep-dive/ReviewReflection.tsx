'use client';

import { useActionState, useState } from 'react';

export type ReviewReflectionState = Readonly<{ savedBody?: string; error?: string }>;
export type ReviewReflectionAction = (state: ReviewReflectionState, formData: FormData) => Promise<ReviewReflectionState>;

export function ReviewReflection({ id, label, reflection, action }: {
  id: string;
  label: string;
  reflection: string | null;
  action: ReviewReflectionAction;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [body, setBody] = useState(reflection ?? '');
  const savedBody = state.savedBody ?? reflection ?? '';
  return <form className="deep-dive-reflection" action={formAction}>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !body.trim() || body.trim() === savedBody.trim()}>
        {pending ? 'Saving…' : 'Save reflection'}
      </button>
    </div>
    <p className="status-message status-message--saved" role="status" aria-live="polite" aria-atomic="true">
      {state.savedBody !== undefined && body.trim() === state.savedBody ? 'Reflection saved.' : ''}
    </p>
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}
