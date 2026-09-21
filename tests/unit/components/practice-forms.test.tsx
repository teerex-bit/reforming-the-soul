import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PracticeReturnForm } from '../../../components/practice/PracticeReturnForm';

describe('PracticeReturnForm', () => {
  it('keeps entered wording visible when a concurrency conflict is returned', async () => {
    render(<PracticeReturnForm expectedLockVersion={2} practiceId="practice-a" submit={vi.fn().mockResolvedValue({ ok: false, conflict: true })} />);
    fireEvent.change(screen.getByLabelText(/What happened/), { target: { value: 'My exact outcome' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save what happened' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed in another session');
    expect(screen.getByLabelText(/What happened/)).toHaveValue('My exact outcome');
  });
});
