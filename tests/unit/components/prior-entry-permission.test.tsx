import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PriorEntryPermission } from '../../../components/ai/PriorEntryPermission';

it('states the one-entry permission boundary and offers grant or revoke', () => {
  render(<PriorEntryPermission source={{ id: 'entry-a', preview: 'The meeting ended early.', grant: null }} grant={vi.fn()} revoke={vi.fn()} />);
  expect(screen.getByText(/Only this selected entry will be added/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Allow this entry' })).toBeInTheDocument();
});
