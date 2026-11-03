import { NextRequest, NextResponse } from 'next/server';

// Runtime Node required to forward image upload to the local Python backend.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const LIMIT = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Body harus berisi foto (multipart/form-data).' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Kirim file gambar melalui field file.' }, { status: 400 });
  }
  if (file.size === 0 || file.size > LIMIT) {
    return NextResponse.json({ error: 'Ukuran foto harus lebih dari 0 dan maksimal 8 MB.' }, { status: 413 });
  }

  // Important: server-side env only. Do not expose this endpoint openly in
  // production before integrating authentication and request rate limiting.
  const backendUrl = (process.env.MAE_INFERENCE_URL ?? 'http://127.0.0.1:8765').replace(/\/$/, '');
  const outgoing = new FormData();
  outgoing.append('file', file, file.name);
  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/predict`, {
      method: 'POST',
      body: outgoing,
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[BISA-MAE] Backend unreachable:', error);
    return NextResponse.json({
      error: 'Server AI Python belum aktif. Jalankan MAE backend di port 8765 dan cek /health.',
    }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return NextResponse.json({ error: 'Server MAE mengirim respons yang tidak valid.' }, { status: 502 });
  }
  if (!upstream.ok) {
    const detail = typeof body === 'object' && body && 'detail' in body
      ? String((body as { detail: unknown }).detail)
      : `Inference MAE gagal (${upstream.status}).`;
    return NextResponse.json({ error: detail }, { status: upstream.status >= 500 ? 502 : upstream.status });
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
