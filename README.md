# 🏦 Zouane Conventions

Application web de gestion des conventions bancaires pour l'UBA (Union des Banques Africaines). Solution moderne et sécurisée pour remplacer les fiches papier par un système numérique de saisie, suivi et analyse des conventions par agence.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![TanStack](https://img.shields.io/badge/TanStack-Start-FF4154)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![Tailwind](https://img.shields.io/badge/Tailwind-4.2.1-38B2AC)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du projet](#-structure-du-projet)
- [Documentation](#-documentation)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### 📊 Tableau de bord
- Vue d'ensemble en temps réel des conventions (CC, CE, PM)
- Comparaison année N vs N-1 avec évolution en pourcentage
- Graphiques interactifs (évolution mensuelle, répartition)
- Alertes pour les mois manquants
- Top 5 des agences (admin uniquement)

### ✍️ Saisie mensuelle
- Formulaire simple et rapide (< 30 secondes)
- Saisie par agence, année et mois
- Calcul automatique des totaux
- Mise à jour des données existantes

### 📈 Statistiques
- Analyses détaillées multi-agences
- Comparaisons inter-agences
- Évolution sur plusieurs années
- Visualisations avancées

### 📄 Exports
- Export Excel individuel par agence
- Bilan annuel complet multi-agences
- Format professionnel avec formules Excel
- Logo intégré dans les documents

### 👥 Gestion
- Gestion des agences (admin)
- Gestion des utilisateurs et rôles (admin)
- 2 niveaux d'accès : Admin / Agent
- Authentification sécurisée Supabase

---

## 🛠️ Technologies

### Frontend
- **React 19.2.0** - Bibliothèque UI
- **TanStack Start** - Framework full-stack React
- **TanStack Router** - Routage file-based
- **TanStack Query** - Gestion d'état serveur
- **TypeScript 5.8.3** - Type safety
- **Tailwind CSS 4.2.1** - Styling utility-first
- **shadcn/ui** - Composants UI (Radix)

### Backend & Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de données
- **Row Level Security** - Sécurité au niveau ligne
- **Supabase Auth** - Authentification

### Visualisation & Export
- **Recharts** - Graphiques et charts
- **XLSX** - Export Excel
- **Lucide React** - Icônes

### Tooling
- **Vite 8.0.16** - Build tool
- **Bun** - Package manager & runtime
- **ESLint** - Linting
- **Prettier** - Formatting

---

## 🚀 Installation

### Prérequis

- **Node.js** 18+ ou **Bun** 1.0+
- **Git**
- Un compte **Supabase** (gratuit)

### Étapes

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/zouane-conventions.git
   cd zouane-conventions
   ```

2. **Installer les dépendances**
   ```bash
   bun install
   # ou
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   
   Éditez `.env` et remplissez vos credentials Supabase :
   ```env
   SUPABASE_PROJECT_ID="votre_project_id"
   SUPABASE_PUBLISHABLE_KEY="votre_publishable_key"
   SUPABASE_URL="https://votre_project_id.supabase.co"
   
   VITE_SUPABASE_PROJECT_ID="votre_project_id"
   VITE_SUPABASE_PUBLISHABLE_KEY="votre_publishable_key"
   VITE_SUPABASE_URL="https://votre_project_id.supabase.co"
   ```

4. **Configurer la base de données Supabase**
   
   Exécutez les migrations SQL dans le Supabase SQL Editor :
   - Créez les tables : `agencies`, `conventions`, `profiles`, `user_roles`
   - Configurez les Row Level Security (RLS) policies
   - Ajoutez les fonctions : `has_role()`, `current_user_agency()`
   
   Voir `/docs/supabase-setup.md` pour le script SQL complet.

5. **Démarrer le serveur de développement**
   ```bash
   bun run dev
   # ou
   npm run dev
   ```

6. **Ouvrir l'application**
   ```
   http://localhost:3000
   ```

---

## ⚙️ Configuration

### Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SUPABASE_PROJECT_ID` | ID du projet Supabase | `abc123xyz` |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon key) | `eyJhbGc...` |
| `SUPABASE_URL` | URL du projet | `https://abc123xyz.supabase.co` |
| `VITE_*` | Variables accessibles côté client | (mêmes valeurs) |

### Base de données

Le schéma de base de données comprend :

- **`agencies`** - Agences bancaires
- **`conventions`** - Saisie mensuelle (CC, CE, PM)
- **`profiles`** - Profils utilisateurs étendus
- **`user_roles`** - Rôles (admin / agent)

---

## 📖 Utilisation

### Connexion

1. Créez un compte via la page de connexion
2. Un administrateur doit vous assigner un rôle et une agence
3. Reconnectez-vous pour accéder à l'application

### Saisie mensuelle

1. Accédez à **"Saisie mensuelle"**
2. Sélectionnez votre agence (pré-rempli pour les agents)
3. Choisissez l'année et le mois
4. Saisissez les valeurs : CC, CE, PM
5. Cliquez sur **"Enregistrer"**

### Consultation

- **Tableau de bord** : Vue d'ensemble et statistiques
- **Tableau annuel** : Vue tabulaire des 12 mois
- **Statistiques** : Analyses avancées et comparaisons

### Export Excel

- **Par agence** : Tableau annuel → Bouton "Export"
- **Bilan complet** : Dashboard → Bouton "Bilan annuel"

---

## 📁 Structure du projet

```
zouane-conventions/
├── public/                  # Assets statiques
│   ├── logo.jpg            # Logo UBA
│   └── favicon.ico         # Favicon
├── src/
│   ├── components/         # Composants React
│   │   ├── ui/            # shadcn/ui components
│   │   ├── app-sidebar.tsx
│   │   └── mobile-nav.tsx
│   ├── routes/            # Routes TanStack (file-based)
│   │   ├── __root.tsx     # Root layout
│   │   ├── index.tsx      # Landing page
│   │   ├── auth.tsx       # Authentification
│   │   └── _authenticated/  # Routes protégées
│   │       ├── dashboard.tsx
│   │       ├── saisie.tsx
│   │       ├── tableau.tsx
│   │       ├── statistiques.tsx
│   │       ├── agences.tsx
│   │       └── utilisateurs.tsx
│   ├── integrations/
│   │   └── supabase/      # Client Supabase & types
│   ├── lib/               # Utilitaires
│   │   ├── auth.tsx       # Context d'authentification
│   │   ├── excel-export.ts  # Export Excel
│   │   └── utils.ts       # Helpers
│   └── styles.css         # Styles globaux
├── scripts/               # Scripts utilitaires
│   ├── favicon-helper.html
│   └── generate-favicon.ps1
├── docs/                  # Documentation (voir ci-dessous)
├── .env.example          # Template variables d'environnement
├── package.json          # Dépendances
├── tsconfig.json         # Config TypeScript
└── vite.config.ts        # Config Vite

```

---

## 📚 Documentation

Le projet inclut une documentation complète :

| Fichier | Contenu |
|---------|---------|
| **`INSTALLATION-COMPLETE.md`** | Guide d'installation du logo/favicon |
| **`LOGO-README.md`** | Index de la documentation logo |
| **`LOGO-INTEGRATION.md`** | Intégration technique du logo |
| **`FAVICON-GUIDE.md`** | Guide génération favicon |
| **`AGENTS.md`** | Règles pour intégration Lovable |

---

## 🧪 Scripts disponibles

```bash
# Développement
bun run dev          # Démarrer le serveur dev (http://localhost:3000)

# Build
bun run build        # Build production
bun run build:dev    # Build mode développement
bun run preview      # Prévisualiser le build

# Qualité du code
bun run lint         # Linter le code
bun run format       # Formater avec Prettier
```

---

## 🔐 Sécurité

- ✅ Authentification Supabase
- ✅ Row Level Security (RLS) sur toutes les tables
- ✅ Gestion des rôles (admin/agent)
- ✅ Variables d'environnement pour les secrets
- ✅ Validation des entrées avec Zod
- ✅ Protection des routes côté serveur

**Important** : Ne commitez JAMAIS le fichier `.env` !

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/amelioration`)
3. Commitez vos changements (`git commit -m 'Ajout fonctionnalité X'`)
4. Pushez vers la branche (`git push origin feature/amelioration`)
5. Ouvrez une Pull Request

---

## 📝 Licence

Ce projet est développé pour l'**Union des Banques Africaines (UBA)**.

© 2026 Placy Rodnel DIMI MBONGO - Tous droits réservés.

---

## 🙏 Remerciements

- [TanStack](https://tanstack.com/) pour l'excellent écosystème React
- [Supabase](https://supabase.com/) pour le backend
- [shadcn/ui](https://ui.shadcn.com/) pour les composants
- [Tailwind CSS](https://tailwindcss.com/) pour le styling
- [Lovable](https://lovable.dev/) pour l'environnement de développement

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@votre-domaine.com
- 📖 Documentation : Voir le dossier `/docs`
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/zouane-conventions/issues)

---

**Développé avec ❤️ pour l'UBA**
