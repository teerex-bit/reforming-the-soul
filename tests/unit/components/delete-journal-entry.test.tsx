import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteJournalEntry } from '../../../components/history/DeleteJournalEntry';

describe('DeleteJournalEntry', () => {
  afterEach(cleanup);
  it('requires a second explicit action, moves focus, and reports successful deletion', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ kind: 'deleted' }), { status: 200 }));
    const deleted = vi.fn();
    render(<DeleteJournalEntry entryId="10000000-0000-4000-8000-000000000001" request={request} onDeleted={deleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    const confirm = screen.getByRole('button', { name: 'Permanently delete entry' });
    await waitFor(() => expect(confirm).toHaveFocus());
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(deleted).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith('/api/journal/10000000-0000-4000-8000-000000000001', expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE' }) }));
  });

  it('can cancel without issuing a request and restores focus to the trigger', async () => {
    const request = vi.fn();
    render(<DeleteJournalEntry entryId="10000000-0000-4000-8000-000000000001" request={request} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep entry' }));
    expect(screen.queryByRole('button', { name: 'Permanently delete entry' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete entry' })).toHaveFocus());
  });
});
