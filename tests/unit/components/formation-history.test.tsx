import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormationHistory } from '../../../components/history/FormationHistory';

describe('FormationHistory', () => {
  it('renders exact wording, structured data, and AI provenance as distinct records without a transcript', () => {
    render(<FormationHistory items={[{
      journal: { id: 'j1', nodeId: 'awaken.pay-attention.observe', entryKind: 'event', body: '  My exact words  ', createdAt: '2026-09-21T10:00:00.000Z' },
      records: [{ id: 'r1', recordType: 'observation', value: 'My exact words', provenance: 'user_authored', createdAt: '2026-09-21T10:00:01.000Z' }],
      artifacts: [{ id: 'a1', artifactType: 'summary', content: { summary: 'A short summary' }, status: 'suggested', provenance: 'ai_suggested', modelId: 'gpt-test', policy: { global: 'g1', stage: 's1', mode: 'm1', outputSchema: 'o1' }, sources: [{ journalEntryId: 'j1', role: 'current', contextGrantId: null, grantRevision: null }, { journalEntryId: 'j0', role: 'selected_prior', contextGrantId: 'grant-7', grantRevision: 3 }], createdAt: '2026-09-21T10:00:02.000Z' }],
    }]} />);

    const wording = screen.getByTestId('history-user-wording-j1');
    expect(within(wording).getByText('User wording')).toBeInTheDocument();
    expect(within(wording).getByText((_content, element) => element?.textContent === '  My exact words  ')).toBeInTheDocument();
    expect(screen.getByText('Structured by you')).toBeInTheDocument();
    expect(screen.getByText('AI suggestion')).toBeInTheDocument();
    expect(screen.getByText(/AI-derived suggestion · Suggested/)).toBeInTheDocument();
    expect(screen.getByText(/gpt-test/)).toBeInTheDocument();
    expect(screen.getByText(/g1 · s1 · m1 · o1/)).toBeInTheDocument();
    expect(screen.getByText(/Current entry/)).toBeInTheDocument();
    expect(screen.getByText(/Selected prior entry \(j0\), grant grant-7 revision 3/)).toBeInTheDocument();
    expect(screen.queryByText(/transcript/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/curriculum progress/i)).not.toBeInTheDocument();
  });
});
