param([string]$Browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$portProbe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$portProbe.Start(); $port = $portProbe.LocalEndpoint.Port; $portProbe.Stop()
$origin = 'http://127.0.0.1:' + $port
$profilePath = Join-Path ([IO.Path]::GetTempPath()) ('copers-offline-' + [guid]::NewGuid().ToString('N'))
$server = $null; $browserProcess = $null; $socket = $null
$cancellation = [Threading.CancellationTokenSource]::new(60000)
$script:messageId = 0
$script:requests = [Collections.Generic.List[string]]::new()
function Send-Cdp([string]$Method, [hashtable]$Parameters = @{}) {
    $script:messageId++
    $command = @{id=$script:messageId; method=$Method; params=$Parameters} | ConvertTo-Json -Depth 12 -Compress
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
        if ($reply.method -eq 'Network.requestWillBeSent') { $script:requests.Add($reply.params.request.url) }
    } while ($reply.id -ne $script:messageId)
    if ($reply.error) { throw ($reply.error | ConvertTo-Json -Compress) }
    return $reply.result
}
function Evaluate([string]$Expression) {
    $reply = Send-Cdp 'Runtime.evaluate' @{expression=$Expression; returnByValue=$true; awaitPromise=$true}
    if ($reply.exceptionDetails) { throw $reply.exceptionDetails.exception.description }
    return $reply.result.value
}
function Check([string]$Label, [bool]$Condition) {
    if (!$Condition) { throw ('FAIL ' + $Label) }
    Write-Output ('PASS ' + $Label)
}
function Wait-For([string]$Expression) {
    $deadline = [DateTime]::UtcNow.AddSeconds(25)
    do {
        try { if (Evaluate $Expression) { return } } catch { }
        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    throw ('Timed out waiting for: ' + $Expression)
}
try {
    $server = Start-Job -ArgumentList $projectPath, $origin -ScriptBlock {
        param($rootPath, $baseUrl)
        $ErrorActionPreference = 'Stop'
        $listener = [Net.HttpListener]::new(); $listener.Prefixes.Add($baseUrl + '/')
        try {
            $listener.Start(); Write-Output 'READY'
            while ($listener.IsListening) {
                $pending = $listener.GetContextAsync()
                while (!$pending.Wait(100)) { }
                $context = $pending.Result
                try {
                    $relative = [uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
                    if (!$relative) { $relative = 'index.html' }
                    $path = [IO.Path]::GetFullPath((Join-Path $rootPath $relative))
                    if (!$path.StartsWith($rootPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath $path -PathType Leaf)) {
                        $context.Response.StatusCode = 404
                    } else {
                        $mime = switch ([IO.Path]::GetExtension($path)) {
                            '.html' { 'text/html; charset=utf-8' }
                            '.js' { 'text/javascript; charset=utf-8' }
                            '.css' { 'text/css; charset=utf-8' }
                            '.json' { 'application/json' }
                            '.png' { 'image/png' }
                            '.jpg' { 'image/jpeg' }
                            '.jpeg' { 'image/jpeg' }
                            '.svg' { 'image/svg+xml' }
                            '.ttf' { 'font/ttf' }
                            default { 'application/octet-stream' }
                        }
                        $body = [IO.File]::ReadAllBytes($path)
                        $context.Response.ContentType = $mime
                        $context.Response.Headers['Cache-Control'] = 'no-store'
                        $context.Response.ContentLength64 = $body.Length
                        $context.Response.OutputStream.Write($body, 0, $body.Length)
                    }
                } finally { $context.Response.Close() }
            }
        } finally { $listener.Close() }
    }
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    while ((Receive-Job $server -Keep) -notcontains 'READY') {
        if ([DateTime]::UtcNow -gt $deadline -or $server.State -eq 'Failed') { throw 'Local server did not start.' }
        Start-Sleep -Milliseconds 100
    }
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Browser
    $start.Arguments = '--headless --disable-gpu --no-first-run --allow-file-access-from-files --remote-debugging-port=0 --user-data-dir="' + $profilePath + '" about:blank'
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true; $start.RedirectStandardError = $true
    $browserProcess = [Diagnostics.Process]::Start($start)
    $outputTask = $browserProcess.StandardOutput.ReadToEndAsync(); $errorTask = $browserProcess.StandardError.ReadToEndAsync()
    $portFile = Join-Path $profilePath 'DevToolsActivePort'
    while (!(Test-Path -LiteralPath $portFile)) { Start-Sleep -Milliseconds 100 }
    $debugPort = ([IO.File]::ReadAllLines($portFile))[0]
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        $targets = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $debugPort + '/json/list')
        $target = $targets | Where-Object type -eq 'page' | Select-Object -First 1
        if (!$target) { Start-Sleep -Milliseconds 100 }
    } while (!$target -and [DateTime]::UtcNow -lt $deadline)
    if (!$target) { throw 'Chrome did not create a test page.' }
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $null = $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl, $cancellation.Token).GetAwaiter().GetResult()
    $null = Send-Cdp 'Network.enable'
    $null = Send-Cdp 'Page.enable'
    $null = Send-Cdp 'Page.addScriptToEvaluateOnNewDocument' @{source='window.offlineSmokeErrors=[];addEventListener("error",event=>offlineSmokeErrors.push(event.message));'}
    $null = Send-Cdp 'Page.navigate' @{url=$origin + '/index.html'}
    Wait-For 'Boolean(navigator.serviceWorker.controller && document.getElementById("offlinePlayStatus")?.textContent === "Ready for offline play")'
    Check 'the hosted game installs a complete offline cache' (Evaluate '(async()=>{const names=await caches.keys();const cache=await caches.open(names.find(name=>name.startsWith("idle-adventure-offline-")));return (await cache.keys()).length>100;})()')
    $baseline = Evaluate '(()=>{const random=Math.random;Math.random=()=>0;try{state.currentView="map";state.isInTown=false;state.combatPaused=false;state.playerHp=getPlayerMaxHealth();state.monsterStates[0].hp=1;state.attackTimer=getAttackSpeed();simulateCombatStep(gameTickSeconds);render();saveGame();return {gold:state.gold,gel:state.materials.gel,origin:performance.timeOrigin};}finally{Math.random=random;}})()'
    Check 'combat awards and saves progress before disconnecting' ($baseline.gold -gt 0 -and $baseline.gel -gt 0)
    Stop-Job $server
    Check 'the origin server is stopped for the offline checks' ($server.State -eq 'Stopped')
    $oldOrigin = $baseline.origin | ConvertTo-Json -Compress
    $null = Send-Cdp 'Page.reload' @{ignoreCache=$true}
    Wait-For ('Boolean(typeof hasSavedGame !== "undefined" && hasSavedGame && document.readyState === "complete" && performance.timeOrigin !== ' + $oldOrigin + ')')
    $restored = Evaluate '({gold:state.gold,gel:state.materials.gel,logo:document.querySelector(".logo img").complete && document.querySelector(".logo img").naturalWidth>0})'
    Check 'the game reloads offline with its saved progress and original logo' ($restored.gold -ge $baseline.gold -and $restored.gel -ge $baseline.gel -and $restored.logo)
    Check 'sprites for every world remain available offline' (Evaluate '(async()=>{state.developerTravelEnabled=true;clearOfflineRecap();for(const world of worldData){travelToMap(world.mapIds.at(-1));await elements.combatArt.decode();if(!elements.combatArt.naturalWidth)return false;}return true;})()')
    Check 'crafting and inventory remain playable offline' (Evaluate '(()=>{for(const id of Object.keys(materialNames))state.materials[id]=100000;const recipe=recipes.find(entry=>recipeIsUnlocked(entry)&&!ownsItem(entry.id));craftGear(recipe.id);state.currentView="inventory";render();return ownsItem(recipe.id)&&elements.inventory.children.length>0;})()')
    Check 'the skill tree and fonts remain available offline' (Evaluate '(async()=>{state.currentView="upgrades";render();await document.fonts.ready;return Boolean(document.querySelector(".skill-tree-board"))&&document.fonts.check("16px \"Pixeloid Sans\"");})()')
    Check 'offline play has no runtime errors' (Evaluate 'offlineSmokeErrors.length === 0')
    $null = Send-Cdp 'Page.navigate' @{url=([uri](Join-Path $projectPath 'index.html')).AbsoluteUri}
    Wait-For 'Boolean(location.protocol === "file:" && document.readyState === "complete" && typeof state !== "undefined")'
    Check 'a downloaded folder also opens directly without a server' (Evaluate '(()=>{const random=Math.random;Math.random=()=>0;try{state.combatPaused=false;state.playerHp=getPlayerMaxHealth();state.monsterStates[0].hp=1;state.attackTimer=getAttackSpeed();simulateCombatStep(gameTickSeconds);return state.gold>0&&state.materials.gel>0&&offlineSmokeErrors.length===0;}finally{Math.random=random;}})()')
    $external = @($script:requests | Where-Object { $_ -match '^https?://' -and !$_.StartsWith($origin + '/') })
    Check 'the game makes no requests to external services' ($external.Count -eq 0)
    Write-Output 'SMOKE PASSED'
} finally {
    if ($socket) { $socket.Dispose() }
    $cancellation.Dispose()
    if ($browserProcess -and !$browserProcess.HasExited) { $browserProcess.Kill(); $browserProcess.WaitForExit() }
    if ($server) { if ($server.State -eq 'Running') { Stop-Job $server }; Remove-Job $server -Force }
}
