param([string]$AssetDirectory=(Join-Path $PSScriptRoot '../assets/effects'))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$assetPath=(Resolve-Path -LiteralPath $AssetDirectory).Path
$weaponPath=Join-Path $assetPath 'scythe-ccw-270-4x4.png'
$bloodPath=Join-Path $assetPath 'blood-4x4-source.png'
$weapon=[Drawing.Bitmap]::FromFile($weaponPath)
$blood=[Drawing.Bitmap]::FromFile($bloodPath)
$normalized=[Drawing.Bitmap]::new(2048,2048,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics=[Drawing.Graphics]::FromImage($normalized)
$graphics.Clear([Drawing.Color]::Transparent)
$graphics.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$attributes=[Drawing.Imaging.ImageAttributes]::new()
$attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
try{
    if($weapon.Width%4 -or $weapon.Height%4 -or $weapon.Width -ne $weapon.Height){throw 'Weapon must have sixteen equal square cells.'}
    $frames=for($index=0;$index -lt 16;$index++){
        $column=$index%4;$row=[Math]::Floor($index/4)
        $x=[int][Math]::Round($column*$blood.Width/4.0,[MidpointRounding]::AwayFromZero)
        $right=[int][Math]::Round(($column+1)*$blood.Width/4.0,[MidpointRounding]::AwayFromZero)
        $y=[int][Math]::Round($row*$blood.Height/4.0,[MidpointRounding]::AwayFromZero)
        $bottom=[int][Math]::Round(($row+1)*$blood.Height/4.0,[MidpointRounding]::AwayFromZero)
        $source=[Drawing.Rectangle]::new($x,$y,$right-$x,$bottom-$y)
        $cell=$blood.Clone($source,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try{
            $scale=504.0/[Math]::Max($cell.Width,$cell.Height)
            $width=[int][Math]::Round($cell.Width*$scale);$height=[int][Math]::Round($cell.Height*$scale)
            $destination=[Drawing.Rectangle]::new($column*512+[int][Math]::Floor((512-$width)/2),$row*512+[int][Math]::Floor((512-$height)/2),$width,$height)
            $graphics.DrawImage($cell,$destination,0,0,$cell.Width,$cell.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
            $touches=@()
            foreach($side in @('left','right','top','bottom')){
                $length=if($side -in @('left','right')){$cell.Height}else{$cell.Width}
                for($pixel=0;$pixel -lt $length;$pixel++){
                    $edgeColor=switch($side){
                        left {$cell.GetPixel(0,$pixel)}
                        right {$cell.GetPixel($cell.Width-1,$pixel)}
                        top {$cell.GetPixel($pixel,0)}
                        bottom {$cell.GetPixel($pixel,$cell.Height-1)}
                    }
                    if($edgeColor.A -gt 16){$touches+=$side;break}
                }
            }
            [ordered]@{frame=$index;source=@($x,$y,$cell.Width,$cell.Height);destination=@($destination.X,$destination.Y,$width,$height);sourceEdgeContacts=$touches}
        }finally{$cell.Dispose()}
    }
    $normalized.Save((Join-Path $assetPath 'blood-4x4-normalized.png'),[Drawing.Imaging.ImageFormat]::Png)
    $hashes=for($index=12;$index -lt 16;$index++){
        $cell=$weapon.Clone([Drawing.Rectangle]::new(($index%4)*($weapon.Width/4),[Math]::Floor($index/4)*($weapon.Height/4),$weapon.Width/4,$weapon.Height/4),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $stream=[IO.MemoryStream]::new();$sha=[Security.Cryptography.SHA256]::Create()
        try{$cell.Save($stream,[Drawing.Imaging.ImageFormat]::Png);[BitConverter]::ToString($sha.ComputeHash($stream.ToArray()))}
        finally{$cell.Dispose();$stream.Dispose();$sha.Dispose()}
    }
    $report=[ordered]@{
        grid=4;frames=16;durationMs=600
        weapon=[ordered]@{source='scythe-ccw-270-4x4.png';size=@($weapon.Width,$weapon.Height);cell=@(($weapon.Width/4),($weapon.Height/4));pivot=@(.5,.5);modified=$false;finalFramesIdentical=(@($hashes|Select-Object -Unique).Count -eq 1);outerAnglesDegrees=@(-95.6,-118.1,-140.7,-163,-185.5,-207.9,-230.4,-252.9,-275.4,-298.2,-320.4,-343.2,-365.8,-365.8,-365.8,-365.8)}
        blood=[ordered]@{source='blood-4x4-source.png';size=@($blood.Width,$blood.Height);prepared='blood-4x4-normalized.png';preparedCell=@(512,512);gutterPx=4;rotationDegrees=-85;scale=.92;firstVisibleFrame=3;fadeFrames=@(13,14,15);progressiveReveal='Measured outer blade edge, -115 - 22.5 * min(frame,12) degrees';frames=$frames}
        notes=@('The located weapon is 3072x3072, not the stated 2048x2048. It is preserved without resampling.','Weapon angles were measured from the outer blade pixels; frames 12-15 hold the final pose.','The blood sheet is independently generated and is not an exact spatial/temporal match. Its faint starting particles are about 135 degrees away from the weapon; a single starting-angle correction is insufficient because the blood accumulates differently. The fitted correction is -85 degrees on blood only, with wind-up frames suppressed and a progressive reveal following the measured cutting edge. Weapon pixels are never rotated.','Normalization copies every source cell pixel, fits it uniformly and adds transparent gutters. Source effects already touching cell boundaries cannot be reconstructed; contacts are recorded per frame.')
    }
    [IO.File]::WriteAllText((Join-Path $assetPath 'scythe-reap-assets.json'),($report|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
    Write-Output ('Prepared 16 blood frames with transparent gutters. Weapon cells: {0}px. Final poses identical: {1}' -f ($weapon.Width/4),$report.weapon.finalFramesIdentical)
}finally{$attributes.Dispose();$graphics.Dispose();$normalized.Dispose();$blood.Dispose();$weapon.Dispose()}
