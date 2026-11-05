$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$reportPath=Join-Path ([IO.Path]::GetTempPath()) ('copers-reap-blood-'+[guid]::NewGuid().ToString('N')+'.txt')
try{
    # Build-time readback is permitted here; the game loads the resulting PNG.
    $buildOutput=& (Join-Path $projectPath 'tests/run-equipment-smoke.ps1') -TestScript 'scripts/prepare-reap-blood.js' -ReportPath $reportPath -ViewportSize '1440,1000'
    $report=[IO.File]::ReadAllText($reportPath)
    $match=[regex]::Match($report,'REAP_BLOOD_PNG=([A-Za-z0-9+/=]+)')
    if(!$match.Success){throw 'Prepared blood PNG missing from browser build output.'}
    $outputPath=Join-Path $projectPath 'assets/effects/blood-4x4-clean.png'
    [IO.File]::WriteAllBytes($outputPath,[Convert]::FromBase64String($match.Groups[1].Value))
    Write-Output ('Prepared cleaned Reap blood: '+$outputPath)
}finally{Remove-Item -LiteralPath $reportPath -ErrorAction SilentlyContinue}
