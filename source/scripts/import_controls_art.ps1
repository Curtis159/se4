param([string]$OriginalInstall='C:/Users/curti/OneDrive/Documents/se4')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$web=Join-Path (Split-Path $PSScriptRoot) 'web'
$manifestPath=Join-Path $web 'assets/classic-art.json'
$manifest=Get-Content $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
function Icon($source,$name,$x,$y,$size){
 $image=[Drawing.Bitmap]::new((Join-Path $OriginalInstall "Pictures/$source"))
 try{$part=$image.Clone([Drawing.Rectangle]::new($x,$y,$size,$size),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 try{$part.MakeTransparent([Drawing.Color]::Black);$part.Save((Join-Path $web "assets/classic/interface/$name.png"),[Drawing.Imaging.ImageFormat]::Png)}finally{$part.Dispose()}}finally{$image.Dispose()}
 $manifest["interface/$name.png"]="assets/classic/interface/$name.png"
}
$orders=@{move=0;warp=5;colonize=2;attack=4;fleet=6;resupply=8;repair=9;stop=10;sentry=12;explore=3;load=19;unload=20}
foreach($name in $orders.Keys){Icon 'Game/Buttons/Orders.bmp' "order-$name" ($orders[$name]*34) 0 34}
foreach($entry in @(@('status-empire',5),@('status-scores',5),@('status-diplomacy',7),@('status-designs',4))){Icon 'Game/Buttons/Main.bmp' $entry[0] ($entry[1]*34) 0 34}
Icon 'Game/General.bmp' 'status-intelligence' 32 32 32
Icon 'Game/Buttons/Orders.bmp' 'status-simulator' (4*34) 0 34
Icon 'Game/General.bmp' 'planet-shipyard' 0 136 20
Icon 'Game/General.bmp' 'planet-dome' (17*20) 136 20
Icon 'Game/General.bmp' 'planet-colony' ((22%19)*20) 156 20
Icon 'Game/Buttons/Orders.bmp' 'planet-resupply' (8*34) 0 34
$manifest | ConvertTo-Json -Compress | Set-Content $manifestPath -Encoding utf8NoBOM

