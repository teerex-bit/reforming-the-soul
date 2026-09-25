import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A1Lesson } from '../../../components/deep-dive/A1Lesson';
import { A1_SECTIONS } from '../../../content/deep-dive/v1';
import { AWAKEN_INTRODUCTION } from '../../../content/deep-dive/v1';
import StagePage from '../../../app/(app)/deep-dive/[stageId]/page';

vi.mock('../../../server/services/deep-dive-service', () => ({
  getA1: vi.fn(async () => null), getA2: vi.fn(async () => null),
  getA3: vi.fn(async () => null), getA4: vi.fn(async () => null),
}));

afterEach(cleanup);

const section = (id: string) => A1_SECTIONS.find(item => item.id === id)!;

describe('A1 participant experience', () => {
  it('announces reflection success only after the server action resolves', async () => {
    let confirmSave!: () => void;
    const saveReflection = vi.fn(() => new Promise<{ saved: boolean }>(resolve => {
      confirmSave = () => resolve({ saved: true });
    }));
    render(<A1Lesson section={section('reflection')} index={5} total={9} reflection={null} saveReflection={saveReflection} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A thought worth keeping' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    confirmSave();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Reflection saved.'));
  });

  it('does not announce a save after the participant skips the optional reflection', async () => {
    const saveReflection = vi.fn(async (_state: { saved: boolean }, formData: FormData) => ({ saved: formData.get('skip') !== 'true' }));
    render(<A1Lesson section={section('reflection')} index={5} total={9} reflection={null} saveReflection={saveReflection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue without writing' }));

    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('does not enable saving whitespace-only reflections', () => {
    render(<A1Lesson section={section('reflection')} index={5} total={9} reflection={null} saveReflection={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   \n  ' } });
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
  });

  it('keeps the entered reflection available after a failed save', async () => {
    const saveReflection = vi.fn(async () => ({ saved: false, error: 'Could not save your reflection. Please try again.' }));
    render(<A1Lesson section={section('reflection')} index={5} total={9} reflection={null} saveReflection={saveReflection} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep these words' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByRole('textbox')).toHaveValue('Keep these words');
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeEnabled();
  });

  it('makes the entire disclosure row operable and exposes its state', () => {
    render(<A1Lesson section={section('teaching')} index={3} total={9} reflection={null} saveReflection={vi.fn()} />);
    const disclosure = screen.getByRole('button', { name: /what does.*notice.*mean/i });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  });

  it('presents Luke 6:45 as Scripture with a visible translation attribution', () => {
    render(<A1Lesson section={section('scripture')} index={4} total={9} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('figure', { name: /Luke 6:45/i })).toBeInTheDocument();
    expect(screen.getByText(/World English Bible/)).toBeInTheDocument();
    expect(screen.getByText(/Jesus directs attention toward an important reality/)).toBeInTheDocument();
  });

  it('separates the outside event from the inside response as two readable observations', () => {
    render(<A1Lesson section={section('outside-inside')} index={2} total={9} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'What happened around you' })).toHaveTextContent('A message arrived: “Can we talk later?”');
    expect(screen.getByRole('group', { name: 'What happened inside you' })).toHaveTextContent('That depends on the person.');
  });

  it('gives the A1 practice question a distinct, easily revisited emphasis', () => {
    render(<A1Lesson section={section('practice')} index={7} total={9} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('note')).toHaveTextContent('What just happened in me?');
  });

  it('gives practice and carry-forward sections clear, distinct transition treatments', () => {
    const { rerender } = render(<A1Lesson section={section('practice')} index={7} total={9} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Practice for the next few days' })).toBeInTheDocument();

    rerender(<A1Lesson section={section('carry-forward')} index={8} total={9} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Carry forward' })).toBeInTheDocument();
  });

  it('introduces Awaken before A1 as a separate orientation page', async () => {
    const page = await StagePage({ params: Promise.resolve({ stageId: 'awaken' }) });
    render(page);

    expect(screen.getByRole('heading', { level: 1, name: 'Awaken' })).toBeInTheDocument();
    expect(screen.getByText(AWAKEN_INTRODUCTION)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Begin Pay Attention · A1' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
    expect(screen.queryByRole('heading', { name: 'Can we talk later?' })).not.toBeInTheDocument();
  });
});
