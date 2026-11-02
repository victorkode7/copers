param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectPath ('playtest/playtest-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
$targetPath = [IO.Path]::GetFullPath($OutputDirectory)
if (!$targetPath.StartsWith($projectPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Build output must be inside this workspace.' }
if (Test-Path -LiteralPath $targetPath) { throw 'Use a new output directory; existing builds are never overwritten.' }
$null = New-Item -ItemType Directory -Path $targetPath
# Omit tooling from the artifact, rather than trusting saved flags or hidden UI.
$html = [IO.File]::ReadAllText((Join-Path $projectPath 'index.html'))
$html = [regex]::Replace($html, '(?m)^.*<script[^>]*data-developer-module[^>]*></script>\r?\n', '')
$html = [regex]::Replace($html, '<!-- Optional tooling owns its UI and capabilities\.[\s\S]*?-->', '')
$html = [regex]::Replace($html, '<a href="(?:skill-tree|item|material|world)-editor\.html"[^>]*>[\s\S]*?</a>', '')
[IO.File]::WriteAllText((Join-Path $targetPath 'index.html'), $html, [Text.UTF8Encoding]::new($false))
$paths = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$null = $paths.Add('offline-worker.js')
foreach ($match in [regex]::Matches($html, '(?:src|href)="([^"#]+)"')) {
    $url = $match.Groups[1].Value
    if ($url -notmatch '^(?:https?:|data:|#)' -and $url -match '\.(?:js|css)(?:\?|$)') { $null = $paths.Add(($url -split '\?',2)[0]) }
}
foreach ($path in $paths) {
    $sourcePath = [IO.Path]::GetFullPath((Join-Path $projectPath $path))
    $destinationPath = [IO.Path]::GetFullPath((Join-Path $targetPath $path))
    if (!$sourcePath.StartsWith($projectPath + '\', [StringComparison]::OrdinalIgnoreCase) -or !$destinationPath.StartsWith($targetPath + '\', [StringComparison]::OrdinalIgnoreCase) -or $path -match '^dev/') { throw "Unexpected runtime path: $path" }
    $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destinationPath)) -Force
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
}
Copy-Item -LiteralPath (Join-Path $projectPath 'assets') -Destination $targetPath -Recurse
& (Join-Path $PSScriptRoot 'update-offline-cache.ps1') -ProjectPath $targetPath -Build Playtest
if (Test-Path -LiteralPath (Join-Path $targetPath 'dev')) { throw 'Developer files were included in the build.' }
$manifest = [IO.File]::ReadAllText((Join-Path $targetPath 'js/offline-assets.js'))
if ($manifest -match 'dev/|developer-tools|editor\.html') { throw 'Tooling was included in the offline manifest.' }
[IO.File]::WriteAllText((Join-Path $targetPath 'README.txt'), "Open index.html to play. Keep the assets, css and js folders beside it.`r`nThis playtest uses the normal profile slot; development profiles are separate.`r`n", [Text.UTF8Encoding]::new($false))
$archivePath = $targetPath + '.zip'
if (Test-Path -LiteralPath $archivePath) { throw 'Archive already exists.' }
Compress-Archive -Path (Join-Path $targetPath '*') -DestinationPath $archivePath -CompressionLevel Optimal
Write-Output "Playtest folder: $targetPath"
Write-Output "Playtest archive: $archivePath"
