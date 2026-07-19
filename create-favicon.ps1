# Script PowerShell pour créer un favicon à partir de logo.jpg
# Utilise .NET System.Drawing (intégré à Windows)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🎨 CRÉATION DU FAVICON À PARTIR DE LOGO.JPG             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$logoPath = "public\logo.jpg"
$faviconPath = "public\favicon.ico"

# Vérifier que le logo existe
if (-not (Test-Path $logoPath)) {
    Write-Host "❌ Erreur: Le fichier $logoPath n'existe pas!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📁 Vérifiez que vous êtes dans le bon répertoire." -ForegroundColor Yellow
    Write-Host "   Chemin actuel: $PWD" -ForegroundColor White
    exit 1
}

Write-Host "✅ Logo trouvé: $logoPath" -ForegroundColor Green

# Obtenir les infos du logo
$logoInfo = Get-Item $logoPath
Write-Host "   Taille: $([math]::Round($logoInfo.Length / 1KB, 2)) KB" -ForegroundColor White
Write-Host ""

# Charger System.Drawing
Add-Type -AssemblyName System.Drawing

Write-Host "🔄 Conversion en cours..." -ForegroundColor Cyan
Write-Host ""

try {
    # Charger l'image source
    $sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath).Path)
    
    Write-Host "   📐 Dimensions originales: $($sourceImage.Width)x$($sourceImage.Height) pixels" -ForegroundColor White
    
    # Créer une image 32x32 pour le favicon
    $faviconSize = 32
    $favicon = New-Object System.Drawing.Bitmap($faviconSize, $faviconSize)
    $graphics = [System.Drawing.Graphics]::FromImage($favicon)
    
    # Améliorer la qualité du redimensionnement
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Dessiner l'image redimensionnée
    $graphics.DrawImage($sourceImage, 0, 0, $faviconSize, $faviconSize)
    
    Write-Host "   ✅ Image redimensionnée à ${faviconSize}x${faviconSize} pixels" -ForegroundColor Green
    
    # Sauvegarder comme PNG (compatible favicon)
    $favicon.Save((Resolve-Path ".").Path + "\$faviconPath", [System.Drawing.Imaging.ImageFormat]::Png)
    
    Write-Host "   ✅ Favicon sauvegardé: $faviconPath" -ForegroundColor Green
    
    # Nettoyer les ressources
    $graphics.Dispose()
    $favicon.Dispose()
    $sourceImage.Dispose()
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ✅ FAVICON CRÉÉ AVEC SUCCÈS !                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    # Afficher les infos du nouveau favicon
    $faviconInfo = Get-Item $faviconPath
    Write-Host "📊 Informations du favicon:" -ForegroundColor Cyan
    Write-Host "   📁 Emplacement: $faviconPath" -ForegroundColor White
    Write-Host "   📦 Taille: $([math]::Round($faviconInfo.Length / 1KB, 2)) KB" -ForegroundColor White
    Write-Host "   📐 Dimensions: 32x32 pixels" -ForegroundColor White
    Write-Host "   🕒 Créé: $($faviconInfo.CreationTime)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🎉 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   1️⃣  Redémarrez votre serveur de développement:" -ForegroundColor Yellow
    Write-Host "      bun run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "   2️⃣  Ouvrez http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   3️⃣  Vérifiez le favicon dans l'onglet du navigateur" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ⚠️  Si le favicon n'a pas changé:" -ForegroundColor Yellow
    Write-Host "      • Videz le cache: Ctrl + Shift + R" -ForegroundColor White
    Write-Host "      • Fermez tous les onglets et rouvrez" -ForegroundColor White
    Write-Host "      • Testez en navigation privée" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              ❌ ERREUR                                     ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Message d'erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions alternatives:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   1️⃣  Ouvrez generate-favicon-now.html dans votre navigateur" -ForegroundColor Yellow
    Write-Host "      Double-cliquez sur le fichier" -ForegroundColor White
    Write-Host ""
    Write-Host "   2️⃣  Utilisez un service en ligne:" -ForegroundColor Yellow
    Write-Host "      https://realfavicongenerator.net/" -ForegroundColor White
    Write-Host ""
    Write-Host "   3️⃣  Consultez la documentation:" -ForegroundColor Yellow
    Write-Host "      FAVICON-GUIDE.md" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
