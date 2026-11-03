# 06 – Actions du joueur

Les actions de l'onglet « Actions » sont dans `data/actions.js`. Les autres
onglets (Emploi, Logement, Savoir, Objets, Famille, Entreprise) appellent
directement des fonctions du moteur (`postuler`, `changerLogement`, `etudier`,
`fabriquer`…), enveloppées par `NF.core.actionGenerique` qui gère les PA.

## Schéma

```js
{ id: 'sport', nom: 'Marcher, courir, respirer', icone: '🏃',
  categorie: 'soin',        // survie | soin | social | travail | loisirs | famille (onglets de filtre)
  desc: 'Le parc, les quais, n\'importe où.',
  pa: 1,                    // coût en PA (0 = gratuit)
  cout: { energie: 4 },     // optionnel : coûts fixes affichés sur la carte (« ⚡ −4 ») ; informatif, c'est `effet` qui les applique
  conditions: { logementOrdreMax: 3 },           // déclaratif (voir 03-evenements.md)
  condition: function (s) { return true; },      // optionnel
  visible: function (s) { return true; },        // optionnel : cacher l'action
  info: function (s) { return 'Texte court sous la description'; },   // optionnel
  effet: function (s) {
    NF.api.modifierJauge(s, 'moral', 9);
    NF.api.modifierJauge(s, 'energie', -4);
    return 'Une longue marche. Les idées s\'éclaircissent.';
  } }
```

`effet` applique lui-même les changements (avec `NF.api.*` et `NF.core.*`) et
retourne le texte affiché. Le moteur calcule et affiche les variations de jauges.

Les textes (nom, description, résultats) sont écrits en français et enveloppés
dans `NF.t('…')` pour être traduits (`return NF.t('Une longue marche.')` ;
`python outils/i18n.py envelopper` le fait pour vous), voir `12-langues.md`.

**Échec sans dépenser de PA** : retournez un texte commençant par `Impossible`,
`Il faut`, `Il vous manque`, `Plus de place`, `Vous n'avez pas`… (liste dans
`src/core/tour.js`, fonction `actionGenerique`).

**Déclencher un événement depuis une action** :
`NF.core.forcerEvenement(s, 'id')` ; il s'affichera immédiatement après
l'action, puis le joueur revient à ses actions.

## Actions livrées

| Catégorie | Action | PA | Résumé |
| --- | --- | --- | --- |
| Survie | Faire la manche | 1 | argent selon réputation, hygiène, panneau, lieu gare, décembre ; 8 % de contrôle de police |
| Survie | Chercher de la nourriture | 1 | +30 à 52 faim (marché, association, soupe populaire) ; 25 % de conserve en plus |
| Survie | Fouiller les bennes | 1 | 1 à 3 matériaux au hasard (poids `fouille` des objets) |
| Survie | Fouiller les poubelles | 1 | +6 à 18 faim, souvent quelques pièces, parfois un petit objet ; −7 hygiène |
| Survie | Petits boulots | 1 | 45 à 110 € ; −10 énergie ; 8 % de patron qui ne paie pas |
| Survie | Manger au snack | 0 | 15 € → +14 faim |
| Soin | Dormir au foyer de nuit | 1 | +45 énergie, +35 hygiène, +15 faim ; souvent complet l'hiver |
| Soin | Se reposer | 1 | +45 énergie dehors, +55 logé |
| Soin | Se laver | 1 | +24 fontaine … +45 chez soi |
| Soin | Se faire soigner | 1 | +14 santé (+3 par niveau de soins) ; gratuit pour les classes 1–2 ; 70 % de guérison |
| Soin | Repas à l'association | 1 | +32 faim, +6 moral, +1 réputation |
| Soin | Marcher, courir | 1 | +9 moral, +3 santé (+1 par niveau de sport) ; xp sport |
| Social | Démarches administratives | 1 | papiers perdus → domiciliation → aides ; xp administratif |
| Social | Nouer des contacts | 1 | +2 à 6 réputation (+10 % par niveau de théâtre) ; 30 % d'événement social ; peut débloquer un hébergement |
| Travail | Heures supplémentaires | 1 | +25 % de salaire, −15 énergie |
| Travail | Rembourser sa dette | 0 | verse tout l'argent disponible |
| Famille | Du temps en famille | 1 | +9 relation partenaire, +7 enfants, +7 moral |
| Famille | Éduquer les enfants | 1 | éducation des enfants de 3 à 17 ans, −20 € |
| Famille | Essayer d'avoir un enfant | 0 | active/désactive le projet (relation ≥ 50) |
| Loisirs | Spectacle de rue | 1 | argent selon le meilleur talent (musique, jonglage, danse, magie, théâtre) ; guitare, balles, gare, marché ; +4 moral ; 5 % de contrôle de police |
| Loisirs | Pêcher | 1 | +5 à 14 faim (×1,5 avec une canne, ×0,5 l'hiver), +5 moral ; dès le niveau 2, poissons vendus |
| Loisirs | Cueillette | 1 | parc requis ; +5 à 13 faim selon la saison (automne ×1,5, hiver ×0,3) ; intoxication 14 % −3 %/niveau |
| Loisirs | Jardiner | 1 | parc ou vrai logement ; +8 à 20 faim selon la saison ; conserves dès le niveau 2 |
| Loisirs | Dessiner et vendre des portraits | 1 | dessin niveau 1 ; 6 à 16 € × niveau ; carnet ×1,3 |
| Loisirs | Écrire | 1 | lecture niveau 1 ; +6 moral (+1 par niveau) ; dès le niveau 2, textes publiés |
| Loisirs | Photographier la ville | 1 | téléphone requis ; +5 moral ; dès le niveau 2, clichés vendus |
| Loisirs | Coudre et raccommoder | 1 | +6 hygiène ; dès le niveau 1, retouches payées 5 à 14 € × niveau |
| Loisirs | Promener et garder des animaux | 1 | réputation 10 ; 10 à 28 € (+30 %/niveau) ; morsure 8 % −1,5 %/niveau |
| Loisirs | Coiffer | 1 | +8 hygiène (+1 par niveau) ; dès le niveau 1, clients payants |
| Loisirs | Jouer aux échecs au parc | 1 | parc requis ; petite mise gagnée (30 % +10 %/niveau) ou perdue |
| Loisirs | Méditer | 1 | +5 moral (+2 par niveau), +4 énergie (+1 par niveau), +1 santé |
| Loisirs | Soirée quiz | 1 | +4 moral ; lot de 10 à 30 € (+5/niveau) avec 10 % +13 %/niveau de chance |
