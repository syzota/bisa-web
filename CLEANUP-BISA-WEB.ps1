# Jalankan dari root project C:\website\bisa-next-web
$ErrorActionPreference = "Stop"
if (-not (Test-Path "package.json") -or -not (Test-Path "components/Scanner.tsx")) {
  throw "Buka PowerShell di root project BISA Next.js dulu."
}
# Hapus hanya aset dan skrip khusus model lama dari NEXT.JS (bukan dari Flutter).
@(
  "public/mobilenetv2-web.tflite",
  "public/mobilenetv2.tflite",
  "scripts/copy-litert-wasm.mjs",
  "scripts/fix_tflite_batch_signature.py"
) | ForEach-Object {
  if (Test-Path $_) { Remove-Item $_ -Force; Write-Host "Hapus: $_" }
}
# WASM khusus LiteRT tidak diperlukan lagi dalam web, tidak menghapus berkas lain.
if (Test-Path "public/wasm") { Remove-Item "public/wasm" -Force -Recurse; Write-Host "Hapus: public/wasm" }
Write-Host "Pembersihan selesai. Jalankan npm install lalu npm run dev."
