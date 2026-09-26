import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SG1Lesson } from '../../../components/deep-dive/SG1Lesson';
import { SG1_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sg1';

afterEach(cleanup);
const props = { record: null, reflection: null, completed: false, reviewReflection: false,
  saveImage: vi.fn(), deleteImage: vi.fn(), saveReflection: vi.fn(), editReflection: vi.fn(), deleteReflection: vi.fn() };

describe('SG1 participant recognition', () => {
  it('opens with narrative and separates recognition from future SG2/SG3 questions', () => {
    expect(SG1_SECTIONS.map(section => section.id)).toEqual(['entry', 'formation', 'influences', 'recognition', 'reflection', 'carry-forward']);
    expect(SG1_SECTIONS[0].paragraphs[0]).toContain('Someone may sincerely believe');
    expect(SG1_SECTIONS[5].paragraphs.join(' ')).toContain('SG2 — What I Expect From God');
    render(<SG1Lesson {...props} section={SG1_SECTIONS[3]} />);
    expect(screen.getByLabelText('The God I learned seemed…')).toHaveValue('');
    expect(screen.getByLabelText(/Some things that may have shaped this picture/)).toHaveValue('');
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Continue without saving a picture' })).toBeInTheDocument();
  });
  it('keeps participant wording controlled and makes deletion independent', () => {
    render(<SG1Lesson {...props} section={SG1_SECTIONS[3]} completed record={{ learnedGodImage: 'He seemed far away.', sourceInfluenceNote: null }} />);
    fireEvent.change(screen.getByLabelText('The God I learned seemed…'), { target: { value: '  He may be patient.  ' } });
    expect(screen.getByLabelText('The God I learned seemed…')).toHaveValue('  He may be patient.  ');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete saved picture' })).toBeInTheDocument();
  });
  it('offers optional private reflection and clears it after deletion', () => {
    const view = render(<SG1Lesson {...props} section={SG1_SECTIONS[4]} completed reviewReflection reflection="It feels familiar." />);
    expect(screen.getByLabelText('What makes this picture of God feel familiar to you?')).toHaveValue('It feels familiar.');
    view.rerender(<SG1Lesson {...props} section={SG1_SECTIONS[4]} completed reviewReflection reflection={null} />);
    expect(screen.getByLabelText('What makes this picture of God feel familiar to you?')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Delete reflection' })).not.toBeInTheDocument();
  });
});
