# 03 – Écrire un événement

Les événements sont dans `data/evenements/`, un fichier par famille (plus
`loisirs.js`, événements ouverts par les compétences annexes, et `risques.js`,
situations rares où la mort est une issue possible). Chaque
fichier appelle `NF.ajouterEvenements([ … ])`. Pour un nouveau fichier, ajoutez
sa balise `<script>` dans `index.html` (section 4, après `systeme.js`).

Chaque mois, le moteur tire 1 événement (2 avec une probabilité
`config.chanceSecondEvenement`) parmi les événements **éligibles**, au hasard
pondéré par `poids`. Deux événements de la même famille le même mois sont
rendus peu probables.

## Schéma complet

```js
NF.ajouterEvenements([
  {
    id: 'sec_vol_sac',            // unique, minuscules, sans accent. Préfixe conseillé : famille
    famille: 'securite',          // sante | securite | social | administratif | travail | economie | famille | divers (vie quotidienne)
    icone: '🎒',
    titre: 'Sac volé',            // string, ou function (s, donnees)
    texte: function (s) { return 'Au réveil, votre sac a disparu, ' + s.joueur.prenom + '.'; },
    poids: 2,                     // nombre, ou function (s) → nombre ; défaut 1
    delai: 8,                     // mois avant de pouvoir se reproduire ; défaut 6
    unique: false,                // true = une seule fois par personnage
    force: false,                 // true = jamais tiré au hasard (seulement forcé/programmé)
    conditions: { expose: true, jauges: { hygiene: { max: 50 } } },   // voir ci-dessous
    condition: function (s) { return Object.keys(s.joueur.inventaire).length > 0; },  // optionnel
    choix: [
      { texte: 'Courir après le voleur',
        conditions: { jauges: { energie: { min: 30 } } },     // choix grisé si faux
        cache: false,                                           // true = choix masqué (et non grisé) si faux
        aleatoire: [                                            // issues incertaines
          { poids: 4, effets: { moral: 5, energie: -8 }, resultat: 'Vous le rattrapez. Il lâche le sac.' },
          { poids: 6, effets: { moral: -8, energie: -8, objets: { sac_a_dos: -1 } }, resultat: 'Trop rapide.' },
        ] },
      { texte: 'Laisser tomber',
        effets: { moral: -6, objets: { sac_a_dos: -1 }, drapeaux: { vole_recemment: true },
                  programmer: { evenement: 'sec_sac_retrouve', dans: 2 } },
        resultat: 'Un sac de moins. On fait avec.' },
    ],
  },
  /* Un événement sans choix est informatif : */
  { id: 'sec_sac_retrouve', famille: 'securite', force: true, icone: '🎒', titre: 'Sac retrouvé',
    texte: 'Un bénévole a retrouvé votre sac dans un buisson.',
    effets: { objets: { sac_a_dos: 1 }, moral: 5 }, resultat: 'Il manque vos affaires, mais le sac est là.' },
]);
```

## `conditions` (déclaratives)

Toutes les clés sont optionnelles et se cumulent (ET logique). Les tableaux
signifient « l'une de ces valeurs ». Référence complète dans
`src/core/etat.js`, fonction `verifierConditions`.

| Clé | Sens |
| --- | --- |
| `saison: 'hiver'` ou `['hiver','automne']` | saison en cours (`hiver`, `printemps`, `ete`, `automne`) |
| `mois: [11, 0]` | mois (0 = janvier … 11 = décembre) |
| `logement: 'rue'` ou `[…]` | id du logement actuel |
| `logementOrdreMin` / `logementOrdreMax` | rang de confort (0 rue … 8 villa, voir `logements.js`) |
| `expose: true/false` | logement exposé aux intempéries (rue, squat, tente) |
| `classeMin` / `classeMax` | catégorie sociale (1 à 7) |
| `ageMin` / `ageMax` | âge en années |
| `emploi: true/false` ou `'id'` ou `['ids']` | a un emploi / cet emploi |
| `emploiNiveauMin` / `emploiNiveauMax` | niveau du métier (1 à 5) |
| `secteur: 'batiment'` ou `[…]` | secteur du métier actuel |
| `nonDeclare: true/false` | travail non déclaré |
| `jauges: { sante: { min, max }, … }` | bornes sur les jauges (`sante`, `nourriture`, `energie`, `hygiene`, `moral`) |
| `argentMin` / `argentMax` | argent |
| `reputationMin` / `reputationMax` | réputation |
| `competences: { lecture: 2 }` | niveau minimum ; `competencesMax` pour un maximum |
| `objet: 'velo'` ou `[…]` | possède ces objets ; `objetAbsent` pour l'inverse |
| `drapeau: 'x'` ou `[…]` | drapeaux posés ; `sansDrapeau` pour l'inverse |
| `trait: 'robuste'` / `sansTrait` | trait de caractère |
| `partenaire: true/false` | en couple |
| `enfants: true/false`, `enfantsMin: 2` | enfants |
| `entreprise: true/false` | a une entreprise |
| `formation: true/false` | en formation |
| `domiciliation: true/false` | adresse administrative |
| `adresse: true` | vrai logement (chambre et au-delà) |
| `casier: true/false` | casier judiciaire |
| `permis: true` | permis de conduire |
| `diplome: 'bac'` ou `[…]` | diplôme obtenu |
| `lieu: 'gare'` | la ville a ce lieu (voir `ville.js`) |
| `dette: true/false` | a des dettes |
| `generationMin` | génération de la lignée |
| `maladie: true/false` | malade en ce moment |
| `telephone: true` | a un téléphone |
| `hygiene: 40` | hygiène minimum (raccourci) |
| `experience: { batiment: 24 }` | mois d'expérience dans un secteur |
| `proba: 0.3` | filtre aléatoire supplémentaire |

Pour une condition qui n'existe pas dans cette liste, utilisez
`condition: function (s) { … return true/false; }`.

## `effets` (déclaratifs)

Un objet, ou une fonction `(s, donnees)` qui retourne un objet. Référence :
`src/core/api.js`, fonction `appliquerEffets`.

| Clé | Effet |
| --- | --- |
| `sante`, `nourriture`, `energie`, `hygiene`, `moral` | variation de jauge (± nombre) |
| `argent` | gain (+) ou dépense (−, limitée à l'argent disponible) |
| `dette` | ajoute à la dette |
| `reputation` | variation |
| `xp: { lecture: 20 }` | expérience de compétence |
| `objets: { carton: 2, velo: -1 }` | ajoute / retire des objets (limité par la place) |
| `drapeaux: { nom: true }` | pose des drapeaux (`false` pour effacer) |
| `programmer: { evenement: 'id', dans: 3, donnees: {…} }` ou tableau | événement futur |
| `emploi: 'perdre'`, `raison: '…'` | perd l'emploi |
| `logement: 'rue'` | impose un logement |
| `maladie: { nom, duree, sante }` | rend malade (`sante` perdue par mois pendant `duree` mois) |
| `guerir: true` | guérit |
| `casier: true` | casier judiciaire |
| `domiciliation: true/false` | adresse administrative |
| `formation: 'arreter'` | arrête la formation |
| `conjoncture: -0.1` | modifie la conjoncture économique |
| `mort: 'cause'` | tue le personnage (rare, pondéré) |
| `journal: 'texte'` | ligne de journal |
| `fn: function (s) {}` | code libre |

Dans une fonction `effets`, vous pouvez aussi modifier l'état directement puis
retourner les effets déclaratifs :

```js
effets: function (s) {
  s.joueur.emploi.salaire = Math.round(s.joueur.emploi.salaire * 1.1);
  NF.core.formerCouple(s, { prenom: 'Sam', revenu: 900 });
  return { moral: 8 };
}
```

Le moteur calcule automatiquement les variations de jauges affichées au joueur
(« +8 moral, −20 € ») en comparant l'état avant et après.

## Issues mortelles

`effets: { mort: NF.t('cause') }` tue le personnage ; la cause s'affiche après
« est mort » (`'dans un accident de la route'`, `'noyé'`, `'sous le feu, en
patrouille'`). Règles suivies dans `risques.js` (vie civile) et `armee.js`
(missions en opération, entraînement, interventions) :

- la mort n'est jamais la seule issue d'un choix : elle figure dans un
  `aleatoire` à côté d'issues indemnes et blessées, et l'événement garde au
  moins un choix prudent sans issue mortelle ;
- son poids passe par `NF.api.poidsMortel(s, base, competence)`, qui tient
  compte des traits (chanceux ×0,6, robuste ×0,8, fragile ×1,25) et d'une
  compétence protectrice facultative (−12 % par niveau) :
  `poids: function (s) { return NF.api.poidsMortel(s, 0.6, 'conduite'); }` ;
- ordre de grandeur, pour des poids « sains » totalisant une dizaine : 0,15 à
  0,5 (1 à 5 %) pour un choix raisonnable, 1 à 1,5 (10 à 15 %) pour une
  imprudence.

Les opérations extérieures (`arm_opex`) enchaînent dans le même mois une ou
deux missions tirées au sort (`arm_mission_*`, drapeau `en_opex`) puis le
retour (`arm_opex_retour`) ; `s.stats.opex` compte les retours.

## Chaînes d'événements

Trois outils :

1. **Les drapeaux** : `drapeaux: { plainte_deposee: true }` dans un choix, puis
   `conditions: { drapeau: 'plainte_deposee' }` sur l'événement de suite (tiré au
   hasard plus tard, seulement si le drapeau est posé).
2. **La programmation** : `programmer: { evenement: 'id_suite', dans: 2 }` :
   l'événement arrive exactement dans 2 mois (il doit exister ; `force: true`
   évite qu'il sorte au hasard). `donnees` est transmis aux fonctions
   `texte`/`effets`/`resultat` en deuxième argument.
3. **Les délais** : `delai` empêche la répétition ; `unique: true` limite à une
   fois par vie.

Même programmé ou forcé, un événement dont les `conditions` ne tiennent plus au
moment de s'afficher est abandonné (ex. licenciement alors que l'emploi est déjà
perdu).

## Événements système (`systeme.js`)

Le moteur déclenche lui-même, via `NF.core.forcerEvenement`, les événements
suivants ; gardez leurs `id`, modifiez librement textes et choix :
`accident_travail`, `licenciement`, `promotion`, `controle_travail_non_declare`,
`tomber_malade`, `expulsion_loyer`, `foyer_reouvert`, `huissier`, `naissance`,
`rupture`, `controle_entreprise`, `faillite`, `controle_police_manche`,
`vol_foyer`.

## Drapeaux connus du moteur

| Drapeau | Posé par | Effet |
| --- | --- | --- |
| `papiers_perdus` | événements | l'action Démarches sert d'abord à refaire les papiers |
| `foyer_interdit` | fin d'hébergement en foyer, rixes | interdit « Dormir au foyer » et le logement foyer |
| `contact_association` | repas à l'association, bonus | +15 % de chance de domiciliation |
| `hebergement_propose` | contacts, événements | débloque le logement « Hébergé chez quelqu'un » |
| `relation_en_cours` | événements sociaux | une rencontre amoureuse est en cours |
| `veut_enfant` | action « Essayer d'avoir un enfant » | naissance possible |
| `temps_famille`, `education_enfants` | actions famille | relations / éducation du mois |
| `alcool` | événements | chaîne d'addiction |
| `retombe_rue` | moteur | accomplissement « Rebond » |
| `emploi_declare`, `a_cree_entreprise`, `heritier` | moteur | accomplissements, texte |
| `demarches_succession` | succession | nombre de mois avec 1 PA en moins |
| `_ev_<id>` | moteur | mémorise les événements `unique` |

## Conseils d'écriture

- Vouvoiement, ton sobre, situations plausibles ; éviter la caricature.
- Toujours au moins un choix accessible (le moteur rend le premier accessible
  s'il n'y en a aucun, mais autant l'anticiper).
- Un choix « conditionnel » (compétence, objet, argent, lieu) par événement rend
  la progression visible.
- Pour les gros effets, préférez une fonction qui calcule à partir de l'état
  (ex. `0,5 × salaire`) plutôt qu'un montant fixe.
- Enveloppez chaque texte dans `NF.t('…')` pour qu'il soit traduisible (ou
  lancez `python outils/i18n.py envelopper` après coup) ; voir `12-langues.md`.
- Testez : console → `NF.core.forcerEvenement(NF.ui.app.s, 'mon_id'); NF.core.demarrerEvenement(NF.ui.app.s); NF.ui.app.rendre();`
