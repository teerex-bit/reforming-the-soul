'use client';

import { useActionState } from 'react';

export type LessonTransitionState = { error?: string; signIn?: boolean };
export type LessonTransitionAction = (state: LessonTransitionState, data: FormData) => Promise<LessonTransitionState>;

export function LessonTransitionForm({ action, label, section }: { action: LessonTransitionAction; label: string; section?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}>
    {section ? <input type="hidden" name="section" value={section} /> : null}
    <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : label}</button>
    {state.error ? <p role="alert" className="field__error">{state.error}{state.signIn ? <> <a href="/sign-in">Sign in</a></> : null}</p> : null}
  </form>;
}
