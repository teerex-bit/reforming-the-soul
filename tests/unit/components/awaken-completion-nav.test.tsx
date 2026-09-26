import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AwakenCompletionNav } from '../../../components/deep-dive/AwakenCompletionNav';

afterEach(cleanup);

describe('completed Awaken lesson navigation', () => {
  const handoffs = [
    ['a1', 'Continue to A2', '/deep-dive/awaken/catch-yourself-being-you'],
    ['a2', 'Continue to A3', '/deep-dive/awaken/your-reactions-have-a-history'],
    ['a3', 'Continue to A4', '/deep-dive/awaken/formation-is-not-identity'],
    ['a4', 'Continue to See Clearly', '/deep-dive/see-clearly'],
  ] as const;

  for (const [module, label, href] of handoffs) {
    it(`${module} presents a forward link and a quiet route back to Awaken`, () => {
      render(<AwakenCompletionNav module={module} />);
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
      expect(screen.getByRole('link', { name: 'Back to Awaken' })).toHaveAttribute('href', '/deep-dive/awaken');
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });
  }
  it('lets A1 end with a quiet return while leaving A2 available', () => {
    render(<AwakenCompletionNav module="a1" />);
    const [returnLink, forwardLink] = screen.getAllByRole('link');
    expect(returnLink).toHaveTextContent('Back to Awaken');
    expect(returnLink).toHaveClass('button--secondary');
    expect(forwardLink).toHaveTextContent('Continue to A2');
    expect(forwardLink).not.toHaveClass('button');
  });
});
