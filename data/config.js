/* =====================================================================
 * CONFIGURATION ET ÉQUILIBRAGE
 * ---------------------------------------------------------------------
 * Toutes les constantes numériques du jeu sont ici. Modifiez-les pour
 * rendre le jeu plus facile ou plus dur. Les commentaires expliquent
 * chaque valeur. Les jauges vont de 0 à 100 (100 = bon état).
 * ===================================================================== */
NF.data.config = {

  /* ----- Tour / points d'action ----- */
  paParMois: 3,              // points d'action de base chaque mois
  paMalusEnergie: 20,        // en dessous de ce niveau d'énergie : -1 PA
  paMalusSante: 25,          // en dessous de ce niveau de santé : -1 PA
  paMax: 5,

  /* ----- Jauges de départ ----- */
  depart: {
    sante: 75,
    nourriture: 55,
    energie: 60,
    hygiene: 45,
    moral: 55,
    argent: 40,
    reputation: 10,
    ageAnnees: 18,
  },

  /* ----- Dégradation mensuelle des jauges selon le logement -----
   * (valeurs retirées chaque mois ; le logement peut les réduire) */
  usure: {
    nourriture: 35,   // sans manger pendant un mois, on perd 35 (manger est un besoin mensuel)
    energie: 12,      // se reposer est nécessaire environ un mois sur deux (plus souvent avec un emploi pénible)
    hygiene: 15,      // se laver aussi
    moral: 7,
  },

  /* ----- Effets des jauges basses sur la santé (par mois) ----- */
  seuils: {
    critique: 20,          // sous ce seuil : dégâts de santé
    bas: 40,               // sous ce seuil : légers malus
    santeFaim: 10,         // perte de santé si nourriture < critique
    santeEnergie: 5,
    santeHygiene: 4,
    santeMoralBas: 1.5,
    moralSiFaim: 6,        // moral perdu si on a faim
  },

  /* ----- Saisons ----- */
  saisons: {
    hiver: { santeRue: 8, moralRue: 5, energieRue: 5, maladie: 0.18 },   // vivre à la rue l'hiver
    printemps: { santeRue: 1, moralRue: 0, energieRue: 0, maladie: 0.06 },
    ete: { santeRue: 0, moralRue: -2, energieRue: 0, maladie: 0.03 },    // moral négatif = bonus
    automne: { santeRue: 3, moralRue: 2, energieRue: 2, maladie: 0.08 },
  },

  /* ----- Efficacité des actions ----- */
  efficacite: {
    moralBas: 0.75,      // multiplicateur quand moral < seuil bas
    energieBas: 0.8,     // multiplicateur quand énergie < seuil bas
  },
  recuperationMoral: 5,  // moral regagné chaque mois quand faim et énergie sont correctes (≥ 40)
  recuperationEnergieLoge: 6, // énergie regagnée chaque mois quand on dort sous un vrai toit
  penibiliteMultiplicateur: 0.8, // multiplie la pénibilité de tous les métiers (1 = valeurs de metiers.js)

  /* ----- Compétences ----- */
  xpParNiveau: 100,      // xp nécessaire par niveau (niveau = xp / 100, max 5)
  niveauMax: 5,
  xpEtude: 35,           // xp gagnée par séance de bibliothèque
  xpPratique: 12,        // xp gagnée par mois en exerçant un métier

  /* ----- Inventaire ----- */
  inventaireBase: 6,     // nombre d'emplacements sans sac
  inventaireSac: 6,      // emplacements en plus avec un sac à dos

  /* ----- Événements ----- */
  evenementsParMois: { min: 1, max: 2 },
  chanceSecondEvenement: 0.45,

  /* ----- Emploi ----- */
  moisAvantPromotion: 12,        // ancienneté minimale avant une promotion
  chancePromotion: 0.06,         // par mois ensuite (× trait ambitieux, × efficacité)
  validationAcquisMois: 36,      // mois d'expérience dans un secteur qui remplacent un diplôme en promotion interne
  chanceLicenciementBase: 0.012, // par mois (modifié par la conjoncture)
  chanceControleNonDeclare: 0.05,
  amendeNonDeclare: 400,

  /* ----- Argent ----- */
  depotGarantie: 1,        // mois de loyer demandés à l'entrée d'un logement
  interetDette: 0.02,      // intérêt mensuel sur les dettes

  /* ----- Famille ----- */
  ageMajorite: 18,
  chanceNaissanceCouple: 0.03,  // par mois pour un couple stable qui essaie
  chanceNaissanceSurprise: 0.006,
  maxEnfants: 4,

  /* ----- Vieillissement et mort ----- */
  vieillesse: {
    debut: 62,           // âge à partir duquel la santé baisse naturellement
    perteSanteParAn: 2,  // perte de santé max par an après cet âge (répartie)
    ageRisque: 72,       // âge à partir duquel la mort naturelle devient possible
    chanceParMois: 0.004, // chance de base par mois après ageRisque
    chanceParAnSupp: 0.0025, // ajoutée pour chaque année au-delà
  },

  /* ----- Score et méta-progression ----- */
  score: {
    parGeneration: 500,
    parAnnee: 60,
    parClasseMax: 300,
    fortuneDiviseur: 50,   // 1 point par 50 € transmis
    parSucces: 150,
    pointsParScore: 0.1,   // points de bonus = score × 0.1
  },
  highscoresMax: 10,

  /* ----- Conjoncture économique ----- */
  conjoncture: {
    initiale: 1.0,          // 1 = normale, < 1 = crise, > 1 = croissance
    variationMensuelle: 0.03,
    min: 0.6,
    max: 1.4,
  },
};
