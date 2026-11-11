# Raster exports of the code-native app icon for browser installation manifests.
Add-Type -AssemblyName System.Drawing
$webRoot=Join-Path (Split-Path $PSScriptRoot) 'web'
foreach($size in @(192,512)){
 $bitmap=New-Object System.Drawing.Bitmap($size,$size)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 $graphics.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#132035'))
 $blue=New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#2864a8'))
 $gold=New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#e9bf69'))
 $pen=New-Object Drawing.Pen($gold,($size*0.035))
 $graphics.FillEllipse($blue,[single]($size*0.273),[single]($size*0.203),[single]($size*0.454),[single]($size*0.454))
 $graphics.TranslateTransform([single]($size*0.5),[single]($size*0.43));$graphics.RotateTransform(-25)
 $graphics.DrawEllipse($pen,[single](-$size*0.371),[single](-$size*0.098),[single]($size*0.742),[single]($size*0.196));$graphics.ResetTransform()
 $font=New-Object Drawing.Font('Arial',([single]($size*0.165)),[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel)
 $format=New-Object Drawing.StringFormat;$format.Alignment=[Drawing.StringAlignment]::Center
 $graphics.DrawString('SE IV',$font,$gold,[Drawing.RectangleF]::new(0,[single]($size*0.69),$size,[single]($size*0.25)),$format)
 $bitmap.Save((Join-Path $webRoot "icon-$size.png"),[Drawing.Imaging.ImageFormat]::Png)
 $font.Dispose();$format.Dispose();$pen.Dispose();$gold.Dispose();$blue.Dispose();$graphics.Dispose();$bitmap.Dispose()
}
