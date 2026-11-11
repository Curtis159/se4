param([string]$OriginalInstall='C:\Users\curti\OneDrive\Documents\se4')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$web=Join-Path (Split-Path $PSScriptRoot) 'web'
$out=Join-Path $web 'assets\classic\interface'
New-Item -ItemType Directory $out -Force | Out-Null
$manifestPath=Join-Path $web 'assets\classic-art.json'
$manifest=Get-Content $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
function Export-Art($Source,$Name,$Crop=$null) {
 $image=[Drawing.Bitmap]::new((Join-Path $OriginalInstall "Pictures\$Source"))
 try {
  if($Crop){$part=$image.Clone([Drawing.Rectangle]::new($Crop[0],$Crop[1],$Crop[2],$Crop[3]),[Drawing.Imaging.PixelFormat]::Format32bppArgb)}
  else{$part=$image.Clone()}
  try{$part.Save((Join-Path $out "$Name.png"),[Drawing.Imaging.ImageFormat]::Png)}finally{$part.Dispose()}
 } finally {$image.Dispose()}
 $manifest["interface/$Name.png"]="assets/classic/interface/$Name.png"
}
Export-Art 'Game\Dialogs\StartMenu.bmp' 'start-menu'
Export-Art 'Game\Dialogs\Rowgrid.bmp' 'row-grid'
Export-Art 'Game\Backgrd.bmp' 'background'
Export-Art 'Game\Screens\1024X768\Starmap.bmp' 'starfield'
Export-Art 'Game\General.bmp' 'research' @(0,0,16,16)
Export-Art 'Game\General.bmp' 'colonize-green' @(234,16,12,8)
Export-Art 'Game\General.bmp' 'colonize-red' @(258,16,12,8)
$icons=@{maps=2;colonies=1;research=6;designs=4;ships=3;log=8;status=5}
foreach($name in $icons.Keys){Export-Art 'Game\Buttons\Main.bmp' "command-$name" @(($icons[$name]*34),0,34,34)}
$manifest | ConvertTo-Json -Compress | Set-Content $manifestPath -Encoding utf8NoBOM

& (Join-Path $PSScriptRoot "prepare_transparent_art.ps1") -OriginalInstall $OriginalInstall
