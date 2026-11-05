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

## Entreprise et vie privée (comme Route Nette, version déchets — 2026-11-05.5)
Ajout par-dessus le tycoon, sans changer le jeu de base. Tout est dans `st.e` (entreprise, via `E()`) et `st.pv` (vie privée, via `PV()`), gardés par le prestige (`keep`).
- **Temps** : `DAYS` = 15 s réelles par jour du jeu (`entTick` dans `loop`, `dayE()`, fin de mois `monthE()`), date `dstr(e.day)` (départ 1/1/2027), affichée dans `#edate`.
- **Pages** : `#ent` plein écran (`entOpen('ent'|'pv')`, `entClose`, `entR()` redessine, onglets `eTab` équipe/marchés/gestion/carrière et `pTab` vie/acheter/bourse/casino). Boutons `.ebtns` au-dessus de la mission.
- **Personnel** : `ROLE` (chauf, rip, trieur, meca, prev, compta, rh, offre, jur, dir ; coûts employeur estimés), candidats `refreshCand()` le lundi, `mkW`, `hireW`, `fireW` (préavis), `prime`, motivation (démission si < 0,3). Équipes automatiques `crewCalc()` → `CREW` (1 chauffeur + 2 rippeurs par camion) ; effets `crewM(T)` dans `truckTick` (vitesse), `planTrip` (capacité), temps de ramassage ; `entMul()` (trieurs, directeur) sur le gain au déchargement. Petits rippeurs 3D derrière les camions (`crewVis`). Pannes `T.brk`. Estimation de rentabilité `gainW(w)` sur chaque candidat.
- **Marchés publics** : intercommunales `ICS` (Intradel, BEP, IPALLE, Hygea, Tibi, in BW, AIVE, ICDI), types `TTYPE`, concurrents fictifs `RIV`. `genTender`, conditions `bidOk` (BCE, enregistrement de collecteur, SRL pour ≥ 3 camions, équipes libres en comptant contrats et offres `pendK`), `bid(id,f)`, `decideT`. Contrats `e.con` payés chaque mois ; plaintes/pénalités si pas assez d'équipes. Montant = max(9 000 €, 30 % de ce que rapporte un camion) × camions.
- **Gestion** : `ADM` (BCE 100 €, enregistrement 250 €, SRL 1 800 €), `INS` (accidents du travail obligatoire 3,5 %, omnium, protection juridique, RC), frais fixes `fixedM()`, crédit `loanGo`, impôt mensuel sur l'augmentation de l'argent (`e.m0`, corrigée par `e.loanIn` ; indépendant 40 %, SRL 20/25 %, comptable −10 %), bilan `e.last`, courbe `e.hist`. Justice : accidents (`e.law`), contrôle fiscal (SRL), avocats `LAWY`, juriste. Toute dépense passe par `mvE(montant,catégorie)`.
- **Carrière** : XP `xp()`, `lvl()`, `TITLES`, succès `ACH` (`achTick`).
- **Vie privée** : salaire `P.sal` (SRL : coût net/0,55), dividende/prélèvement `divGo`, vie de tous les jours 1 650 € (850 € si propriétaire), catalogue `PRIV` (prix belges estimés, droits 3 % / 12,5 %), loyers, revente `pSell`, huissier sous −10 000 €. Bourse `STK` (8 actions belges, `mkDay`, TOB 0,35 %). Casino équitable (roulette sans zéro, machine ×7/×1,5, blackjack égalité = +50 %).
- **Mode facile** (`EZ()`, `st.easy`, activé par défaut, réglable dans ⭐ Plus) : BCE/enregistrement/SRL/assurance AT automatiques, offres remises toutes seules, pas de démissions, plaintes, accidents, procès ni contrôle fiscal, réparations gratuites, impôts ÷2.
- Test navigateur : Three.js n'est pas joignable depuis le serveur de dev → servir `three@0.128.0` (npm pack) via `page.route` et `serviceWorkers:'block'`.
