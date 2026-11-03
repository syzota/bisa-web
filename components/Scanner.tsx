'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp, ScanLine, LoaderCircle, ShieldAlert, CheckCircle2, Crop, RotateCcw, GitCompareArrows, ClipboardCheck, ChevronDown } from 'lucide-react';
import styles from './ScannerClean.module.css';
import CropEditor, { type CropRegion } from './CropEditor';
import { classifyMae, type MaePrediction } from '@/lib/mae-classifier';
import { type ScanLog, uid } from '@/lib/data';

const LABELS = ['Kardus', 'Kaca', 'Logam', 'Kertas', 'Plastik', 'Sampah lainnya/residu'];
type Props = { onResult: (row: ScanLog) => void; onChoose: (label: string) => void };

export default function Scanner({ onResult, onChoose }: Props) {
  const [src, setSrc] = useState('');
  const [originalSrc, setOriginalSrc] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [comparison, setComparison] = useState<{ original: MaePrediction; cropped: MaePrediction } | null>(null);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadStatus, setLoadStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<MaePrediction | null>(null);
  const [manualLabel, setManualLabel] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCameraOn(false); };
  useEffect(() => () => { stream.current?.getTracks().forEach(t => t.stop()); }, []);

  async function startCamera() {
    try {
      setError(''); stop();
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.current = s; setCameraOn(true);
      window.setTimeout(() => {
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      }, 0);
    } catch (e) { setError(`Kamera gagal: ${e instanceof Error ? e.message : 'izin ditolak'}. Gunakan localhost atau HTTPS.`); }
  }

  function takePhoto() {
    const v = video.current; if (!v?.videoWidth) return;
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    const nextSrc = canvas.toDataURL('image/jpeg', 0.9);
    setSrc(nextSrc); setOriginalSrc(nextSrc); setCropRegion(null); setComparison(null);
    setSource('camera'); setResult(null); setGroundTruth(''); stop();
  }

  function loadPhoto(f?: File) {
    if (!f) return;
    stop(); setError(''); setResult(null); setComparison(null); setCropRegion(null);
    setSource(f.name); setGroundTruth('');
    const reader = new FileReader();
    reader.onload = () => { const image = String(reader.result || ''); setSrc(image); setOriginalSrc(image); };
    reader.readAsDataURL(f);
  }

  function applyCrop(nextSrc: string, region: CropRegion) {
    setSrc(nextSrc); setCropRegion(region); setCropOpen(false); setResult(null); setComparison(null); setError('');
  }
  function restoreOriginal() {
    setSrc(originalSrc); setCropRegion(null); setResult(null); setComparison(null); setError('');
  }

  function recordPrediction(r: MaePrediction, mode: string, pairId = '') {
    onResult({
      id: uid(), timestamp: new Date().toISOString(),
      source: `${source} | model:${r.modelName} | original_class:${r.originalClass} | ${mode}${pairId ? ` | pair:${pairId}` : ''}`,
      prediction: r.label, confidence: r.confidence, groundTruth,
      preprocessMs: r.preprocessMs, inferenceMs: r.inferenceMs,
      status: r.canUseInTransaction ? 'predicted_unverified' : 'outside_bisa_taxonomy',
      loadMs: 0,
    });
  }

  async function compareCrop() {
    if (!src || !originalSrc || !cropRegion) return;
    setBusy(true); setError(''); setResult(null); setComparison(null); setLoadStatus('');
    try {
      const base = await classifyMae(originalSrc, setLoadStatus);
      const cropped = await classifyMae(src, setLoadStatus);
      const pairId = uid();
      recordPrediction(base, 'original', pairId);
      recordPrediction(cropped, 'manual_crop', pairId);
      setComparison({ original: base, cropped }); setResult(cropped);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setLoadStatus(''); }
  }

  async function scan() {
    if (!src) return;
    setBusy(true); setError(''); setResult(null); setComparison(null); setLoadStatus('');
    try {
      const prediction = await classifyMae(src, setLoadStatus);
      setResult(prediction); recordPrediction(prediction, cropRegion ? 'manual_crop' : 'original');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setLoadStatus(''); }
  }

  return <div className="scan-layout">
    <div className="scan-main">
      <div className="scan-preview">
        {cameraOn
          ? <video ref={video} playsInline autoPlay muted className="scan-image" />
          : src
            ? <img src={src} alt="Foto sampah" className="scan-image" />
            : <div className="scan-empty"><div className="scan-empty-icon"><ScanLine size={28} /></div>
                <strong>Siapkan foto sampah</strong><span>Aktifkan kamera atau pilih gambar dari perangkat</span></div>}
        <div className="scan-tag">BISA SMART CAMERA <span>•</span> {cropRegion ? 'FOTO CROP' : 'FOTO ASLI'}</div>
      </div>
      <div className="button-row" style={{ marginTop: 16 }}>
        {cameraOn ? <>
          <button className="btn primary" onClick={takePhoto}><Camera size={16} /> Ambil foto</button>
          <button className="btn subtle" onClick={stop}><CameraOff size={16} /> Tutup kamera</button>
        </> : <>
          <button className="btn secondary" onClick={startCamera}><Camera size={16} /> Kamera</button>
          <button className="btn subtle" onClick={() => file.current?.click()}><ImageUp size={16} /> Pilih foto</button>
        </>}
        <input hidden ref={file} type="file" accept="image/*" onChange={e => loadPhoto(e.target.files?.[0])} />
        {!cameraOn && src && <button className="btn secondary" onClick={() => setCropOpen(true)} disabled={busy}>
          <Crop size={16} /> Crop objek</button>}
        {!cameraOn && cropRegion && <button className="btn subtle" onClick={restoreOriginal} disabled={busy}>
          <RotateCcw size={16} /> Foto asli</button>}
        <button className="btn primary" onClick={scan} disabled={!src || busy || cameraOn}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <ScanLine size={16} />}
          {busy ? 'Memproses...' : 'Scan AI'}
        </button>
      </div>
      <details className={styles.evaluation}>
        <summary className={styles.evaluationSummary}>
          <span className={styles.evaluationIcon}><ClipboardCheck size={17} /></span>
          <span className={styles.evaluationHeading}>
            <strong>Opsi evaluasi penelitian</strong>
            <small>Hanya untuk mencatat hasil pengujian AI</small>
          </span>
          <span className={styles.optional}>Opsional</span>
          <ChevronDown className={styles.evaluationChevron} size={17} aria-hidden="true" />
        </summary>
        <div className={styles.evaluationBody}>
          <p>Isi kategori yang benar <strong>sebelum Scan AI</strong> jika sedang mengumpulkan data penelitian.
            Pilihan ini tidak mengubah prediksi AI.</p>
          <label className={styles.evaluationLabel} htmlFor="bisa-scan-groundtruth">Kategori sebenarnya</label>
          <select id="bisa-scan-groundtruth" className={styles.evaluationSelect} value={groundTruth} disabled={busy}
            onChange={e => setGroundTruth(e.target.value)}>
            <option value="">Tidak dicatat</option>
            {LABELS.map(label => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>
      </details>
      {!cameraOn && cropRegion && <div className="crop-benchmark">
        <span>Crop manual aktif. Bandingkan hasil foto asli vs crop pada model yang sama.</span>
        <button type="button" className="btn secondary" disabled={busy} onClick={compareCrop}>
          <GitCompareArrows size={16} /> Bandingkan asli vs crop</button>
      </div>}
      {loadStatus && <div className="crop-benchmark" role="status" style={{ marginTop: 12 }}>
        <LoaderCircle className="spin" size={17} /><span>{loadStatus}</span>
      </div>}
      <p className="helper">Pastikan objek sampah terlihat jelas. Periksa jenis hasil scan sebelum digunakan dalam transaksi.</p>
      {error && <div className="alert warning"><ShieldAlert size={18} /><div>
        <strong>Inference belum berhasil</strong><p>{error}</p>
        <p>Periksa koneksi layanan AI, atau gunakan pemilihan jenis sampah secara manual.</p>
      </div></div>}
    </div>
    <div className="scan-side">
      <div className="side-heading">Hasil identifikasi</div>
      {comparison && <div className="crop-compare-results">
        <strong>Perbandingan foto asli dan crop</strong>
        <div><span>Foto asli</span><b>{comparison.original.label}</b>
          <small>{(comparison.original.confidence * 100).toFixed(1)}% softmax · {comparison.original.inferenceMs.toFixed(1)} ms</small></div>
        <div><span>Crop manual</span><b>{comparison.cropped.label}</b>
          <small>{(comparison.cropped.confidence * 100).toFixed(1)}% softmax · {comparison.cropped.inferenceMs.toFixed(1)} ms</small></div>
      </div>}
      {result ? <>
        <div className="prediction-icon">{result.canUseInTransaction ? <CheckCircle2 size={28} /> : <ShieldAlert size={28} />}</div>
        <div className="prediction-name">{result.label}</div>
        <div className="prediction-confidence">Skor model {(result.confidence * 100).toFixed(1)}% <span title="Skor model bukan tingkat akurasi yang teruji">· bukan jaminan akurasi</span></div>
        {!result.canUseInTransaction && <div className="alert warning">
          Kelas ini tidak termasuk enam kategori BISA. Jangan otomatis mengubahnya menjadi residu; gunakan konfirmasi manual.
        </div>}
        <details className={styles.resultDetails}>
          <summary className={styles.resultSummary}>Lihat detail analisis <ChevronDown size={15} aria-hidden="true" /></summary>
          <div className={styles.resultBody}>
            <p>Kategori asli model: <strong>{result.originalClass}</strong></p>
            {groundTruth && <p>Kategori sebenarnya: <strong>{groundTruth}</strong> · {groundTruth === result.label ? 'Prediksi cocok' : 'Prediksi berbeda'}</p>}
            <p className={styles.resultCaption}>3 prediksi tertinggi model (9 kelas asal)</p>
            {result.topMatches.map(item => <div className={styles.resultMatch} key={item.originalClass}>
              <span>{item.originalClass}</span><strong>{(item.score * 100).toFixed(1)}%</strong>
            </div>)}
          </div>
        </details>
        <div className="scan-scoregrid">
          <div><small>Inferensi server (CPU)</small><strong>{result.inferenceMs.toFixed(1)} ms</strong></div>
          <div><small>Preprocess server</small><strong>{result.preprocessMs.toFixed(1)} ms</strong></div>
          <div><small>End-to-end (termasuk upload)</small><strong>{result.endToEndMs.toFixed(1)} ms</strong></div>
        </div>
        <button className="btn primary full" disabled={!result.canUseInTransaction}
          onClick={() => result.canUseInTransaction && onChoose(result.label)}>Gunakan hasil di transaksi</button>
        <p className="helper">Selalu periksa jenis sampah sebelum menyimpan transaksi.</p>
      </> : <div className="muted-block">Hasil identifikasi akan muncul setelah kamu mengambil foto dan menekan Scan AI.</div>}
      <div className="manual-box">
        <strong>Pilih jenis secara manual</strong><p>Jika AI salah atau kelasnya tidak sesuai kategori BISA.</p>
        <select value={manualLabel} onChange={e => setManualLabel(e.target.value)}>
          <option value="">Pilih jenis sampah</option>{LABELS.map(label => <option key={label}>{label}</option>)}
        </select>
        <button disabled={!manualLabel} className="btn subtle full" onClick={() => onChoose(manualLabel)}>
          Gunakan pilihan ini</button>
      </div>
    </div>
    {cropOpen && originalSrc && <CropEditor src={originalSrc} onApply={applyCrop} onCancel={() => setCropOpen(false)} />}
  </div>;
}
