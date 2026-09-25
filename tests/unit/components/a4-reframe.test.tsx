import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A4Reframe } from '../../../components/deep-dive/A4Reframe';

afterEach(cleanup);
describe('A4 reframe proposal', () => {
  it('shows original and editable proposal only after generation, without a save action', async () => {
    const generate = vi.fn().mockResolvedValue('I learned to move toward control in some situations, but this is not the whole truth of who I am.');
    render(<A4Reframe generate={generate} />);
    expect(screen.queryByLabelText('A different way to say it')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('A pattern you recognize'), { target: { value: 'I like to be in control.' } });
    fireEvent.click(screen.getByRole('button', { name: 'See another way to say it' }));
    await waitFor(() => expect(screen.getByLabelText('A different way to say it')).toHaveValue('I learned to move toward control in some situations, but this is not the whole truth of who I am.'));
    expect(screen.getByRole('region', { name: 'Your working reframe' })).toHaveTextContent('I like to be in control.');
    fireEvent.change(screen.getByLabelText('A different way to say it'), { target: { value: 'I sometimes seek control.' } });
    expect(screen.getByLabelText('A different way to say it')).toHaveValue('I sometimes seek control.');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});
