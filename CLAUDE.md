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
- **Contenu ajouté (06/11)** : types de tourelles `TT` (mg, canon, flame, tesla ; `st.tt[i]`), pouvoirs `PWD`/`PW`/`usePw`/`pwUI` (`st.pw` = niveaux), zombies `boomer` (explose, `blast`) et `armored` (`ar`), effets `boom`/`fx2`/`coins`/`bolt`/`flames`, caisses `DROP`/`spawnDrop`/`openDrop` (appui court + Raycaster), combos `COMBO`.
- **Boss & événements** : `BOSSES` (6, `ab` = charge/summon/tele/shield/slam/brood ; les 2 derniers `proc` = zombies géants), `bossAbility`, `bossSay`, barre `#bossbar`. Événements `EVS` (`W.ev`), ambiance `setEnv`/`updEnv` (`HEMI`, `SKY`, exposition), météores `meteor`.
- **Icône** : `icons/icon.svg` (rempart + main de zombie) → PNG 180/192/512.
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

## Troisième jeu : Chasseur de Maisons Hantées (dossier `fantomes/`)
Jeu de gestion 3D : acheter une maison hantée pas chère, enquêter de nuit, chasser les fantômes, retaper, revendre. Ville inventée : Brumeville.
En ligne : https://nicolas06061997.github.io/La-Fine-Crasse/fantomes/ (a remplacé l'ancien « Fantômes & Cie », visible dans l'historique git). Le phare remplace l'hôpital de la demande d'origine, pour caser le Gardien du Phare.
- Tout est dans `fantomes/index.html` ; son propre `fantomes/sw.js` (caches `fc-…`), `version.json`, `manifest.webmanifest`, `icons/`.
- À chaque modification : changer `APPV` dans `fantomes/index.html` **et** `v` dans `fantomes/version.json` (même valeur, + `notes`).
- Sauvegarde `localStorage` clé `cmh_save` (`sv:1`) : `m`, `lmax` (quartier débloqué), `mk[lieu]` (3 maisons à vendre), `h` (maison en cours : `rooms` {nm,props,cond,col,g:{ty,v,hp,mx,cap,boss}}, `cn` (carnet par pièce : p présence, f indices trouvés, x indices exclus, boss), `dev`, `phase` plan/night/hunt/fix, `fear`, `cool`, `paid`, `spent`), `eq` (matos 0-5), `tm` (équipe 0-5), `mus` (musée, index type*4+variante), `mi` (€/s du musée), `boss`, `sold`, `caps`, `best`.
- Règles entre `RULES-START` et `RULES-END` : `FAM`, `CLUES` (L F M U O V), `GT` (15 fantômes, `cl` = 3 indices tous différents, `w` = faiblesse), `VAR` (variantes), `LIEUX` (6 lieux : `V` valeur, `rooms`, `pool` de 6 fantômes, `boss` avec `hat` et `ab` = throw/curse/lock/dark/call/all), `TIERS` (un peu hantée / très hantée / maudite = boss), `EQ` (matos), `TEAM`, `salePrice`, `repCost`, `musRate`, `ghostHP`/`bossHP`/`power`.
- Outils → indices : caméra et 👀 observer = 💡📦 ; micro = 🎙️ (niv. 2 : 📼) ; thermomètre = ❄️ ; lampe UV (lampe niv. 1) = 🟣 et voit les Ombres. Un appareil qui ne trouve rien exclut l'indice (`addX`).
- 3D : ville `buildTown` (quartiers espacés de `DX`, maisons `townHouse`), maison vue de dessus `buildInside`/`buildRoom`/`prop` (placée en `HOME`), fantômes `mkGhost`/`skinGhost`, boss `skinBoss` (dents, yeux rouges, chapeau).
- Phases : `openBuy` → `placeDev`/`startNight`/`updNight`/`endNight` → `enterRoom`/`startScan`/`openCarnet`/`useWeapon`/`updRoom`/`captureGhost` (peur pleine → `flee`) → `openFix`/`repair`/`updFix` → `sell`.
- Lieux : maisons de ville (pas de boss : vendre `SALES0`=3 maisons débloque la suite, compteur `s0`), fermes → Sorcière du Marais, écoles → Directeur de l'École, phares → Gardien du Phare, châteaux → Comte du Manoir, île maudite → Reine de l'Île Maudite.
- Le boss d'un quartier est dans la maison « Maudite » ; le battre débloque le quartier suivant (`lmax`).
- Fantômes : les 15 de l'utilisateur + 5 « Légendes du monde » ajoutées avec son accord (famille 5 : Yūrei, La Llorona, Jiangshi, Dullahan, Domovoï ; accessoires `hat`/`nohead`/`hop` dans `skinGhost`). Les 20 combinaisons de 3 indices sur 6 sont toutes prises : un nouveau fantôme devra partager une combinaison ou avoir un autre type d'indice. Boss : exactement les 5 de l'utilisateur.
- Pièce vivante (`updRoom`) : objets qui sautent si le fantôme a 📦, lumière qui clignote si 💡 ; les voir ajoute l'indice au carnet.
- Graphismes (refaits le 09/11 après « graphismes dégueulasses ») : textures dessinées par le jeu `TXC`/`TM(clé,couleur,rx,ry)` (herbe, pavés, tuiles, planches, briques, pierre, parquet, papier peint, sable, brume), ombres (`SUN` = lune, suit la vue), ville de nuit `buildTown` : rue pavée, lampadaires, grilles, sapins, brume, chauves-souris, silhouettes au fond, maisons détaillées `victorian()` + modèles par lieu dans `townHouse` (ferme+grange+silo, école à horloge, phare à faisceau, château, temple de l'île), 3 lumières `TLIGHTS` qui suivent le quartier. Caméra de la ville basse pour voir le ciel. Toujours vérifier par capture d'écran après un changement visuel.
- Contenu en plus : décoration `DECO` (revente +), acheteurs `offers` (famille, collectionneur, promoteur / youtubeuse), demandes des habitants `st.ms`/`newMission`/`ev()`/`openMis` (bouton 📜), objets maudits `OBJ` à toucher dans les pièces (`collectItem`, onglet musée 🧿), bulles des fantômes `LINES`/`BOSSL`/`bubble`, bords rouges + cœur quand la peur monte, musique `music()` (`st.music`), nouvelles annonces (`st.mkT`).
- Mises à jour automatiques (`chkUpd`/`tryUpd`) : nouvelle version → sauvegarde + rechargement tout seul (pas pendant une nuit ni dans une pièce) ; une seule fois par version (`sessionStorage` `cmh_upd`), sinon bouton de secours. Installation comme une appli : bouton `#inst` (`beforeinstallprompt` → `doInstall`, sinon explications iPhone/Android), aussi dans ⭐.
- Succès `ACH` (+3 % de revente chacun, vérifiés dans `step` toutes les 3 s) ; compteurs `okw` (bonnes armes), `nights`, `flees`.

## Quatrième jeu : MYTHORIA (dossier `mythoria/`)
Grand jeu de stratégie médiéval-fantastique multijoueur (cahier des charges du 13/11/2026, plan en 7 phases : `mythoria/docs/ROADMAP.md`).
En ligne : https://nicolas06061997.github.io/La-Fine-Crasse/mythoria/ . L'utilisateur voulait un dépôt « mythoria-game » : impossible à créer depuis la session (accès limité à ce dépôt) ; le dossier est autonome et peut y être déplacé tel quel.
- Plusieurs fichiers (modules ES, pas de build). Règles partagées client/serveur dans `src/shared/` (content.js, sim.js déterministe, ai.js, rng.js) ; jeu dans `src/client/` (battle.js, store.js, render/arena.js, render/sprites.js, ui/app.js). Détails : `mythoria/docs/ARCHITECTURE.md`.
- À chaque modification : changer `data-version` dans `mythoria/index.html` **et** `v` dans `mythoria/version.json` (+ `notes`). Si un nouveau fichier JS est ajouté, l'ajouter à `FILES` dans `mythoria/sw.js`.
- Tests : `cd mythoria && npm test` (node --test, aucune dépendance). Test navigateur : `?speed=4` accélère le combat, `window.__battle` donne le combat en cours.
- Sauvegarde locale `myt_profile_v1` (en attendant le serveur, phase 3). Jamais de faux joueurs : l'IA est toujours affichée « 🤖 IA ».
