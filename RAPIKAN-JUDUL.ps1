# Update the title of the Smart Camera panel without replacing BisaApp.tsx.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$file = Join-Path $root 'components\BisaApp.tsx'
if (-not (Test-Path -LiteralPath $file)) {
    Write-Error "Tidak ditemukan: $file"
    exit 1
}
$original = [System.IO.File]::ReadAllText($file)
$old = 'Card title="Pindai sampah — MAE RealWaste (6 kategori BISA)"'
$new = 'Card title="Smart Camera AI"'
if ($original.Contains($old)) {
    $backup = "$file.bak-ui-clean"
    [System.IO.File]::Copy($file, $backup, $true)
    $modified = $original.Replace($old, $new)
    [System.IO.File]::WriteAllText($file, $modified, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'Judul Smart Camera diperbarui. Backup BisaApp.tsx.bak-ui-clean dibuat.' -ForegroundColor Green
} elseif ($original.Contains($new)) {
    Write-Host 'Judul Smart Camera sudah rapi. Tidak perlu perubahan.' -ForegroundColor Green
} else {
    Write-Warning 'Teks judul versi sebelumnya tidak ditemukan; cek secara manual di components\BisaApp.tsx.'
}
