# 10 – Sauvegarde, score, bonus permanents, graine

## Sauvegarde automatique

À chaque action, fin de mois ou choix d'événement, la partie est enregistrée
dans le navigateur (`localStorage`, clé `nf_partie`). L'écran titre propose
« Continuer ». La sauvegarde est effacée à la fin de la lignée.

| Clé localStorage | Contenu |
| --- | --- |
| `nf_partie` | l'état complet de la partie (JSON) |
| `nf_meta` | `{ points, bonus: { id: niveau }, parties, scoreTotal }` |
| `nf_scores` | les 10 meilleures lignées |

**Export / import** (écran titre) : un fichier JSON contenant les trois clés.
Utile pour changer de navigateur ou d'appareil. Format :
`{ format: 'nouvelle-fortune', version, partie, meta, scores }`.

**Compatibilité** : une sauvegarde référence des ids (objets, métiers,
logements, événements programmés, diplômes). Si vous renommez un id, les
sauvegardes qui l'utilisent peuvent se comporter bizarrement (objet ignoré,
événement programmé abandonné). Ajouter du contenu ne pose aucun problème.

## Graine

Chaque partie a une graine (texte). Elle détermine la ville (nom, quartiers,
lieux et leur qualité, marché de l'emploi par secteur), le personnage de départ
(prénom, traits, santé, origine) et toute la suite aléatoire. Même graine +
mêmes choix = même partie. La graine est affichée dans la colonne de droite et
dans le tableau des scores ; on peut la saisir sur l'écran titre.

Techniquement : `src/core/rng.js` (sfc32 + hachage cyrb128). Toute
l'aléatoire du jeu doit passer par `NF.rng` (jamais `Math.random`), sinon la
reproductibilité est perdue. La scène SVG utilise son propre générateur dérivé
de la graine pour ne pas consommer celle de la partie.

## Score et points (`src/core/score.js`, `config.score`)

À la fin de la lignée :

| Critère | Points |
| --- | --- |
| Générations jouées | 500 chacune |
| Années de survie (toute la lignée) | 60 chacune |
| Catégorie sociale maximale | 300 × niveau |
| Fortune transmise (somme des successions nettes) | 1 par 50 € |
| Accomplissements | 150 chacun |

Les points de bonus gagnés valent 10 % du score. Les 10 meilleures lignées sont
conservées (nom de famille, graine, score, générations, années, classe, date).

## Bonus permanents (`data/bonus.js`)

```js
{ id: 'sac', nom: 'Sac à dos de départ', icone: '🎒', cout: 40, niveaux: 1,
  desc: 'Vous commencez avec un sac à dos.',
  appliquer: function (s, niveau) { NF.api.ajouterObjet(s, 'sac_a_dos', 1); } }
```

`appliquer` est appelée à la création de chaque personnage (y compris les
héritiers). Les bonus s'achètent sur l'écran titre avec les points. Ajoutez-en
librement : tout ce que `NF.api` et `NF.core` permettent est possible.

## Accomplissements (`data/succes.js`)

```js
{ id: 'un_toit', nom: 'Un toit', icone: '🏠', desc: 'Obtenir un vrai logement.',
  condition: function (s) { return NF.core.logementActuel(s).ordre >= 3; } }
```

Vérifiés chaque fin de mois ; une fois obtenus, ils restent acquis pour la
lignée (`s.lignee.succes`).
