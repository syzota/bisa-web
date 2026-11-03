# BISA Web + MAE — Deployment permanen ke Railway

**Tujuan:** website BISA bisa diakses dari HP/laptop melalui link HTTPS tanpa menyalakan laptop pengembang. Next.js dan Python MAE tetap dua proses terpisah, tetapi berjalan di satu proyek Railway dan satu repository GitHub.

## A. Pasang patch dan periksa Git

1. Buat cadangan folder `C:\website\bisa-next-web`.
2. Ekstrak isi ZIP patch ini langsung ke folder `C:\website\bisa-next-web` (jangan ke subfolder baru). File baru: `mae_backend/Dockerfile`, `mae_backend/.dockerignore`, `.node-version`, `app/api/mae/status/route.ts`, `DEPLOY-RAILWAY.md`.
3. Dari PowerShell:

```powershell
cd C:\website\bisa-next-web
npm run build
git status --short
git remote -v
git branch --show-current
```

`npm run build` harus lulus. Jika belum ada Git repo, `git init` dan buat repo **private** di GitHub. Jika `origin` sudah ada, **jangan** menimpanya.

**SANGAT PENTING: JANGAN unggah file-file ini ke GitHub:**

- `mae_backend/.venv/`
- `mae_backend/models/` (checkpoint >1 GB)
- `node_modules/`, `.next/`
- `.env.local`, `.env`, kunci API, kredensial apa pun

Root `.gitignore` source BISA sudah berisi `node_modules`, `.next`, `.env*`; dan `mae_backend/.gitignore` sudah mengabaikan `.venv/`, `models/`. Periksa sebelum `git add`:

```powershell
git check-ignore -v mae_backend/models/best_model.pth mae_backend/.venv/Scripts/python.exe .env.local node_modules/example
```

Jika ada file sensitif yang **sudah tracked** sebelum dipasang gitignore, `git check-ignore` tidak cukup. Periksa:

```powershell
git ls-files | Select-String '(^|/)(\.venv|models|node_modules|\.next)/|(^|/)\.env'
```

Kosong = kondisi yang diharapkan. Jika tidak kosong, hentikan proses push dan bersihkan index Git serta riwayat sensitif terlebih dahulu.

Jika `origin` sudah disetel dan file aman:

```powershell
git add .
git diff --cached --stat
git commit -m "Prepare BISA Web and MAE for Railway"
git push -u origin HEAD
```

Jika belum ada remote: buat repo private kosong di `https://github.com/new`, kemudian:

```powershell
git init
git add .
git commit -m "Prepare BISA Web and MAE for Railway"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Ganti `USERNAME/NAMA-REPO` dengan repo milikmu. Jangan lakukan `git init` / `git remote add` lagi jika Git repo sudah ada.

## B. Buat dua layanan dalam satu Railway project

Buka `https://railway.com/new`, login dengan GitHub, buat **Empty Project**. Hubungkan repository yang sama ke dua layanan:

### Layanan 1 — `bisa-mae` (Python)

1. Tambah service dari repository GitHub BISA, beri nama **`bisa-mae`**.
2. Set **Settings → Source → Root Directory = `/mae_backend`**. Ini wajib supaya Railway memakai `mae_backend/Dockerfile`, BUKAN mencoba menjalankan Next.js di service Python.
3. Set **Variables**: `PORT=8765`.
4. Biarkan layanan MAE **tanpa public domain**. Next.js mengaksesnya melalui private network Railway.
5. Deploy. Build akan menginstal PyTorch CPU dan mengunduh checkpoint `best_model.pth` (~1.03 GB) ke Docker image. **Butuh jaringan, ruang image, RAM dan mungkin waktu build lama**. Pada startup server mengeluarkan `[MAE] Ready in ...` dalam Deploy Logs.
6. Di **Settings → Deploy** opsional set Healthcheck Path `/health` jika tersedia.
7. Untuk awal, sediakan sumber daya yang memadai (uji dengan limit RAM **4 GB** dan CPU **2 vCPU**; kapasitas final harus mengikuti pengamatan penggunaan aktual). Railway Free/trial tidak cocok untuk checkpoint/model sebesar ini.

### Layanan 2 — `bisa-web` (Next.js)

1. Tambah service lain dari repository GitHub yang SAMA, beri nama **`bisa-web`**.
2. Set Root Directory `/` (root repository).
3. Builder: default **Railpack/Node**. Build Command `npm run build` dan Start Command `npm run start` jika autodetection gagal. `next start` menggunakan port dari `PORT` Railway.
4. Set **Variables**:

```env
MAE_INFERENCE_URL=http://bisa-mae.railway.internal:8765
```

Nama `bisa-mae` HARUS sama dengan nama service Railway; jika berbeda gunakan `<nama-service>.railway.internal`. Variabel ini hanya di **Next.js server**, jangan `NEXT_PUBLIC_...`.

5. Deploy service `bisa-web`.
6. **Settings → Networking → Generate Domain** untuk `bisa-web` (backend tetap private). Dapatkan link `https://....up.railway.app`.

**Catatan:** Jika kamu mengubah setting Root Directory setelah service pernah deploy, lakukan Redeploy dan pastikan build logs service backend mengatakan `Using detected Dockerfile`.

## C. Tes penguji dari HP lain

1. Buka `https://DOMAIN-BISA.up.railway.app/api/mae/status`. Harapannya `{"status":"ready","service":"MAE RealWaste"}`.
2. Buka `https://DOMAIN-BISA.up.railway.app` dan login demo.
3. Buka Smart Camera, upload foto dan Scan AI. Uji menggunakan paket data seluler agar benar-benar beda jaringan.
4. Periksa Deploy Logs service `bisa-mae` untuk permintaan POST `/predict`.
5. Jika MAE status `not_configured`, periksa `MAE_INFERENCE_URL` di **bisa-web**. Jika `unavailable`, cek nama service, port 8765, apakah backend sudah siap, dan apakah kedua service berada dalam project+environment Railway yang sama.

## D. Batasan penting

- **Frontend dapat online permanen, tetapi biaya Railway bergantung pemakaian**. Set **spending limit/alerts** pada Railway dan jangan jalankan backend resource-berat lebih lama dari yang dibutuhkan.
- `localStorage` masih menyimpan data terpisah per HP/browser. **Hasil sampel dari banyak perangkat BELUM otomatis terhimpun dalam satu database**. Untuk pengumpulan hasil penelitian lintas device, tambahkan API log + database (misal Postgres) dan persetujuan penggunaan data.
- Login BISA saat ini adalah demo client-side, **bukan autentikasi produksi**. Endpoint `/api/mae/predict` berpotensi dipanggil oleh siapa pun yang memiliki link. Bagikan hanya ke penguji tepercaya, jangan mempublikasikan untuk umum sebelum ditambah autentikasi, rate limit, kuota, dan monitoring biaya.
- Backend mengembalikan sembilan kelas asal. Tiga kelas di luar enam kategori BISA tidak dipaksa menjadi residu.
- Dataset RealWaste kemungkinan memiliki batasan lisensi nonkomersial; periksa persyaratan sebelum penggunaan di luar penelitian.
- Saya sudah memeriksa sintaks patch dan struktur file, **belum menjalankan Docker build maupun deploy ke akun Railway milikmu**. Build Docker dan kompatibilitas runtime harus diverifikasi dari log Railway.

## Rujukan dokumentasi

- Railway monorepo: https://docs.railway.com/deployments/monorepo
- Railway Dockerfiles: https://docs.railway.com/builds/dockerfiles
- Railway private domains: https://docs.railway.com/networking/domains/working-with-domains
- Railway Next.js: https://railway.com/guides/nextjs
- PyTorch CPU-only: https://pytorch.org/get-started/previous-versions/
- Railway pricing: https://railway.com/pricing
