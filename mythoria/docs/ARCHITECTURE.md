# Architecture technique de MYTHORIA

## Direction artistique (refonte du 13/11/2026)
- **Style** : « diorama fantastique » 3D low-poly stylisé, couleurs riches, lumières chaudes, effets lumineux.
  Menus : nuit saphir + or ancien + cristal arcanique, panneaux de verre sombre à liseré doré, titres gravés (Cinzel).
- **Concept de combat (« Les Failles »)** — volontairement différent de Clash Royale :
  une seule île flottante ovale, pas de chemins ni de rivière ni de ponts ; **un Sanctuaire** par camp ;
  au centre le **Cœur de Mythe** à capturer (+50 % d'éther, jauge d'Éveil 2× plus rapide) ;
  pas de cartes en main : un **Cercle d'Invocation** de 5 socles en 3D où l'on **invoque** des héros au hasard
  (selon la rareté), on les **fusionne** (★2, ★3) puis on les **glisse** sur l'île ; un **sortilège** unique par deck
  lancé quand la jauge d'Éveil est pleine.
- **6 mondes** = 6 factions : Royaume d'Aurore (Aube), Sylve Enchantée, Académie Arcane, Pics des Dragons (Braise),
  Terres de Givre, Royaume des Ombres. Chaque monde : ciel, lumière, sol peint, décor, particules d'ambiance, adversaires.

## Choix techniques
| Besoin | Choix | Pourquoi |
|---|---|---|
| Vraie 3D dans Chrome via un lien | **three.js r160** (WebGL), copié dans `vendor/` | Standard du web 3D, marche sur Android, pas de dépendance à un site externe, fonctionne hors ligne. |
| Personnages animés | **KayKit Adventurers + Skeletons** (CC0) : 9 modèles riggés, même squelette | Une seule banque d'animations partagée (36 clips : course, attaques, sorts, mort…). |
| Bêtes | **Quaternius** (CC0) : loup, cerf animés | Animations propres (galop, attaque, mort). |
| Créatures uniques | **Construites par le code** (`procedural.js`) : dragons, golem, feux-follets, bélier, obélisque | Vraie 3D animée par le code, aucun fichier à télécharger. |
| Décor | Quaternius (arbres, rochers, temples) + éléments faits par le code (cristaux, champignons, tombes, bannières) | |
| Optimisation | Modèles réduits avec gltf-transform (≈ 7 Mo au total au lieu de ≈ 40) ; mis en cache par le service worker | Chargement rapide, jeu hors ligne après la 1re visite. |
| Téléphones | Résolution limitée (×1,6 max), ombres 1024 sur les petits téléphones, une seule géométrie pour toutes les particules | Fluidité. |
| Règles | `src/shared/` en JavaScript pur, déterministe | Réutilisable telle quelle par le serveur (phase 3) → anti-triche. |

### Ce qui n'est pas possible seul (dit honnêtement)
La qualité exacte de TFT vient d'équipes d'artistes 3D (modèles et textures peints à la main, centaines d'animations sur mesure).
On ne peut pas la fabriquer par du code. Ce qui est fait : de vrais modèles 3D animés de bonne qualité (libres de droits),
personnalisés (armes, teintes, auras, tailles) et mis en valeur par la lumière et les effets.
**Pour monter encore en qualité** : acheter un pack de personnages fantastiques plus détaillé (ex. Synty Polygon Fantasy, ~50-150 €)
ou commander des héros à un artiste. L'architecture accepte n'importe quel modèle `.glb` sans rien changer d'autre :
il suffit de remplacer le champ `model` du héros dans `content.js`.

## Principe central : une simulation déterministe partagée
`src/shared/sim.js` avance par ticks fixes (20/s). Même graine + mêmes commandes = même combat (test automatique).
Commandes possibles : `summon`, `merge`, `deploy`, `spell`, toutes vérifiées par `check()`.
En ligne, seul le serveur fera avancer la simulation : modifier le jeu dans son navigateur ne donnera aucun avantage.

## Organisation
- `src/shared/` : règles (content, sim, ai, rng) — aucun code navigateur.
- `src/client/three/` : 3D (assets, procedural, world, fx, battleview, showcase, stage).
- `src/client/ui/` : menus (app, dom, icons). `src/client/battle.js` : écran de combat.
- `assets/models/` : modèles 3D optimisés (voir `CREDITS.md`). `vendor/` : three.js.

## Plan du serveur (phase 3)
Node.js + WebSocket, serveur autoritaire qui exécute `sim.js` ; PostgreSQL (ex. Supabase) pour comptes, profils,
combats, classements, clans. Hébergement : petit serveur Node (Render / Fly.io) — l'utilisateur crée les comptes gratuits.
