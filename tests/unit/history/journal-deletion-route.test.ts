import { describe, expect, it, vi } from 'vitest';
import { DELETE } from '../../../app/api/journal/[entryId]/route';

const entryId = '10000000-0000-4000-8000-000000000001';
const request = (body: unknown, origin = 'https://rts.test') => new Request(`https://rts.test/api/journal/${entryId}`, {
  method: 'DELETE', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
});

describe('journal deletion route', () => {
  it('requires an exact explicit confirmation before invoking deletion', async () => {
    const remove = vi.fn();
    for (const body of [{}, { confirmation: true }, { confirmation: 'delete' }, { confirmation: 'DELETE', extra: true }]) {
      const response = await DELETE(request(body), { params: Promise.resolve({ entryId }) }, { remove });
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests and returns a neutral unavailable response', async () => {
    const remove = vi.fn();
    expect((await DELETE(request({ confirmation: 'DELETE' }, 'https://attacker.test'), { params: Promise.resolve({ entryId }) }, { remove })).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
    remove.mockResolvedValue({ kind: 'unavailable' });
    const response = await DELETE(request({ confirmation: 'DELETE' }), { params: Promise.resolve({ entryId }) }, { remove });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ kind: 'unavailable' });
  });

  it('returns content-free success without echoing the deleted ID or user wording', async () => {
    const remove = vi.fn().mockResolvedValue({ kind: 'deleted', dependentArtifactCount: 1, dependentRecordCount: 2, dependentLinkCount: 3, grantCount: 1 });
    const response = await DELETE(request({ confirmation: 'DELETE' }), { params: Promise.resolve({ entryId }) }, { remove });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ kind: 'deleted', dependentArtifactCount: 1, dependentRecordCount: 2, dependentLinkCount: 3, grantCount: 1 });
    expect(JSON.stringify(body)).not.toContain(entryId);
  });
});
