import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SC1Lesson } from '../../../components/deep-dive/SC1Lesson';
import { SC1_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sc1';

afterEach(cleanup);

const props = { record: null, reflection: null, sources: [], completed: false, saveResponse: vi.fn(), saveReflection: vi.fn() };

describe('SC1 guided lesson', () => {
  it('teaches with an observable contrast before inviting an interpretation', () => {
    expect(SC1_SECTIONS.map(section => section.id)).toEqual(['entry', 'teaching', 'contrast', 'interaction', 'reflection', 'practice', 'carry-forward']);
    render(<SC1Lesson {...props} section={SC1_SECTIONS[2]} />);
    expect(screen.getByText('Two people stopped talking when I entered.')).toBeInTheDocument();
    expect(screen.getByText('“They don’t want me here.”')).toBeInTheDocument();
    expect(screen.getByText(/The conclusion might be right/)).toBeInTheDocument();
    expect(screen.getByText('Look again at the difference')).toBeInTheDocument();
  });

  it('labels distinct participant fields and keeps review read-only', () => {
    const record = { eventFacts: 'The message was read.', automaticInterpretation: 'I upset my friend.', sourceEntryId: null };
    const { rerender } = render(<SC1Lesson {...props} section={SC1_SECTIONS[3]} record={record} />);
    expect(screen.getByLabelText(/What could a careful witness observe/)).toHaveValue('The message was read.');
    expect(screen.getByLabelText(/What did you immediately make it mean/)).toHaveValue('I upset my friend.');
    rerender(<SC1Lesson {...props} section={SC1_SECTIONS[3]} record={record} completed />);
    expect(screen.getByRole('region', { name: 'Your saved moment' })).toHaveTextContent('I upset my friend.');
    expect(screen.queryByRole('button', { name: 'Save & continue' })).not.toBeInTheDocument();
  });
});
