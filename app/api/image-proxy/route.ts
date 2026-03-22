import { NextRequest, NextResponse } from 'next/server';

// Allowlist: only proxy images from trusted domains
const ALLOWED_HOSTS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse('Host not allowed', { status: 403 });
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'HabitApp/1.0 (educational project)' },
  });

  if (!response.ok) {
    return new NextResponse(`Upstream error: ${response.status}`, { status: 502 });
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await response.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // cache for 1 day
    },
  });
}
