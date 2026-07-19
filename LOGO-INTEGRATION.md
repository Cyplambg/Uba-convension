# 🎨 Intégration du Logo - Zouane Conventions

## 📍 Emplacements du logo dans l'application

Le logo `logo.png` a été intégré à **5 endroits clés** de l'application :

### 1. ✅ Page d'accueil (Landing Page)
- **Fichier** : `src/routes/index.tsx`
- **Position** : Header principal, à gauche du nom "Zouane Conventions"
- **Taille** : `h-10` (40px de hauteur, largeur automatique)

### 2. ✅ Sidebar Desktop
- **Fichier** : `src/components/app-sidebar.tsx`
- **Position** : En-tête de la sidebar (collapsible)
- **Taille** : `h-8 w-8` (32x32px, objet contenu)

### 3. ✅ Header Mobile/Desktop (Application authentifiée)
- **Fichier** : `src/routes/_authenticated/route.tsx`
- **Position** : Header du layout authentifié, entre le trigger de sidebar et le titre
- **Taille** : `h-7` (28px de hauteur, largeur automatique)

### 4. ✅ Favicon
- **Fichier** : `public/favicon.ico`
- **Instructions** : Voir section "Génération du Favicon" ci-dessous

### 5. ✅ Exports Excel
- **Fichier** : `src/lib/excel-export.ts`
- **Position** : Ligne 2 de chaque feuille Excel (espace réservé)
- **Note** : La bibliothèque `xlsx` standard ne supporte pas l'insertion d'images. Pour ajouter réellement le logo dans les fichiers Excel, vous auriez besoin d'une bibliothèque comme `exceljs`.

---

## 📋 Instructions de mise en place

### Étape 1 : Placer le logo
Copiez votre fichier `logo.png` dans le dossier :
```
public/logo.png
```

**Recommandations pour le logo :**
- Format : PNG avec transparence (fond transparent)
- Dimensions recommandées : 200x200px minimum (sera redimensionné automatiquement)
- Poids : < 100KB
- Format carré ou légèrement rectangulaire

### Étape 2 : Générer le favicon

#### Option A : En ligne (Recommandé)
1. Visitez [Real Favicon Generator](https://realfavicongenerator.net/)
2. Uploadez `public/logo.png`
3. Configurez les paramètres pour différentes plateformes
4. Téléchargez le package de favicons
5. Remplacez `public/favicon.ico` avec le fichier généré

#### Option B : Ligne de commande (ImageMagick)
```bash
# Installer ImageMagick d'abord : https://imagemagick.org/
convert public/logo.png -resize 32x32 public/favicon.ico
```

#### Option C : PowerShell (si ImageMagick installé)
```powershell
magick convert public/logo.png -resize 32x32 public/favicon.ico
```

### Étape 3 : Vérifier l'intégration
Lancez le serveur de développement :
```bash
bun run dev
```

Vérifiez que le logo apparaît :
- ✅ Sur la page d'accueil (http://localhost:3000)
- ✅ Dans la sidebar (après connexion)
- ✅ Dans le header de l'application
- ✅ Comme favicon dans l'onglet du navigateur

---

## 🎨 Personnalisation

### Ajuster la taille du logo

**Landing Page** (`src/routes/index.tsx`) :
```tsx
<img src="/logo.png" alt="Zouane Conventions" className="h-10 w-auto object-contain" />
//                                                           ^^^^  <- Modifiez ici (h-8, h-12, h-16, etc.)
```

**Sidebar** (`src/components/app-sidebar.tsx`) :
```tsx
<img src="/logo.png" alt="Zouane" className="h-8 w-8 shrink-0 object-contain" />
//                                             ^^^^^^^^ <- Taille fixe carrée
```

**Header** (`src/routes/_authenticated/route.tsx`) :
```tsx
<img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
//                                         ^^^^ <- Ajustez la hauteur
```

### Classes Tailwind disponibles
- `h-6` : 24px
- `h-7` : 28px
- `h-8` : 32px
- `h-10` : 40px
- `h-12` : 48px
- `h-16` : 64px

---

## 🔧 Amélioration avancée : Logo dans Excel

Pour **réellement** insérer le logo dans les fichiers Excel (pas juste réserver l'espace), vous devez :

### Option 1 : Utiliser ExcelJS (Recommandé)
```bash
bun add exceljs
```

Puis remplacer la logique d'export dans `src/lib/excel-export.ts` avec `exceljs` qui supporte l'insertion d'images.

### Option 2 : Post-traitement
Utiliser un script Python avec `openpyxl` pour ajouter le logo après génération.

---

## 📸 Format du logo

**Logo actuel attendu :**
- Nom : `logo.png`
- Emplacement : `public/logo.png`
- Accessible via : `/logo.png` dans l'application

**Si vous avez plusieurs variants :**
- `public/logo.png` → Logo principal (couleur)
- `public/logo-white.png` → Logo blanc (pour fonds sombres)
- `public/logo-icon.png` → Icône seule (pour favicon)

---

## ✅ Checklist

- [ ] Logo placé dans `public/logo.png`
- [ ] Favicon généré et remplacé dans `public/favicon.ico`
- [ ] Serveur de dev redémarré (`bun run dev`)
- [ ] Page d'accueil vérifiée
- [ ] Sidebar vérifiée (après connexion)
- [ ] Header vérifiée
- [ ] Favicon visible dans l'onglet du navigateur
- [ ] Exports Excel testés (espace réservé visible)

---

## 🐛 Dépannage

**Le logo ne s'affiche pas :**
1. Vérifiez que le fichier existe : `public/logo.png`
2. Vérifiez les permissions du fichier
3. Videz le cache du navigateur (Ctrl + Shift + R)
4. Redémarrez le serveur de développement

**Le logo est déformé :**
- Utilisez toujours `object-contain` dans les classes
- Assurez-vous que le logo source est de bonne qualité
- Pour un logo carré, utilisez `h-X w-X`, pour rectangulaire utilisez `h-X w-auto`

**Le favicon ne change pas :**
- Le favicon est souvent mis en cache agressivement
- Fermez complètement le navigateur et rouvrez
- Testez en navigation privée
- Vérifiez la console pour les erreurs 404

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. La console du navigateur (F12 → Console)
2. Les erreurs réseau (F12 → Network)
3. Que le chemin `/logo.png` retourne bien l'image (http://localhost:3000/logo.png)

---

**Date de mise à jour** : Juillet 2026  
**Version** : 1.0.0
