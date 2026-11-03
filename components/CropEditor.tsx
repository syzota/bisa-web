'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { Check, Crop, RotateCcw, X } from 'lucide-react';

export type CropRegion = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Props = {
  src: string;
  onApply: (croppedDataUrl: string, region: CropRegion) => void;
  onCancel: () => void;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const initialRegion: CropRegion = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

export default function CropEditor({ src, onApply, onCancel }: Props) {
  const photo = useRef<HTMLImageElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const anchor = useRef<Point | null>(null);
  const [region, setRegion] = useState<CropRegion>(initialRegion);
  const [error, setError] = useState('');

  function coordinate(e: PointerEvent<HTMLDivElement>): Point {
    const box = area.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return { x: 0, y: 0 };
    return { x: clamp((e.clientX - box.left) / box.width), y: clamp((e.clientY - box.top) / box.height) };
  }
  function regionBetween(start: Point, end: Point): CropRegion {
    return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setError('');
    anchor.current = coordinate(e);
    area.current?.setPointerCapture(e.pointerId);
    setRegion({ ...anchor.current, width: 0, height: 0 });
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (anchor.current) setRegion(regionBetween(anchor.current, coordinate(e)));
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (!anchor.current) return;
    setRegion(regionBetween(anchor.current, coordinate(e)));
    anchor.current = null;
    if (area.current?.hasPointerCapture(e.pointerId)) area.current.releasePointerCapture(e.pointerId);
  }
  function apply() {
    try {
      const image = photo.current;
      if (!image?.complete || !image.naturalWidth || !image.naturalHeight) throw new Error('Gambar belum selesai dimuat.');
      if (region.width < 0.02 || region.height < 0.02) throw new Error('Area crop terlalu kecil. Tarik kotak di atas objek.');
      const sx = Math.round(region.x * image.naturalWidth);
      const sy = Math.round(region.y * image.naturalHeight);
      const sw = Math.min(image.naturalWidth - sx, Math.max(1, Math.round(region.width * image.naturalWidth)));
      const sh = Math.min(image.naturalHeight - sy, Math.max(1, Math.round(region.height * image.naturalHeight)));
      const canvas = document.createElement('canvas'); canvas.width = sw; canvas.height = sh;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas tidak tersedia di browser ini.');
      context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      onApply(canvas.toDataURL('image/jpeg', 0.94), region);
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return <div className="crop-modal" role="dialog" aria-modal="true" aria-label="Crop foto sampah">
    <div className="crop-dialog">
      <div className="crop-head"><div><strong><Crop size={18}/> Crop objek sampah</strong><p>Tarik kotak di sekitar objek. Hindari memasukkan latar belakang yang tidak perlu.</p></div><button type="button" className="crop-close" onClick={onCancel} aria-label="Tutup crop"><X size={20}/></button></div>
      <div className="crop-stage">
        <div ref={area} className="crop-photo-area" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {/* Plain img deliberately used so browser-native canvas can crop original pixels. */}
          <img ref={photo} src={src} alt="Pilih area objek sampah" draggable={false} />
          <div className="crop-selection" style={{ left:`${region.x * 100}%`, top:`${region.y * 100}%`, width:`${region.width * 100}%`, height:`${region.height * 100}%` }} />
        </div>
      </div>
      <div className="crop-foot">
        <span className="crop-note">Crop manual = pilih kotak, bukan segmentasi otomatis. Model AI tetap MAE RealWaste (6 kategori BISA).</span>
        <div className="crop-actions"><button type="button" className="btn subtle" onClick={() => setRegion(initialRegion)}><RotateCcw size={15}/> Reset kotak</button><button type="button" className="btn secondary" onClick={onCancel}>Batal</button><button type="button" className="btn primary" onClick={apply}><Check size={16}/> Gunakan crop</button></div>
      </div>
      {error && <p className="crop-error" role="alert">{error}</p>}
    </div>
  </div>;
}
