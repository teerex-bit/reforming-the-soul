'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../design-system/Button';

type Request = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export function DeleteJournalEntry({ entryId, request = fetch, onDeleted }: Readonly<{
  entryId: string; request?: Request; onDeleted?: () => void;
}>) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocus = useRef(false);
  const triggerId = `delete-trigger-${entryId}`;
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      document.getElementById(triggerId)?.focus();
    }
  }, [confirming, triggerId]);

  async function remove() {
    setBusy(true); setError('');
    try {
      const response = await request(`/api/journal/${entryId}`, {
        method: 'DELETE', headers: { 'content-type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      if (!response.ok) throw new Error('unavailable');
      onDeleted?.();
      if (!onDeleted) window.location.reload();
    } catch {
      setError('This entry could not be deleted. Nothing was changed.');
    } finally { setBusy(false); }
  }

  if (!confirming) return <Button id={triggerId} className="history-delete-trigger" variant="secondary" onClick={() => { restoreTriggerFocus.current = true; setConfirming(true); }}>Delete entry</Button>;
  return <section className="history-delete-confirmation" aria-labelledby={`delete-title-${entryId}`}>
    <h3 id={`delete-title-${entryId}`}>Permanently delete this entry?</h3>
    <p>This removes your original wording, its structured records, permissions, and dependent AI material. Your curriculum progress stays intact.</p>
    <div className="history-delete-actions">
      <button ref={confirmRef} className="button button--danger" type="button" disabled={busy} onClick={remove}>Permanently delete entry</button>
      <Button variant="secondary" disabled={busy} onClick={() => { setConfirming(false); setError(''); }}>Keep entry</Button>
    </div>
    {error ? <p className="status-message status-message--error" role="alert">{error}</p> : null}
  </section>;
}
