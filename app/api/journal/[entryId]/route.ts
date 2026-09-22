import { handleJournalDelete } from './handler';

type Context = Readonly<{ params: Promise<{ entryId: string }> }>;

export async function DELETE(request: Request, context: Context) {
  return handleJournalDelete(request, context);
}
