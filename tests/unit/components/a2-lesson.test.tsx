import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A2Lesson } from '../../../components/deep-dive/A2Lesson';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import StagePage from '../../../app/(app)/deep-dive/[stageId]/page';

vi.mock('../../../server/services/deep-dive-service', () => ({
  getA1: vi.fn(async () => null), getA2: vi.fn(async () => null),
  getA3: vi.fn(async () => null), getA4: vi.fn(async () => null),
}));

afterEach(cleanup);

describe('A2 participant experience', () => {
  it('teaches the pattern and preserves the passage attribution', () => {
    const section = A2_SECTIONS.find(item => item.id === 'scripture')!;
    render(<A2Lesson editReflection={vi.fn()} section={section} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('figure', { name: /James 1:23–24/i })).toBeInTheDocument();
    expect(screen.getByText(/World English Bible/)).toBeInTheDocument();
    expect(screen.getByText(/seeing a repeated response is not condemnation/i)).toBeInTheDocument();
  });

  it('saves and confirms the private reflection only after the server action succeeds', async () => {
    let confirmSave!: () => void;
    const saveReflection = vi.fn(() => new Promise<{ saved: boolean }>(resolve => {
      confirmSave = () => resolve({ saved: true });
    }));
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection="Saved thought" saveReflection={saveReflection} />);

    expect(screen.getByLabelText(/which response do you notice most often/i)).toHaveValue('Saved thought');
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
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection={null} saveReflection={saveReflection} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without writing' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
  });

  it('clearly teaches a no-interpretation daily practice', () => {
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'practice')!} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent('notice when a familiar response appears');
    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toHaveTextContent(/collect observations/i);
  });

  it('lets the participant connect situations to recurring responses without saving those choices', () => {
    const saveReflection = vi.fn();
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'patterns')!} reflection={null} saveReflection={saveReflection} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'A plan changes unexpectedly' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'I feel overlooked' }));
    fireEvent.change(screen.getByLabelText('First internal move for A plan changes unexpectedly'), { target: { value: 'Urgency' } });
    fireEvent.change(screen.getByLabelText('Typical response for A plan changes unexpectedly'), { target: { value: 'Control' } });
    fireEvent.change(screen.getByLabelText('First internal move for I feel overlooked'), { target: { value: 'Insecurity' } });
    fireEvent.change(screen.getByLabelText('Typical response for I feel overlooked'), { target: { value: 'Control' } });
    expect(screen.getByRole('region', { name: 'A response that repeats' })).toHaveTextContent('Control');
    expect(screen.getByRole('region', { name: 'A response that repeats' })).toHaveTextContent('2 situations');
    expect(screen.getByRole('region', { name: 'A response that repeats' })).toHaveTextContent(/Urgency.*Insecurity/);
    expect(saveReflection).not.toHaveBeenCalled();
  });

  it('opens with ordinary situations before teaching the idea of patterns', () => {
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS[0]} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByText('Someone misunderstands you.')).toBeInTheDocument();
    expect(screen.getByText('Plans suddenly change.')).toBeInTheDocument();
    expect(screen.getByText(/Different situations\. Same you\./)).toBeInTheDocument();
  });

  it('explains response families through an accessible disclosure without assigning identities', () => {
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'patterns')!} reflection={null} saveReflection={vi.fn()} />);
    const button = screen.getByRole('button', { name: /what can these responses look like/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/moving toward control may look like taking over/i)).toBeInTheDocument();
  });

  it('retains private wording and a retry action after a failed reflection save', async () => {
    const saveReflection = vi.fn(async () => ({ saved: false, error: 'Could not save your reflection. Please try again.' }));
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection={null} saveReflection={saveReflection} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My own words' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByRole('textbox')).toHaveValue('My own words');
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeEnabled();
  });

  it('makes NOTICE, NAME, ASK, RECEIVE a navigable practice without optional labels', () => {
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'go-deeper')!} reflection={null} saveReflection={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'ASK' }));
    expect(screen.getByRole('region', { name: 'ASK' })).toHaveTextContent('God, what do You want me to see here?');
    fireEvent.click(screen.getByRole('button', { name: 'RECEIVE' }));
    expect(screen.getByRole('region', { name: 'RECEIVE' })).toHaveTextContent(/stay with what becomes clear/i);
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('allows completed reflection revision', () => {
    render(<A2Lesson editReflection={vi.fn()} section={A2_SECTIONS.find(item => item.id === 'reflection')!} reflection="Saved thought" saveReflection={vi.fn()} review />);
    expect(screen.getByRole('textbox')).toHaveValue('Saved thought');
    expect(screen.getByRole('button', { name: 'Save reflection' })).toBeDisabled();
  });

  it('offers both lessons from the Awaken stage page', async () => {
    render(await StagePage({ params: Promise.resolve({ stageId: 'awaken' }) }));

    expect(screen.getByRole('link', { name: 'Begin Pay Attention · A1' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
    expect(screen.getByRole('link', { name: 'Begin Catch Yourself Being You · A2' })).toHaveAttribute('href', '/deep-dive/awaken/catch-yourself-being-you');
  });
});
