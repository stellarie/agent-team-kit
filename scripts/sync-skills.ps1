# Copy .agents/skills (canonical) to .claude/skills.
# Replaces each skill directory; leaves other skills in .claude/skills alone.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root '.agents/skills'
$dst = Join-Path $root '.claude/skills'

if (-not (Test-Path $src)) { throw "missing $src" }
New-Item -ItemType Directory -Force -Path $dst | Out-Null

foreach ($dir in Get-ChildItem -Path $src -Directory) {
    $target = Join-Path $dst $dir.Name
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Recurse -Path $dir.FullName -Destination $target
    Write-Output "synced $($dir.Name)"
}
