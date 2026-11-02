# 08 – Famille, héritage, entreprise

## Famille (`src/core/famille.js`)

```js
s.joueur.famille = {
  partenaire: { prenom, age (mois), relation (0–100), sante, revenu, metier, depuis },
  enfants: [ { prenom, age (mois), relation, sante, education (0–100), naissance } ],
}
```

- **Rencontre** : les événements sociaux posent `relation_en_cours`, puis
  appellent `NF.core.formerCouple(s, { prenom, revenu, relation })`.
- **Chaque mois** : la relation baisse de 2 sans « temps en famille », de 2 de
  plus si le moral est bas, de 1 à la rue. La moitié du revenu du partenaire
  entre dans le ménage. Relation ≤ 5 → événement `rupture`.
  `NF.core.separer(s, raison)` sépare.
- **Naissance** : avec le projet d'enfant (`veut_enfant`, relation ≥ 50) :
  `config.chanceNaissanceCouple` par mois ; sinon `chanceNaissanceSurprise`.
  Maximum `config.maxEnfants`. Événement `naissance` → `NF.core.naissance(s)`.
- **Enfants** : coûtent 90 € + 40 € × classe par mois jusqu'à 18 ans.
  L'éducation progresse de 3 à 17 ans (plus vite si classe ≥ 3 et avec
  l'action « Éduquer les enfants »). À 18 ans, un enfant est un héritier possible.

## Mort et succession

Causes : santé à 0 (`verifierMort` : faim, froid, maladie, épuisement),
vieillesse (`config.vieillesse` : possible dès 72 ans, probabilité croissante),
événements rares (`mort: 'cause'`).

À la mort, s'il y a des enfants vivants, le joueur en choisit un.
`NF.core.calculerSuccession(s, nbEnfants)` :

| Étape | Règle (`impots.succession`) |
| --- | --- |
| Patrimoine brut | argent + bien possédé + valeur de l'entreprise |
| Abattement | `abattementParEnfant` × nombre d'enfants |
| Droits | tranches progressives (10 % → 65 %) sur le reste |
| Frais de notaire | `fraisNotaire` (3 %) du brut, minimum 300 € |
| Impôts en retard | `impotsEnRetard` (2 %) du brut |
| Dettes | transmises si `dettesTransmises` |

L'argent paie le total ; s'il manque, l'héritier démarre endetté. Le bien
possédé et l'entreprise sont transmis en nature. L'héritier garde la position
sociale, le logement (loué si les moyens le permettent), la domiciliation,
`reputationTransmise` (50 %) de la réputation, et perd `moisDemarches` mois à
1 PA en moins. Ses compétences de départ dépendent de l'**éducation** de
l'enfant. Un **mineur** passe sous tutelle : le temps avance jusqu'à ses 18 ans,
l'argent fond de 3 % par an, l'éducation continue.

Le bonus permanent « Héritage facilité » (`drapeaux.reduction_succession`)
réduit les droits.

Sans héritier : `NF.core.finDeLignee` calcule le score (voir `10`).

## Entreprise (`data/entreprise.js`, `src/core/entreprise.js`)

```js
s.joueur.entreprise = {
  secteur, statut: 'micro' | 'societe', nom, mois,
  capital,            // trésorerie
  employes, investissements, remuneration,
  prets: [ { nom, reste, mensualite } ],
  malusConcurrence, dernierCA, dernierBenefice, aideRestante, historique,
}
```

**Créer** : 18 ans, domiciliation, un secteur où l'on a 6 mois d'expérience ou
une compétence de niveau 3 (`NF.core.secteursPossibles`), et un capital ≥
`capitalMin` du secteur après frais de création. Financement : épargne,
microcrédit (réputation ≥ 20, max 8 000 €), prêt bancaire (adresse et revenus
≥ 1 400 €/mois, max 80 000 €). Aide à la création : charges et cotisations
réduites de moitié 12 mois. La gestion prend 1 PA par mois.

**Chaque mois** (`moisEntreprise`) : chiffre d'affaires = `caBase` du secteur
× (0,6 + 0,12 × niveau de la compétence) × réputation × saisonnalité ×
conjoncture × employés (+60 % chacun) × investissements (+8 % par tranche) ×
concurrence × efficacité × aléa (0,75–1,25). Puis : impayés (6 %), concurrent
(3 %), contrôle (1,5 %), charges fixes, TVA (8 %), salaires chargés (+43 %),
comptable, cotisations (micro : 24 % du CA, plafond 6 500 €/mois), prêts,
rémunération du dirigeant + 40 % de charges (société), impôt sur les sociétés
(15 % puis 25 %), dividendes au-delà de 15 000 € de trésorerie (flat tax 30 %).
Le dirigeant perd 8 énergie + 2 par employé.

**Décisions** (0 PA) : embaucher/licencier (société seulement, indemnité 1,5
mois), investir (2 000 € par tranche, max 10), emprunter, fixer sa
rémunération, changer de statut, fermer. Trésorerie < −3 000 € → `faillite`.
À la fermeture, le solde (trésorerie − prêts − indemnités) est versé au joueur,
ou devient une dette personnelle.

**Valeur** (héritage) : trésorerie + 18 mois de bénéfice + moitié des
investissements − prêts.
