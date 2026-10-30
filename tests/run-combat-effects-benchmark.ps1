param(
    [string]$Browser = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    [int]$Ticks = 30,
    [int]$Rounds = 3,
    [int]$MonsterHealth = 100000,
    [string]$ModeList = 'all-on,projectiles-off,abilities-off,shaking-off,glows-off,all-off',
    [string]$ReportPath = 'combat-effects-benchmark.json',
    [switch]$CaptureScreenshots,
    [ValidateSet('mixed','caster')][string]$CombatBuild = 'mixed'
)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$fixturePath = Join-Path $projectPath '.combat-effects-benchmark.html'
$profilePath = Join-Path ([IO.Path]::GetTempPath()) ('copers-effects-bench-' + [guid]::NewGuid().ToString('N'))
$browserProcess = $null; $socket = $null
$cancellation = [Threading.CancellationTokenSource]::new(300000)
$script:messageId = 0
function Send-Cdp([string]$Method, [hashtable]$Parameters = @{}) {
    $script:messageId++
    $command = @{id=$script:messageId; method=$Method; params=$Parameters} | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($command)
    $null = $socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, $cancellation.Token).GetAwaiter().GetResult()
    do {
        $message = [IO.MemoryStream]::new()
        do {
            $buffer = [byte[]]::new(32768)
            $received = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $cancellation.Token).GetAwaiter().GetResult()
            $message.Write($buffer, 0, $received.Count)
        } while (!$received.EndOfMessage)
        $reply = [Text.Encoding]::UTF8.GetString($message.ToArray()) | ConvertFrom-Json
        $message.Dispose()
    } while ($reply.id -ne $script:messageId)
    if ($reply.error) { throw ($reply.error | ConvertTo-Json -Compress) }
    return $reply.result
}
function Evaluate([string]$Expression) {
    $reply = Send-Cdp 'Runtime.evaluate' @{expression=$Expression; returnByValue=$true; awaitPromise=$true}
    if ($reply.exceptionDetails) { throw $reply.exceptionDetails.exception.description }
    return $reply.result.value
}
function Metrics {
    $values = @{}
    foreach ($metric in (Send-Cdp 'Performance.getMetrics').metrics) { $values[$metric.name] = $metric.value }
    return $values
}
try {
    $html = [IO.File]::ReadAllText((Join-Path $projectPath 'index.html'))
    $prelude = '<script>window.benchmarkErrors=[];addEventListener("error",e=>benchmarkErrors.push(e.message));window.benchmarkSetInterval=window.setInterval.bind(window);window.setInterval=()=>0;</script>'
    $html = $html.Replace('<head>', '<head>' + $prelude).Replace('<script src="js/item-system.js', '<script src="tests/equipment-content-fixture.js"></script><script src="js/item-system.js')
    $html = $html.Replace('</body>', '<script src="tests/combat-effects-benchmark.js"></script></body>')
    [IO.File]::WriteAllText($fixturePath, $html, [Text.UTF8Encoding]::new($false))
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Browser
    # Leave GPU acceleration enabled; this test measures real animation frames.
    $start.Arguments = '--headless --no-first-run --allow-file-access-from-files --remote-debugging-port=0 --window-size=1440,1000 --user-data-dir="' + $profilePath + '" "' + ([uri]$fixturePath).AbsoluteUri + '"'
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true; $start.RedirectStandardError = $true
    $browserProcess = [Diagnostics.Process]::Start($start)
    $null = $browserProcess.StandardOutput.ReadToEndAsync(); $null = $browserProcess.StandardError.ReadToEndAsync()
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    $portFile = Join-Path $profilePath 'DevToolsActivePort'
    while (!(Test-Path -LiteralPath $portFile) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 100 }
    $port = ([IO.File]::ReadAllLines($portFile))[0]
    $targets = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/json/list')
    $target = $targets | Where-Object type -eq 'page' | Select-Object -First 1
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $null = $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl, $cancellation.Token).GetAwaiter().GetResult()
    do { $ready = Evaluate 'Boolean(window.CombatEffectsBenchmark)'; if (!$ready) { Start-Sleep -Milliseconds 100 } } while (!$ready -and [DateTime]::UtcNow -lt $deadline)
    if (!$ready) { throw 'Benchmark did not initialize.' }
    $environment = Evaluate 'CombatEffectsBenchmark.environment()'
    try { $environment | Add-Member cpu ((Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name) -join ', ') } catch { }
    $null = Send-Cdp 'Performance.enable' @{timeDomain='threadTicks'}
    Write-Output ('ENVIRONMENT ' + ($environment | ConvertTo-Json -Compress))
    $buildJson = $CombatBuild | ConvertTo-Json -Compress
    $null = Evaluate ('CombatEffectsBenchmark.prepare("all-on",' + $MonsterHealth + ',' + $buildJson + ')')
    $null = Evaluate 'CombatEffectsBenchmark.run(15)'
    $modes = @($ModeList.Split(','))
    $samples = [Collections.Generic.List[object]]::new()
    $referenceOutcome = $null
    for ($round = 0; $round -lt $Rounds; $round++) {
        # Rotate order to reduce warm-up and ordering bias.
        for ($index = 0; $index -lt $modes.Count; $index++) {
            $rotation = if ($modes.Count -eq 2) { $round } else { $round * 2 }
            $mode = $modes[($index + $rotation) % $modes.Count]
            $modeJson = $mode | ConvertTo-Json -Compress
            $null = Evaluate ('CombatEffectsBenchmark.prepare(' + $modeJson + ',' + $MonsterHealth + ',' + $buildJson + ')')
            $before = Metrics
            $sample = Evaluate ('CombatEffectsBenchmark.run(' + $Ticks + ')')
            $after = Metrics
            if ($mode -like 'webgl*' -and (!$sample.webgl.available -or $sample.webgl.reducedMotion -or !$sample.webgl.active)) {
                throw 'The WebGL comparison did not render GPU effects.'
            }
            if ($referenceOutcome -and $sample.outcome -ne $referenceOutcome) { throw ('Combat outcome differs for ' + $mode) }
            $referenceOutcome = $sample.outcome
            $sample | Add-Member mode $mode
            $sample | Add-Member round ($round + 1)
            $sample | Add-Member mainThreadMs (($after.TaskDuration - $before.TaskDuration) * 1000)
            $sample | Add-Member scriptThreadMs (($after.ScriptDuration - $before.ScriptDuration) * 1000)
            $sample | Add-Member layoutStyleMs (($after.LayoutDuration - $before.LayoutDuration + $after.RecalcStyleDuration - $before.RecalcStyleDuration) * 1000)
            $samples.Add($sample)
            Write-Output ('SAMPLE ' + ($sample | ConvertTo-Json -Compress))
            if ($CaptureScreenshots -and $round -eq 0) {
                $shot = Send-Cdp 'Page.captureScreenshot' @{format='png'}
                $shotName = [IO.Path]::GetFileNameWithoutExtension($ReportPath) + '-' + $mode + '.png'
                [IO.File]::WriteAllBytes((Join-Path $projectPath $shotName), [Convert]::FromBase64String($shot.data))
            }
        }
    }
    function Median($values) { $sorted = @($values | Sort-Object); return $sorted[[int][Math]::Floor($sorted.Count / 2)] }
    $summary = foreach ($mode in $modes) {
        $group = @($samples | Where-Object mode -eq $mode)
        $entry = [ordered]@{mode=$mode; samples=$group.Count}
        foreach ($key in @('mainThreadMs','scriptThreadMs','layoutStyleMs','simulationMs','visualMs','elapsedMs','createdElements','peakEffectRoots','frameP95Ms','framesOver25ms')) {
            $entry[$key] = [Math]::Round((Median @($group | ForEach-Object { $_.$key })), 2)
        }
        [pscustomobject]$entry
    }
    $report = [ordered]@{
        environment=$environment; combatBuild=$CombatBuild; monsterHealth=$MonsterHealth
        ticksPerSample=$Ticks; rounds=$Rounds; metricTimeDomain='threadTicks'; combatOutcome=$referenceOutcome
        summary=@($summary); samples=@($samples.ToArray())
        notes=@('Isolated synthetic 64-monster all-skills fight, at 10 combat ticks per second.',
            'Main-thread measurements exclude GPU-process work and do not represent whole-system CPU usage.',
            'Individual-off cases leave all other switches on; abilities-off also disables ability projectiles.',
            'SVG retains original effects; webgl-cracks changes only cracks; webgl converts projectiles, bursts, particles, auras and glows. Labels and plate movement remain HTML.',
            'The caster build adds gear mana and mana regeneration to sustain spell casting.',
            'Order rotates across rounds. No saves or background timer throttling are measured.')
    }
    $reportJson = $report | ConvertTo-Json -Depth 12
    [IO.File]::WriteAllText((Join-Path $projectPath $ReportPath), $reportJson, [Text.UTF8Encoding]::new($false))
    Write-Output ('SUMMARY ' + ($summary | ConvertTo-Json -Depth 4 -Compress))
    Write-Output 'PASS all settings preserve identical combat outcomes.'
} finally {
    if ($socket) { $socket.Dispose() }
    $cancellation.Dispose()
    if ($browserProcess -and !$browserProcess.HasExited) { $browserProcess.Kill(); $browserProcess.WaitForExit() }
    Remove-Item -LiteralPath $fixturePath -ErrorAction SilentlyContinue
}
