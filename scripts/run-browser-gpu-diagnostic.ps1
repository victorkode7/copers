param([ValidateSet('Chrome','Firefox')][string]$Browser='Chrome',[string]$ReportPath)
$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$fixturePath=Join-Path $projectPath '.gpu-diagnostic.html'
$profilePath=Join-Path ([IO.Path]::GetTempPath()) ('copers-gpu-diagnostic-'+[guid]::NewGuid().ToString('N'))
$socket=$null;$process=$null;$messageId=0;$context=$null;$cancellation=[Threading.CancellationTokenSource]::new(60000)
function Send-Protocol([string]$Method,[hashtable]$Parameters=@{}){
 $script:messageId++;$json=@{id=$script:messageId;method=$Method;params=$Parameters}|ConvertTo-Json -Depth 12 -Compress
 $bytes=[Text.Encoding]::UTF8.GetBytes($json);$null=$socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,$cancellation.Token).GetAwaiter().GetResult()
 do{$memory=[IO.MemoryStream]::new();do{$buffer=[byte[]]::new(32768);$received=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),$cancellation.Token).GetAwaiter().GetResult();$memory.Write($buffer,0,$received.Count)}while(!$received.EndOfMessage);$reply=[Text.Encoding]::UTF8.GetString($memory.ToArray())|ConvertFrom-Json;$memory.Dispose()}while($reply.id -ne $script:messageId)
 if($reply.error){throw ($reply|ConvertTo-Json -Depth 8 -Compress)};return $reply.result
}
function Evaluate([string]$Expression){
 $expression='(async()=>JSON.stringify(await ('+$Expression+')))()'
 if($Browser -eq 'Firefox'){$reply=Send-Protocol 'script.evaluate' @{expression=$expression;target=@{context=$context};awaitPromise=$true};if($reply.type -eq 'exception'){throw ($reply.exceptionDetails|ConvertTo-Json -Depth 8)};return $reply.result.value|ConvertFrom-Json}
 $reply=Send-Protocol 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true};if($reply.exceptionDetails){throw $reply.exceptionDetails.exception.description};return $reply.result.value|ConvertFrom-Json
}
try{
 $html=[IO.File]::ReadAllText((Join-Path $projectPath 'index.html'))
 $html=$html.Replace('<head>','<head><script>window.smokeErrors=[];addEventListener("error",e=>smokeErrors.push(e.message));window.auditSetInterval=setInterval.bind(window);window.setInterval=()=>0;</script>')
 $html=$html.Replace('<script src="js/item-system.js','<script src="tests/equipment-content-fixture.js"></script><script src="js/item-system.js').Replace('<script src="js/skill-sprites.js','<script src="tests/skill-sprite-content-fixture.js"></script><script src="js/skill-sprites.js')
 $html=[regex]::Replace($html,'<script src="https://ajax.googleapis.com[^>]+></script>','')
 $html=$html.Replace('</body>','<script src="tests/performance-audit.js"></script><script src="tests/browser-gpu-diagnostic.js"></script></body>')
 [IO.File]::WriteAllText($fixturePath,$html,[Text.UTF8Encoding]::new($false));$null=New-Item -ItemType Directory -Path $profilePath
 $start=[Diagnostics.ProcessStartInfo]::new();$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 if($Browser -eq 'Firefox'){
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0);$listener.Start();$port=$listener.LocalEndpoint.Port;$listener.Stop()
  $start.FileName='C:\Program Files\Mozilla Firefox\firefox.exe';$start.Arguments='--headless --no-remote --profile "'+$profilePath+'" --remote-debugging-port '+$port+' about:blank'
 }else{$start.FileName='C:\Program Files\Google\Chrome\Application\chrome.exe';$start.Arguments='--headless --no-first-run --allow-file-access-from-files --remote-debugging-port=0 --user-data-dir="'+$profilePath+'" about:blank'}
 $process=[Diagnostics.Process]::Start($start);$null=$process.StandardOutput.ReadToEndAsync();$errorTask=$process.StandardError.ReadToEndAsync();$deadline=[DateTime]::UtcNow.AddSeconds(30)
 if($Browser -eq 'Firefox'){
  do{
   try{$socket=[Net.WebSockets.ClientWebSocket]::new();$null=$socket.ConnectAsync([uri]('ws://127.0.0.1:'+$port+'/session'),$cancellation.Token).GetAwaiter().GetResult();break}catch{if($socket){$socket.Dispose();$socket=$null};Start-Sleep -Milliseconds 100}
  }while([DateTime]::UtcNow -lt $deadline)
  if(!$socket){if(!$process.HasExited){$process.Kill();$process.WaitForExit()};throw ('Firefox debugger connection unavailable: '+$errorTask.GetAwaiter().GetResult())}
  $null=Send-Protocol 'session.new' @{capabilities=@{}}
  $context=(Send-Protocol 'browsingContext.getTree').contexts[0].context
  $null=Send-Protocol 'browsingContext.setViewport' @{context=$context;viewport=@{width=1440;height=1000};devicePixelRatio=1}
  $null=Send-Protocol 'browsingContext.navigate' @{context=$context;url=([uri]$fixturePath).AbsoluteUri;wait='complete'}
 }else{
  $portFile=Join-Path $profilePath 'DevToolsActivePort';$port=0
  while(!$port -and [DateTime]::UtcNow -lt $deadline){if(Test-Path -LiteralPath $portFile){try{$lines=[IO.File]::ReadAllLines($portFile);if($lines.Length -ge 2){$port=[int]$lines[0]}}catch [IO.IOException]{}};if(!$port){Start-Sleep -Milliseconds 100}}
  $target=$null;while(!$target -and [DateTime]::UtcNow -lt $deadline){$targets=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$port+'/json/list');$target=$targets|Where-Object type -eq 'page'|Select-Object -First 1;if(!$target){Start-Sleep -Milliseconds 100}}
  if(!$target){throw 'Chrome debugger page unavailable'}
  $socket=[Net.WebSockets.ClientWebSocket]::new();$null=$socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,$cancellation.Token).GetAwaiter().GetResult()
  $null=Send-Protocol 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false}
  $null=Send-Protocol 'Page.navigate' @{url=([uri]$fixturePath).AbsoluteUri}
 }
 do{Start-Sleep -Milliseconds 100;$ready=Evaluate '!!window.BrowserGpuDiagnostic'}while(!$ready -and [DateTime]::UtcNow -lt $deadline)
 if(!$ready){throw 'Diagnostic fixture not ready'}
 $environment=Evaluate 'PerformanceAudit.environment()';$samples=@()
 foreach($scenario in @('idle','ambient','reap32')){
  $sample=Evaluate ('BrowserGpuDiagnostic.run('+($scenario|ConvertTo-Json -Compress)+')');$samples+=$sample;Write-Output ($sample|ConvertTo-Json -Depth 5 -Compress)
 }
 $report=@{browser=$Browser;environment=$environment;samples=$samples;notes=@('Isolated headless browser with fresh storage.','Counts drawing submissions, not GPU utilization or execution time.','No combat intervals or real player profile. Ambient and Reap loads are synthetic.','Headless timing and rendering may differ from interactive browser windows.')}
 if(!$ReportPath){$ReportPath='audit/browser-gpu-'+$Browser.ToLowerInvariant()+'.json'}
 $reportPath=Join-Path $projectPath $ReportPath;[IO.File]::WriteAllText($reportPath,($report|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false));Write-Output ('REPORT '+$reportPath)
}finally{if($socket){$socket.Dispose()};$cancellation.Dispose();if($process -and !$process.HasExited){if($Browser -eq 'Firefox'){$null=& taskkill.exe /PID $process.Id /T /F 2>$null}else{$process.Kill()};$process.WaitForExit()};Remove-Item -LiteralPath $fixturePath -ErrorAction SilentlyContinue}
