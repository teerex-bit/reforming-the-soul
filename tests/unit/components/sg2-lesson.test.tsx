import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SG2Lesson } from '../../../components/deep-dive/SG2Lesson';
import { SG2_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sg2';

afterEach(cleanup);

describe('SG2 functional expectation', () => {
  it('recognizes one situation and expectation without requiring SG1 context', () => {
    expect(SG2_SECTIONS.map(section => section.id)).toEqual(['entry', 'examples', 'recognition', 'reflection', 'carry-forward']);
    render(<SG2Lesson section={SG2_SECTIONS[2]} record={null} sg1Context={null} reflection={null}
      completed={false} reviewReflection={false} saveRecord={vi.fn()} deleteRecord={vi.fn()}
      saveReflection={vi.fn()} editReflection={vi.fn()} deleteReflection={vi.fn()} />);
    expect(screen.getByLabelText('A real moment I noticed…')).toHaveValue('');
    expect(screen.getByLabelText('In that moment, I expected God to…')).toHaveValue('');
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeInTheDocument();
  });
  it('shows an earlier SG1 picture only as optional read-only context', () => {
    render(<SG2Lesson section={SG2_SECTIONS[2]} record={null} sg1Context={{ learnedGodImage: '  God seemed distant.  ', sourceInfluenceNote: null }} reflection={null}
      completed={false} reviewReflection={false} saveRecord={vi.fn()} deleteRecord={vi.fn()}
      saveReflection={vi.fn()} editReflection={vi.fn()} deleteReflection={vi.fn()} />);
    expect(screen.getByText('Look back at my SG1 picture (optional)')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByLabelText('In that moment, I expected God to…')).toHaveValue('');
  });
});
