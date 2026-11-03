// Classifier client for the local Python MAE RealWaste inference service.
// Weight loading/inference happen on the server, not in a visitor's browser.
export type MaePrediction = {
  label: string;
  originalClass: string;
  canUseInTransaction: boolean;
  confidence: number; // raw 9-way softmax, NOT validated accuracy
  modelName: string;
  preprocessMs: number;
  inferenceMs: number;
  endToEndMs: number; // includes browser upload + Next.js proxy + Python inference
  topMatches: Array<{ label: string; originalClass: string; score: number }>;
  scores: number[];
};

export async function classifyMae(imageSrc: string, report?: (message: string) => void): Promise<MaePrediction> {
  report?.('Mengirim foto ke server MAE RealWaste...');
  const start = performance.now();
  const imageResponse = await fetch(imageSrc);
  const blob = await imageResponse.blob();
  if (blob.size > 8 * 1024 * 1024) throw new Error('Foto terlalu besar (maksimum 8 MB). Crop atau pilih foto lain.');
  const formData = new FormData();
  formData.append('file', blob, 'foto-sampah.jpg');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch('/api/mae/predict', { method: 'POST', body: formData, signal: controller.signal });
    const json: unknown = await response.json();
    if (!response.ok) {
      const msg = json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Server klasifikasi gagal (${response.status}).`;
      throw new Error(msg);
    }
    if (!json || typeof json !== 'object') throw new Error('Server MAE tidak mengirim data JSON.');
    const result = json as Partial<MaePrediction>;
    if (typeof result.label !== 'string' || typeof result.originalClass !== 'string'
      || typeof result.confidence !== 'number' || !Array.isArray(result.topMatches)
      || typeof result.inferenceMs !== 'number' || typeof result.preprocessMs !== 'number'
      || typeof result.canUseInTransaction !== 'boolean') {
      throw new Error('Format keluaran server MAE tidak sesuai.');
    }
    report?.('Prediksi MAE selesai.');
    return {
      ...result,
      label: result.label,
      originalClass: result.originalClass,
      confidence: result.confidence,
      canUseInTransaction: result.canUseInTransaction,
      inferenceMs: result.inferenceMs,
      preprocessMs: result.preprocessMs,
      modelName: result.modelName ?? 'MAE RealWaste (ViT-Base)',
      topMatches: result.topMatches,
      scores: result.scores ?? [],
      endToEndMs: performance.now() - start,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Server MAE tidak merespons dalam 120 detik. Periksa terminal Python.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
