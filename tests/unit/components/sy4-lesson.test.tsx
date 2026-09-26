import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SY4Lesson } from '../../../components/deep-dive/SY4Lesson';
import { SY4_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sy4';

afterEach(cleanup);
const props = { record: null, source: null, reflection: null, completed: false, reviewReflection: false,
  saveTruth: vi.fn(), saveReflection: vi.fn(), editReflection: vi.fn(), deleteReflection: vi.fn() };

describe('SY4 authored authority lesson', () => {
  it('teaches the two central passages and offers one optional truth field', () => {
    expect(SY4_SECTIONS.map(section => section.id)).toEqual(['entry', 'formation', 'scripture', 'look-again', 'reflection', 'carry-forward']);
    render(<SY4Lesson {...props} section={SY4_SECTIONS[2]} />);
    expect(screen.getByText(/2 Corinthians 5:17/)).toBeInTheDocument();
    expect(screen.getByText(/Ephesians 2:10/)).toBeInTheDocument();
    cleanup();
    render(<SY4Lesson {...props} section={SY4_SECTIONS[3]} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByLabelText('A truth I want to learn to live from is…')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Continue without saving a statement' })).toBeInTheDocument();
  });
  it('shows owned SY3 wording read only and preserves source choice across retry', () => {
    const source = { id: 'owned', selfStoryHypothesis: 'I must earn approval.' };
    render(<SY4Lesson {...props} section={SY4_SECTIONS[3]} source={source} />);
    fireEvent.click(screen.getByLabelText('Look at my SY3 story'));
    fireEvent.reset(screen.getByLabelText('Look at my SY3 story').closest('form')!);
    expect(screen.getByLabelText('Look at my SY3 story')).toBeChecked();
    expect(screen.getByRole('complementary', { name: 'Your SY3 story' })).toHaveTextContent('I must earn approval.');
    expect(screen.getByText('WHAT HAS AUTHORITY TO DEFINE ME?')).toBeInTheDocument();
  });
  it('clears the review editor when a separate reflection is deleted', () => {
    const view = render(<SY4Lesson {...props} section={SY4_SECTIONS[4]} completed reviewReflection reflection="I find it difficult." />);
    expect(screen.getByLabelText(/What makes it difficult/)).toHaveValue('I find it difficult.');
    view.rerender(<SY4Lesson {...props} section={SY4_SECTIONS[4]} completed reviewReflection reflection={null} />);
    expect(screen.getByLabelText(/What makes it difficult/)).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Delete reflection' })).not.toBeInTheDocument();
  });
});
