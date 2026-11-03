# Peta migrasi BISA Flutter → Next.js

| Source Flutter | Next.js |
|---|---|
| `lib/views/auth/login_view.dart` | `components/BisaApp.tsx` → `LoginScreen` (preview role switch, bukan auth asli) |
| `lib/views/kelurahan/dashboard_kelurahan_view.dart` | `BisaApp` → Dashboard Kelurahan |
| `lib/views/pengelola/dashboard_view.dart` & `pengelola_main_view.dart` | `BisaApp` → Dashboard Pengelola dan sidebar |
| `lib/views/kelurahan/bank_sampah_list_view.dart` & form | `BanksPage` |
| `lib/views/kelurahan/master_sampah_view.dart` | `MasterPage` |
| `lib/views/kelurahan/pengelola_list_view.dart` & form | `ManagersPage` |
| `lib/views/pengelola/nasabah_list_view.dart` | `CustomersPage` |
| `lib/views/pengelola/input_sampah_view.dart` | `InputPage` |
| `lib/views/pengelola/histori_view.dart` | `HistoryPage` |
| `lib/views/kelurahan/monitoring_view.dart` | `MonitoringPage` |
| `lib/views/kelurahan/rekap_bulanan_view.dart` | `RecapPage` |
| `lib/views/kelurahan/laporan_view.dart` & laporan pengelola | `ReportsPage` (CSV sederhana) |
| `lib/views/kelurahan/profil_kelurahan_view.dart` & profil bank | `ProfilePage` |
| `lib/core/services/yolo_scan_service.dart` | `components/Scanner.tsx` (browser beta, perlu validasi) |
| `assets/data/seed.json` | `lib/bisa-seed.json` (hash password dihapus) |
| `assets/models/mobnet_model_quantized.tflite` | `public/mobilenetv2.tflite` |
| `assets/data/schema.sql` | `lib/data.ts` tipe data + localStorage (demo, **bukan** pengganti penuh SQL) |

**Belum paritas penuh:** registrasi/verifikasi real, password auth, RBAC server, peta, semua laporan PDF/Excel, tipe/subkategori, fitur penjualan, edit transaksi, harga spesifik tiap bank, jaminan paritas model preprocessing dan validasi benchmark. Prioritaskan sesuai implementasi Flutter aktual sebelum menyebut migrasi final.
