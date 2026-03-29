import { NextResponse } from 'next/server';
import { defaultMemoryQuery } from '@/lib/mastra-client';
import { getMastraBaseUrl } from '@/lib/config';

interface Params {
  params: Promise<{ threadId: string }>;
}

export async function DELETE(_: Request, { params }: Params) {
  const { threadId } = await params;
  const query = defaultMemoryQuery();
  const url = new URL(`/api/memory/threads/${threadId}`, getMastraBaseUrl());
  url.searchParams.set('agentId', query.agentId);
  url.searchParams.set('resourceId', query.resourceId);

  try {
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to delete thread');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete thread' },
      { status: 500 },
    );
  }
}
