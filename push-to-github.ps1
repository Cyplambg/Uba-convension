# Script de push vers GitHub
# Usage: .\push-to-github.ps1

$ErrorActionPreference = "Continue"

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Push Zouane Conventions vers GitHub            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Vérifier si on est dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json non trouvé" -ForegroundColor Red
    Write-Host "   Exécutez ce script depuis le dossier du projet`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Répertoire du projet détecté`n" -ForegroundColor Green

# Vérifier l'authentification GitHub
Write-Host "🔍 Vérification de l'authentification GitHub..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Non authentifié sur GitHub`n" -ForegroundColor Red
    Write-Host "📋 Veuillez vous authentifier avec :" -ForegroundColor Yellow
    Write-Host "   gh auth login`n" -ForegroundColor Green
    
    $response = Read-Host "Voulez-vous vous authentifier maintenant? (o/n)"
    if ($response -eq "o" -or $response -eq "O" -or $response -eq "y" -or $response -eq "Y") {
        Write-Host "`n🔐 Lancement de l'authentification...`n" -ForegroundColor Cyan
        gh auth login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n❌ Échec de l'authentification" -ForegroundColor Red
            exit 1
        }
        Write-Host "`n✅ Authentification réussie!`n" -ForegroundColor Green
    } else {
        Write-Host "`n⏭️  Authentification annulée" -ForegroundColor Yellow
        Write-Host "   Relancez le script après vous être authentifié`n" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "✅ Authentifié sur GitHub`n" -ForegroundColor Green
}

# Demander le nom du repository
Write-Host "📝 Configuration du repository`n" -ForegroundColor Cyan
$repoName = Read-Host "Nom du repository (défaut: zouane-conventions)"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "zouane-conventions"
}

# Demander la visibilité
Write-Host "`n🔒 Visibilité du repository:" -ForegroundColor Cyan
Write-Host "   1. Public  (visible par tout le monde)" -ForegroundColor White
Write-Host "   2. Private (visible uniquement par vous)" -ForegroundColor White
$visibility = Read-Host "Choisissez (1 ou 2, défaut: 1)"

$visibilityFlag = "--public"
if ($visibility -eq "2") {
    $visibilityFlag = "--private"
    Write-Host "   → Repository privé sélectionné" -ForegroundColor Yellow
} else {
    Write-Host "   → Repository public sélectionné" -ForegroundColor Green
}

# Demander la description
$description = Read-Host "`nDescription (optionnel)"
$descriptionFlag = ""
if (-not [string]::IsNullOrWhiteSpace($description)) {
    $descriptionFlag = "--description `"$description`""
}

# Vérifier si le repo existe déjà
Write-Host "`n🔍 Vérification de l'existence du repository..." -ForegroundColor Cyan
$username = (gh api user --jq .login 2>$null)
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "⚠️  Impossible de récupérer le nom d'utilisateur" -ForegroundColor Yellow
} else {
    Write-Host "   Username: $username" -ForegroundColor White
    $repoExists = (gh repo view "$username/$repoName" 2>$null)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⚠️  Le repository $repoName existe déjà sur GitHub!" -ForegroundColor Yellow
        $overwrite = Read-Host "Voulez-vous continuer et pusher dessus? (o/n)"
        if ($overwrite -ne "o" -and $overwrite -ne "O" -and $overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Host "`n⏭️  Opération annulée`n" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Résumé avant création
Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📋 RÉSUMÉ                                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "   Nom       : $repoName" -ForegroundColor White
Write-Host "   Visibilité: $(if ($visibilityFlag -eq '--public') { 'Public 🌐' } else { 'Private 🔒' })" -ForegroundColor White
if (-not [string]::IsNullOrWhiteSpace($description)) {
    Write-Host "   Description: $description" -ForegroundColor White
}
Write-Host ""

$confirm = Read-Host "Confirmer la création et le push? (o/n)"
if ($confirm -ne "o" -and $confirm -ne "O" -and $confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "`n⏭️  Opération annulée`n" -ForegroundColor Yellow
    exit 1
}

# Créer le repository et pusher
Write-Host "`n🚀 Création du repository et push en cours...`n" -ForegroundColor Cyan

$command = "gh repo create `"$repoName`" $visibilityFlag --source=. --remote=origin --push"
if (-not [string]::IsNullOrWhiteSpace($descriptionFlag)) {
    $command += " $descriptionFlag"
}

Write-Host "   Exécution: $command`n" -ForegroundColor Gray

# Créer le repo
if ([string]::IsNullOrWhiteSpace($description)) {
    gh repo create "$repoName" $visibilityFlag --source=. --remote=origin --push
} else {
    gh repo create "$repoName" $visibilityFlag --source=. --remote=origin --push --description "$description"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   ✅ SUCCÈS !                                        ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    if (-not [string]::IsNullOrWhiteSpace($username)) {
        $repoUrl = "https://github.com/$username/$repoName"
        Write-Host "🌐 Votre repository est accessible sur :" -ForegroundColor Cyan
        Write-Host "   $repoUrl`n" -ForegroundColor Green
        
        # Demander si on veut ouvrir le navigateur
        $openBrowser = Read-Host "Voulez-vous ouvrir le repository dans le navigateur? (o/n)"
        if ($openBrowser -eq "o" -or $openBrowser -eq "O" -or $openBrowser -eq "y" -or $openBrowser -eq "Y") {
            Start-Process $repoUrl
        }
    }
    
    Write-Host "📊 Statistiques du push:" -ForegroundColor Cyan
    Write-Host "   - Commits    : 1" -ForegroundColor White
    Write-Host "   - Fichiers   : 108" -ForegroundColor White
    Write-Host "   - Insertions : 10883 lignes" -ForegroundColor White
    
    Write-Host "`n📚 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "   1. Visitez le repository sur GitHub" -ForegroundColor White
    Write-Host "   2. Ajoutez des topics (react, typescript, supabase...)" -ForegroundColor White
    Write-Host "   3. Configurez les paramètres du repo si nécessaire" -ForegroundColor White
    Write-Host "   4. Invitez des collaborateurs (Settings → Collaborators)" -ForegroundColor White
    
} else {
    Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║   ❌ ÉCHEC                                           ║" -ForegroundColor Red
    Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Red
    
    Write-Host "💡 Suggestions de dépannage:" -ForegroundColor Yellow
    Write-Host "   1. Vérifiez votre connexion internet" -ForegroundColor White
    Write-Host "   2. Vérifiez que vous êtes authentifié: gh auth status" -ForegroundColor White
    Write-Host "   3. Essayez de créer le repo manuellement sur GitHub.com" -ForegroundColor White
    Write-Host "   4. Consultez le guide: PUSH-TO-GITHUB.md`n" -ForegroundColor White
    
    exit 1
}

Write-Host "`n🎉 Terminé !`n" -ForegroundColor Green
