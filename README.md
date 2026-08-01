# Synapse — 5 défis, chaque jour

Application de défis quotidiens (mémoire, calcul rapide, logique, observation,
concentration) avec série (streak), XP/niveaux, badges, statistiques,
récompense quotidienne, plusieurs langues (français, anglais, créole haïtien)
et fonctionnement 100% hors ligne.

## Pourquoi ça ne devient jamais répétitif sans "milliers de défis" écrits à la main

Chaque défi est **généré à partir de règles**, avec une graine (seed) dérivée
de la date du jour (voir `src/rng.js` et `src/challenges.js`). Deux personnes
qui jouent le même jour reçoivent les mêmes défis (comme un Wordle), et
chaque nouveau jour génère une combinaison différente — pour un nombre de
jours quasiment illimité, sans fichier de contenu à maintenir ni base de
données de questions.

## Démarrer en local

Prérequis : [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

## Construire pour la production

```bash
npm run build
```

Résultat dans `dist/` — héberge-le sur Vercel, Netlify, GitHub Pages, etc.
L'app est déjà une PWA valide (voir `public/manifest.json`) : sur mobile,
un visiteur peut "Ajouter à l'écran d'accueil" et l'utiliser comme une app.

⚠️ Avant de publier, remplace les icônes placeholder (`public/icon-192.png`,
`public/icon-512.png` — à créer) par de vraies icônes carrées.

## Monétisation

- **Publicité bannière + interstitielle (web)** : `src/components/Games.jsx`
  contient `ADSENSE_CLIENT` / `ADSENSE_SLOT`, vides par défaut (l'app
  fonctionne normalement sans pub tant que rien n'est configuré). Renseigne
  tes identifiants [Google AdSense](https://adsense.google.com) une fois ton
  compte approuvé.
- **Publicité récompensée** : bouton "Regarder une pub pour un indice" —
  actuellement simulé (compte à rebours de 3s). Pour du vrai AdMob en app
  mobile native (via Capacitor), remplace l'appel par le SDK
  `@capacitor-community/admob` — exemple en commentaire dans le même fichier.
- **Premium** : bascule actuellement locale (démonstration). Pour une vraie
  version payante, il faudra un vrai système de paiement (Stripe pour le web,
  achats intégrés App Store/Play Store pour le mobile).

## Publier en app mobile (Android/iOS)

Voir le README du projet précédent (`fuite-app`) pour la marche à suivre
complète avec Capacitor — la même procédure s'applique ici :

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Synapse" "com.tonnom.synapse" --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android
```

## Données

Tout est stocké en local (`localStorage`) : aucun serveur requis. Pour un
classement entre joueurs plus tard, il faudrait ajouter un backend partagé.
