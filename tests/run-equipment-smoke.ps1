param(
    [string]$Browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [string]$Page = 'index.html',
    [string]$TestScript = 'tests/equipment-smoke.js',
    [string]$ReportPath,
    [string]$WindowSize = '1440,1000',
    [int]$TimeoutSeconds = 25
)
$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$fixturePath = Join-Path $workspacePath '.equipment-smoke.html'
$skillFixturePath = Join-Path $workspacePath '.skill-editor-smoke.html'
$profilePath = Join-Path ([IO.Path]::GetTempPath()) ('copers-browser-' + [guid]::NewGuid().ToString('N'))
$html = [IO.File]::ReadAllText((Join-Path $workspacePath $Page))
$prelude = '<script>window.smokeErrors=[];window.smokeIntervals=[];window.addEventListener("error",e=>smokeErrors.push(e.message));window.setInterval=callback=>{smokeIntervals.push(callback);return 0;};</script>'
$html = $html.Replace('<head>', '<head>' + $prelude)
$html = [regex]::Replace($html, '<script src="https://ajax.googleapis.com[^>]+></script>', '')
if ($Page -eq 'index.html') {
    $html = $html.Replace('<script src="js/item-system.js', '<script src="tests/equipment-content-fixture.js"></script><script src="js/item-system.js')
    $html = $html.Replace('<script src="js/skill-sprites.js', '<script src="tests/skill-sprite-content-fixture.js"></script><script src="js/skill-sprites.js')
}
$html = $html.Replace('</body>', '<script src="' + $TestScript + '"></script></body>')
[IO.File]::WriteAllText($fixturePath, $html, [Text.UTF8Encoding]::new($false))
if ($TestScript -eq 'tests/editor-persistence-smoke.js') {
    $skillHtml = [IO.File]::ReadAllText((Join-Path $workspacePath 'skill-tree-editor.html'))
    $skillHtml = $skillHtml.Replace('<head>', '<head>' + $prelude)
    $skillHtml = $skillHtml.Replace('</body>', '<script src="tests/editor-persistence-smoke.js"></script></body>')
    [IO.File]::WriteAllText($skillFixturePath, $skillHtml, [Text.UTF8Encoding]::new($false))
}
try {
    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $Browser
    $processInfo.Arguments = '--headless --disable-gpu --no-first-run --allow-file-access-from-files --dump-dom --virtual-time-budget=5000 --user-data-dir="' + $profilePath + '" "' + ([uri]$fixturePath).AbsoluteUri + '"'
    $realtime = $TestScript -in @('tests/editor-persistence-smoke.js', 'tests/skill-sprites-smoke.js', 'tests/item-editor-smoke.js', 'tests/material-editor-smoke.js', 'tests/inventory-categories-smoke.js', 'tests/loot-effects-smoke.js', 'tests/crowded-background-smoke.js', 'tests/world-editor-smoke.js', 'tests/world-quick-save-smoke.js', 'tests/editor-quick-save-smoke.js')
    $realtime = $realtime -or $TestScript -in @('tests/background-reload-smoke.js', 'tests/game-profiles-smoke.js', 'tests/skill-editor-selection-smoke.js')
    $realtime = $realtime -or ($Page -eq 'skill-tree-editor.html' -and $TestScript -eq 'tests/shield-expansion-smoke.js')
    if ($realtime) {
        $processInfo.Arguments = '--headless --disable-gpu --no-first-run --allow-file-access-from-files --remote-debugging-port=0 --user-data-dir="' + $profilePath + '" "' + ([uri]$fixturePath).AbsoluteUri + '"'
    }
    $processInfo.UseShellExecute = $false
    $processInfo.Arguments += ' --window-size=' + $WindowSize
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($processInfo)
    $outputTask = $process.StandardOutput.ReadToEndAsync()
    $errorTask = $process.StandardError.ReadToEndAsync()
    if ($realtime) {
        # Real time allows IndexedDB draft/sprite operations to finish, including across navigation.
        $deadline = [DateTime]::UtcNow.AddSeconds(20)
        $portFile = Join-Path $profilePath 'DevToolsActivePort'
        while (!(Test-Path -LiteralPath $portFile) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 100 }
        $port = ([IO.File]::ReadAllLines($portFile))[0]
        $targets = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/json/list')
        $target = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
        $socket = [Net.WebSockets.ClientWebSocket]::new()
        $cancellation = [Threading.CancellationTokenSource]::new(20000)
        try {
            $null = $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl, $cancellation.Token).GetAwaiter().GetResult()
            $messageId = 0
            $outputText = $null
            while (!$outputText -and [DateTime]::UtcNow -lt $deadline) {
                $messageId++
                $command = @{id=$messageId; method='Runtime.evaluate'; params=@{expression="document.getElementById('smoke-results') ? document.documentElement.outerHTML : null"; returnByValue=$true}} | ConvertTo-Json -Depth 6 -Compress
                $commandBytes = [Text.Encoding]::UTF8.GetBytes($command)
                $null = $socket.SendAsync([ArraySegment[byte]]::new($commandBytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, $cancellation.Token).GetAwaiter().GetResult()
                do {
                    $message = [IO.MemoryStream]::new()
                    do {
                        $buffer = [byte[]]::new(16384)
                        $received = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $cancellation.Token).GetAwaiter().GetResult()
                        $message.Write($buffer, 0, $received.Count)
                    } while (!$received.EndOfMessage)
                    $reply = [Text.Encoding]::UTF8.GetString($message.ToArray()) | ConvertFrom-Json
                    $message.Dispose()
                } while ($reply.id -ne $messageId)
                if ($reply.result.result.value) { $outputText = $reply.result.result.value }
                else { Start-Sleep -Milliseconds 100 }
            }
        } finally {
            $socket.Dispose(); $cancellation.Dispose()
            if (!$process.HasExited) { $process.Kill(); $process.WaitForExit() }
        }
    } else {
        if (!$process.WaitForExit($TimeoutSeconds * 1000)) { $process.Kill(); throw 'Browser test timed out.' }
        $outputText = $outputTask.Result
    }
    $result = [regex]::Match($outputText, '<pre id="smoke-results">([\s\S]*?)</pre>')
    if (!$result.Success) {
        Write-Output $errorTask.Result
        Write-Output ([regex]::Match($outputText, 'data-test-phase="[^"]*"').Value)
        throw 'No smoke results found in browser output.'
    }
    $report = [Net.WebUtility]::HtmlDecode($result.Groups[1].Value)
    if ($ReportPath) { [IO.File]::WriteAllText($ReportPath, $report) }
    Write-Output $report
    if (!$report.Contains('SMOKE PASSED')) { throw 'Equipment smoke checks failed.' }
    $archive = [regex]::Match($outputText, '<pre id="archive-results" hidden="">([A-Za-z0-9+/=]+)</pre>')
    if ($archive.Success) {
        Add-Type -AssemblyName System.IO.Compression
        $bytes = [Convert]::FromBase64String($archive.Groups[1].Value)
        $stream = [IO.MemoryStream]::new($bytes, $false)
        $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Read)
        try {
            $expectedDataFile = if ($Page -eq 'world-editor.html') { 'js/world-content.js' } elseif ($Page -eq 'skill-tree-editor.html') { 'js/skill-tree.js' } else { 'js/items.js' }
            $expectedEntries = if ($Page -eq 'world-editor.html') { 3 } else { 2 }
            if ($zip.Entries.Count -ne $expectedEntries -or !$zip.GetEntry($expectedDataFile)) { throw 'Package did not contain expected data and sprite.' }
            foreach ($entry in $zip.Entries) {
                $reader = $entry.Open()
                $copy = [IO.MemoryStream]::new()
                try { $reader.CopyTo($copy); if ($copy.Length -eq 0) { throw 'Empty ZIP entry.' } }
                finally { $reader.Dispose(); $copy.Dispose() }
            }
            Write-Output 'PASS exported ZIP opens with .NET and contains item data plus sprite'
        } finally { $zip.Dispose(); $stream.Dispose() }
    }
} finally {
    Remove-Item -LiteralPath $fixturePath -ErrorAction SilentlyContinue
    if ($TestScript -eq 'tests/editor-persistence-smoke.js') { Remove-Item -LiteralPath $skillFixturePath -ErrorAction SilentlyContinue }
}
