import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SG3Lesson } from '../../../components/deep-dive/SG3Lesson';
import { SG3_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sg3';

afterEach(cleanup);
const actions = { saveRecord: vi.fn(), deleteRecord: vi.fn(), saveReflection: vi.fn(), editReflection: vi.fn(), deleteReflection: vi.fn() };

describe('SG3 observation of Jesus', () => {
  it('grounds the lesson in the Father revealed by Jesus and offers one observation', () => {
    expect(SG3_SECTIONS.map(section => section.id)).toEqual(['entry', 'scripture', 'scenes', 'observation', 'reflection', 'carry-forward']);
    expect(SG3_SECTIONS[1].paragraphs.join(' ')).toContain('John 14:9');
    expect(SG3_SECTIONS[1].paragraphs.join(' ')).toContain('Hebrews 1:3');
    expect(SG3_SECTIONS[2].paragraphs.join(' ')).toContain('John 21');
    render(<SG3Lesson {...actions} section={SG3_SECTIONS[3]} record={null} sg2Context={null} reflection={null} completed={false} reviewReflection={false} />);
    expect(screen.getByLabelText('When I look at Jesus here, what do I notice about God?')).toHaveValue('');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeInTheDocument();
  });
  it('keeps the prior SG2 expectation optional and read-only', () => {
    render(<SG3Lesson {...actions} section={SG3_SECTIONS[3]} record={null}
      sg2Context={{ situation: 'Waiting', expectation: '  I expected silence.  ' }} reflection={null} completed={false} reviewReflection={false} />);
    expect(screen.getByText('My earlier expectation (optional)')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByLabelText('When I look at Jesus here, what do I notice about God?')).toHaveValue('');
  });
});
