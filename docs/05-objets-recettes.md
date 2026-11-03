# 05 – Objets, recettes, boutique

## Objets (`data/objets.js`)

```js
{ id: 'couverture', nom: 'Couverture', icone: '🛌', desc: '…',
  type: 'objet',          // 'materiau' | 'objet' | 'consommable'
  taille: 1,              // emplacements occupés (0 = ne prend pas de place, ex. voiture)
  prix: 15,               // prix en boutique (0 = pas en vente)
  vente: 3,               // prix de revente
  fouille: 2,             // poids quand on fouille les bennes (0 = jamais trouvé)
  passif: { froid: 0.75, usureEnergie: 0.9 },   // effets tant que l'objet est dans le sac
  usage: { nourriture: 18 },                     // consommable : effet à l'utilisation
  fragile: 0.04 }         // chance par mois d'être perdu quand on vit dehors (×1,5 l'hiver)
```

### Effets passifs reconnus

Les multiplicateurs se multiplient entre objets (deux couvertures = 0,75 × 0,75).

| Clé | Effet |
| --- | --- |
| `mendicite` | gains de mendicité |
| `fouille` | quantité trouvée en fouillant |
| `froid` | dégâts de l'hiver dehors (0,5 = moitié) |
| `usureEnergie`, `usureHygiene`, `usureMoral`, `usureNourriture` | usure mensuelle des jauges |
| `nourritureCout` | coût des repas automatiques |
| `inventaire` | emplacements en plus (somme) |
| `emploi` | chance d'embauche |
| `apprentissage` | xp gagnée |
| `vol` | risque de vol (0,5 = moitié) |
| `maladie` | chance et gravité des maladies |
| `bricolage` | xp et efficacité de fabrication |
| `depensesFixes` | euros par mois (somme), ex. entretien d'une voiture |
| `telephone: true`, `velo: true`, `voiture: true` | compte comme tel pour les prérequis |
| `peche`, `dessin`, `couture` | efficacité des actions de loisirs correspondantes (canne à pêche, carnet, nécessaire de couture) |
| `spectacle` | gains du spectacle de rue (guitare, balles de jonglage) |

Pour un nouvel effet passif, lisez-le dans le moteur avec
`NF.api.passif(s, 'maCle')` (produit) ou `NF.api.passifSomme(s, 'maCle')`.

### Inventaire

`config.inventaireBase` (6) emplacements + `passif.inventaire` des objets (sac à
dos : +6). Un objet de `taille` 2 occupe 2 emplacements par unité. Quand le sac
est plein, `NF.api.ajouterObjet` retourne 0 et l'objet est perdu : pensez-y dans
les événements qui donnent beaucoup de choses.

## Recettes (`data/recettes.js`)

```js
{ id: 'r_abri', resultat: 'abri_carton', quantite: 1,
  ingredients: { carton: 4, ficelle: 1 },     // consommés
  competences: { bricolage: 1 },             // niveaux minimum
  objetsRequis: ['outils'],                  // nécessaires mais pas consommés
  desc: 'Quatre cartons, un peu de scotch.',
  xp: { bricolage: 8 } }
```

Fabriquer coûte 1 PA, −4 énergie, +3 moral. La place est vérifiée en tenant
compte des ingrédients libérés.

## Boutique

Tout objet avec `prix > 0` est en vente (onglet Objets). Acheter ne coûte pas
de PA. Remises : −25 % sur les objets de moins de 200 € si la ville a une
ressourcerie, −3 % par niveau de commerce. La voiture exige le permis.

## Nourriture automatique

Chaque fin de mois, après l'usure des jauges, si le joueur a de l'argent, il
achète de quoi remonter la jauge de faim jusqu'à 80 (il commence donc le mois
nourri, et la santé peut récupérer) : 1,6 € par point avec une cuisine, 2,4 € sans,
× `passif.nourritureCout` (réchaud 0,6), −5 % par niveau de cuisine, × trait
(économe/dépensier). Sans argent, il faut les actions « Chercher de la
nourriture » et « Repas à l'association », ou des conserves.
