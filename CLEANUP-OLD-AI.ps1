# Remove only the named unused browser-AI files after you have backed up the project.
# This script does NOT change management data, transactions, or localStorage.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$oldFiles = @(
  'lib\clip-classifier.ts',
  'lib\mobileclip-prompts.json',
  'public\mobileclip-text-embeddings.json',
  'scripts\precompute-mobileclip-text.mjs',
  'public\models\mobnet_model_quantized.tflite'
)
foreach ($file in $oldFiles) {
  if (Test-Path -LiteralPath $file -PathType Leaf) {
    Remove-Item -LiteralPath $file -Force
    Write-Host "Deleted old AI asset: $file"
  }
}
Write-Host 'Old browser AI cleanup complete. No management data changed.'
