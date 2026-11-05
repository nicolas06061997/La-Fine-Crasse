# La Fine Crasse

Jeu mobile 3D (PWA) en un seul fichier `index.html`, publié par GitHub Pages depuis la branche `main` :
https://nicolas06061997.github.io/La-Fine-Crasse/
Projet indépendant de Krinkels Plan : ne rien mélanger entre les deux.

L'utilisateur parle français et n'est pas développeur : réponses courtes, en français, étape par étape.

## À chaque modification du jeu
1. Changer `APPV` en bas de `index.html` **et** `v` dans `version.json` (même valeur, format `AAAA-MM-JJ.n`, différente à chaque fois).
   Mettre dans `notes` de `version.json` une phrase courte : elle s'affiche dans « Nouvelle mise à jour disponible ».
   Le service worker est enregistré en `sw.js?v=APPV` : son cache (`finecrasse-<version>`) change tout seul.
2. Commit + push sur `main` ; GitHub Pages publie en 2-3 minutes.

## Lancer
- `python3 -m http.server 8000` puis `http://localhost:8000/`. Pas de build. Three.js r128 vient des CDN (cdnjs, jsdelivr), gardé en cache par `sw.js` pour jouer hors ligne.

## Structure du code (tycoon, depuis 2026-11-05)
Le jeu est un **tycoon de gestion** (pas de personnage dirigé). L'ancien jeu de ramassage est dans l'historique git (commit c8c1d04).
- **Sauvegarde** : objet `st` dans `localStorage` clé `lfc_tycoon` (argent, camions, niveaux, quartiers `zones`, `garage`, `sort`, `fact`, `tip`, `gfx`…).
- **Économie** : `ZONES` (8 quartiers, prix, multiplicateur), `R` (prix du camion, capacité, vitesse, valeur, production), `UP` (améliorations), `BLD` (garage, centre de tri, usine), `cost()`.
- **Carte** : grille de routes `RL` (tous les 20 m), quartiers de 40×40 m autour du dépôt central ; maisons Kenney (`KEN`, `kget`), poubelles avec sacs visibles (`HOUSES`).
- **Camions** : `TRUCKS`, `planTrip` (choisit les maisons les plus pleines), `route` (chemin en L sur la grille), `truckTick` (go → collect → back → unload → park).
- **Interface** : barre du bas (Camions, Quartiers, Dépôt, Améliorer) → `openPanel`/`render` ; caméra : glisser, pincer, toucher un quartier (`tap`) ; conseils `TIPS`, événements `EV`, gains hors ligne et cadeau du jour au démarrage.
- Le second `<script>` (installation, mises à jour) est inchangé.

## Pièges connus
- Fonctions déclarées plusieurs fois (`tree`, `palm`, `mkCar`, `carParts`) : la dernière gagne.
- Le classement (`DBr`, `UID`) ne marche que dans un artifact Claude ; ailleurs il est désactivé sans erreur.
- Ne jamais ajouter de code dans le script du jeu après `requestAnimationFrame(loop)`.
