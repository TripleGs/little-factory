$ErrorActionPreference = "Stop"

$root = (Resolve-Path "$PSScriptRoot\\..").Path
$web = Join-Path $root "web"

New-Item -ItemType Directory -Force -Path $web | Out-Null

$targets = @(
  "css",
  "js",
  "index.html",
  "style.css",
  "colorConfig.js",
  "colorSystem.js"
)

foreach ($item in $targets) {
  $dest = Join-Path $web $item
  if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
  }
  $src = Join-Path $root $item
  Copy-Item -Recurse -Force $src $dest
}
