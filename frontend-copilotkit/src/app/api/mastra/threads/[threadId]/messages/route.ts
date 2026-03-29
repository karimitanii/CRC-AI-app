import { NextResponse } from 'next/server';
import { defaultMemoryQuery, fetchMastraJson } from '@/lib/mastra-client';
import { ThreadMessagesResponse } from '@/lib/types';

interface Params {
  params: Promise<{ threadId: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { threadId } = await params;
  try {
    const messages = await fetchMastraJson<ThreadMessagesResponse>(
      `/api/memory/threads/${threadId}/messages`,
      { method: 'GET' },
      defaultMemoryQuery(),
    );

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load messages' },
      { status: 500 },
    );
  }
}
