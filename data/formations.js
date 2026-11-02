/* =====================================================================
 * FORMATIONS ET DIPLÔMES
 * ---------------------------------------------------------------------
 * Suivre une formation prend 1 point d'action par mois (automatique)
 * et coûte `coutMensuel`. À la fin, le diplôme est ajouté au personnage
 * et débloque des métiers (voir metiers.js, prerequis.diplome).
 *
 * Champs :
 *   id, nom, icone, desc
 *   duree        : nombre de mois
 *   coutMensuel  : coût chaque mois
 *   prerequis    : { competences: { id: niveau }, diplome: id, ageMin }
 *   xp           : xp gagnée chaque mois { competence: xp }
 *   lieu         : lieu de la ville nécessaire (optionnel, sinon partout)
 * ===================================================================== */
NF.data.formations = [
  { id: 'remise_niveau', nom: NF.t('Remise à niveau'), icone: '✏️', desc: NF.t('Lire, écrire, compter. Gratuit via la mission locale.'),
    duree: 4, coutMensuel: 0, prerequis: {}, xp: { lecture: 30, administratif: 10 } },

  { id: 'cap', nom: NF.t('CAP (certificat d\'aptitude professionnelle)'), icone: '📜', desc: NF.t('Formation professionnelle courte. Ouvre les métiers qualifiés.'),
    duree: 10, coutMensuel: 20, prerequis: { competences: { lecture: 1 } }, xp: { technique: 15, cuisine: 10, bricolage: 10 } },

  { id: 'carte_pro_securite', nom: NF.t('Carte professionnelle de sécurité'), icone: '🪪', desc: NF.t('Formation obligatoire pour être agent de sécurité.'),
    duree: 3, coutMensuel: 150, prerequis: { competences: { lecture: 1 }, casierVierge: true }, xp: { soins: 5 } },

  { id: 'permis_poids_lourd', nom: NF.t('Permis poids lourd'), icone: '🚚', desc: NF.t('Pour conduire des camions.'),
    duree: 3, coutMensuel: 400, prerequis: { competences: { conduite: 2 }, permis: true }, xp: { conduite: 25 } },

  { id: 'bac', nom: NF.t('Baccalauréat professionnel'), icone: '🎓', desc: NF.t('Cours du soir pour décrocher le bac.'),
    duree: 18, coutMensuel: 30, prerequis: { competences: { lecture: 2 } }, xp: { lecture: 10, gestion: 8, informatique: 8 } },

  { id: 'diplome_aide_soignant', nom: NF.t('Diplôme d\'aide-soignant'), icone: '🩺', desc: NF.t('Formation aux soins et à l\'aide à la personne.'),
    duree: 12, coutMensuel: 60, prerequis: { competences: { soins: 2, lecture: 2 } }, xp: { soins: 20 } },

  { id: 'bts', nom: NF.t('BTS (brevet de technicien supérieur)'), icone: '📘', desc: NF.t('Deux ans de formation technique après le bac.'),
    duree: 24, coutMensuel: 50, prerequis: { diplome: 'bac' }, xp: { informatique: 10, gestion: 10, technique: 10 }, lieu: 'universite' },

  { id: 'diplome_infirmier', nom: NF.t('Diplôme d\'État infirmier'), icone: '💉', desc: NF.t('Trois ans d\'études de soins.'),
    duree: 36, coutMensuel: 80, prerequis: { diplome: 'bac', competences: { soins: 3 } }, xp: { soins: 15 }, lieu: 'universite' },

  { id: 'licence', nom: NF.t('Licence'), icone: '📗', desc: NF.t('Trois ans d\'université (ou un an après un BTS).'),
    duree: 24, coutMensuel: 70, prerequis: { diplome: 'bac', competences: { lecture: 3 } }, xp: { lecture: 10, langues: 8, gestion: 8 }, lieu: 'universite' },

  { id: 'master', nom: NF.t('Master'), icone: '📕', desc: NF.t('Deux ans de spécialisation. La porte des postes de cadre.'),
    duree: 24, coutMensuel: 120, prerequis: { diplome: 'licence' }, xp: { gestion: 12, informatique: 8, technique: 8 }, lieu: 'universite' },

  { id: 'medecine', nom: NF.t('Études de médecine'), icone: '⚕️', desc: NF.t('Très longues, très exigeantes.'),
    duree: 72, coutMensuel: 150, prerequis: { diplome: 'bac', competences: { soins: 4, lecture: 4 } }, xp: { soins: 15 }, lieu: 'universite' },

  { id: 'formation_gestion', nom: NF.t('Formation à la création d\'entreprise'), icone: '🏪', desc: NF.t('Comptabilité, statuts, fiscalité : les bases pour se lancer.'),
    duree: 2, coutMensuel: 0, prerequis: { competences: { lecture: 1 } }, xp: { gestion: 40, administratif: 15 } },
];
