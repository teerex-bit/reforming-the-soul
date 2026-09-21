'use client';

import { FormEvent, useRef, useState } from 'react';
import { Button } from '../design-system/Button';
import { Field } from '../design-system/Field';

type ReflectResult =
  | { kind: 'success'; threadId: string; value: { questions: readonly string[] } }
  | { kind: 'refusal'; threadId?: string; safeMessage: string }
  | { kind: 'incomplete' | 'invalid' | 'timeout' | 'provider_error' | 'unavailable' | 'in_progress' | 'already_completed'; threadId?: string };

async function defaultRequestReflect(intentId: string): Promise<ReflectResult> {
  const response = await fetch('/api/ai/reflect', {
    method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ intentId }),
  });
  return response.json() as Promise<ReflectResult>;
}

export function AIReflectPanel({
  requestReflect = defaultRequestReflect,
  saveInsight,
}: Readonly<{
  requestReflect?: (intentId: string) => Promise<ReflectResult>;
  saveInsight: (input: { threadId: string | null; insightText: string }) => Promise<void>;
}>) {
  const [result, setResult] = useState<ReflectResult | null>(null);
  const [insight, setInsight] = useState('');
  const [busy, setBusy] = useState(false);
  const activeIntentId = useRef<string | null>(null);

  async function reflect() {
    setBusy(true);
    activeIntentId.current ??= crypto.randomUUID();
    try {
      const next = await requestReflect(activeIntentId.current);
      setResult(next);
      if (next.kind !== 'in_progress') activeIntentId.current = null;
    } catch {
      setResult({ kind: 'unavailable' });
    }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!insight.trim()) return;
    setBusy(true);
    try { await saveInsight({ threadId: result?.threadId ?? null, insightText: insight }); }
    finally { setBusy(false); }
  }

  return <section className="reflection-panel" aria-labelledby="ai-reflect-title">
    <p className="eyebrow">OPTIONAL SUPPORT</p>
    <h2 id="ai-reflect-title">AI Reflect</h2>
    <p>AI can ask a careful follow-up. It is not an authority and will not diagnose you or tell you what God is saying.</p>
    <Button disabled={busy} onClick={reflect} type="button">Reflect with AI</Button>
    {result?.kind === 'success' ? <div aria-live="polite">
      <p className="eyebrow">AI reflection</p>
      <ul>{result.value.questions.map(question => <li key={question}>{question}</li>)}</ul>
    </div> : result ? <p role="status">{result.kind === 'refusal' ? result.safeMessage : 'AI Reflect is unavailable right now. You can continue in your own words.'}</p> : null}
    <form onSubmit={save}>
      <Field id="added-insight" label="What would you like to save in your own words?" onChange={event => setInsight(event.currentTarget.value)} value={insight} />
      <Button disabled={busy || !insight.trim()} type="submit">Save my added insight</Button>
    </form>
  </section>;
}
