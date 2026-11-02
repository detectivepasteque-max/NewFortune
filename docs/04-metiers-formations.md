# 04 – Métiers, formations, aides

## Métiers (`data/metiers.js`)

```js
{ id: 'electricien', nom: 'Électricien', icone: '⚡', niveau: 3, secteur: 'batiment',
  desc: 'Installer et réparer. Métier recherché.',
  salaire: [1700, 2300],   // net mensuel, tiré à l'embauche puis modulé par le marché de la ville
  penibilite: 16,          // énergie perdue par mois (×0,7 quand on est logé)
  risque: 0.025,           // chance d'accident chaque mois
  pa: 1,                   // 1 = temps plein (−1 PA par mois), 0 = à la tâche
  nonDeclare: false,       // true = pas d'impôt, pas de protection, contrôles
  saisons: ['ete'],        // optionnel : saisons où le métier existe
  stabilite: 0.01,         // optionnel : chance mensuelle de licenciement (défaut config)
  xp: { technique: 12 },   // xp gagnée chaque mois
  prerequis: { hygiene: 40, adresse: true, diplome: 'cap', competences: { technique: 2 } } }
```

Prérequis possibles : `competences`, `hygiene`, `domiciliation`, `adresse`
(vrai logement), `diplome` (id ou tableau : un seul suffit), `permis`,
`telephone`, `objet`, `reputation`, `experience: { secteur: mois }`,
`casierVierge`, `lieu`, `ageMin`.

Prérequis supplémentaires : `ageMax`, `jauges: { sante: { min: 50 } }` (les
métiers militaires exigent une bonne santé).

**Secteurs** utilisés : `industrie`, `logistique`, `restauration`, `services`,
`commerce`, `batiment`, `agriculture`, `sante`, `transport`, `bureau`,
`securite`, `informatique`, `armee`. Ils servent à l'expérience
(`s.joueur.experience`), au marché de l'emploi de la ville (`s.ville.marche`)
et à la création d'entreprise (voir `08`).

### Carrière militaire et sécurité publique

Le secteur `armee` regroupe `legionnaire` (accessible sans domiciliation ni
casier vierge : la Légion est une porte de sortie de la rue), `militaire_du_rang`,
`sous_officier`, `officier`, `officier_superieur` et `gendarme`. Le
`pompier` est dans le secteur `securite`. À l'embauche dans le secteur
`armee`, un personnage sans vrai logement et sans famille est logé en
**caserne** (logement `caserne`, gratuit, avec adresse) ; il la quitte s'il
cesse de servir. L'expérience militaire compte comme expérience de sécurité
pour créer une entreprise. Les événements de cette carrière sont dans
`data/evenements/armee.js`.

### Filières de carrière et promotions internes

`NF.data.promotions`, en bas de `metiers.js`, associe un métier au métier
suivant de sa filière (`plongeur → aide_cuisinier → cuisinier → chef_cuisine`,
`militaire_du_rang → sous_officier → officier → officier_superieur`, etc.).

Après `config.moisAvantPromotion` mois (12) dans un emploi à temps plein
déclaré, une promotion peut survenir chaque mois (`config.chancePromotion`,
6 %, × trait ambitieux × efficacité). L'événement `promotion` propose alors :

- le **poste suivant** si le joueur en remplit les prérequis en « promotion
  interne » (`NF.core.prerequisMetier(s, m, true)`) : le diplôme est remplacé
  par `config.validationAcquisMois` (36) mois d'expérience dans le secteur, le
  téléphone et la réputation ne comptent pas, l'hygiène exigée baisse de 10 ;
  le salaire est au moins +10 % et la moitié de l'ancienneté est conservée ;
- sinon une **augmentation** de 15 %.

L'onglet Emploi affiche l'évolution possible et ce qui manque. Pour créer une
filière, ajoutez une ligne dans `NF.data.promotions`.

### Embauche (`src/core/emploi.js`)

Postuler coûte 1 PA. La chance (`NF.core.chanceEmbauche`) part d'une base par
niveau (75 % niveau 1 … 22 % niveau 5), ou du champ `chance` du métier
(concours et sélections : Légion 20 %, gendarmerie 30 %…), puis est multipliée par : hygiène,
réputation, objets (`passif.emploi` : tenue propre, téléphone, ordinateur),
trait, conjoncture, marché de la ville pour ce secteur, mission locale (jeunes,
niveaux 1–2), compétences au-delà du minimum, expérience dans le secteur,
casier (×0,6), efficacité. Bornée entre 5 % et 95 %.

Le salaire tiré est conservé pendant toute la durée de l'emploi ; les métiers
« à la tâche » (`pa: 0`) voient leur paie varier chaque mois avec la conjoncture.

### Chaque mois avec un emploi

Salaire (imposable sauf non déclaré), +1 mois d'expérience dans le secteur, xp,
pénibilité (énergie), risque d'accident → événement `accident_travail`,
licenciement (`config.chanceLicenciementBase`, ×2,5 en crise, ×2 si hygiène
< 25) → `licenciement`, promotion après 12 mois (`config.chancePromotion`) →
`promotion`, contrôle du travail non déclaré (`config.chanceControleNonDeclare`)
→ `controle_travail_non_declare`. Les métiers saisonniers s'arrêtent hors saison.

## Formations et diplômes (`data/formations.js`)

```js
{ id: 'cap', nom: 'CAP', icone: '📜', desc: '…',
  duree: 10,                 // mois
  coutMensuel: 20,           // 0 = gratuit
  prerequis: { competences: { lecture: 1 }, diplome: 'bac', ageMin: 18, casierVierge: true, permis: true },
  xp: { technique: 15 },     // xp par mois
  lieu: 'universite' }       // optionnel : lieu nécessaire dans la ville
```

Suivre une formation prend **1 PA par mois automatiquement** et coûte
`coutMensuel`. Un mois impayé ne compte pas. À la fin, l'id est ajouté à
`s.joueur.diplomes`. Les métiers y font référence par `prerequis.diplome`.

Cas particuliers : la compétence **conduite** au niveau 2 donne le permis
(`s.joueur.permis`) ; la formation `permis_poids_lourd` le donne aussi.

## Compétences (`data/competences.js`)

```js
{ id: 'lecture', nom: 'Lecture et écriture', icone: '📖', desc: '…', lieu: 'bibliotheque', cout: 0 }
```

Niveau = `xp / config.xpParNiveau` (100), maximum `config.niveauMax` (5).
Étudier (onglet Savoir, 1 PA) donne `config.xpEtude` × efficacité × trait × objets
(livres, lampe, ordinateur) × qualité du lieu. Sans le lieu dans la ville : ×0,7.
La culture générale (compétence annexe `culture`) ajoute +4 % d'xp par niveau
à toutes les séances d'étude.

### Compétences annexes (loisirs et talents)

Les compétences marquées `annexe: true` (musique, pêche, dessin, écriture,
photographie, jardinage, couture, théâtre, danse, sport, échecs, jonglage,
méditation, cueillette, animaux, coiffure, culture générale, magie) sont
affichées dans une section à part de l'onglet Savoir. Elles s'étudient comme
les autres, mais progressent surtout en pratiquant : chaque action de la
catégorie **Loisirs et talents** (`data/actions.js`, voir `06`) donne de l'xp
et rapporte d'autant plus (argent, nourriture, moral) que le niveau est haut.

Elles ouvrent aussi :

- des objets et recettes (canne à pêche, guitare, carnet de dessin, balles de
  jonglage, nécessaire de couture ; couverture et vêtements cousus, voir `05`) ;
- des métiers (musicien de bar → professeur de musique, coiffeur, toiletteur,
  animateur, photographe, coach sportif, écrivain public, graphiste) ;
- des événements (`data/evenements/loisirs.js` : concerts, concours,
  expositions, commandes, coups de main…) ;
- des effets passifs dans le moteur : la **méditation** réduit l'usure
  mensuelle du moral (−6 % par niveau), le **théâtre** améliore la chance
  d'embauche (+4 % par niveau) et les contacts (+10 % par niveau), le
  **sport** renforce « Marcher, courir, respirer » (+1 santé par niveau).

## Aides sociales (`data/impots.js`, clé `aides`)

```js
rsa: { montant: 560, conditions: { ageMin: 25, revenuMax: 500, domiciliation: true } }
```

Conditions : `ageMin`, `revenuMax`, `revenuMin`, `domiciliation`, `loyerMin`,
`emploi` (déclaré), `enfantsMin`. Une aide se **demande** via l'action
« Démarches administratives » (chance 60 % + 10 % par niveau administratif) et
reste versée tant que les conditions tiennent ; sinon elle est suspendue.
Ajoutez une aide en ajoutant une clé : elle apparaît automatiquement.
