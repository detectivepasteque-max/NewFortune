/* =====================================================================
 * CATÉGORIES SOCIALES
 * ---------------------------------------------------------------------
 * Recalculées chaque mois. La première catégorie dont la `condition`
 * est vraie, en partant du haut (niveau le plus élevé), est retenue.
 *
 * Champs :
 *   niveau     : 1 (bas) à 7 (haut)
 *   nom, icone, desc
 *   trainDeVie : dépenses mensuelles "attendues" (vêtements, sorties,
 *                transports…) en plus du loyer. Monter coûte plus cher.
 *   condition  : fonction (state, infos) -> booléen
 *       infos = { logement (objet), revenu (mensuel net), ordreLogement,
 *                 emploiStable (bool), patrimoine (argent + biens) }
 * ===================================================================== */
NF.data.classes = [
  { niveau: 1, nom: NF.t('À la rue'), icone: '🌃', desc: NF.t('Survivre au jour le jour.'),
    trainDeVie: 0,
    condition: function () { return true; } },

  { niveau: 2, nom: NF.t('Hébergé'), icone: '🛏️', desc: NF.t('Un toit temporaire : foyer, squat, canapé.'),
    trainDeVie: 30,
    condition: function (s, i) { return i.ordreLogement >= 1; } },

  { niveau: 3, nom: NF.t('Précaire'), icone: '🚪', desc: NF.t('Un petit logement, des revenus irréguliers.'),
    trainDeVie: 120,
    condition: function (s, i) { return i.ordreLogement >= 3; } },

  { niveau: 4, nom: NF.t('Salarié stable'), icone: '💼', desc: NF.t('Un emploi régulier et un vrai logement.'),
    trainDeVie: 280,
    condition: function (s, i) { return i.ordreLogement >= 3 && i.emploiStable && i.revenu >= 1300; } },

  { niveau: 5, nom: NF.t('Classe moyenne'), icone: '🏢', desc: NF.t('Du confort, de l\'épargne, des projets.'),
    trainDeVie: 550,
    condition: function (s, i) { return i.ordreLogement >= 4 && i.revenu >= 2400 && i.patrimoine >= 5000; } },

  { niveau: 6, nom: NF.t('Aisé'), icone: '🏡', desc: NF.t('Propriétaire ou hauts revenus.'),
    trainDeVie: 1100,
    condition: function (s, i) { return i.ordreLogement >= 5 && i.revenu >= 4500 && i.patrimoine >= 40000; } },

  { niveau: 7, nom: NF.t('Fortuné'), icone: '🏰', desc: NF.t('Au sommet de l\'échelle.'),
    trainDeVie: 2500,
    condition: function (s, i) { return i.ordreLogement >= 7 && i.revenu >= 9000 && i.patrimoine >= 400000; } },
];
