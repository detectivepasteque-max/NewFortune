# 02 – Architecture

## Ordre de chargement

`index.html` charge les scripts dans cet ordre. Il compte : un fichier ne peut
utiliser que ce qui est chargé avant lui (au moment du chargement ; les
fonctions appelées plus tard, en jeu, peuvent utiliser tout).

0. **Langues** : `src/i18n.js` (`NF.t`, langue courante), puis les
   dictionnaires `lang/*.js` (voir `12-langues.md`).
1. **Socle** : `src/nf.js` (objet global `NF`, utilitaires `NF.util`), puis
   `src/compteurs.js` (compteurs globaux joueurs / vies, voir `12-langues.md`
   pour les textes et l'en-tête du fichier pour le service utilisé),
   `src/core/rng.js` (générateur aléatoire à graine, `NF.rng`).
2. **Données** : tous les fichiers de `data/` sauf les événements.
3. **Moteur** : `src/core/*.js`.
4. **Événements** : `data/evenements/*.js` (ils appellent
   `NF.ajouterEvenements`, définie par le moteur). Pour ajouter un fichier
   d'événements, ajoutez une balise `<script>` dans cette section.
5. **Interface** : `src/ui/*.js`, puis `src/main.js` qui démarre l'application.

## L'objet `NF`

| Espace | Rôle | Fichiers |
| --- | --- | --- |
| `NF.data` | Tout le contenu modifiable | `data/` |
| `NF.core` | Les règles : création de partie, tour, économie, emploi, événements, famille, entreprise, score, sauvegarde | `src/core/` |
| `NF.api` | Fonctions utilitaires pensées pour être appelées depuis les données (ajouter de l'argent, un objet, programmer un événement…) | `src/core/api.js` |
| `NF.ui` | Affichage | `src/ui/` |
| `NF.util` | Petits utilitaires (euros, clamp, saison…) | `src/nf.js` |
| `NF.rng` | Générateur aléatoire de la partie en cours (`random`, `int`, `chance`, `pick`, `pondere`…) | `src/core/rng.js` |
| `NF.t`, `NF.i18n` | Traduction : `NF.t('texte français')` rend le texte dans la langue choisie ; dictionnaires dans `lang/` (voir `12`) | `src/i18n.js`, `lang/` |
| `NF.compteurs` | Compteurs globaux affichés sur l'écran titre (joueurs, vies créées) : `nouvelleVie()`, `lire()`, `texte()` ; service public Abacus, incréments seulement depuis le site publié (`HOTES`) | `src/compteurs.js` |

## L'état d'une partie (`s`)

Toutes les fonctions du moteur prennent l'état `s` en premier argument. C'est un
objet JSON pur (sauvegardable tel quel). Les champs principaux :

```js
s = {
  graine: 'BRUME-4821',          // graine de la partie
  rng: [a, b, c, d],             // état interne du générateur (sauvegarde)
  temps: { mois: 0..11, annee: 1.., moisAbsolu: 0.. },   // moisAbsolu : total de la lignée
  conjoncture: 1.0,              // 0.6 (crise) à 1.4 (boom)
  ville: { nom, quartiers: [], quartier, lieux: { id: { qualite } }, marche: { secteur: mult } },
  joueur: {
    prenom, nom, age (en mois), traits: ['robuste', …], origine,
    jauges: { sante, nourriture, energie, hygiene, moral },   // 0–100, 100 = bien
    argent, dette, reputation (0–100),
    competences: { lecture: xp, … },     // niveau = xp / config.xpParNiveau
    inventaire: { carton: 2, … },
    emploi: null | { id, salaire, mois, secteur },
    experience: { secteur: mois },
    diplomes: ['cap', …], formation: null | { id, moisRestants },
    logement: 'rue', logementMois, loyersImpayes,
    domiciliation, permis, casier, aides: { rsa: true, … },
    classe: 1..7, classeMax, paBonus,
    entreprise: null | { … },            // voir 08
    famille: { partenaire: null | {…}, enfants: [ {…} ] },
    drapeaux: { … },                     // mémoire des choix (chaînes d'événements)
    cooldowns: { idEvenement: moisAbsolu },
    programmes: [ { evenement, mois, donnees } ],   // événements à venir
    maladie: null | { nom, moisRestants, santeParMois },
  },
  lignee: { generation, membres: [], classeMax, succes: [], fortuneTransmise },
  stats: { … },
  pa, paMax,                     // points d'action du mois
  phase: 'actions' | 'bilan' | 'evenement' | 'mort' | 'fin',
  journal: [ { mois, annee, texte, type } ],
  bilan: null | { revenus, depenses, textes, deltas, … },
  evenementsEnAttente: [ { id, donnees } ],
  evenementCourant: null | { id, titre, texte, choix, resultat, deltas },
  mort: null | { cause, age },
}
```

## Déroulement d'un tour (`src/core/tour.js`)

```
phase 'actions'      le joueur dépense ses PA (NF.core.executerAction, actionGenerique)
        │
        ▼  bouton « Terminer le mois »
NF.core.finDuMois(s)
   moisEmploi → moisFormation → moisEntreprise → moisAides → moisFamille
   → moisImpots → moisLogement → moisTrainDeVie → moisNourriture → moisDettes
   → reglerBilan (encaisse et paie) → moisJauges (usure, saison)
   → moisSante (faim, maladie, vieillesse) → usureObjets → moisConjoncture
   → moisVieillesse → recalculerClasse → verifierSucces → verifierMort
   → declencherProgrammes + tirerEvenements
        │
        ▼
phase 'bilan'        affichage du bilan
        │  NF.core.apresBilan
        ▼
phase 'evenement'    un événement à la fois : NF.core.choisir, NF.core.apresEvenement
        │
        ▼
NF.core.nouveauMois  mois + 1, âge + 1, PA remis (calculerPaMax)
```

La mort (`s.mort`) interrompt tout : phase `'mort'`, puis l'interface propose un
héritier (`NF.core.succession`) ou termine la lignée (`NF.core.finDeLignee`).

Une action peut aussi déclencher un événement immédiat (ex. « Nouer des
contacts ») : la phase passe à `'evenement'` puis revient à `'actions'` dans le
même mois (`s.retourPhase`).

## Points d'action

`NF.core.calculerPaMax(s)` : base `config.paParMois` (3) + bonus (trait
« énergique », bonus permanent « Endurance ») − 1 si emploi à temps plein −
1 si formation − 1 si entreprise − 1 si énergie < 25 − 1 si santé < 25 − 1
pendant les démarches de succession. Minimum 1, maximum `config.paMax`.

## Efficacité

`NF.core.efficacite(s)` : multiplicateur appliqué aux actions « productives »
(mendicité, petits boulots, étude, embauche, entreprise). Vaut
`config.efficacite.moralBas` (0,75) si le moral est bas et
`config.efficacite.energieBas` (0,8) si l'énergie est basse (cumulables).

## Interface (`src/ui/`)

L'interface redessine entièrement l'écran à chaque changement (`NF.ui.app.rendre`).
Tous les boutons portent `data-act="…"` et `data-arg="…"` ; un seul écouteur
de clics (`src/ui/app.js`, fonction `App.executer`) fait le lien avec le moteur.
Pour ajouter un bouton : ajoutez un `case` dans `App.executer`.

- `titre.js` : écran titre (nouvelle partie, bonus, scores, import/export, aide)
- `jeu.js` : en-tête, jauges, colonne de droite
- `onglets.js` : contenu des onglets (Actions, Emploi, Logement, Savoir, Objets, Famille, Entreprise, Journal)
- `modales.js` : bilan, événement, mort, héritier, fin, confirmations
- `scene.js` : la scène urbaine en SVG (saison, logement, météo)
- `dom.js` : fragments HTML réutilisables (jetons de variation, barres…)
