# MYTHORIA

Jeu mobile de stratégie médiéval-fantastique : cartes, héros, fusion, synergies et combats en temps réel.
Jouable dans Chrome (Android) et installable sur l'écran d'accueil (PWA).

**Jouer :** https://nicolas06061997.github.io/La-Fine-Crasse/mythoria/

## Lancer en local
```
python3 -m http.server 8000      # depuis ce dossier
# puis http://localhost:8000/   (ajouter ?speed=4 pour accélérer les combats)
npm test                         # tests du moteur (Node 20+, aucune dépendance)
```

## Organisation
```
index.html, styles.css         page et style des menus
manifest.webmanifest, sw.js    installation + jeu hors ligne
version.json                   version (doit être égale à data-version de index.html)
src/shared/                    RÈGLES — partagées avec le futur serveur (aucun code navigateur)
  content.js                   cartes, factions, raretés, arènes      ← ajouter du contenu ici
  sim.js                       simulation déterministe des combats
  ai.js                        IA d'entraînement (toujours affichée comme IA)
  rng.js                       hasard reproductible
src/client/                    JEU dans le navigateur
  main.js                      démarrage, mises à jour
  battle.js                    écran de combat (simulation + toucher + IA)
  store.js                     profil du joueur (local → serveur en phase 3)
  audio.js                     sons synthétisés
  render/arena.js              dessin de l'arène et des effets
  render/sprites.js            dessin des personnages, tours, illustrations de cartes
  ui/app.js, ui/dom.js         menus
tests/                         tests automatiques (node --test)
docs/                          architecture et plan
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/ROADMAP.md](docs/ROADMAP.md).
