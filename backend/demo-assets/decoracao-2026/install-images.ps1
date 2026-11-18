param([string]$AssetRoot=$PSScriptRoot)
$ErrorActionPreference='Stop'
$manifest=Get-Content -LiteralPath (Join-Path $AssetRoot 'imagens.json') -Raw | ConvertFrom-Json
$target=Join-Path (Split-Path (Split-Path $AssetRoot -Parent) -Parent) 'uploads'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach($entry in $manifest.images) {
  $source=Join-Path $AssetRoot $entry.filename
  if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw ('Hash divergente: '+$entry.filename) }
  $destination=Join-Path $target $entry.filename
  if(Test-Path -LiteralPath $destination) {
    if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw ('Arquivo de destino diferente: '+$entry.filename) }
  } else { Copy-Item -LiteralPath $source -Destination $destination }
}
Write-Output ('Imagens verificadas e disponíveis: '+$manifest.images.Count)
