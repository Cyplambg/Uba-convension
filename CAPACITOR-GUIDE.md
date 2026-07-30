# Guide Capacitor - Application Mobile UBA Convention

## 📱 Vue d'ensemble

Votre projet est maintenant configuré avec Capacitor pour créer des applications mobiles natives Android et iOS à partir de votre application web.

## 🏗️ Configuration actuelle

- **App Name:** UBAConvention
- **App ID:** com.ubaarchives.convention
- **Web Directory:** `.output/public`

## 📋 Prérequis

### Pour Android
- **Android Studio** installé ([Download](https://developer.android.com/studio))
- **JDK 17** ou supérieur
- **Android SDK** (installé avec Android Studio)

### Pour iOS (Mac uniquement)
- **Xcode** installé (depuis l'App Store)
- **CocoaPods** installé (`sudo gem install cocoapods`)

## 🚀 Workflow de développement

### 1. Build de l'application web
```bash
bun run build
```

### 2. Synchroniser avec les plateformes natives
```bash
# Synchroniser Android
bunx cap sync android

# Synchroniser iOS (Mac uniquement)
bunx cap sync ios
```

### 3. Ouvrir dans l'IDE natif

#### Android
```bash
bunx cap open android
```
Cela ouvrira Android Studio. Vous pourrez alors :
- Lancer l'app sur un émulateur
- Lancer l'app sur un appareil physique connecté
- Générer un APK/AAB pour publication

#### iOS (Mac uniquement)
```bash
bunx cap open ios
```
Cela ouvrira Xcode.

## 🔄 Commandes utiles

### Développement rapide
```bash
# 1. Modifier le code
# 2. Rebuild
bun run build

# 3. Synchroniser les changements
bunx cap sync android
```

### Ajouter des plugins Capacitor
```bash
# Exemple: Caméra
bun add @capacitor/camera

# Puis synchroniser
bunx cap sync
```

### Plugins Capacitor populaires
- `@capacitor/camera` - Accès à la caméra
- `@capacitor/filesystem` - Accès aux fichiers
- `@capacitor/geolocation` - Localisation GPS
- `@capacitor/network` - État du réseau
- `@capacitor/push-notifications` - Notifications push
- `@capacitor/storage` - Stockage local
- `@capacitor/splash-screen` - Écran de démarrage

## 📦 Génération de l'APK (Android)

### Debug APK
1. Ouvrir Android Studio: `bunx cap open android`
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. L'APK sera dans: `android/app/build/outputs/apk/debug/`

### Release APK (pour publication)
1. Générer une clé de signature:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Configurer dans `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('path/to/my-release-key.keystore')
            storePassword 'your-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. Build release: **Build → Generate Signed Bundle / APK**

## 🍎 Génération IPA (iOS)

1. Ouvrir Xcode: `bunx cap open ios`
2. Sélectionner le bon équipe de développement (Team)
3. **Product → Archive**
4. Distribuer via App Store Connect ou Ad Hoc

## ⚙️ Configuration Capacitor

Le fichier `capacitor.config.ts` contient la configuration:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ubaarchives.convention',
  appName: 'UBAConvention',
  webDir: '.output/public',
  server: {
    // Pour développement avec live reload
    // url: 'http://192.168.1.X:8080',
    // cleartext: true
  }
};

export default config;
```

## 🔧 Personnalisation

### Icône de l'application
- Android: Remplacer les images dans `android/app/src/main/res/mipmap-*/`
- iOS: Utiliser Xcode pour gérer les icônes dans Assets.xcassets

### Splash Screen
- Android: `android/app/src/main/res/drawable/splash.png`
- iOS: Gérer via Xcode dans Assets.xcassets

### Permissions
- Android: `android/app/src/main/AndroidManifest.xml`
- iOS: `ios/App/App/Info.plist`

## 📱 Test sur appareil physique

### Android
1. Activer le mode développeur sur votre téléphone
2. Activer le débogage USB
3. Connecter via USB
4. Dans Android Studio: sélectionner l'appareil et Run

### iOS
1. Connecter l'iPhone/iPad
2. Dans Xcode: sélectionner l'appareil
3. Accepter les certificats de développement
4. Run

## 🐛 Résolution de problèmes

### "index.html not found"
Assurez-vous de builder avant de sync:
```bash
bun run build
bunx cap sync
```

### Changements non visibles
Effacez et reconstruisez:
```bash
bun run build
bunx cap sync --inline
```

### Erreurs Gradle (Android)
```bash
cd android
./gradlew clean
cd ..
bunx cap sync android
```

## 📚 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Plugins Capacitor](https://capacitorjs.com/docs/plugins)
- [Guide Android](https://capacitorjs.com/docs/android)
- [Guide iOS](https://capacitorjs.com/docs/ios)

## 🎯 Prochaines étapes

1. **Installer Android Studio** si pas déjà fait
2. **Ouvrir le projet**: `bunx cap open android`
3. **Tester sur émulateur** pour voir l'application
4. **Personnaliser** l'icône et le splash screen
5. **Ajouter des plugins** selon vos besoins

---

**Note:** Ce projet utilise TanStack Start (SSR). Pour une meilleure expérience mobile, vous pourriez envisager d'adapter certaines fonctionnalités pour fonctionner en mode offline avec le stockage local.
