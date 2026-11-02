/* =====================================================================
 * FISCALITÉ
 * ---------------------------------------------------------------------
 * Barèmes simplifiés, inspirés du système français, volontairement
 * lourds sur la transmission. Les tranches de l'impôt sur le revenu
 * sont MENSUELLES (revenu net du mois).
 * ===================================================================== */
NF.data.impots = {

  /* Impôt sur le revenu : tranches mensuelles { jusqua, taux } */
  revenu: [
    { jusqua: 950, taux: 0 },
    { jusqua: 2400, taux: 0.11 },
    { jusqua: 6900, taux: 0.30 },
    { jusqua: 14800, taux: 0.41 },
    { jusqua: Infinity, taux: 0.45 },
  ],
  /* Les revenus non déclarés n'y sont pas soumis (mais : contrôles). */

  /* Droits de succession : appliqués sur tout le patrimoine transmis
   * (argent + valeur du logement si propriétaire + valeur de l'entreprise) */
  succession: {
    abattementParEnfant: 15000,    // part exonérée par enfant héritier
    tranches: [
      { jusqua: 10000, taux: 0.10 },
      { jusqua: 30000, taux: 0.25 },
      { jusqua: 80000, taux: 0.40 },
      { jusqua: 200000, taux: 0.55 },
      { jusqua: Infinity, taux: 0.65 },
    ],
    fraisNotaire: 0.03,           // 3 % du patrimoine brut
    fraisNotaireMin: 300,
    impotsEnRetard: 0.02,         // 2 % du patrimoine réclamé "en retard"
    moisDemarches: 2,             // mois perdus en paperasse pour l'héritier (pas de PA)
    reputationTransmise: 0.5,     // part de la réputation conservée
    partLogement: true,           // le logement possédé est transmis
    dettesTransmises: true,       // les dettes passent à l'héritier
  },

  /* Taxe foncière annuelle pour les propriétaires : % du prix du bien, prélevée par 1/12 */
  taxeFonciere: 0.009,

  /* Cotisations sur les salaires déclarés (déjà retirées du net affiché) */
  cotisationsSalarie: 0.22,
  /* Charges patronales (pour les entreprises qui embauchent) */
  chargesPatronales: 0.43,

  /* Aides sociales mensuelles (versées si demandées via les démarches) */
  aides: {
    rsa: { montant: 560, conditions: { ageMin: 25, revenuMax: 500, domiciliation: true } },
    apl: { montant: 180, conditions: { loyerMin: 200, revenuMax: 1800 } },
    prime: { montant: 150, conditions: { revenuMin: 700, revenuMax: 1600, emploi: true } },
    familiale: { montant: 130, conditions: { enfantsMin: 2 } },
  },
};
