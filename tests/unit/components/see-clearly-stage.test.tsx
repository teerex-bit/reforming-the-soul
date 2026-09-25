import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SeeClearlyStage } from '../../../components/deep-dive/SeeClearlyStage';

afterEach(cleanup);

describe('See Clearly movements', () => {
  it('shows two module groups with only the built SC1 lesson as an action', () => {
    render(<SeeClearlyStage status="begin" />);
    expect(screen.getByRole('heading', { name: 'See Yourself Clearly' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'See God Clearly' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'See Yourself Clearly modules' }).children).toHaveLength(4);
    expect(screen.getByRole('list', { name: 'See God Clearly modules' }).children).toHaveLength(4);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Begin SC1' })).toHaveAttribute('href', '/deep-dive/see-clearly/facts-and-interpretation');
  });

  it('opens completed SC1 from entry for review', () => {
    render(<SeeClearlyStage status="review" />);
    expect(screen.getByRole('link', { name: 'Review SC1' })).toHaveAttribute('href', '/deep-dive/see-clearly/facts-and-interpretation?section=entry');
  });
});
