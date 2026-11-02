/* =====================================================================
 * RECETTES DE FABRICATION
 * ---------------------------------------------------------------------
 * Fabriquer coûte 1 point d'action. Les ingrédients sont consommés.
 *
 * Champs :
 *   id          : identifiant unique
 *   resultat    : id de l'objet fabriqué (voir objets.js)
 *   quantite    : nombre produit (défaut 1)
 *   ingredients : { idObjet: quantité }
 *   competences : { idCompetence: niveau minimum }
 *   objetsRequis: objets nécessaires mais non consommés (ex. outils)
 *   desc        : texte affiché
 *   xp          : xp gagnée dans une compétence { bricolage: 10 }
 * ===================================================================== */
NF.data.recettes = [
  { id: 'r_panneau', resultat: 'panneau', ingredients: { carton: 1 }, competences: { lecture: 1 },
    desc: NF.t('Un message sincère écrit sur un carton.'), xp: { lecture: 5 } },

  { id: 'r_abri', resultat: 'abri_carton', ingredients: { carton: 4, ficelle: 1 }, competences: {},
    desc: NF.t('Quatre cartons, un peu de scotch, un coin à l\'abri du vent.'), xp: { bricolage: 8 } },

  { id: 'r_abri_bache', resultat: 'abri_carton', ingredients: { carton: 3, bache: 1, ficelle: 1 }, competences: { bricolage: 1 },
    desc: NF.t('Version imperméable de l\'abri.'), xp: { bricolage: 10 } },

  { id: 'r_couverture', resultat: 'couverture_rapiecee', ingredients: { couverture: 1, tissu: 2, ficelle: 1 }, competences: { bricolage: 1 },
    desc: NF.t('Doubler une couverture avec du tissu.'), xp: { bricolage: 10 } },

  { id: 'r_couverture_zero', resultat: 'couverture', ingredients: { tissu: 4, ficelle: 1 }, competences: { bricolage: 1 },
    desc: NF.t('Coudre une couverture à partir de chutes.'), xp: { bricolage: 12 } },

  { id: 'r_rechaud', resultat: 'rechaud', ingredients: { boite_conserve: 2, ferraille: 1, briquet: 1 }, competences: { bricolage: 1 },
    desc: NF.t('Une boîte percée, un peu de combustible.'), xp: { bricolage: 12 } },

  { id: 'r_tente', resultat: 'tente', ingredients: { bache: 3, bois: 2, ficelle: 2 }, competences: { bricolage: 2 }, objetsRequis: ['outils'],
    desc: NF.t('Une tente solide à partir de bâches et de bois.'), xp: { bricolage: 20 } },

  { id: 'r_lampe', resultat: 'lampe', ingredients: { ferraille: 1, bouteille: 1 }, competences: { bricolage: 2, technique: 1 },
    desc: NF.t('Récupérer une pile, une ampoule, un boîtier.'), xp: { technique: 10 } },

  { id: 'r_velo', resultat: 'velo', ingredients: { piece_velo: 3, ferraille: 1 }, competences: { bricolage: 2 }, objetsRequis: ['outils'],
    desc: NF.t('Remonter un vélo à partir de pièces.'), xp: { bricolage: 25, technique: 10 } },

  { id: 'r_outils', resultat: 'outils', ingredients: { ferraille: 3, bois: 1 }, competences: { bricolage: 2, technique: 1 },
    desc: NF.t('Forger des outils grossiers mais utiles.'), xp: { technique: 15 } },

  { id: 'r_conserve', resultat: 'conserve', quantite: 3, ingredients: { boite_conserve: 3 }, competences: { cuisine: 2 }, objetsRequis: ['rechaud'],
    desc: NF.t('Cuisiner des invendus et les mettre en conserve.'), xp: { cuisine: 12 } },

  { id: 'r_savon', resultat: 'savon', quantite: 2, ingredients: { bouteille: 1, tissu: 1 }, competences: { cuisine: 1 },
    desc: NF.t('Savon maison à partir de restes de graisse et de cendre.'), xp: { cuisine: 6 } },

  { id: 'r_cadenas', resultat: 'cadenas', ingredients: { ferraille: 2 }, competences: { bricolage: 1, technique: 1 }, objetsRequis: ['outils'],
    desc: NF.t('Une chaîne et un cadenas rafistolés.'), xp: { technique: 8 } },

  { id: 'r_radio', resultat: 'radio', ingredients: { ferraille: 1, piece_velo: 1 }, competences: { technique: 2 }, objetsRequis: ['outils'],
    desc: NF.t('Réparer une radio trouvée dans une benne.'), xp: { technique: 12 } },

  /* ----- Loisirs et talents (compétences annexes) ----- */
  { id: 'r_canne', resultat: 'canne_a_peche', ingredients: { bois: 1, ficelle: 2, ferraille: 1 }, competences: { bricolage: 1 },
    desc: NF.t('Une branche droite, du fil solide, un hameçon tordu dans un bout de fer.'), xp: { bricolage: 8, peche: 5 } },

  { id: 'r_balles', resultat: 'balles_jonglage', ingredients: { tissu: 2 }, competences: { couture: 1 },
    desc: NF.t('Trois balles de tissu remplies de riz ou de sable.'), xp: { couture: 8, cirque: 5 } },

  { id: 'r_couverture_couture', resultat: 'couverture', ingredients: { tissu: 3, ficelle: 1 }, competences: { couture: 1 }, objetsRequis: ['necessaire_couture'],
    desc: NF.t('Une couverture cousue proprement : moins de tissu qu\'en bricolant.'), xp: { couture: 10 } },

  { id: 'r_vetements_propres', resultat: 'vetements_propres', ingredients: { tissu: 3, ficelle: 1 }, competences: { couture: 1 }, objetsRequis: ['necessaire_couture'],
    desc: NF.t('Retailler et recoudre des vêtements de la ressourcerie pour en faire une tenue correcte.'), xp: { couture: 12 } },

  { id: 'r_vetements_chauds', resultat: 'vetements_chauds', ingredients: { tissu: 4, ficelle: 1 }, competences: { couture: 2 }, objetsRequis: ['necessaire_couture'],
    desc: NF.t('Doubler un manteau, coudre un bonnet, renforcer des chaussures.'), xp: { couture: 15 } },
];
