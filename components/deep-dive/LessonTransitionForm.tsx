'use client';

import { useActionState } from 'react';

export type LessonTransitionState = { error?: string; signIn?: boolean };
export type LessonTransitionAction = (state: LessonTransitionState, data: FormData) => Promise<LessonTransitionState>;

export function LessonActionError({ error, signIn }: LessonTransitionState) {
  return error ? <p role="alert" className="field__error">{error}{signIn || error.startsWith('Your session ended.') ? <> <a href="/sign-in">Sign in</a></> : null}</p> : null;
}

export function LessonTransitionForm({ action, label, section }: { action: LessonTransitionAction; label: string; section?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}>
    {section ? <input type="hidden" name="section" value={section} /> : null}
    <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : label}</button>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}
