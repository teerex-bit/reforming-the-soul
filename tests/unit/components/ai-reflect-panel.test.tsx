import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIReflectPanel } from '../../../components/ai/AIReflectPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AIReflectPanel', () => {
  it('requests reflection, labels AI output, and saves only user-confirmed wording', async () => {
    const requestReflect = vi.fn().mockResolvedValue({ kind: 'success', threadId: 'thread-1', value: { questions: ['What did you notice?'] } });
    const saveInsight = vi.fn().mockResolvedValue(undefined);
    render(<AIReflectPanel requestReflect={requestReflect} saveInsight={saveInsight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reflect with AI' }));
    expect(await screen.findByText('What did you notice?')).toBeInTheDocument();
    expect(screen.getByText('AI reflection')).toBeInTheDocument();
    expect(saveInsight).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('What would you like to save in your own words?'), { target: { value: '  I noticed I was bracing.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my added insight' }));
    await waitFor(() => expect(saveInsight).toHaveBeenCalledWith({ threadId: 'thread-1', insightText: '  I noticed I was bracing.  ' }));
  });

  it('keeps the authored flow usable when AI is unavailable', async () => {
    render(<AIReflectPanel requestReflect={vi.fn().mockResolvedValue({ kind: 'timeout' })} saveInsight={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reflect with AI' }));
    expect(await screen.findByRole('status')).toHaveTextContent('AI Reflect is unavailable');
    expect(screen.getByLabelText('What would you like to save in your own words?')).toBeEnabled();
  });

  it('reuses one intent across transport failure and in-progress retry, then rotates after terminal completion', async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('network lost'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'in_progress', threadId: 'thread-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'success', threadId: 'thread-1', value: { questions: ['What did you notice?'] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'success', threadId: 'thread-2', value: { questions: ['What else did you notice?'] } }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    render(<AIReflectPanel saveInsight={vi.fn()} />);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Reflect with AI' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(attempt + 1));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Reflect with AI' })).toBeEnabled());
    }

    const intents = fetch.mock.calls.map(call => JSON.parse(call[1].body).intentId);
    expect(new Set(intents.slice(0, 3))).toHaveLength(1);
    expect(intents[3]).not.toBe(intents[2]);
  });
});
