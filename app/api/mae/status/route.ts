import { NextResponse } from 'next/server';

// Optional deployment diagnostic. Never exposes private Railway URLs or secrets.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = process.env.MAE_INFERENCE_URL
    ?? (process.env.RAILWAY_ENVIRONMENT ? '' : 'http://127.0.0.1:8765');

  if (!backendUrl.trim()) {
    return NextResponse.json(
      { status: 'not_configured', message: 'MAE_INFERENCE_URL belum diatur.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`MAE health returned ${response.status}`);
    const result: unknown = await response.json();
    const isReady = typeof result === 'object'
      && result !== null && 'status' in result && result.status === 'ready';

    return NextResponse.json(
      { status: isReady ? 'ready' : 'not_ready', service: 'MAE RealWaste' },
      { status: isReady ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[BISA] MAE healthcheck failed:', error);
    return NextResponse.json(
      { status: 'unavailable', message: 'Backend AI tidak dapat dihubungi.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
