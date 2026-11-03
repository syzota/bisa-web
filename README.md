# BISA Web — Next.js / React (Research Preview)

Aplikasi web awal yang **meniru fungsi dan alur BISA Flutter**, bukan hanya halaman scanning. Dibangun berdasarkan `bisa-source.zip` (snapshot source Flutter Oktober 2026) dari pemilik proyek. UI diperbarui agar responsif untuk desktop/mobile.

## Menjalankan di Windows

**Prasyarat:** Node.js 20.9+ (disarankan 22 LTS) dan npm. Tidak memerlukan Flutter / Dart / MacBook.

```powershell
# ekstrak ZIP ini ke folder baru, misalnya C:\Users\Asus GK\bisa-next-web
cd "C:\Users\Asus GK\bisa-next-web"
node -v
npm install
npm run dev
```

Buka **http://localhost:3000**. Klik masuk sebagai **Pengelola** atau **Kelurahan** (demo tanpa password).

> JANGAN ekstrak ZIP di dalam repository Flutter asli, dan jangan jalankan patch Flutter Stage 1 lagi. Keduanya proyek terpisah.

## Status fitur versi ini

| Fitur BISA asli | Implementasi Next.js ini | Keterangan |
|---|---|---|
| Dashboard Kelurahan / Pengelola | Ada | Statistik dihitung dari data lokal nyata, bukan angka palsu |
| Pengelolaan bank sampah | Ada | Tambah, edit, ubah status aktif |
| Master jenis dan harga sampah | Ada | 6 kelas dan harga mengikuti seed BISA; tambah/edit/nonaktif |
| Profil & penetapan pengelola | Ada | Data profil lokal; belum membuat akun server |
| Input setoran | Ada | Pilih bank, jenis, berat, nama, harga otomatis, total, simpan |
| Histori transaksi | Ada | Filter, ekspor CSV, hapus |
| Nasabah | Ada | Daftar dihitung dari nama nasabah pada transaksi, seperti model data source |
| Monitoring, rekap, laporan | Ada | Data turunan dari transaksi lokal, ekspor CSV |
| Profil kelurahan / bank sampah | Ada | Tampilkan informasi, reset demo |
| Smart Camera | **Beta / belum tervalidasi** | Kamera, unggah foto, fallback manual, percobaan TFLite model lama |
| Login / registrasi / verifikasi | **Belum produksi** | Role demo tanpa password; tidak ada autentikasi aman |
| Database bersama | **Belum** | Menggunakan `localStorage` per browser, bukan server bersama |
| PDF / Excel seperti Flutter | **Belum seluruhnya** | CSV tersedia; generator PDF native butuh porting lanjutan |
| Alur bisnis detail lanjutan | **Parsial** | Subkategori/tipe, edit transaksi, penjualan, map, foto & scan linkage belum 100% setara Flutter |

**Penting:** Ini *working prototype source*, bukan migrasi final 1:1 yang sudah teruji. Proyek ini dibuat di lingkungan tanpa akses berhasil ke npm registry, jadi **`npm install`, `next build`, dan pengujian browser belum berhasil dijalankan oleh pembuat paket**. Sintaks TypeScript/TSX diperiksa secara statis. Kamu harus menjalankan tes di laptopmu.

## Data dan privasi

- `lib/bisa-seed.json` diambil dari `assets/data/seed.json` Flutter **tanpa tabel akun dan hash password**.
- `public/mobilenetv2.tflite` adalah model MobileNetV2 dari source Flutter asli.
- Data transaksi tersimpan di `localStorage` browser ini. Menghapus cache/site data bisa menghapus data. Tidak ada sinkronisasi antar perangkat.
- Akun demo **bukan keamanan yang layak dipakai publik**. Jangan memasukkan informasi pribadi nasabah sungguhan, jangan deploy untuk produksi, dan jangan mengandalkan menu role sebagai authorization.

## AI & metodologi Paper 2

Modul kamera memuat `mobilenetv2.tflite` secara *client-side* menggunakan TensorFlow.js TFLite (WASM). Model belum diuji di browser dan pipeline preprocessing dengan canvas adalah **aproksimasi** terhadap implementasi bilinear kustom Dart pada `lib/core/utils/yolo_preprocessing.dart`; hasil **tidak boleh** dimasukkan sebagai data paper sebelum paritas label, tensor, foto, dan output pada Android/web tervalidasi.

Untuk paper 2 lakukan urutan: (1) validasi prediksi dan preprocessing model yang sama Android vs Web; (2) pengujian terkontrol gambar/perangkat yang sama; (3) pengembangan model advanced; (4) optimasi runtime/quantization; (5) pengukuran akurasi dan latency, termasuk waktu loading pertama. Hindari klaim web pasti lebih efisien sebelum ada hasil.

## Pemetaan fitur asal

Lihat `docs/SOURCE_MAPPING.md`.

## Langkah setelah MVP berhasil build

1. Sambungkan backend PostgreSQL/SQLite server untuk transaksi bersama, bukan `localStorage`.
2. Implementasi autentikasi dan RBAC aman di server untuk `kelurahan`/`pengelola`; jangan pakai hash demo sebagai kredensial publik.
3. Porting lengkap subkategori/tipe, semua laporan Excel/PDF, registrasi-verifikasi, peta, penjualan jika dipakai.
4. Perbaiki dan benchmark Smart Camera sebelum publikasi.
