param([string]$AssetRoot=$PSScriptRoot)
$ErrorActionPreference='Stop'
$manifest=Get-Content -Encoding utf8 -LiteralPath (Join-Path $AssetRoot 'imagens.json') -Raw | ConvertFrom-Json
$target=Join-Path (Split-Path (Split-Path $AssetRoot -Parent) -Parent) 'uploads'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach($entry in $manifest) {
  $source=Join-Path (Join-Path $AssetRoot 'imagens') $entry.file
  if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw ('Hash divergente: '+$entry.file) }
  $destination=Join-Path $target $entry.file
  if(Test-Path -LiteralPath $destination) {
    if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw ('Arquivo de destino diferente: '+$entry.file) }
  } else { Copy-Item -LiteralPath $source -Destination $destination }
}
Write-Output ('Imagens verificadas e disponíveis: '+$manifest.Count)
