import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { LessonTransitionForm } from '../../../components/deep-dive/LessonTransitionForm';

afterEach(cleanup);

it('keeps the retry control and offers sign-in after a failed action', async () => {
  const action = vi.fn(async () => ({ error: 'Your session ended. Sign in, then return to this lesson.', signIn: true }));
  render(<LessonTransitionForm action={action} label="Continue" section="next" />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended');
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
});
