param([string]$OriginalInstall='C:/Users/curti/OneDrive/Documents/se4')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$web=Join-Path (Split-Path $PSScriptRoot) 'web'
$manifestPath=Join-Path $web 'assets/classic-art.json'
$manifest=Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$converted=0
foreach($entry in $manifest.PSObject.Properties){
 if($entry.Name -notmatch '^(planets|facilities|components|races)/'){continue}
 $source=Join-Path "$OriginalInstall/Pictures" ([IO.Path]::ChangeExtension($entry.Name,'.bmp'))
 if(!(Test-Path -LiteralPath $source)){throw "Original art missing: $source"}
 $relative=[IO.Path]::ChangeExtension($entry.Name,'.png').Replace([char]92,[char]47)
 $target=Join-Path $web "assets/classic/$relative"
 [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
 $bitmap=[Drawing.Bitmap]::new($source)
 try{$bitmap.MakeTransparent([Drawing.Color]::Black);$bitmap.Save($target,[Drawing.Imaging.ImageFormat]::Png)}finally{$bitmap.Dispose()}
 $entry.Value="assets/classic/$relative";$converted++
}
$sheet=[Drawing.Bitmap]::new("$OriginalInstall/Pictures/Game/General.bmp")
try{
 foreach($entry in @(@('resource-research',0),@('resource-intelligence',16),@('resource-minerals',32),@('resource-organics',48),@('resource-radioactives',64),@('research',0),@('colonize-green',234),@('colonize-red',258))){
  $star=$entry[0] -like 'colonize-*';$y=0;$w=16;$h=16;if($star){$y=16;$w=12;$h=8}
  $part=$sheet.Clone([Drawing.Rectangle]::new([int]$entry[1],$y,$w,$h),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try{$part.MakeTransparent([Drawing.Color]::Black);$part.Save((Join-Path $web "assets/classic/interface/$($entry[0]).png"),[Drawing.Imaging.ImageFormat]::Png)}finally{$part.Dispose()}
  $manifest|Add-Member -NotePropertyName "interface/$($entry[0]).png" -NotePropertyValue "assets/classic/interface/$($entry[0]).png" -Force
 }
}finally{$sheet.Dispose()}
$sheet=[Drawing.Bitmap]::new("$OriginalInstall/Pictures/Game/Buttons/Main.bmp")
try{foreach($entry in @(@('maps',2),@('colonies',1),@('research',6),@('designs',4),@('ships',3),@('log',8),@('status',5))){
 $part=$sheet.Clone([Drawing.Rectangle]::new(([int]$entry[1]*34+1),1,32,32),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 try{$part.MakeTransparent([Drawing.Color]::Black);$part.Save((Join-Path $web "assets/classic/interface/command-$($entry[0]).png"),[Drawing.Imaging.ImageFormat]::Png)}finally{$part.Dispose()}
}}finally{$sheet.Dispose()}
$racesPath=Join-Path $web 'assets/races.json';$races=Get-Content $racesPath -Raw -Encoding UTF8|ConvertFrom-Json
foreach($race in $races){$bitmap=[Drawing.Bitmap]::new("$OriginalInstall/Pictures/Races/$($race.name)/$($race.name)_Race_Portrait.bmp");try{$bitmap.MakeTransparent([Drawing.Color]::Black);$race.image="assets/races/$($race.name).png";$bitmap.Save((Join-Path $web $race.image),[Drawing.Imaging.ImageFormat]::Png)}finally{$bitmap.Dispose()}}
$utf8=[Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($manifestPath,($manifest|ConvertTo-Json -Depth 8 -Compress),$utf8)
[IO.File]::WriteAllText($racesPath,($races|ConvertTo-Json -Depth 8 -Compress),$utf8)
Write-Output "Converted $converted object images, 16 portraits, and interface/resource icons to transparent PNG."
