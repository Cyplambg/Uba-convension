# Script de génération de favicon à partir de logo.png
# Usage: .\scripts\generate-favicon.ps1

$logoPath = "public\logo.png"
$faviconPath = "public\favicon.ico"

Write-Host "🎨 Générateur de Favicon - Zouane Conventions" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le logo existe
if (-not (Test-Path $logoPath)) {
    Write-Host "❌ Erreur: Le fichier $logoPath n'existe pas!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Instructions:" -ForegroundColor Yellow
    Write-Host "   1. Placez votre logo.png dans le dossier 'public/'" -ForegroundColor White
    Write-Host "   2. Relancez ce script" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logo trouvé: $logoPath" -ForegroundColor Green
Write-Host ""

# Méthode 1: Utiliser un service en ligne
Write-Host "🌐 MÉTHODE RECOMMANDÉE: Service en ligne" -ForegroundColor Cyan
Write-Host "   Cette méthode génère un favicon professionnel multi-plateforme" -ForegroundColor White
Write-Host ""
Write-Host "   1. Visitez: https://realfavicongenerator.net/" -ForegroundColor Yellow
Write-Host "   2. Uploadez: $logoPath" -ForegroundColor Yellow
Write-Host "   3. Configurez les paramètres pour iOS, Android, Windows" -ForegroundColor Yellow
Write-Host "   4. Téléchargez le package" -ForegroundColor Yellow
Write-Host "   5. Extrayez favicon.ico dans le dossier public/" -ForegroundColor Yellow
Write-Host ""

# Méthode 2: Vérifier si ImageMagick est installé
Write-Host "🔧 MÉTHODE ALTERNATIVE: ImageMagick (si installé)" -ForegroundColor Cyan
Write-Host ""

$magickInstalled = $false
try {
    $magickVersion = magick --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $magickInstalled = $true
        Write-Host "   ✅ ImageMagick détecté!" -ForegroundColor Green
        Write-Host ""
        
        $response = Read-Host "   Voulez-vous générer le favicon maintenant? (o/n)"
        if ($response -eq "o" -or $response -eq "O" -or $response -eq "y" -or $response -eq "Y") {
            Write-Host ""
            Write-Host "   🔄 Génération du favicon en cours..." -ForegroundColor Yellow
            
            # Générer le favicon
            magick convert "$logoPath" -resize 32x32 -background none -flatten "$faviconPath"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Favicon généré avec succès: $faviconPath" -ForegroundColor Green
                Write-Host ""
                Write-Host "   📊 Informations:" -ForegroundColor Cyan
                $faviconInfo = Get-Item $faviconPath
                Write-Host "      Taille: $($faviconInfo.Length) octets" -ForegroundColor White
                Write-Host "      Créé: $($faviconInfo.CreationTime)" -ForegroundColor White
                Write-Host ""
                Write-Host "   🎉 Terminé! Redémarrez votre serveur de développement." -ForegroundColor Green
            } else {
                Write-Host "   ❌ Erreur lors de la génération" -ForegroundColor Red
            }
        } else {
            Write-Host "   ⏭️  Génération annulée" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  ImageMagick n'est pas installé" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Pour installer ImageMagick:" -ForegroundColor White
    Write-Host "   • Via Chocolatey: choco install imagemagick" -ForegroundColor Gray
    Write-Host "   • Via Scoop: scoop install imagemagick" -ForegroundColor Gray
    Write-Host "   • Téléchargement: https://imagemagick.org/script/download.php" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📚 Documentation complète: LOGO-INTEGRATION.md" -ForegroundColor Cyan
Write-Host ""
