import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SeeClearlyStage } from '../../../components/deep-dive/SeeClearlyStage';

afterEach(cleanup);

describe('See Clearly movements', () => {
  it('shows two module groups with only the built SY1 lesson as an action', () => {
    render(<SeeClearlyStage status="begin" />);
    expect(screen.getByRole('heading', { name: 'See Yourself Clearly' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'See God Clearly' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'See Yourself Clearly modules' }).children).toHaveLength(4);
    expect(screen.getByRole('list', { name: 'See God Clearly modules' }).children).toHaveLength(4);
    expect(screen.getByText('SY1')).toBeInTheDocument();
    expect(screen.getByText('SG1')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Begin SY1' })).toHaveAttribute('href', '/deep-dive/see-clearly/facts-and-interpretation');
  });

  it('opens completed SY1 from entry for review', () => {
    render(<SeeClearlyStage status="review" />);
    expect(screen.getByRole('link', { name: 'Review SY1' })).toHaveAttribute('href', '/deep-dive/see-clearly/facts-and-interpretation?section=entry');
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(document.getElementById('see-yourself-sc2')).toHaveTextContent('Follow the Formation Chain');
    expect(document.getElementById('see-god-sc5')).toHaveTextContent('The God I Learned');
  });
});
