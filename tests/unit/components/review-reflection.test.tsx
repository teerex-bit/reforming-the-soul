import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReviewReflection } from '../../../components/deep-dive/ReviewReflection';

afterEach(cleanup);

describe('later reflection edits', () => {
  it('lets a skipped reflection be written and confirms only after server success', async () => {
    let confirm: ((value: { savedBody: string }) => void) | undefined;
    const action = vi.fn((_: unknown, data: FormData) => new Promise<{ savedBody: string }>(resolve => {
      expect(data.get('body')).toBe('A thought I had later.');
      confirm = resolve;
    }));
    render(<ReviewReflection id="reflection" label="What did you notice?" reflection={null} action={action} />);
    const save = screen.getByRole('button', { name: 'Save reflection' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'What did you notice?' }), { target: { value: 'A thought I had later.' } });
    fireEvent.click(save);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Reflection saved.')).not.toBeInTheDocument();
    confirm?.({ savedBody: 'A thought I had later.' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Reflection saved.'));
  });

  it('loads saved wording for revision and does not confirm failed saves', async () => {
    const action = vi.fn(async () => ({ error: 'Could not save your reflection.' }));
    render(<ReviewReflection id="reflection" label="What did you notice?" reflection="Earlier wording." action={action} />);
    const textbox = screen.getByRole('textbox', { name: 'What did you notice?' });
    expect(textbox).toHaveValue('Earlier wording.');
    expect(screen.getByRole('button', { name: 'Save reflection' })).toBeDisabled();
    fireEvent.change(textbox, { target: { value: 'Revised wording.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not save'));
    expect(textbox).toHaveValue('Revised wording.');
    expect(screen.queryByText('Reflection saved.')).not.toBeInTheDocument();
  });
});
