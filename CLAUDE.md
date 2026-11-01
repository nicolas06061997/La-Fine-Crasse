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

## Structure du code (script principal, ordre important)
1. **État et sauvegarde** : objet `st` (argent, véhicule `veh` 0-3, entrepôt `wh` 0-3, `map`…), sauvegardé dans `localStorage` clé `ramasseur2`.
2. **Boutique** : tableau `SHOP` (réinitialisé par `SHOP.length=0;SHOP.push(...)`), rendu par `render()`.
3. **Scène** : renderer, lumières, ciel (dôme), sols, route, joueur (`P`), véhicule (`CAR`, `buildCar()`).
4. **Virages** : patch de shader (`THREE.Material.prototype.onBeforeCompile`, uniforms `BU`, `BT`). La logique reste en ligne droite sur l'axe -Z.
5. **Zones** : 300 m chacune (`biomeOf(z)` : campagne, plage, montagne, autoroute). `NM(m)=50+25*m` déchets. `buildBounds(m)`, `mapDoneUI()`, `goMap()`.
6. **Décor** : `scenery(z)` appelé par `spawn()` tous les 6 m ; `tree()`, `palm()`, `grass()`, `tufts()`, `town()`, `depot()`, `wareBuild()`.
7. **Déchets** : `T`, `GOLD`, `CHEST`, `BARREL`, bonus `mkPw()`.
8. **Boucle** : `loop()` puis rendu `COMP` (post-traitement) ou `R.render`.
9. **Qualité** : `setQ('max'|'norm')` + `fpsMon()`.
Un second `<script>` à la fin gère l'installation (bouton, bandeau) et les mises à jour (`version.json`, bouton « Vérifier les mises à jour » dans la boutique).
10. **Personnages** : liste `CHARS` (fichiers `models/*.glb` convertis depuis des FBX Mixamo : FBXLoader + GLTFExporter dans Chromium, textures réduites en JPEG, puis gltf-transform dedup/weld/quantize) + `models/anims.glb` (animations idle/walk/run du X Bot, squelette seul), adaptées par `retarget()` ; chargement `loadHero(i)`, taille réglée sur l'os de la tête. Écran « Choisis ton personnage » : `FOPT`, `buildFace()`, `faceUI()` (bouton 🧑 ou appui sur le personnage). Vêtements repeints par `paintTop()`/`repaint2()`. À vélo : `pedal()` ; au volant : `seat()`.
11. **Collisions** : `COLS` (boîtes `userData.cols` des groupes, troncs `userData.tr`, `userData.colr`), remplies par `put()`, résolues par `collide()` à pied seulement.
12. **Parc à conteneurs** : `depot(z)` (quai, bennes `skip()`, clôture `gFence()`, bulles à verre).

## Pièges connus
- Fonctions déclarées plusieurs fois (`tree`, `palm`, `mkCar`, `carParts`) : la dernière gagne.
- `inDepot(z)` exclut aussi la zone de l'entrepôt : les compteurs `cnts` en dépendent.
- Le classement (`DBr`, `UID`) ne marche que dans un artifact Claude ; ailleurs il est désactivé sans erreur.
- Ne jamais ajouter de code dans le script du jeu après `requestAnimationFrame(loop)`.
