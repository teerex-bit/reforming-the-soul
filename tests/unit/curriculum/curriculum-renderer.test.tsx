import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurriculumRenderer } from '../../../components/curriculum/CurriculumRenderer';
import { PHASE_1_NODES } from '../../../content/phase-1/v1/curriculum';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('CurriculumRenderer', () => {
  it('renders an interaction only from its validated authored content and preserves entered text', () => {
    const node = PHASE_1_NODES.find(candidate => candidate.id === 'awaken.pay-attention.observe');
    if (!node) throw new Error('Awaken observation fixture is missing');
    const submit = vi.fn();

    render(<CurriculumRenderer node={node} onSubmit={submit} />);

    expect(screen.getByRole('heading', { name: 'What happened?' })).toBeInTheDocument();
    expect(screen.getByText('Describe the situation in your own words.')).toBeInTheDocument();
    const field = screen.getByLabelText('What happened?');
    fireEvent.change(field, { target: { value: '  café\nI felt startled  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(submit).toHaveBeenCalledWith({ event_text: '  café\nI felt startled  ' });
  });

  it('renders bridge teaching generically without treating it as an interaction', () => {
    const node = PHASE_1_NODES.find(candidate => candidate.id === 'bridge.awaken-see-clearly');
    if (!node) throw new Error('Awaken bridge fixture is missing');

    render(<CurriculumRenderer node={node} />);

    expect(screen.getByRole('heading', { name: 'See clearly' })).toBeInTheDocument();
    expect(screen.getByText(/A situation and the meaning we give it are related/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders a supplied interaction sequence as one authored observation form', () => {
    const nodes = PHASE_1_NODES.filter(candidate => [
      'awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body',
    ].includes(candidate.id));

    render(<CurriculumRenderer nodes={nodes} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'What happened?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What happened inside me?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What did you notice in your body?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeInTheDocument();
  });

  it('renders See Clearly as one form with fact and interpretation visibly separate and one belief type choice', () => {
    const nodes = PHASE_1_NODES.filter(candidate => candidate.id.startsWith('see-clearly.'));
    render(<CurriculumRenderer nodes={nodes} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'What is the observable fact?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What is my interpretation?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'belief' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'expectation' })).toBeInTheDocument();
  });

  it('does not expose an unhandled interaction', () => {
    const node = PHASE_1_NODES.find(candidate => candidate.id === 'awaken.pay-attention.reflect');
    if (!node) throw new Error('Awaken reflect fixture is missing');

    render(<CurriculumRenderer node={node} />);

    expect(screen.queryByText('Reflect with AI')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument();
  });

  it('keeps the practice review question in one heading and uses a distinct field label', () => {
    const node = PHASE_1_NODES.find(candidate => candidate.id === 'become.practice.review');
    if (!node) throw new Error('Practice review fixture is missing');
    render(<CurriculumRenderer node={node} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'What are you noticing now?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Your reflection')).toBeInTheDocument();
    expect(screen.getAllByText('What are you noticing now?')).toHaveLength(1);
    expect(screen.queryByText(/Displays the original plan/)).not.toBeInTheDocument();
  });
});
