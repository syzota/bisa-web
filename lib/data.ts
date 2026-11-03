'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import rawSeed from './bisa-seed.json';

export type Role = 'kelurahan' | 'pengelola';
export type Bank = { id: string; nama: string; alamat: string | null; rt: string | null; rw: string | null; jam_operasional: string | null; is_active: number; created_at: string; updated_at: string; latitude?: number | null; longitude?: number | null; };
export type Jenis = { id: string; nama: string; model_label: string | null; kategori_id: string | null; deskripsi: string | null; satuan_default_id: string | null; urutan: number; is_active: number; created_at: string; updated_at: string; sub_kategori_id?: string | null; tipe_id?: string | null; };
export type Harga = { id: string; bank_sampah_id: string; jenis_sampah_id: string | null; kategori_id?: string | null; harga_per_satuan: number; satuan_id: string; updated_at: string; sub_kategori_id?: string | null; tipe_id?: string | null; };
export type Profile = { id: string; auth_user_id: string; nama_lengkap: string; no_hp: string | null; role: Role; is_verified: number; bank_sampah_pilihan: string; created_at: string; updated_at: string; };
export type Assignment = { id: string; profile_id: string; bank_sampah_id: string; created_at: string };
export type Transaction = { id: string; bank_sampah_id: string; profile_id: string; kategori_id: string; jenis_sampah_id: string | null; jumlah: number; satuan_id: string; harga_per_satuan: number | null; total_harga: number | null; tanggal_pengelolaan: string; catatan: string | null; nama_nasabah: string | null; created_at: string; updated_at: string; sub_kategori_id?: string | null; tipe_id?: string | null; };
export type ScanLog = { id: string; timestamp: string; source: string; prediction: string; confidence: number | null; groundTruth: string; inferenceMs: number | null; preprocessMs: number | null; status: string; promptPreset?: string; textSource?: string; loadMs?: number };
export type Db = {
  bank_sampah: Bank[];
  jenis_sampah: Jenis[];
  harga_sampah: Harga[];
  profiles: Profile[];
  pengelola_bank_sampah: Assignment[];
  pengelolaan_sampah: Transaction[];
  kategori_sampah: { id: string; nama: string; deskripsi: string | null }[];
  satuan: { id: string; nama: string; singkatan: string }[];
  hasil_scan_web: ScanLog[];
};

const STORAGE_KEY = 'bisa-next-web-research-v1';
const ACCOUNT_KEY = 'bisa-next-web-account';
export const safeSeed = (): Db => ({
  bank_sampah: structuredClone(rawSeed.bank_sampah) as Bank[],
  jenis_sampah: structuredClone(rawSeed.jenis_sampah) as Jenis[],
  harga_sampah: structuredClone(rawSeed.harga_sampah) as Harga[],
  profiles: structuredClone(rawSeed.profiles) as Profile[],
  pengelola_bank_sampah: structuredClone(rawSeed.pengelola_bank_sampah) as Assignment[],
  pengelolaan_sampah: [],
  kategori_sampah: structuredClone(rawSeed.kategori_sampah),
  satuan: structuredClone(rawSeed.satuan),
  hasil_scan_web: [],
});

export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `bisa-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const iso = () => new Date().toISOString();
export const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
export const amount = (value: number, digits = 1) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value || 0);
export const dateId = (date: string) => date ? new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const dateInput = () => new Date().toLocaleDateString('en-CA');

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(row => keys.map(k => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function useBisaData() {
  const [db, setDb] = useState<Db>(safeSeed);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    try {
      const found = window.localStorage.getItem(STORAGE_KEY);
      if (found) {
        const prev = JSON.parse(found) as Partial<Db>;
        setDb({ ...safeSeed(), ...prev, hasil_scan_web: prev.hasil_scan_web || [] });
      }
      const savedRole = window.localStorage.getItem(ACCOUNT_KEY);
      if (savedRole === 'pengelola' || savedRole === 'kelurahan') setRole(savedRole);
    } catch (err) { console.warn('Data lokal tidak dapat dibaca, seed digunakan.', err); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }, [db, ready]);
  const login = useCallback((next: Role) => { setRole(next); window.localStorage.setItem(ACCOUNT_KEY, next); }, []);
  const logout = useCallback(() => { setRole(null); window.localStorage.removeItem(ACCOUNT_KEY); }, []);
  const update = useCallback((fn: (previous: Db) => Db) => setDb(prev => fn(prev)), []);
  const reset = useCallback(() => { setDb(safeSeed()); window.localStorage.removeItem(STORAGE_KEY); }, []);
  const bankId = db.bank_sampah.find(b => b.is_active)?.id || db.bank_sampah[0]?.id || '';
  const activeBank = db.bank_sampah.find(b => b.id === bankId);
  const totalKg = useMemo(() => db.pengelolaan_sampah.reduce((a, t) => a + Number(t.jumlah), 0), [db.pengelolaan_sampah]);
  const totalValue = useMemo(() => db.pengelolaan_sampah.reduce((a, t) => a + Number(t.total_harga || 0), 0), [db.pengelolaan_sampah]);
  return { db, role, ready, login, logout, update, reset, bankId, activeBank, totalKg, totalValue };
}
