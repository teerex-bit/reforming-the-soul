import { AuthenticationRequiredError } from '../../../../server/auth/require-actor';
import { deleteJournalEntry } from '../../../../server/services/journal-deletion-service';

const headers = { 'cache-control': 'no-store', 'content-type': 'application/json' };
type Context = Readonly<{ params: Promise<{ entryId: string }> }>;
type Dependencies = Readonly<{ remove?: typeof deleteJournalEntry }>;

export async function DELETE(request: Request, context: Context, dependencies: Dependencies = {}) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return new Response(JSON.stringify({ kind: 'forbidden' }), { status: 403, headers });
    }
    const body = await request.json() as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || body.confirmation !== 'DELETE') {
      return new Response(JSON.stringify({ kind: 'invalid_request' }), { status: 400, headers });
    }
    const { entryId } = await context.params;
    const result = await (dependencies.remove ?? deleteJournalEntry)({ entryId });
    return new Response(JSON.stringify(result), { status: result.kind === 'unavailable' ? 404 : 200, headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return new Response(JSON.stringify({ kind: 'unauthorized' }), { status: 401, headers });
    if (error instanceof SyntaxError || (error instanceof Error && /UUID/.test(error.message))) {
      return new Response(JSON.stringify({ kind: 'invalid_request' }), { status: 400, headers });
    }
    return new Response(JSON.stringify({ kind: 'unavailable' }), { status: 404, headers });
  }
}
