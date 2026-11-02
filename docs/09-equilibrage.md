# 09 – Équilibrage

Toutes les constantes sont dans `data/config.js`, commentées. Ce document
explique la logique derrière, et comment tester.

## La logique du mois

Avec 3 PA par mois à la rue, le jeu est calibré ainsi :

- **Manger** est un besoin mensuel : la faim perd 35 par mois. Une action
  « Chercher de la nourriture » rend 30 à 52 ; l'argent achète le reste
  automatiquement (2,4 €/point sans cuisine).
- **Dormir** et **se laver** sont des besoins « un mois sur deux » : usure de
  12 et 15 (×1,15 dehors), actions qui rendent 45 à 55 et 24 à 45. Le foyer de
  nuit couvre les deux en une action, quand il y a de la place. Sous un vrai
  toit, on récupère 6 d'énergie par mois sans rien faire
  (`recuperationEnergieLoge`) et la pénibilité des métiers est réduite
  (`penibiliteMultiplicateur` 0,8, puis ×0,7 une fois logé).
- **Le moral** s'use de 7 par mois (×1,15 dehors), baisse avec la mendicité et
  l'hiver, remonte de 5 quand faim et énergie sont correctes, et avec le sport,
  l'association, la famille.
- **La santé** ne baisse que si une jauge passe sous `seuils.critique` (20),
  l'hiver dehors (8 par mois, réduit par couverture, abri, vêtements), en cas
  de maladie, et avec l'âge. Elle remonte de 4 par mois quand tout va bien.

Résultat visé : un joueur attentif tient l'automne, souffre l'hiver (il faut
l'avoir préparé : abri, couverture, foyer), et doit sacrifier une jauge pour
progresser (démarches, étude, candidatures). Un joueur qui agit au hasard meurt
en quelques mois.

Un emploi à temps plein retire 1 PA et de l'énergie (`penibilite`, ×0,7 une
fois logé) : travailler en vivant dehors est épuisant, et le logement est la
vraie délivrance. Un studio exige des fiches de paie (3 mois d'emploi déclaré).

## Les leviers principaux

| Pour… | Modifiez |
| --- | --- |
| Rendre le jeu plus facile | `paParMois` (4), `usure.*` (−20 %), `saisons.hiver.santeRue` (5), `depart.argent` |
| Rendre l'hiver plus dur | `saisons.hiver` (santeRue, maladie), `logements.js` → `rue.usure` |
| Accélérer la montée sociale | `moisAvantPromotion`, `chancePromotion`, `validationAcquisMois`, filières `NF.data.promotions`, salaires dans `metiers.js`, accès dans `logements.js` |
| Moins de fatigue | `usure.energie`, `penibiliteMultiplicateur`, `recuperationEnergieLoge`, `paMalusEnergie` |
| Rendre l'héritage plus dur | `impots.succession.tranches`, `abattementParEnfant`, `moisDemarches` |
| Plus d'événements | `evenementsParMois`, `chanceSecondEvenement`, `poids` des événements |
| Plus de rencontres | `poids` des événements `social`, action « Nouer des contacts » (30 % d'événement) |
| Vieillir plus vite / plus lentement | `vieillesse.*` |
| Plus ou moins de score | `score.*` |

## Tester avec l'outil de simulation

`outils/simulation.js` joue des parties automatiquement avec une stratégie
« sensée » (ou aléatoire) et affiche survie, classe, génération, score.

1. Ouvrez le jeu, puis la console (F12).
2. Collez le contenu de `outils/simulation.js`.
3. `NF.simuler(16, 360)` : 16 graines, 30 ans maximum.
4. `NF.simuler(8, 120, 'aleatoire')` : joueur qui agit au hasard.

Ordres de grandeur à la livraison (stratégie sensée, 20 graines, 30 ans) : 19
lignées sur 20 passent les 30 ans et atteignent la classe 5–6, avec en moyenne
deux promotions internes ; la carrière militaire (Légion accessible depuis la
rue, puis sous-officier et officier) est un chemin fréquent. Le joueur
aléatoire meurt en 3 à 6 mois. Pour durcir le début de partie, remontez
`usure.energie` (16), baissez `recuperationEnergieLoge` (0) ou le `chance` de
la Légion dans `metiers.js`.

La stratégie de simulation est volontairement simple (elle ne fabrique rien, ne
se forme pas, n'entreprend pas). Modifiez `politiqueSensee` pour tester une
autre façon de jouer, ou pour vérifier qu'une nouvelle mécanique fonctionne.

## Vérifier un contenu précis

Dans la console, `NF.ui.app.s` est l'état de la partie affichée :

```js
var s = NF.ui.app.s;
NF.api.ajouterArgent(s, 5000); NF.ui.app.rendre();          // tricher pour tester
NF.core.forcerEvenement(s, 'sec_vol_sac'); NF.core.demarrerEvenement(s); NF.ui.app.rendre();
NF.core.embaucher(s, NF.util.byId(NF.data.metiers, 'electricien'));
s.joueur.age = 70 * 12;                                       // vieillir d'un coup
NF.data.evenements.filter(function (e) { return NF.core.evenementEligible(s, e); }).map(function (e) { return e.id; });  // événements possibles ce mois
```
