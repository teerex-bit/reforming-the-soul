import { handleAiReflectPost } from './handler';

export async function POST(request: Request) {
  return handleAiReflectPost(request);
}
