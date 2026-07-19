# 📱 Création d'une Application Android avec Capacitor

## 🎯 Objectif

Transformer **Zouane Conventions** en application Android (APK) avec :
- ✅ Support offline complet
- ✅ Icône et splash screen personnalisés
- ✅ Synchronisation avec l'API
- ✅ Cache des données localement
- ✅ Installation sur smartphones Android

**URL de production** : https://harchives-uba.mbongo801.workers.dev

---

## 📋 Prérequis

### 1. Node.js et Bun
```powershell
# Vérifier l'installation
node --version  # v18+ requis
bun --version
```

### 2. Android Studio
**Téléchargement** : https://developer.android.com/studio

**Installation** :
1. Téléchargez Android Studio
2. Installez avec les options par défaut
3. Lancez Android Studio
4. Installez Android SDK (API Level 33 minimum)
5. Configurez un AVD (Android Virtual Device) ou connectez un appareil physique

### 3. Java JDK
```powershell
# Vérifier l'installation
java -version  # JDK 17+ requis
```

Si pas installé :
- Téléchargez depuis : https://www.oracle.com/java/technologies/downloads/
- Ou via Chocolatey : `choco install openjdk17`

---

## 🚀 Installation de Capacitor

### Étape 1 : Installer les dépendances Capacitor

```powershell
cd "c:\Users\PLC\Downloads\lovable-2f588b4d (1)"

# Installer Capacitor CLI et Core
bun add @capacitor/core @capacitor/cli

# Installer le plugin Android
bun add @capacitor/android

# Installer les plugins utiles
bun add @capacitor/network        # Détection réseau
bun add @capacitor/splash-screen  # Écran de démarrage
bun add @capacitor/status-bar     # Barre de statut
bun add @capacitor/app           # Lifecycle de l'app
```

### Étape 2 : Initialiser Capacitor

```powershell
bunx cap init
```

**Répondre aux questions** :
- **App name** : `Zouane Conventions`
- **App package ID** : `com.uba.zouaneconventions`
- **Web asset directory** : `.output/public` (pour TanStack Start)

### Étape 3 : Ajouter la plateforme Android

```powershell
bunx cap add android
```

Cela créera un dossier `android/` avec tout le projet Android.

---

## ⚙️ Configuration

### 1. Créer `capacitor.config.ts`

Le fichier devrait être créé automatiquement, mais voici la configuration optimale :

```typescript
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
      keystorePath: 'android/app/keystore.jks',
      keystorePassword: process.env.KEYSTORE_PASSWORD,
      keystoreAlias: 'zouane',
      keystoreAliasPassword: process.env.KEY_PASSWORD,
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
```

### 2. Mettre à jour `package.json`

Ajouter les scripts Capacitor :

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    
    "cap:sync": "cap sync",
    "cap:open:android": "cap open android",
    "cap:run:android": "cap run android",
    "cap:build": "bun run build && cap sync",
    "android:build": "bun run build && cap sync android && cd android && ./gradlew assembleRelease",
    "android:dev": "bun run build:dev && cap sync android && cap open android"
  }
}
```

---

## 💾 Support Offline

### 1. Service Worker avec Workbox

Créer `public/sw.js` :

```javascript
// Service Worker pour le mode offline
const CACHE_NAME = 'zouane-conventions-v1';
const urlsToCache = [
  '/',
  '/logo.jpg',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
```

### 2. Manifest PWA

Créer `public/manifest.json` :

```json
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
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3. Plugin de détection réseau

Créer `src/lib/network.ts` :

```typescript
import { Network } from '@capacitor/network';
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  setOnline: (online: boolean) => void;
  setConnectionType: (type: string) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  connectionType: 'wifi',
  setOnline: (online) => set({ isOnline: online }),
  setConnectionType: (type) => set({ connectionType: type }),
}));

// Initialiser la détection réseau
export async function initNetworkListener() {
  const status = await Network.getStatus();
  useNetworkStore.getState().setOnline(status.connected);
  useNetworkStore.getState().setConnectionType(status.connectionType);

  Network.addListener('networkStatusChange', (status) => {
    useNetworkStore.getState().setOnline(status.connected);
    useNetworkStore.getState().setConnectionType(status.connectionType);
  });
}
```

### 4. Cache local avec IndexedDB

Créer `src/lib/offline-storage.ts` :

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ConventionsDB extends DBSchema {
  conventions: {
    key: string;
    value: {
      id: string;
      agency_id: string;
      year: number;
      month: number;
      cc: number;
      ce: number;
      pm: number;
      synced: boolean;
      updated_at: string;
    };
  };
  agencies: {
    key: string;
    value: {
      id: string;
      name: string;
      code: string;
      synced: boolean;
    };
  };
  pending_sync: {
    key: number;
    value: {
      id?: number;
      table: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<ConventionsDB>;

export async function initDB() {
  db = await openDB<ConventionsDB>('zouane-conventions', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('conventions')) {
        db.createObjectStore('conventions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('agencies')) {
        db.createObjectStore('agencies', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return db;
}

export async function saveConventionOffline(convention: any) {
  const db = await initDB();
  await db.put('conventions', { ...convention, synced: false });
  
  // Ajouter à la queue de synchronisation
  await db.add('pending_sync', {
    table: 'conventions',
    action: 'update',
    data: convention,
    timestamp: Date.now(),
  });
}

export async function syncPendingChanges() {
  const db = await initDB();
  const pending = await db.getAll('pending_sync');
  
  for (const item of pending) {
    try {
      // Envoyer à Supabase
      // await supabase.from(item.table)...
      
      // Si succès, marquer comme synchronisé
      await db.delete('pending_sync', item.id!);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## 🎨 Ressources (Icônes et Splash Screen)

### 1. Générer les icônes

Utilisez votre `logo.jpg` pour créer les icônes :

**Option A : Outil en ligne (Recommandé)**
- https://icon.kitchen/
- Uploadez `public/logo.jpg`
- Téléchargez le package Android
- Extrayez dans `android/app/src/main/res/`

**Option B : Script PowerShell**

Créer `generate-icons.ps1` (nécessite ImageMagick)

### 2. Structure des icônes Android

```
android/app/src/main/res/
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
└── mipmap-xxxhdpi/
    └── ic_launcher.png (192x192)
```

---

## 🏗️ Build de l'Application

### Mode Développement

```powershell
# Build et ouvrir dans Android Studio
bun run android:dev
```

### Build de Production (APK)

```powershell
# 1. Build l'application
bun run build

# 2. Synchroniser avec Capacitor
bunx cap sync android

# 3. Ouvrir Android Studio
bunx cap open android
```

Dans Android Studio :
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Attendre la compilation
3. Cliquer sur "locate" quand terminé
4. L'APK se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release (Signé)

```powershell
cd android
./gradlew assembleRelease
```

L'APK signé sera dans : `android/app/build/outputs/apk/release/`

---

## 🔑 Signature de l'APK

### 1. Créer un Keystore

```powershell
cd android/app
keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias zouane
```

**Informations à fournir** :
- Password: (choisissez un mot de passe fort)
- Nom: UBA
- Organisation: Union des Banques Africaines
- Ville: (votre ville)
- Pays: (votre pays)

### 2. Configurer Gradle

Éditer `android/app/build.gradle` :

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('keystore.jks')
            storePassword 'VOTRE_MOT_DE_PASSE'
            keyAlias 'zouane'
            keyPassword 'VOTRE_MOT_DE_PASSE'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

⚠️ **Sécurité** : Ne committez JAMAIS le keystore ou les mots de passe !

---

## 📦 Installation sur Android

### Via USB

```powershell
# Activer le débogage USB sur votre téléphone
# Connecter le téléphone en USB
# Autoriser le débogage

# Installer l'APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via Fichier

1. Copiez l'APK sur votre téléphone
2. Ouvrez le fichier APK
3. Autorisez l'installation depuis des sources inconnues
4. Installez

---

## 🧪 Tests

### Test en mode offline

1. Lancez l'application
2. Activez le mode avion sur votre téléphone
3. Vérifiez que l'app fonctionne
4. Saisissez des données
5. Désactivez le mode avion
6. Vérifiez que les données se synchronisent

---

## 📊 Taille de l'APK

- **Debug** : ~60-80 MB
- **Release** : ~20-30 MB (après minification)
- **Bundle (AAB)** : ~15-20 MB (pour Google Play)

---

## 🐛 Dépannage

### Erreur "SDK not found"
```powershell
# Définir ANDROID_HOME
$env:ANDROID_HOME = "C:\Users\VOTRE_USER\AppData\Local\Android\Sdk"
```

### Erreur Gradle
```powershell
cd android
./gradlew clean
./gradlew build
```

### L'app crash au démarrage
- Vérifiez les logs : `adb logcat`
- Vérifiez que le webDir est correct
- Vérifiez que le build s'est bien effectué

---

## 📚 Ressources

- **Capacitor Docs** : https://capacitorjs.com/docs
- **Android Studio** : https://developer.android.com/studio
- **Icon Kitchen** : https://icon.kitchen/
- **Splash Screen Generator** : https://apetools.webprofusion.com/app/#/tools/imagegorilla

---

**Prochaine étape** : Exécutez `setup-capacitor.ps1` pour automatiser l'installation !
