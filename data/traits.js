/* =====================================================================
 * TRAITS DE CARACTÈRE
 * ---------------------------------------------------------------------
 * Chaque personnage reçoit 2 traits au hasard à la création. Un trait
 * peut modifier les jauges de départ, les points d'action ou servir de
 * condition dans les événements (conditions: { trait: 'debrouillard' }).
 *
 * Champs :
 *   id        : identifiant unique (sans accent, sans espace)
 *   nom       : nom affiché
 *   desc      : description courte
 *   depart    : modifications des valeurs de départ (optionnel)
 *   pa        : points d'action en plus ou en moins (optionnel)
 *   modif     : multiplicateurs utilisés par le moteur (optionnel)
 *               ex. { mendicite: 1.3, apprentissage: 0.8, sante: 1.1 }
 * ===================================================================== */
NF.data.traits = [
  { id: 'robuste', nom: NF.t('Robuste'), desc: NF.t('Une santé de fer. Résiste mieux au froid et aux maladies.'),
    depart: { sante: 15 }, modif: { maladie: 0.6 } },
  { id: 'fragile', nom: NF.t('Fragile'), desc: NF.t('Tombe plus facilement malade.'),
    depart: { sante: -10 }, modif: { maladie: 1.5 } },
  { id: 'debrouillard', nom: NF.t('Débrouillard'), desc: NF.t('Trouve toujours de quoi se nourrir et bricoler.'),
    modif: { fouille: 1.4, bricolage: 1.2 } },
  { id: 'charismatique', nom: NF.t('Charismatique'), desc: NF.t('Les gens vous écoutent. Mendicité et contacts plus efficaces.'),
    modif: { mendicite: 1.4, social: 1.3 } },
  { id: 'timide', nom: NF.t('Timide'), desc: NF.t('Difficile d\'aller vers les autres.'),
    modif: { mendicite: 0.75, social: 0.7, apprentissage: 1.1 } },
  { id: 'studieux', nom: NF.t('Studieux'), desc: NF.t('Apprend vite.'),
    modif: { apprentissage: 1.35 } },
  { id: 'energique', nom: NF.t('Énergique'), desc: NF.t('Un point d\'action supplémentaire chaque mois.'),
    pa: 1, modif: { usureEnergie: 1.1 } },
  { id: 'optimiste', nom: NF.t('Optimiste'), desc: NF.t('Le moral tient mieux.'),
    depart: { moral: 15 }, modif: { usureMoral: 0.6 } },
  { id: 'anxieux', nom: NF.t('Anxieux'), desc: NF.t('Le moral s\'effrite plus vite.'),
    depart: { moral: -10 }, modif: { usureMoral: 1.5 } },
  { id: 'econome', nom: NF.t('Économe'), desc: NF.t('Dépense moins pour vivre.'),
    modif: { depenses: 0.85 } },
  { id: 'depensier', nom: NF.t('Dépensier'), desc: NF.t('L\'argent file entre les doigts.'),
    modif: { depenses: 1.2 } },
  { id: 'chanceux', nom: NF.t('Chanceux'), desc: NF.t('Les bonnes surprises arrivent plus souvent.'),
    modif: { chance: 1.3 } },
  { id: 'mefiant', nom: NF.t('Méfiant'), desc: NF.t('Se fait moins voler, mais noue moins de contacts.'),
    modif: { vol: 0.5, social: 0.85 } },
  { id: 'ambitieux', nom: NF.t('Ambitieux'), desc: NF.t('Promotions plus fréquentes, mais plus de stress.'),
    modif: { promotion: 1.6, usureMoral: 1.15 } },
];
