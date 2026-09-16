Add-Type -AssemblyName System.Drawing

$width = 1024
$height = 500
$outputPath = Join-Path $PSScriptRoot "..\assets\images\play-store-feature-graphic.png"
$iconPath = Join-Path $PSScriptRoot "..\assets\images\icon.png"

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(0, 0, $width, $height)),
  [System.Drawing.Color]::FromArgb(15, 23, 42),
  [System.Drawing.Color]::FromArgb(30, 64, 175),
  0
)
$graphics.FillRectangle($background, 0, 0, $width, $height)

$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 147, 197, 253), 1)
for ($x = -40; $x -lt $width; $x += 48) { $graphics.DrawLine($gridPen, $x, 0, $x + 260, $height) }
for ($y = 20; $y -lt $height; $y += 48) { $graphics.DrawLine($gridPen, 0, $y, $width, $y) }

$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 147, 197, 253))
$graphics.FillEllipse($accentBrush, 720, -230, 480, 480)
$graphics.FillEllipse($accentBrush, -160, 340, 400, 400)

$appIcon = [System.Drawing.Image]::FromFile($iconPath)
$graphics.DrawImage($appIcon, (New-Object System.Drawing.Rectangle(112, 149, 202, 202)))
$appIcon.Dispose()

$titleFont = New-Object System.Drawing.Font("Segoe UI", 66, [System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 23, [System.Drawing.FontStyle]::Regular)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(219, 234, 254))
$titleText = "PadCommand"
$subtitleText = "Rental property command center"
$titlePosition = New-Object System.Drawing.PointF(352, 176)
$subtitleWidth = $graphics.MeasureString($subtitleText, $subtitleFont).Width
$titleCenter = $titlePosition.X + ($graphics.MeasureString($titleText, $titleFont).Width / 2)
$subtitlePosition = New-Object System.Drawing.PointF(($titleCenter - ($subtitleWidth / 2)), 264)
$graphics.DrawString($titleText, $titleFont, $titleBrush, $titlePosition)
$graphics.DrawString($subtitleText, $subtitleFont, $subtitleBrush, $subtitlePosition)

$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, 191, 219, 254), 3)
$graphics.DrawLine($linePen, 357, 321, 884, 321)

$graphics.Dispose()
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Output "Created $outputPath (1024 x 500 PNG)"
