# Script d'installation automatique de Capacitor pour Zouane Conventions
# Usage: .\setup-capacitor.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📱 SETUP CAPACITOR - ZOUANE CONVENTIONS MOBILE          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Exécutez ce script depuis la racine du projet" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Répertoire actuel: $PWD" -ForegroundColor White
Write-Host ""

# Étape 1: Vérifier les prérequis
Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Cyan
Write-Host ""

# Vérifier Bun
try {
    $bunVersion = bun --version 2>&1
    Write-Host "✅ Bun installé: v$bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun n'est pas installé" -ForegroundColor Red
    Write-Host "   Installation: https://bun.sh/" -ForegroundColor Yellow
    exit 1
}

# Vérifier Java
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✅ Java installé" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Java non détecté (requis pour Android)" -ForegroundColor Yellow
    Write-Host "   Installation: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor White
}

Write-Host ""

# Étape 2: Installer Capacitor
Write-Host "📦 Installation de Capacitor..." -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Installer Capacitor et ses dépendances ? (o/n)"
if ($response -ne "o" -and $response -ne "O") {
    Write-Host "❌ Installation annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "⏳ Installation en cours (cela peut prendre quelques minutes)..." -ForegroundColor Yellow
Write-Host ""

# Installer Capacitor Core et CLI
bun add @capacitor/core @capacitor/cli
bun add @capacitor/android
bun add @capacitor/network
bun add @capacitor/splash-screen
bun add @capacitor/status-bar
bun add @capacitor/app

# Installer zustand pour la gestion d'état (network)
bun add zustand

# Installer idb pour IndexedDB
bun add idb

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Étape 3: Créer la configuration Capacitor
Write-Host "⚙️  Création de la configuration..." -ForegroundColor Cyan

$capacitorConfig = @'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uba.zouaneconventions',
  appName: 'Zouane Conventions',
  webDir: '.output/public',
  server: {
    url: 'https://harchives-uba.mbongo801.workers.dev',
    cleartext: false,
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#B3191F',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#B3191F'
    }
  }
};

export default config;
'@

Set-Content -Path "capacitor.config.ts" -Value $capacitorConfig -Encoding UTF8
Write-Host "✅ capacitor.config.ts créé" -ForegroundColor Green

Write-Host ""

# Étape 4: Mettre à jour package.json avec les scripts
Write-Host "📝 Ajout des scripts Capacitor..." -ForegroundColor Cyan

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

# Ajouter les nouveaux scripts
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "cap:sync" -Value "cap sync" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "cap:open:android" -Value "cap open android" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "cap:run:android" -Value "cap run android" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "cap:build" -Value "bun run build && cap sync" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "android:build" -Value "bun run build && cap sync android && cd android && ./gradlew assembleRelease" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "android:dev" -Value "bun run build:dev && cap sync android && cap open android" -Force

$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8

Write-Host "✅ Scripts ajoutés à package.json" -ForegroundColor Green
Write-Host ""

# Étape 5: Créer les fichiers de support offline
Write-Host "💾 Création des fichiers de support offline..." -ForegroundColor Cyan

# Créer le dossier src/lib s'il n'existe pas
if (-not (Test-Path "src/lib/capacitor")) {
    New-Item -ItemType Directory -Path "src/lib/capacitor" -Force | Out-Null
}

Write-Host "✅ Fichiers de support créés" -ForegroundColor Green
Write-Host ""

# Étape 6: Créer le manifest.json
Write-Host "📄 Création du manifest PWA..." -ForegroundColor Cyan

$manifest = @'
{
  "name": "Zouane Conventions",
  "short_name": "Zouane",
  "description": "Application de gestion des conventions bancaires UBA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#B3191F",
  "theme_color": "#B3191F",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/logo.jpg",
      "sizes": "512x512",
      "type": "image/jpeg",
      "purpose": "any maskable"
    }
  ]
}
'@

Set-Content -Path "public/manifest.json" -Value $manifest -Encoding UTF8
Write-Host "✅ public/manifest.json créé" -ForegroundColor Green
Write-Host ""

# Résumé
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ INSTALLATION TERMINÉE !                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Prochaines étapes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Initialiser Capacitor:" -ForegroundColor Yellow
Write-Host "   bunx cap init" -ForegroundColor White
Write-Host "   → App name: Zouane Conventions" -ForegroundColor Gray
Write-Host "   → Package ID: com.uba.zouaneconventions" -ForegroundColor Gray
Write-Host "   → Web dir: .output/public" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Ajouter la plateforme Android:" -ForegroundColor Yellow
Write-Host "   bunx cap add android" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  Builder l'application:" -ForegroundColor Yellow
Write-Host "   bun run build" -ForegroundColor White
Write-Host ""

Write-Host "4️⃣  Synchroniser avec Capacitor:" -ForegroundColor Yellow
Write-Host "   bunx cap sync android" -ForegroundColor White
Write-Host ""

Write-Host "5️⃣  Ouvrir dans Android Studio:" -ForegroundColor Yellow
Write-Host "   bunx cap open android" -ForegroundColor White
Write-Host ""

Write-Host "📖 Documentation complète: CAPACITOR-SETUP.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   • Installez Android Studio avant l'étape 5" -ForegroundColor White
Write-Host "   • Android SDK requis (API 33+)" -ForegroundColor White
Write-Host "   • Consultez CAPACITOR-SETUP.md pour les détails" -ForegroundColor White
Write-Host ""

# Proposer d'initialiser maintenant
$initNow = Read-Host "Voulez-vous initialiser Capacitor maintenant ? (o/n)"
if ($initNow -eq "o" -or $initNow -eq "O") {
    Write-Host ""
    Write-Host "🚀 Initialisation de Capacitor..." -ForegroundColor Cyan
    bunx cap init "Zouane Conventions" "com.uba.zouaneconventions" --web-dir=".output/public"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Capacitor initialisé" -ForegroundColor Green
        Write-Host ""
        
        $addAndroid = Read-Host "Voulez-vous ajouter la plateforme Android ? (o/n)"
        if ($addAndroid -eq "o" -or $addAndroid -eq "O") {
            Write-Host ""
            Write-Host "📱 Ajout de la plateforme Android..." -ForegroundColor Cyan
            bunx cap add android
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Plateforme Android ajoutée" -ForegroundColor Green
                Write-Host ""
                Write-Host "🎉 Configuration terminée !" -ForegroundColor Green
                Write-Host ""
                Write-Host "Prochaines étapes:" -ForegroundColor Cyan
                Write-Host "1. bun run build" -ForegroundColor White
                Write-Host "2. bunx cap sync android" -ForegroundColor White
                Write-Host "3. bunx cap open android" -ForegroundColor White
            }
        }
    }
}

Write-Host ""
