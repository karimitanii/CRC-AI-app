import { NextRequest, NextResponse } from 'next/server';
import { getMastraBaseUrl } from '@/lib/config';

function buildTargetUrl(pathSegments: string[] | undefined, request: NextRequest): string {
  const base = getMastraBaseUrl().replace(/\/$/, '');
  const suffix = pathSegments && pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  const url = new URL(`${base}/chat${suffix}`);
  url.search = request.nextUrl.search;
  return url.toString();
}

async function proxyRequest(request: NextRequest, pathSegments: string[] | undefined): Promise<NextResponse> {
  const targetUrl = buildTargetUrl(pathSegments, request);
  const bodyText =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  const forwardedHeaders = new Headers();
  const accept = request.headers.get('accept');
  const contentType = request.headers.get('content-type');
  const userAgent = request.headers.get('user-agent');
  const copilotVersion = request.headers.get('x-copilotkit-runtime-client-gql-version');

  if (accept) forwardedHeaders.set('accept', accept);
  if (contentType) forwardedHeaders.set('content-type', contentType);
  if (userAgent) forwardedHeaders.set('user-agent', userAgent);
  if (copilotVersion) forwardedHeaders.set('x-copilotkit-runtime-client-gql-version', copilotVersion);

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: forwardedHeaders,
      body: bodyText,
      cache: 'no-store',
    });

    const headers = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) {
      headers.set('content-type', upstreamContentType);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reach Copilot runtime',
        targetUrl,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
