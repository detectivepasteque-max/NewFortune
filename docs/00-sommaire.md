# Documentation de Nouvelle Fortune

## Par où commencer

1. **Jouer** : ouvrez `index.html`. L'aide intégrée (bouton « Comment jouer »
   sur l'écran titre) résume les règles.
2. **Modifier une valeur** (rendre le jeu plus facile, changer un salaire) :
   ouvrez `data/config.js` ou le fichier de données concerné, modifiez, rechargez.
3. **Ajouter du contenu** (événement, métier, objet…) : chaque fichier de
   `data/` commence par un commentaire qui décrit ses champs. Copiez une entrée,
   changez l'`id`, rechargez. Les documents ci-dessous détaillent chaque type.
4. **Toucher au moteur** (`src/core/`) : lisez d'abord `02-architecture.md`.

## Sommaire

| Document | Contenu |
| --- | --- |
| [01-prise-en-main.md](01-prise-en-main.md) | Lancer le jeu, l'héberger sur internet, dépanner |
| [02-architecture.md](02-architecture.md) | Organisation du code, état d'une partie, déroulement d'un tour, phases |
| [03-evenements.md](03-evenements.md) | Écrire un événement : conditions, choix, effets, issues aléatoires, chaînes |
| [04-metiers-formations.md](04-metiers-formations.md) | Métiers, embauche, formations, diplômes, aides sociales |
| [05-objets-recettes.md](05-objets-recettes.md) | Objets, effets passifs, consommables, recettes, boutique |
| [06-actions.md](06-actions.md) | Les actions du joueur et comment en ajouter |
| [07-logements-classes-fiscalite.md](07-logements-classes-fiscalite.md) | Logements, catégories sociales, impôts, train de vie, dettes |
| [08-famille-heritage-entreprise.md](08-famille-heritage-entreprise.md) | Couple, enfants, succession, héritier, création d'entreprise |
| [09-equilibrage.md](09-equilibrage.md) | Toutes les constantes de `config.js`, l'outil de simulation |
| [10-sauvegarde-meta.md](10-sauvegarde-meta.md) | Sauvegarde, export/import, score, bonus permanents, graine |
| [11-reference-api.md](11-reference-api.md) | Référence des fonctions utilisables dans les données |
| [12-langues.md](12-langues.md) | Traduction : comment les textes sont traduits, traduire du nouveau contenu, ajouter une langue |

## Conventions

- Le code et les données sont en **JavaScript classique** (ES5) : `var`,
  `function () {}`, pas d'`import`. Cela permet d'ouvrir `index.html`
  directement, sans serveur ni compilation.
- Tout est accroché à l'objet global `NF` : `NF.data` (contenu), `NF.core`
  (règles), `NF.api` (fonctions utilitaires pour les données), `NF.ui`
  (affichage), `NF.rng` (aléatoire à graine).
- Les identifiants (`id`) sont en minuscules, sans accent ni espace.
- Les textes affichés sont écrits en français et enveloppés dans `NF.t('…')` ;
  les traductions sont dans `lang/` (voir `12-langues.md`).
- Les jauges vont de 0 à 100 ; **100 est toujours la bonne valeur** (la jauge
  « Faim » stocke en réalité la satiété, comme dans Les Sims : clé `nourriture` ;
  la jauge « Énergie » a pour clé `energie`).
- L'argent est en euros, les durées en mois, l'âge en mois dans l'état
  (`NF.core.ageAnnees(s)` donne l'âge en années).
