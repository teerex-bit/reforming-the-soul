import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A3Lesson, A4Lesson } from '../../../components/deep-dive/A3A4Lesson';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';

afterEach(cleanup);

describe('condensed Awaken lessons', () => {
  it('lets participants trace a pattern without supplying its cause for them', () => {
    render(<A3Lesson editReflection={vi.fn()} section={A3_SECTIONS.find(s => s.id === 'trace')!} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByLabelText('Recurring response')).toHaveValue('');
    expect(screen.getByLabelText('Possible source')).toHaveValue('');
    expect(screen.getByLabelText('Possible function')).toHaveValue('');
    expect(document.querySelectorAll('.a3-thread__fields > .a3-thread__card')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Recurring response'), { target: { value: 'Withdrawal' } });
    fireEvent.change(screen.getByLabelText('Possible source'), { target: { value: "I'm not sure" } });
    expect(screen.getByRole('region', { name: 'Your working thread' })).toHaveTextContent(/Withdrawal.*I.m not sure/s);
    expect(screen.getByText(/these selections are not saved/i)).toBeInTheDocument();
  });

  it('shows the A4 reframe interaction', () => {
    render(<A4Lesson editReflection={vi.fn()} section={A4_SECTIONS.find(s => s.id === 'reframe')!} reflection={null} saveReflection={vi.fn()} generateReframe={vi.fn().mockResolvedValue('I learned to respond this way in some situations, but this is not the whole truth of who I am.')} />);
    expect(screen.getByLabelText('A pattern you recognize')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see another way/i })).toBeDisabled();
  });

  it('presents asking and receiving as full steps in the A4 carry-forward', () => {
    render(<A4Lesson editReflection={vi.fn()} section={A4_SECTIONS.find(s => s.id === 'carry-forward')!} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByText('ASK')).toBeInTheDocument();
    expect(screen.getByText('RECEIVE')).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ready to see clearly/i })).toBeInTheDocument();
  });
});
