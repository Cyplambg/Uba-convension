# Script de push du logo et des modifications vers GitHub
# Usage: .\push-logo.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 PUSH LOGO & FAVICON VERS GITHUB                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Exécutez ce script depuis la racine du projet" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Répertoire actuel: $PWD" -ForegroundColor White
Write-Host ""

# Vérifier que Git est installé
try {
    $gitVersion = git --version 2>$null
    Write-Host "✅ Git détecté: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git n'est pas installé" -ForegroundColor Red
    Write-Host "   Téléchargez depuis: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Vérifier l'état Git
Write-Host "🔍 Vérification de l'état Git..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Host "✅ Aucune modification non commitée" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Toutes les modifications ont déjà été commitées." -ForegroundColor Yellow
    Write-Host "   Si vous voulez pusher vers GitHub, exécutez:" -ForegroundColor Yellow
    Write-Host "   git push origin master" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "📊 Fichiers modifiés/nouveaux détectés:" -ForegroundColor Cyan
Write-Host ""
git status --short
Write-Host ""

# Vérifier le remote
Write-Host "🔗 Vérification de la connexion GitHub..." -ForegroundColor Cyan
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "⚠️  Remote 'origin' non configuré" -ForegroundColor Yellow
    Write-Host "   Configuration automatique..." -ForegroundColor White
    
    git remote add origin https://github.com/Cyplambg/Uba-convension.git
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote configuré: https://github.com/Cyplambg/Uba-convension.git" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec de la configuration du remote" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Remote configuré: $remoteUrl" -ForegroundColor Green
}

Write-Host ""

# Demander confirmation
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Fichiers à ajouter et pusher :" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ Code modifié (logo intégré)" -ForegroundColor Green
Write-Host "   ✅ Assets (logo.jpg, favicon.ico)" -ForegroundColor Green
Write-Host "   ✅ Documentation (8 fichiers)" -ForegroundColor Green
Write-Host "   ✅ Outils (scripts favicon)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Continuer ? (o/n)"
if ($response -ne "o" -and $response -ne "O" -and $response -ne "y" -and $response -ne "Y") {
    Write-Host "❌ Annulé par l'utilisateur" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔨 Ajout des fichiers..." -ForegroundColor Cyan

# Ajouter les fichiers modifiés du code
$filesToAdd = @(
    "src/routes/index.tsx",
    "src/components/app-sidebar.tsx",
    "src/routes/_authenticated/route.tsx",
    "src/lib/excel-export.ts"
)

foreach ($file in $filesToAdd) {
    if (Test-Path $file) {
        git add $file
        Write-Host "   ✅ $file" -ForegroundColor Green
    }
}

# Ajouter les assets
$assets = @(
    "public/logo.jpg",
    "public/favicon.ico",
    "public/.logo-placeholder.txt"
)

foreach ($asset in $assets) {
    if (Test-Path $asset) {
        git add $asset
        Write-Host "   ✅ $asset" -ForegroundColor Green
    }
}

# Ajouter la documentation
$docs = @(
    "INSTALLATION-COMPLETE.md",
    "LOGO-README.md",
    "LOGO-QUICKSTART.md",
    "LOGO-INTEGRATION.md",
    "FAVICON-GUIDE.md",
    "FAVICON-QUICKSTART.txt",
    "PUSH-LOGO-TO-GITHUB.md",
    "push-logo.ps1"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        git add $doc
        Write-Host "   ✅ $doc" -ForegroundColor Green
    }
}

# Ajouter les scripts
$scripts = @(
    "scripts/favicon-helper.html",
    "scripts/generate-favicon.ps1",
    "scripts/generate-favicon.js"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        git add $script
        Write-Host "   ✅ $script" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📝 Création du commit..." -ForegroundColor Cyan

$commitMessage = @"
feat: Intégrer logo UBA et favicon dans toute l'application

✨ Nouvelles fonctionnalités:
- Logo intégré sur page d'accueil (40px)
- Logo dans sidebar (32x32px)
- Logo dans header authentifié (28px)
- Favicon installé (32x32px)
- Espace réservé pour logo dans exports Excel

📄 Documentation ajoutée:
- Guide d'installation complet
- Guide d'intégration du logo
- Guide de génération du favicon
- Instructions rapides

🛠️ Outils inclus:
- Générateur favicon HTML (visuel)
- Script PowerShell de génération
- Script de push automatique

📦 Assets:
- public/logo.jpg (50 KB)
- public/favicon.ico (20 KB)

📝 Fichiers modifiés:
- src/routes/index.tsx
- src/components/app-sidebar.tsx
- src/routes/_authenticated/route.tsx
- src/lib/excel-export.ts
"@

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit créé avec succès" -ForegroundColor Green
} else {
    Write-Host "❌ Échec de la création du commit" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Push vers GitHub..." -ForegroundColor Cyan
Write-Host "   Repository: https://github.com/Cyplambg/Uba-convension" -ForegroundColor White
Write-Host ""

git push -u origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ✅ PUSH RÉUSSI !                              ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Toutes les modifications ont été poussées vers GitHub !" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Visitez votre dépôt:" -ForegroundColor Cyan
    Write-Host "   https://github.com/Cyplambg/Uba-convension" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Le logo et le favicon sont maintenant:" -ForegroundColor Green
    Write-Host "   • Sauvegardés sur GitHub" -ForegroundColor White
    Write-Host "   • Synchronisés avec Lovable (si connecté)" -ForegroundColor White
    Write-Host "   • Prêts pour le déploiement" -ForegroundColor White
    Write-Host ""
    
    # Proposer d'ouvrir GitHub
    $openGithub = Read-Host "Ouvrir GitHub dans le navigateur ? (o/n)"
    if ($openGithub -eq "o" -or $openGithub -eq "O" -or $openGithub -eq "y" -or $openGithub -eq "Y") {
        Start-Process "https://github.com/Cyplambg/Uba-convension"
    }
    
} else {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              ❌ ÉCHEC DU PUSH                              ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Causes possibles:" -ForegroundColor Yellow
    Write-Host "   1. Authentification GitHub requise" -ForegroundColor White
    Write-Host "   2. Pas d'accès au dépôt" -ForegroundColor White
    Write-Host "   3. Conflits avec le dépôt distant" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Cyan
    Write-Host "   • S'authentifier: gh auth login" -ForegroundColor White
    Write-Host "   • Pull d'abord: git pull origin master" -ForegroundColor White
    Write-Host "   • Consulter: PUSH-LOGO-TO-GITHUB.md" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
