/* =====================================================================
 * CRÉATION D'ENTREPRISE
 * ---------------------------------------------------------------------
 * Le joueur peut créer une entreprise dans un secteur où il a exercé
 * un métier (ou une compétence suffisante). Les calculs mensuels sont
 * automatiques (voir src/core/entreprise.js).
 * ===================================================================== */
NF.data.entreprise = {

  /* Secteurs d'activité. `competence` : compétence principale,
   * `caBase` : chiffre d'affaires mensuel de référence pour 1 personne,
   * `chargesFixes` : local, matériel, assurance… par mois,
   * `saisonnalite` : multiplicateur par saison,
   * `capitalMin` : capital de départ minimum */
  secteurs: [
    { id: 'restauration', nom: NF.t('Restauration'), icone: '🍽️', competence: 'cuisine', caBase: 4500, chargesFixes: 1400, capitalMin: 6000,
      saisonnalite: { hiver: 0.9, printemps: 1, ete: 1.2, automne: 1 } },
    { id: 'batiment', nom: NF.t('Bâtiment et rénovation'), icone: '🧱', competence: 'technique', caBase: 5200, chargesFixes: 900, capitalMin: 4000,
      saisonnalite: { hiver: 0.75, printemps: 1.1, ete: 1.15, automne: 1 } },
    { id: 'commerce', nom: NF.t('Commerce'), icone: '🛍️', competence: 'commerce', caBase: 4800, chargesFixes: 1600, capitalMin: 8000,
      saisonnalite: { hiver: 1.2, printemps: 0.95, ete: 0.9, automne: 1 } },
    { id: 'logistique', nom: NF.t('Transport et livraison'), icone: '🚚', competence: 'conduite', caBase: 4200, chargesFixes: 1100, capitalMin: 5000,
      saisonnalite: { hiver: 1.1, printemps: 1, ete: 0.95, automne: 1 } },
    { id: 'services', nom: NF.t('Services à la personne'), icone: '🧹', competence: 'soins', caBase: 3200, chargesFixes: 400, capitalMin: 1500,
      saisonnalite: { hiver: 1, printemps: 1, ete: 0.9, automne: 1 } },
    { id: 'informatique', nom: NF.t('Informatique'), icone: '💻', competence: 'informatique', caBase: 6500, chargesFixes: 600, capitalMin: 2000,
      saisonnalite: { hiver: 1, printemps: 1, ete: 0.85, automne: 1.05 } },
    { id: 'industrie', nom: NF.t('Atelier et réparation'), icone: '⚙️', competence: 'bricolage', caBase: 3800, chargesFixes: 800, capitalMin: 3000,
      saisonnalite: { hiver: 1, printemps: 1, ete: 1, automne: 1 } },
    { id: 'bureau', nom: NF.t('Conseil et gestion'), icone: '📊', competence: 'gestion', caBase: 6000, chargesFixes: 500, capitalMin: 2000,
      saisonnalite: { hiver: 1, printemps: 1, ete: 0.8, automne: 1.1 } },
    { id: 'sante', nom: NF.t('Cabinet de santé'), icone: '🩺', competence: 'soins', caBase: 7000, chargesFixes: 1500, capitalMin: 10000,
      saisonnalite: { hiver: 1.15, printemps: 1, ete: 0.9, automne: 1 } },
    { id: 'transport', nom: NF.t('Transport de personnes'), icone: '🚕', competence: 'conduite', caBase: 4000, chargesFixes: 900, capitalMin: 4000,
      saisonnalite: { hiver: 1, printemps: 1, ete: 1.1, automne: 1 } },
    { id: 'securite', nom: NF.t('Sécurité privée'), icone: '🛡️', competence: 'soins', caBase: 4500, chargesFixes: 700, capitalMin: 3000,
      saisonnalite: { hiver: 1, printemps: 1, ete: 1.15, automne: 1 } },
    { id: 'agriculture', nom: NF.t('Maraîchage'), icone: '🥬', competence: 'cuisine', caBase: 3000, chargesFixes: 700, capitalMin: 5000,
      saisonnalite: { hiver: 0.5, printemps: 1, ete: 1.5, automne: 1.2 } },
  ],

  /* Statuts juridiques */
  statuts: {
    micro: {
      nom: NF.t('Micro-entreprise'), icone: '🧾',
      desc: NF.t('Création immédiate, gestion simple. Cotisations sur le chiffre d\'affaires, plafond, pas d\'employé.'),
      cotisations: 0.24,          // part du CA
      plafondCA: 6500,            // CA mensuel maximum (au-delà, obligation de passer en société)
      employesMax: 0,
      comptable: 0,
      impotSocietes: 0,           // pas d'IS : le résultat est imposé comme revenu
      fraisCreation: 0,
    },
    societe: {
      nom: NF.t('Société'), icone: '🏢',
      desc: NF.t('Peut embaucher, grandir, emprunter. Comptable obligatoire, impôt sur les sociétés.'),
      cotisations: 0,
      plafondCA: Infinity,
      employesMax: 12,
      comptable: 180,             // par mois
      impotSocietes: [ { jusqua: 3500, taux: 0.15 }, { jusqua: Infinity, taux: 0.25 } ], // sur le bénéfice mensuel
      fraisCreation: 600,
      chargesDirigeant: 0.40,     // charges sur la rémunération du dirigeant
    },
  },

  /* Employés */
  employe: { salaireBrut: 1900, chargesPatronales: 0.43, caParEmploye: 0.6 }, // chaque employé ajoute 60 % du caBase

  /* TVA : part du CA reversée (simplifiée) */
  tva: 0.08,

  /* Aide à la création : réduction des cotisations/charges la première année */
  aideCreation: { duree: 12, reduction: 0.5 },

  /* Financement */
  microcredit: { max: 8000, taux: 0.015, duree: 36, conditions: { reputation: 20 } },
  pretBancaire: { max: 80000, taux: 0.004, duree: 84, conditions: { adresse: true, revenuMensuel: 1400 } },

  /* Investissement : chaque tranche investie augmente le CA durablement */
  investissement: { tranche: 2000, bonusCA: 0.08, max: 10 },

  /* Risques mensuels */
  risques: {
    impaye: 0.06,        // un client ne paie pas (perte 20–60 % du CA du mois)
    concurrence: 0.03,   // un concurrent s'installe (CA -15 % durable)
    controle: 0.015,     // contrôle fiscal / cotisations
    epuisement: 0.1,     // fatigue et moral du dirigeant
  },

  /* Valeur de l'entreprise (pour l'héritage) : mois de bénéfice */
  valorisationMois: 18,
};
