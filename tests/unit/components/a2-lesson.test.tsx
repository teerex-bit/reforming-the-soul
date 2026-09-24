import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A2Lesson } from '../../../components/deep-dive/A2Lesson';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import StagePage from '../../../app/(app)/deep-dive/[stageId]/page';

afterEach(cleanup);

describe('A2 participant experience', () => {
  it('teaches the pattern and preserves the passage attribution', () => {
    const section = A2_SECTIONS.find(item => item.id === 'scripture')!;
    render(<A2Lesson section={section} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('figure', { name: /James 1:23–24/i })).toBeInTheDocument();
    expect(screen.getByText(/World English Bible/)).toBeInTheDocument();
    expect(screen.getByText(/seeing a pattern is not condemnation/i)).toBeInTheDocument();
  });

  it('saves and confirms the private reflection only after the server action succeeds', async () => {
    let confirmSave!: () => void;
    const saveReflection = vi.fn(() => new Promise<{ saved: boolean }>(resolve => {
      confirmSave = () => resolve({ saved: true });
    }));
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection="Saved thought" saveReflection={saveReflection} />);

    expect(screen.getByLabelText(/write about any of these questions/i)).toHaveValue('Saved thought');
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    confirmSave();
    expect(await screen.findByRole('status')).toHaveTextContent('Reflection saved.');
  });

  it('clearly teaches a no-interpretation daily practice', () => {
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'practice')!} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent('Have I felt this before?');
    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent(/collect observations/i);
  });

  it('offers both lessons from the Awaken stage page', async () => {
    render(await StagePage({ params: Promise.resolve({ stageId: 'awaken' }) }));

    expect(screen.getByRole('link', { name: 'Begin Pay Attention' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
    expect(screen.getByRole('link', { name: 'Begin Catch Yourself Being You · A2' })).toHaveAttribute('href', '/deep-dive/awaken/catch-yourself-being-you');
  });
});
