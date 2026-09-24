import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A1Lesson } from '../../../components/deep-dive/A1Lesson';
import { A1_SECTIONS } from '../../../content/deep-dive/v1';
import { AWAKEN_INTRODUCTION } from '../../../content/deep-dive/v1';
import StagePage from '../../../app/(app)/deep-dive/[stageId]/page';

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
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    confirmSave();
    expect(await screen.findByRole('status')).toHaveTextContent('Reflection saved.');
  });

  it('does not announce a save after the participant skips the optional reflection', async () => {
    const saveReflection = vi.fn(async (_state: { saved: boolean }, formData: FormData) => ({ saved: formData.get('skip') !== 'true' }));
    render(<A1Lesson section={section('reflection')} index={5} total={9} reflection={null} saveReflection={saveReflection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    await waitFor(() => expect(saveReflection).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('presents Luke 6:45 as Scripture with a visible translation attribution', () => {
    render(<A1Lesson section={section('scripture')} index={4} total={9} reflection={null} saveReflection={vi.fn()} />);

    expect(screen.getByRole('figure', { name: /Luke 6:45/i })).toBeInTheDocument();
    expect(screen.getByText(/World English Bible/)).toBeInTheDocument();
    expect(screen.getByText(/Jesus directs attention toward an important reality/)).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Begin Pay Attention' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
    expect(screen.queryByRole('heading', { name: 'Can we talk later?' })).not.toBeInTheDocument();
  });
});
