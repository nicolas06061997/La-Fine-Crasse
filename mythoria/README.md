# MYTHORIA

Jeu mobile de stratégie fantastique en 3D : héros animés, invocation, fusion, Cœur de Mythe, 6 mondes.
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
version.json                   version (= data-version de index.html)
vendor/                        three.js (moteur 3D)
assets/models/                 modèles 3D optimisés (voir CREDITS.md)
src/shared/                    RÈGLES partagées avec le futur serveur
  content.js                   héros, sortilèges, factions, mondes   ← ajouter du contenu ici
  sim.js                       simulation déterministe (île, Sanctuaires, Cœur, invocation, fusion)
  ai.js, rng.js                IA d'entraînement, hasard reproductible
src/client/
  main.js, store.js, audio.js  démarrage, profil, sons
  battle.js                    écran de combat (toucher + interface)
  three/                       3D : assets, procedural (créatures), world (6 mondes), fx, battleview, showcase
  ui/                          menus : app.js, dom.js, icons.js
tests/                         tests (node --test)
docs/                          architecture, plan
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/ROADMAP.md](docs/ROADMAP.md).
