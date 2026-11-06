# Dernier Rempart (dépôt La-Fine-Crasse)

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
- `python3 -m http.server 8000` puis `http://localhost:8000/`. Pas de build. Three.js r128 vient des CDN (cdnjs, jsdelivr), gardé en cache par `sw.js` ## Structure du code (depuis 2026-11-06 : « Dernier Rempart », tycoon de survie contre les zombies)
Les anciennes versions (jeu de ramassage c8c1d04, tycoon de collecte 9193ae9) sont dans l'historique git.
- **Sauvegarde** : `st` dans `localStorage` clé `dr_save` (argent, vague, `best`, `wall`, `tur` (8 emplacements, niveau ou 0), `heroes`/`hlv`/`place` (4 places), `gen` (bâtiments), `up` (bonus), `mis`, `medals`/`pres` (prestige « Nouvelle région »)).
- **Règles** : `HEROES` (modèles Mixamo `models/*.glb`), `GENS` (bâtiments qui produisent €/s, modèles Kenney), `UPS`, `R` (formules), `MIS` (missions), `zHp/zRw/zDm` (zombies par vague), `WALLN`.
- **Vagues** : `W`, `startWave`, `spawnZ` (zombies légers faits de boîtes, types `ZT`, réutilisés via `ZPOOL`), boss toutes les 5 vagues (`BOSSES`, modèles Mixamo + `retarget`), `endWave`, `baseFall` (retour 3 vagues en arrière, jamais de vraie défaite).
- **Combat** : tourelles `TUR` et héros `HER` visent le plus proche (`nearest`), `hit`/`killZ`, traçantes `tracer`, éclaboussures `splat`.
- **Décor** : ville en ruines au crépuscule (`ruins`, `FIRES`), base (`buildWalls`, `buildTurrets`, `buildHeroes`, `buildGens`), cour avec sacs de sable, caisses, tentes.
- **Boucle** : `step(dt)` (logique, répétée ×1/×2/×3 selon `st.speed`), `loop` (effets + rendu). Panneaux `openPanel`/`render` (def, hero, base, up, more).
- Test sans écran : servir three@0.128.0 via `page.route`, `serviceWorkers:'block'` ; simuler avec `step(.05)` en boucle (les boss se chargent de façon asynchrone : faire la simulation en plusieurs appels).

 à jour) est inchangé.

## Pièges connus
- Couleurs : toujours passer par `M(hex)` ou `LIN(hex)` (conversion sRGB → linéaire), sinon tout paraît délavé.
- Ruines/voitures Kenney : `soot(obj,teinte)` garde la texture et l'assombrit ; arbres : matériaux `TREEM` éclairés. Murs : `wallTex(niveau)` ; tourelles : `buildTurrets` (recul `t.rec`) ; zombies : détails `ZX`, flash blanc `HITM`/`unflash`.
- Fonctions déclarées plusieurs fois (`tree`, `palm`, `mkCar`, `carParts`) : la dernière gagne.
- Le classement (`DBr`, `UID`) ne marche que dans un artifact Claude ; ailleurs il est désactivé sans erreur.
- Ne jamais ajouter de code dans le script du jeu après `requestAnimationFrame(loop)`.

## Deuxième jeu : Pêche Paradis (dossier `peche/`)
Jeu de pêche « idle » 3D en eau douce, indépendant de Dernier Rempart : https://nicolas06061997.github.io/La-Fine-Crasse/peche/
Fait d'après les goûts de l'utilisateur : nature/pêche, lacs et rivières, collectionner, devenir riche, beau matos, boss.
- Tout est dans `peche/index.html` ; son propre `peche/sw.js` (caches `peche-…`), `peche/version.json`, `peche/manifest.webmanifest`, `peche/icons/`.
- À chaque modification : changer `APPV` dans `peche/index.html` **et** `v` dans `peche/version.json` (même valeur, + `notes`).
- Sauvegarde `localStorage` clé `pp2_save` (`sv:3` ; `migrate()` convertit les parties à 6 lieux) : `m`, `lvs[lieu]` ({spd,val,cast} propres à chaque lieu), `fuel`, `eq` (rod,line,reel,bait,hook,boat), `spot`/`maxSpot`, `beaten`/`ever`, `caught`/`rec` (par poisson j = lieu*7+k), `bc`/`brec`/`bcd` (boss), `ach`, `cups`, `run`, `life`, `gold`, `t`.
- Règles entre `RULES-START` et `RULES-END` : `SPOTS` (10 lieux, 7 poissons + 1 boss, thème, décor), `FISHV`, `PRICE`/`SPD` (prix des lieux lointains), `UPS` (4 cases du bas), `EQ` (matos, noms par niveau), `power`/`bossHP`/`tenUp` (combat), `cupGain` (Championnat).
- Combat de boss : `openBoss`, `startFight`, `updFight`, `endFight` (maintenir = mouliner, tension, fil qui casse). Battre le boss débloque le lieu suivant.
- Décor par lieu : `buildDecor`, `applySpot` ; bateau/pêcheur : `buildBoat` (`BOATS`, 8 bateaux). Succès : `ACH`, `chkAch`.
- Équilibre vérifié par simulation (achat glouton, en lisant le bloc RULES) : `SPD=3` : 1er boss ≈ 20 min, 5e ≈ 4,5 h, dernier (10e) ≈ 200 h de jeu actif (le Championnat accélère).
