# Umbra Game Client

Client de jeu Project Umbra - Un Hack'n'slash RPG isométrique, Idle et Rogue-lite dans un univers Dark Fantasy.

## 🎮 Technologies

- **React 18** - Interface utilisateur
- **Phaser.js 3.70** - Moteur de jeu 2D
- **TypeScript** - Typage statique
- **Vite** - Build tool moderne
- **Capacitor** - Déploiement mobile natif

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation
```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Ouvrir http://localhost:3000
```

### Build de Production
```bash
# Build pour le web
npm run build

# Prévisualiser le build
npm run preview
```

### Déploiement Mobile
```bash
# Ajouter les plateformes
npx cap add ios
npx cap add android

# Synchroniser le code
npx cap sync

# Ouvrir dans l'IDE natif
npx cap open ios
npx cap open android
```

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests en mode watch
npm run test:watch
```

## 🔧 Développement

### Structure du Projet
```
src/
├── components/     # Composants React
├── game/          # Code Phaser.js
│   ├── scenes/    # Scènes de jeu
│   └── config.ts  # Configuration Phaser
├── services/      # API clients
├── utils/         # Utilitaires
└── types/         # Types TypeScript
```

### Commandes Utiles
```bash
npm run lint        # Vérifier le code
npm run lint:fix    # Corriger automatiquement
npm run format      # Formater le code
```

## 🎯 Fonctionnalités Prévues

- [ ] Système de combat hack'n'slash
- [ ] Progression idle automatique
- [ ] Mécaniques rogue-lite
- [ ] Interface utilisateur React
- [ ] Synchronisation cross-platform
- [ ] Système de gacha
- [ ] Multijoueur asynchrone

## 📱 Plateformes Supportées

- ✅ Web (Chrome, Firefox, Safari, Edge)
- 🔄 Android (via Capacitor)
- 🔄 iOS (via Capacitor)

## 🤝 Contribution

1. Créer une issue avec le template approprié
2. Créer une branche `feature/ISSUE-XXX-description`
3. Développer avec tests
4. Créer une Pull Request

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)
