# 07 – Logements, catégories sociales, fiscalité

## Logements (`data/logements.js`)

```js
{ id: 'studio', nom: 'Studio', icone: '🏠', desc: '…',
  loyer: 480, charges: 70,          // par mois
  proprietaire: false, prix: 0,     // true + prix d'achat pour un bien possédé
  usure: { nourriture: 0.8, energie: 0.45, hygiene: 0.25, moral: 0.7 },  // × usure de base
  bonus: { hygiene: 10 },           // jauges regagnées chaque mois (optionnel)
  expose: false,                    // true = subit la météo (rue, squat, tente)
  cuisine: true,                    // nourriture moins chère
  adresse: true,                    // vrai logement (prêts, métiers « adresse »)
  capacite: 2,                      // personnes maximum (famille)
  dureeMax: null,                   // mois maximum (foyer : 6, hébergé : 8)
  ordre: 4,                         // rang de confort, utilisé par les classes
  acces: { argent: 1200, revenuMensuel: 1100, domiciliation: true, emploiMois: 3 } }
```

Conditions d'accès : `argent` (on paie aussi dépôt + premier loyer :
`config.depotGarantie`), `revenuMensuel` (`NF.core.revenuMensuel`, qui
additionne salaire, entreprise, aides, moitié du revenu du partenaire),
`domiciliation`, `reputation`, `emploiMois` (mois d'emploi déclaré = fiches de
paie ; une entreprise compte double), `lieu`, `objet`, `drapeau`,
`secteurEmploi` (logement de fonction : la `caserne` est réservée au secteur
`armee`, attribuée automatiquement à l'embauche et quittée dès que l'on ne sert
plus). Le logement doit aussi avoir la `capacite` pour la famille.

L'onglet Logement affiche une « prochaine étape » (`NF.core.prochainLogement`) :
le logement accessible le moins élevé au-dessus de l'actuel, sinon le plus
proche selon la `distance` que renvoie `conditionsLogement` (argent et revenus
manquants ÷ 300, réputation manquante ÷ 5, domiciliation 1, mois d'emploi 2,
interdiction de foyer 3, objet 5, proposition d'hébergement 6 ; lieu absent,
secteur d'emploi et famille trop grande rendent le logement inatteignable).

Déménager coûte 1 PA. Quitter un bien possédé le vend à 90 % du prix.
Deux loyers impayés déclenchent l'événement `expulsion_loyer`. À la fin de
`dureeMax`, retour à la rue (le foyer devient interdit quelques mois).

## Catégories sociales (`data/classes.js`)

Recalculées chaque mois. On teste du niveau le plus haut au plus bas, la
première `condition` vraie l'emporte.

```js
{ niveau: 4, nom: 'Salarié stable', icone: '💼', desc: '…',
  trainDeVie: 280,     // dépenses mensuelles attendues, hors loyer
  condition: function (s, infos) { return infos.ordreLogement >= 3 && infos.emploiStable && infos.revenu >= 1300; } }
```

`infos` contient : `logement`, `ordreLogement`, `revenu`, `emploiStable`
(emploi déclaré à temps plein depuis 3 mois, ou entreprise rentable depuis 6
mois), `patrimoine` (argent + bien possédé + entreprise − dettes).

Le **train de vie** est multiplié par 1 + 0,4 (partenaire) + 0,35 par enfant,
et par le trait économe/dépensier. Il s'ajoute aux `depensesFixes` des objets
(voiture). On peut redescendre : perte d'emploi ou de logement.

## Fiscalité (`data/impots.js`)

- **Impôt sur le revenu** : barème mensuel par tranches (`revenu`), appliqué à
  tous les revenus imposables du mois (salaire déclaré, rémunération de
  dirigeant, revenu de micro-entreprise, moitié du revenu du partenaire). Le
  travail non déclaré et les aides ne sont pas imposés.
- **Taxe foncière** : `taxeFonciere` × prix du bien, par douzième.
- **Droits de succession** : voir `08-famille-heritage-entreprise.md`.
- **Dettes** : intérêt mensuel `config.interetDette` (2 %) ; remboursement
  automatique de 30 % du surplus au-delà de 150 € ; au-delà de 3 000 €, visites
  d'huissier (`huissier`).

## Ordre des opérations financières du mois

1. Revenus : salaire, entreprise, aides, partenaire.
2. Dépenses : formation, impôt, loyer et charges (ou taxe foncière), train de
   vie, enfants, nourriture automatique, remboursement de dette.
3. `reglerBilan` encaisse puis paie dans l'ordre ; une dépense marquée
   `obligatoire` (impôt, loyer, taxe foncière) crée une dette si l'argent
   manque ; les autres sont réduites.
