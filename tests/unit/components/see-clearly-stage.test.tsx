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
    expect(screen.getByRole('link', { name: 'Begin SY2' })).toBeInTheDocument();
    expect(document.getElementById('see-yourself-sy2')).toHaveTextContent('Follow the Formation Chain');
    expect(document.getElementById('see-god-sg1')).toHaveTextContent('The God I Learned');
  });
  it('offers SY2 after SY1 and keeps SY3 as the next group item', () => {
    render(<SeeClearlyStage status="review" sy2Status="begin" />);
    expect(screen.getByRole('link', { name: 'Begin SY2' })).toHaveAttribute('href', '/deep-dive/see-clearly/follow-the-formation-chain');
    expect(document.getElementById('see-yourself-sy3')).toHaveTextContent('The Learned Self-Story');
  });
  it('offers SY3 after SY2 and marks SY4 next only after SY3 completion', () => {
    render(<SeeClearlyStage status="review" sy2Status="review" sy3Status="begin" />);
    expect(screen.getByRole('link', { name: 'Begin SY3' })).toHaveAttribute('href', '/deep-dive/see-clearly/the-learned-self-story');
    expect(document.getElementById('see-yourself-sy4')).not.toHaveTextContent('Up next');
    cleanup();
    render(<SeeClearlyStage status="review" sy2Status="review" sy3Status="review" />);
    expect(screen.getByRole('link', { name: 'Review SY3' })).toHaveAttribute('href', '/deep-dive/see-clearly/the-learned-self-story?section=entry');
    expect(screen.getByRole('link', { name: 'Begin SY4' })).toHaveAttribute('href', '/deep-dive/see-clearly/what-is-actually-true-about-me');
  });
  it('opens SG1 after SY4 completion and marks SG2 next after SG1 completion', () => {
    render(<SeeClearlyStage status="review" sy2Status="review" sy3Status="review" sy4Status="review" />);
    expect(screen.getByRole('link', { name: 'Review SY4' })).toHaveAttribute('href', '/deep-dive/see-clearly/what-is-actually-true-about-me?section=entry');
    expect(screen.getByText('Up next: SG1 — The God I Learned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Begin SG1' })).toHaveAttribute('href', '/deep-dive/see-clearly/the-god-i-learned');
    cleanup();
    render(<SeeClearlyStage status="review" sy2Status="review" sy3Status="review" sy4Status="review" sg1Status="review" />);
    expect(screen.getByRole('link', { name: 'Review SG1' })).toHaveAttribute('href', '/deep-dive/see-clearly/the-god-i-learned?section=entry');
    expect(screen.getByText('Up next: SG2 — What I Expect From God')).toBeInTheDocument();
  });
});
