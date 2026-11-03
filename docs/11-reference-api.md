# 11 – Référence des fonctions

Toutes prennent l'état `s` en premier argument. `NF.api` est pensé pour les
données (événements, actions, bonus) ; `NF.core` contient les règles.

## `NF.api` (`src/core/api.js`)

| Fonction | Rôle |
| --- | --- |
| `modifierJauge(s, 'moral', +5)` | modifie une jauge (bornée 0–100), retourne la variation réelle |
| `ajouterArgent(s, 50)` | ajoute de l'argent |
| `retirerArgent(s, 80, detteAutorisee)` | retire ; avec `true`, le manque devient une dette ; retourne le montant payé |
| `ajouterDette(s, 200)` | ajoute à la dette |
| `ajouterReputation(s, -3)` | réputation (0–100) |
| `ajouterXp(s, 'lecture', 20)` | xp de compétence (gère le passage de niveau, le permis) |
| `aObjet(s, 'velo', qte)` / `ajouterObjet(s, id, qte)` / `retirerObjet(s, id, qte)` | inventaire (`ajouterObjet` retourne le nombre réellement ajouté) |
| `capaciteInventaire(s)` / `placeUtilisee(s)` / `placeLibre(s)` | place |
| `passif(s, 'froid')` / `passifSomme(s, 'inventaire')` / `passifBool(s, 'telephone')` | effets passifs des objets |
| `drapeau(s, 'cle', valeur)` / `aDrapeau(s, 'cle')` / `effacerDrapeau(s, 'cle')` | drapeaux |
| `programmer(s, 'id_evenement', dansMois, donnees)` | événement futur |
| `journal(s, 'texte', type)` | ligne de journal (`type` : info, bon, mauvais, titre, evenement, bilan) |
| `rendreMalade(s, nom, duree, santeParMois)` / `guerir(s)` | maladie |
| `tuer(s, 'cause')` | mort |
| `poidsMortel(s, base, competence)` | poids d'une issue mortelle dans un choix `aleatoire` : base × traits (chanceux 0,6 ; robuste 0,8 ; fragile 1,25) × (1 − 0,12 × niveau de la compétence protectrice, plancher 0,4) |
| `appliquerEffets(s, effets)` | applique un objet d'effets déclaratifs (voir `03`) |
| `instantane(s)` / `difference(s, avant)` | pour afficher les variations |
| `LIBELLES` | noms et icônes des jauges, argent, réputation, dette |

## `NF.core` – lecture de l'état (`src/core/etat.js`)

| Fonction | Rôle |
| --- | --- |
| `ageAnnees(s)` | âge en années |
| `saison(s)` | `'hiver'`, `'printemps'`, `'ete'`, `'automne'` |
| `logementActuel(s)` | objet logement |
| `classeActuelle(s)` | objet catégorie sociale |
| `niveauCompetence(s, id)` | 0 à 5 |
| `metierActuel(s)` | objet métier ou `null` |
| `aLieu(s, id)` / `qualiteLieu(s, id)` | lieux de la ville |
| `aTrait(s, id)` / `modifTrait(s, cle)` | traits (produit des multiplicateurs) |
| `aDiplome(s, id ou [ids])` | diplômes |
| `efficacite(s)` | multiplicateur moral/énergie |
| `revenuMensuel(s)` / `patrimoine(s)` / `emploiStable(s)` | finances |
| `verifierConditions(s, conditions)` | `{ ok, raisons }` |
| `texteConjoncture(s)` | `{ nom, icone }` |
| `usurePrevue(s)` / `penibiliteMensuelle(s, m)` | variations attendues en fin de mois, négatif = perte (`travail` : énergie que prendra l'emploi) ; énergie mensuelle d'un métier |
| `prochainLogement(s)` | `{ l, v, d }` : logement à viser et ses conditions (affiché dans l'onglet Logement), ou null |

## `NF.core` – actions sur l'état

| Fonction | Rôle |
| --- | --- |
| `recalculerClasse(s)` | recalcule la catégorie sociale (journalise le changement) |
| `changerLogement(s, id)` / `forcerLogement(s, id)` / `conditionsLogement(s, id)` → `{ ok, raisons, depot, distance }` | logement |
| `postuler(s, id)` / `embaucher(s, metier, salaire?)` / `perdreEmploi(s, raison)` / `prerequisMetier(s, m)` / `chanceEmbauche(s, m)` | emploi |
| `commencerFormation(s, id)` / `arreterFormation(s)` / `prerequisFormation(s, f)` | formations |
| `etudier(s, competence)` | séance d'étude |
| `fabriquer(s, recette)` / `verifierRecette(s, r)` / `utiliserObjet` / `vendreObjet` / `jeterObjet` / `acheterObjet` / `prixAchat` | objets |
| `forcerEvenement(s, id, donnees)` / `demarrerEvenement(s)` / `choisir(s, index)` / `apresEvenement(s)` / `evenementEligible(s, ev)` | événements |
| `formerCouple(s, options)` / `separer(s, raison)` / `naissance(s)` / `heritiersPossibles(s)` / `calculerSuccession(s, n)` / `succession(s, index)` | famille |
| `creerEntreprise(s, secteur, statut, financement)` / `entrepriseEmbaucher` / `entrepriseLicencier` / `entrepriseInvestir` / `entrepriseEmprunter(s, montant)` / `entrepriseRemuneration(s, montant)` / `entrepriseChangerStatut` / `entrepriseFermer` / `valeurEntreprise(s)` / `secteursPossibles(s)` | entreprise |
| `executerAction(s, id)` / `actionGenerique(s, opts, fn)` / `finDuMois(s)` / `apresBilan(s)` / `nouveauMois(s)` | tour |
| `calculerScore(s)` / `finDeLignee(s)` / `chargerMeta()` / `sauverMeta(m)` / `acheterBonus(m, id)` / `chargerScores()` | score |
| `sauvegarder(s)` / `chargerPartie()` / `effacerSauvegarde()` / `exporter(s)` / `importer(json)` | sauvegarde |
| `nouvellePartie(graine, meta)` | nouvelle partie |

## `NF.rng`

`random()` (0–1), `int(min, max)`, `entre(min, max)`, `chance(p)`, `pick(tableau)`,
`shuffle(tableau)`, `pondere(items, fonctionPoids)`. Utilisez toujours
`NF.rng`, jamais `Math.random`, pour garder les parties reproductibles.

## `NF.util`

`clamp`, `round`, `euros(1234)` → `"1 234 €"`, `signe(5)` → `"+5"`, `val(valeurOuFonction, s)`,
`clone`, `cap`, `esc` (HTML), `byId(liste, id)`, `MOIS`, `saison(mois)`, `SAISONS`.
