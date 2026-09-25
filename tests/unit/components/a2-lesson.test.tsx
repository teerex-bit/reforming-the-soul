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
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A thought worth keeping' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    confirmSave();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Reflection saved.'));
  });

  it('keeps whitespace-only text unsavable and permits continuing without writing', async () => {
    const saveReflection = vi.fn(async () => ({ saved: false }));
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection={null} saveReflection={saveReflection} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without writing' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
  });

  it('clearly teaches a no-interpretation daily practice', () => {
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'practice')!} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent('Have I felt this before?');
    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent(/collect observations/i);
  });

  it('lets the participant connect situations to recurring responses without saving those choices', () => {
    const saveReflection = vi.fn();
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'patterns')!} reflection={null} saveReflection={saveReflection} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'A plan changes unexpectedly' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Control' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'I feel overlooked' }));

    expect(screen.getByRole('region', { name: 'A response that repeats' })).toHaveTextContent('Control');
    expect(screen.getByRole('region', { name: 'A response that repeats' })).toHaveTextContent('2 situations');
    expect(saveReflection).not.toHaveBeenCalled();
  });

  it('makes NOTICE, NAME, ASK, RECEIVE a navigable practice and marks ASK and RECEIVE optional', () => {
    render(<A2Lesson section={A2_SECTIONS.find(item => item.id === 'practice')!} reflection={null} saveReflection={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /ASK.*optional/i }));
    expect(screen.getByRole('region', { name: 'ASK' })).toHaveTextContent('God, what do You want me to see here?');
    fireEvent.click(screen.getByRole('button', { name: /RECEIVE.*optional/i }));
    expect(screen.getByRole('region', { name: 'RECEIVE' })).toHaveTextContent(/stay with what becomes clear/i);
  });

  it('offers both lessons from the Awaken stage page', async () => {
    render(await StagePage({ params: Promise.resolve({ stageId: 'awaken' }) }));

    expect(screen.getByRole('link', { name: 'Begin Pay Attention' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
    expect(screen.getByRole('link', { name: 'Begin Catch Yourself Being You · A2' })).toHaveAttribute('href', '/deep-dive/awaken/catch-yourself-being-you');
  });
});
