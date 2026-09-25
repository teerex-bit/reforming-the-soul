import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A3Lesson, A4Lesson } from '../../../components/deep-dive/A3A4Lesson';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';

afterEach(cleanup);

describe('condensed Awaken lessons', () => {
  it('lets participants trace a pattern without supplying its cause for them', () => {
    render(<A3Lesson section={A3_SECTIONS.find(s => s.id === 'trace')!} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByLabelText('Recurring response')).toHaveValue('');
    expect(screen.getByLabelText('Possible source')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Recurring response'), { target: { value: 'Withdrawal' } });
    fireEvent.change(screen.getByLabelText('Possible source'), { target: { value: "I'm not sure" } });
    expect(screen.getByRole('region', { name: 'Your working thread' })).toHaveTextContent(/Withdrawal.*I.m not sure/s);
    expect(screen.getByText(/these selections are not saved/i)).toBeInTheDocument();
  });

  it('reframes identity language using the participant’s own choice', () => {
    render(<A4Lesson section={A4_SECTIONS.find(s => s.id === 'reframe')!} reflection={null} saveReflection={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('A pattern you recognize'), { target: { value: 'move toward control' } });
    expect(screen.getByRole('region', { name: 'Your working reframe' })).toHaveTextContent(/I learned to move toward control, but this is not the whole truth of who I am/i);
  });

  it('leaves asking and receiving optional in the A4 carry-forward', () => {
    render(<A4Lesson section={A4_SECTIONS.find(s => s.id === 'carry-forward')!} reflection={null} saveReflection={vi.fn()} />);
    expect(screen.getByText(/ASK · OPTIONAL/i)).toBeInTheDocument();
    expect(screen.getByText(/RECEIVE · OPTIONAL/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ready to see clearly/i })).toBeInTheDocument();
  });
});
