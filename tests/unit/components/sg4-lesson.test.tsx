import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SG4Lesson } from '../../../components/deep-dive/SG4Lesson';
import { SG4_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sg4';

afterEach(cleanup);
const actions = { saveRecord: vi.fn(), deleteRecord: vi.fn(), saveReflection: vi.fn(), editReflection: vi.fn(), deleteReflection: vi.fn() };

describe('SG4 trust in one unresolved moment', () => {
  it('invites one participant situation and trust statement without an assigned outcome', () => {
    expect(SG4_SECTIONS.map(section => section.id)).toEqual(['entry', 'uncertainty', 'scripture', 'trust-question', 'reflection', 'carry-forward']);
    expect(SG4_SECTIONS[5].paragraphs.join(' ')).toContain('Release control');
    render(<SG4Lesson {...actions} section={SG4_SECTIONS[3]} record={null} sg3Context={null} reflection={null} completed={false} reviewReflection={false} />);
    expect(screen.getByLabelText('One unresolved situation…')).toHaveValue('');
    expect(screen.getByLabelText('In this situation, trusting God would mean…')).toHaveValue('');
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeInTheDocument();
  });
  it('shows SG3 wording as optional read-only context without pre-filling trust', () => {
    render(<SG4Lesson {...actions} section={SG4_SECTIONS[3]} record={null} sg3Context={{ observation: '  Jesus remained with Peter.  ' }} reflection={null} completed={false} reviewReflection={false} />);
    expect(screen.getByText('My SG3 observation (optional)')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByLabelText('In this situation, trusting God would mean…')).toHaveValue('');
  });
});
