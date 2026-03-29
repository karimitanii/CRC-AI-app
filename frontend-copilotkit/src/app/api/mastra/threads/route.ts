import { NextRequest, NextResponse } from 'next/server';
import { defaultMemoryQuery, fetchMastraJson } from '@/lib/mastra-client';
import { ThreadsResponse } from '@/lib/types';

interface CreateThreadBody {
  title?: string;
}

export async function GET() {
  try {
    const threads = await fetchMastraJson<ThreadsResponse>(
      '/api/memory/threads',
      { method: 'GET' },
      defaultMemoryQuery(),
    );

    const sorted = [...(threads.threads ?? [])].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return NextResponse.json({ threads: sorted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load threads' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateThreadBody;

    const thread = await fetchMastraJson('/api/memory/threads', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: defaultMemoryQuery().resourceId,
        title: body.title?.trim() || 'New Chat',
      }),
    }, defaultMemoryQuery());

    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 },
    );
  }
}
