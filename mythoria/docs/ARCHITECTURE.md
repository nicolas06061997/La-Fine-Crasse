# Architecture technique de MYTHORIA

## Choix techniques
| Besoin | Choix | Pourquoi |
|---|---|---|
| Jeu dans Chrome via un lien | HTML5 + JavaScript (modules ES), Canvas 2D | Rien à installer, chargement instantané, fonctionne sur tous les téléphones. |
| Pas d'étape de compilation | Modules ES natifs | Le lien GitHub Pages marche directement ; pas d'outil à installer pour l'utilisateur. |
| Graphismes | Dessin vectoriel par le code (`sprites.js`) | Personnages originaux, nets à toutes les tailles, aucun fichier à télécharger. |
| Serveur multijoueur (phase 3) | Node.js + WebSocket, serveur **autoritaire** | Le serveur exécute la même simulation (`src/shared/`) : le client n'envoie que « je pose telle carte ici ». |
| Comptes + base de données (phase 3) | PostgreSQL (ex. Supabase : authentification + base gratuite au départ) | Comptes sécurisés, sauvegardes, classements, clans. |
| Application Android (plus tard) | Capacitor (emballe la même PWA) | Aucune réécriture du jeu. |
| Godot / Phaser | Non retenus | Godot complique la version web ; Phaser n'apporte rien d'indispensable pour un jeu en vue de dessus avec un moteur de règles maison, et ajoute un poids à télécharger. |

## Principe central : une simulation déterministe partagée
`src/shared/sim.js` contient toutes les règles du combat. Elle avance par « ticks » fixes (20 par seconde).
Même graine + mêmes commandes = exactement le même combat (vérifié par un test).

Conséquences :
- **Anti-triche** : en ligne, seul le serveur fait avancer la simulation. Le téléphone envoie des commandes
  `{carte, x, y}` ; le serveur les vérifie avec `canPlay` (carte en main, éther suffisant, zone autorisée).
  Modifier le jeu dans son navigateur ne donne aucun avantage.
- **Reconnexion** : le serveur garde l'état ; un joueur qui revient reçoit l'état actuel et continue.
- **Replays et vérification** : un combat = graine + liste de commandes (quelques Ko).
- **IA** : l'IA (`ai.js`) passe par les mêmes commandes qu'un joueur. Elle est toujours affichée « 🤖 IA ».
  Aucun faux joueur ne sera jamais présenté comme réel.

## Séparation
- `src/shared/` : règles pures (aucun accès au navigateur) → réutilisées telles quelles par le serveur.
- `src/client/` : affichage, sons, toucher, menus.
- `server/` (phase 3) : salons, matchmaking, comptes, base de données.

## Ajouter du contenu sans tout refaire
- Nouvelle carte : un objet dans `CARDS` (`content.js`) + un `look` dans `sprites.js` + l'ajouter à une arène.
  Les capacités sont des champs réutilisables : `splash`, `fly`, `shield`, `death`, `summon`, `aura`, `chain`,
  `dash`, `roar`, `kamikaze`, `freeze`, `heal`…
- Nouvelle arène : un objet dans `ARENAS` + un thème dans `THEMES` (`arena.js`).
- Les tests vérifient automatiquement que chaque carte est complète et débloquable.

## Plan du serveur (phase 3)
```
Téléphone ──WebSocket──► Serveur de jeu (Node.js)
                          ├─ Matchmaking (file d'attente par trophées)
                          ├─ Salon de combat : sim.js à 20 ticks/s, envoie l'état ~10×/s
                          ├─ Reconnexion (30 s pour revenir)
                          └─ Fin de combat → écrit le résultat en base
                         Base PostgreSQL : comptes, profils, cartes, combats, classements, clans
```
Hébergement envisagé : un petit serveur Node (Render, Fly.io ou Railway) + Supabase.
L'utilisateur devra créer ces comptes (gratuits au départ) ; tout le reste sera fait par le développeur.
