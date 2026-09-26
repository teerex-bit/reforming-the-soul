import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SY3Lesson } from '../../../components/deep-dive/SY3Lesson';
import { SY3_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sy3';

afterEach(cleanup);
const props = { record: null, source: null, reflection: null, completed: false, reviewReflection: false,
  saveStory: vi.fn(), saveReflection: vi.fn(), editReflection: vi.fn(), deleteReflection: vi.fn() };

describe('SY3 authored story', () => {
  it('keeps one tentative participant field and allows continuation without disclosure', () => {
    expect(SY3_SECTIONS.map(section => section.id)).toEqual(['entry', 'teaching', 'recognition', 'clarification', 'reflection', 'carry-forward']);
    render(<SY3Lesson {...props} section={SY3_SECTIONS[2]} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByLabelText('A story I sometimes carry is…')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Continue without saving a story' })).toBeInTheDocument();
  });
  it('offers an owned trace read only and keeps a deleted-source explanation', () => {
    const source = { id: 'owned', perception: 'The room became quiet.', belief: 'I had said too much.', expectation: null, desire: null, intention: null, choice: null, outcome: null };
    render(<SY3Lesson {...props} section={SY3_SECTIONS[2]} source={source} record={{ selfStoryHypothesis: 'Maybe I disappoint people.', sourceSy2RecordId: 'owned', sourceWasLinked: true }} />);
    expect(screen.getByRole('complementary', { name: 'Your SY2 trace' })).toHaveTextContent('The room became quiet.');
    expect(screen.getByLabelText('A story I sometimes carry is…')).toHaveValue('Maybe I disappoint people.');
    cleanup();
    render(<SY3Lesson {...props} completed section={SY3_SECTIONS[2]} record={{ selfStoryHypothesis: 'Maybe I disappoint people.', sourceSy2RecordId: null, sourceWasLinked: true }} />);
    expect(screen.getByRole('status')).toHaveTextContent('earlier SY2 source is no longer available');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
  it('uses the approved single reflection question', () => {
    render(<SY3Lesson {...props} section={SY3_SECTIONS[4]} />);
    expect(screen.getByLabelText('When this story shows up, what do you notice it changes in the way you respond?')).toBeInTheDocument();
  });
});
