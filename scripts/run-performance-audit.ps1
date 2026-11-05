param([ValidateSet('core','render','effects','memory','save','catchup','interactions')][string]$Phase='core',[string]$ViewportSize='1440,1000',[string]$ReportPath='audit/performance-core.json',[ValidateRange(1,5)][int]$Rounds=1,[ValidateRange(1,2000)][int]$MemoryCycles=10)
$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$fixturePath=Join-Path $projectPath '.performance-audit.html'
$profilePath=Join-Path ([IO.Path]::GetTempPath()) ('copers-audit-'+[guid]::NewGuid().ToString('N'))
$socket=$null;$process=$null;$messageId=0;$cancellation=[Threading.CancellationTokenSource]::new([Math]::Max(60000,30000+$MemoryCycles*800))
function Send-Cdp([string]$Method,[hashtable]$Parameters=@{}){
 $script:messageId++
 $json=@{id=$script:messageId;method=$Method;params=$Parameters}|ConvertTo-Json -Depth 12 -Compress
 $bytes=[Text.Encoding]::UTF8.GetBytes($json);$null=$socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,$cancellation.Token).GetAwaiter().GetResult()
 do{$memory=[IO.MemoryStream]::new();do{$buffer=[byte[]]::new(32768);$received=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),$cancellation.Token).GetAwaiter().GetResult();$memory.Write($buffer,0,$received.Count)}while(!$received.EndOfMessage);$reply=[Text.Encoding]::UTF8.GetString($memory.ToArray())|ConvertFrom-Json;$memory.Dispose()}while($reply.id -ne $script:messageId)
 if($reply.error){throw ($reply.error|ConvertTo-Json -Compress)};return $reply.result
}
function Evaluate([string]$Expression){$reply=Send-Cdp 'Runtime.evaluate' @{expression=$Expression;returnByValue=$true;awaitPromise=$true};if($reply.exceptionDetails){throw $reply.exceptionDetails.exception.description};return $reply.result.value}
function Metrics{$values=@{};foreach($entry in (Send-Cdp 'Performance.getMetrics').metrics){$values[$entry.name]=$entry.value};return $values}
try{
 $html=[IO.File]::ReadAllText((Join-Path $projectPath 'index.html'))
 $prelude='<script>window.smokeErrors=[];addEventListener("error",e=>smokeErrors.push(e.message));window.auditSetInterval=setInterval.bind(window);window.setInterval=()=>0;</script>'
 $html=$html.Replace('<head>','<head>'+$prelude).Replace('<script src="js/item-system.js','<script src="tests/equipment-content-fixture.js"></script><script src="js/item-system.js')
 $html=$html.Replace('<script src="js/skill-sprites.js','<script src="tests/skill-sprite-content-fixture.js"></script><script src="js/skill-sprites.js')
 $html=[regex]::Replace($html,'<script src="https://ajax.googleapis.com[^>]+></script>','')
 $html=$html.Replace('</body>','<script src="tests/performance-audit.js"></script></body>');[IO.File]::WriteAllText($fixturePath,$html,[Text.UTF8Encoding]::new($false))
 $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName='C:\Program Files\Google\Chrome\Application\chrome.exe';$start.Arguments='--headless --no-first-run --allow-file-access-from-files --remote-debugging-port=0 --user-data-dir="'+$profilePath+'" about:blank';$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $process=[Diagnostics.Process]::Start($start);$null=$process.StandardOutput.ReadToEndAsync();$null=$process.StandardError.ReadToEndAsync()
 $deadline=[DateTime]::UtcNow.AddSeconds(20);$portFile=Join-Path $profilePath 'DevToolsActivePort';$port=0
 while(!$port -and [DateTime]::UtcNow -lt $deadline){if(Test-Path -LiteralPath $portFile){try{$lines=[IO.File]::ReadAllLines($portFile);if($lines.Length -ge 2){$port=[int]$lines[0]}}catch [IO.IOException]{}};if(!$port){Start-Sleep -Milliseconds 100}}
 if(!$port){throw 'Chrome debugging port unavailable'}
 $target=$null
 while(!$target -and [DateTime]::UtcNow -lt $deadline){$targets=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$port+'/json/list');$target=$targets|Where-Object {$_.type -eq 'page'}|Select-Object -First 1;if(!$target){Start-Sleep -Milliseconds 100}}
 if(!$target){throw 'Chrome page did not become available'}
 $socket=[Net.WebSockets.ClientWebSocket]::new();$null=$socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,$cancellation.Token).GetAwaiter().GetResult()
 $dimensions=$ViewportSize.Split(',');$null=Send-Cdp 'Emulation.setDeviceMetricsOverride' @{width=[int]$dimensions[0];height=[int]$dimensions[1];deviceScaleFactor=1;mobile=$false}
 $null=Send-Cdp 'Page.navigate' @{url=([uri]$fixturePath).AbsoluteUri}
 do{Start-Sleep -Milliseconds 100;$ready=Evaluate '!!window.PerformanceAudit'}while(!$ready -and [DateTime]::UtcNow -lt $deadline)
 if(!$ready){throw 'Audit harness failed to load'}
 $environment=Evaluate 'PerformanceAudit.environment()';$null=Evaluate ('window.auditMemoryCycles='+$MemoryCycles);$null=Send-Cdp 'Performance.enable' @{timeDomain='threadTicks'}
 $samples=@();$phaseJson=ConvertTo-Json $Phase -Compress
 for($round=1;$round -le $Rounds;$round++){foreach($case in @(Evaluate ('PerformanceAudit.cases('+$phaseJson+')'))){
  $config=$case|ConvertTo-Json -Depth 6 -Compress;$setup=Evaluate ('PerformanceAudit.prepare('+$config+')');$null=Send-Cdp 'HeapProfiler.collectGarbage';$before=Metrics
  $sample=Evaluate ('PerformanceAudit.run('+$phaseJson+','+$config+')');$after=Metrics;$null=Send-Cdp 'HeapProfiler.collectGarbage';$memoryAfter=Metrics
  $sample|Add-Member setup $setup
  $sample|Add-Member round $round
  $sample|Add-Member mainThreadMs ([Math]::Round(($after.TaskDuration-$before.TaskDuration)*1000,3))
  $sample|Add-Member layoutStyleMs ([Math]::Round(($after.LayoutDuration+$after.RecalcStyleDuration-$before.LayoutDuration-$before.RecalcStyleDuration)*1000,3))
  $sample|Add-Member layoutCount ($after.LayoutCount-$before.LayoutCount)
  $sample|Add-Member heapBefore $before.JSHeapUsedSize;$sample|Add-Member heapAfter $memoryAfter.JSHeapUsedSize;$sample|Add-Member nodesBefore $before.Nodes;$sample|Add-Member nodesAfter $memoryAfter.Nodes
  $samples+=$sample;Write-Output ('SAMPLE '+(($sample|Select-Object scenario,round,medianTickMs,p95TickMs,frameP95Ms,layoutStyleMs,layoutCount,elapsedMs)|ConvertTo-Json -Compress))
 }}
 $report=[ordered]@{phase=$Phase;rounds=$Rounds;environment=$environment;samples=$samples;notes=@('Synthetic isolated profile; production files are unchanged.','GPU acceleration requested; the actual renderer is recorded.','Inclusive instrumented timings overlap and include instrumentation overhead.','CDP thread timings exclude GPU-process work. Memory snapshots follow forced GC.','Narrow viewport is desktop Chrome without mobile CPU throttling.')}
 $path=Join-Path $projectPath $ReportPath;$null=New-Item -ItemType Directory -Force -Path (Split-Path $path)
 [IO.File]::WriteAllText($path,($report|ConvertTo-Json -Depth 14),[Text.UTF8Encoding]::new($false));Write-Output ('REPORT '+$path)
}finally{if($socket){$socket.Dispose()};$cancellation.Dispose();if($process -and !$process.HasExited){$process.Kill();$process.WaitForExit()};Remove-Item -LiteralPath $fixturePath -ErrorAction SilentlyContinue}
