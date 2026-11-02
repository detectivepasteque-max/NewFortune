/* =====================================================================
 * COMPÉTENCES
 * ---------------------------------------------------------------------
 * Une compétence a un niveau de 0 à 5 (voir config.xpParNiveau).
 * Elle progresse en étudiant (action "Apprendre") ou en pratiquant
 * (métier). Les métiers, recettes et événements y font référence par id.
 *
 * Champs :
 *   id      : identifiant unique
 *   nom     : nom affiché
 *   icone   : emoji
 *   desc    : description
 *   lieu    : lieu de la ville qui améliore l'apprentissage (optionnel)
 *   cout    : coût en argent d'une séance d'étude (0 = gratuit)
 *   annexe  : true = compétence annexe (loisir, talent). Affichée dans une
 *             section à part de l'onglet Savoir. Elle se pratique surtout
 *             par les actions de la catégorie « Loisirs et talents »
 *             (data/actions.js), qui rapportent d'autant plus que le
 *             niveau est haut, et ouvre des recettes, des métiers et des
 *             événements (data/evenements/loisirs.js).
 * ===================================================================== */
NF.data.competences = [
  /* ----- Compétences principales ----- */
  { id: 'lecture', nom: NF.t('Lecture et écriture'), icone: '📖', desc: NF.t('Lire un contrat, écrire une lettre, remplir un formulaire.'), lieu: 'bibliotheque', cout: 0 },
  { id: 'informatique', nom: NF.t('Informatique'), icone: '💻', desc: NF.t('Utiliser un ordinateur, internet, puis programmer.'), lieu: 'bibliotheque', cout: 0 },
  { id: 'bricolage', nom: NF.t('Bricolage'), icone: '🔧', desc: NF.t('Réparer, construire, fabriquer des objets.'), lieu: 'ressourcerie', cout: 5 },
  { id: 'cuisine', nom: NF.t('Cuisine'), icone: '🍳', desc: NF.t('Préparer des repas avec trois fois rien.'), lieu: 'association', cout: 5 },
  { id: 'administratif', nom: NF.t('Démarches administratives'), icone: '📄', desc: NF.t('Comprendre les aides, les papiers, les délais.'), lieu: 'centre_social', cout: 0 },
  { id: 'langues', nom: NF.t('Langues'), icone: '🗣️', desc: NF.t('Parler une ou plusieurs langues étrangères.'), lieu: 'bibliotheque', cout: 0 },
  { id: 'commerce', nom: NF.t('Commerce et négociation'), icone: '💬', desc: NF.t('Vendre, convaincre, négocier.'), lieu: 'marche', cout: 0 },
  { id: 'soins', nom: NF.t('Soins et santé'), icone: '🩺', desc: NF.t('Premiers secours, hygiène, aide à la personne.'), lieu: 'hopital', cout: 10 },
  { id: 'conduite', nom: NF.t('Conduite'), icone: '🚗', desc: NF.t('Code et conduite. Au niveau 2, vous obtenez le permis.'), lieu: 'pole', cout: 60 },
  { id: 'gestion', nom: NF.t('Gestion et comptabilité'), icone: '📊', desc: NF.t('Tenir des comptes, gérer un budget, une entreprise.'), lieu: 'universite', cout: 15 },
  { id: 'technique', nom: NF.t('Technique et industrie'), icone: '⚙️', desc: NF.t('Électricité, mécanique, bâtiment.'), lieu: 'zone', cout: 10 },

  /* ----- Compétences annexes : loisirs et talents -----
   * Chacune a au moins une action dans l'onglet Actions (catégorie Loisirs)
   * et, pour la plupart, un événement dans data/evenements/loisirs.js. */
  { id: 'musique', nom: NF.t('Musique'), icone: '🎸', desc: NF.t('Chanter, jouer d\'un instrument. Spectacles de rue, puis concerts dans les bars.'), lieu: 'centre_social', cout: 5, annexe: true },
  { id: 'peche', nom: NF.t('Pêche'), icone: '🎣', desc: NF.t('L\'étang du parc, le canal, les quais : de quoi manger, parfois de quoi vendre.'), lieu: 'parc', cout: 0, annexe: true },
  { id: 'dessin', nom: NF.t('Dessin et peinture'), icone: '🎨', desc: NF.t('Croquis, portraits, affiches. Se vend sur le trottoir, puis en galerie.'), lieu: 'centre_social', cout: 5, annexe: true },
  { id: 'ecriture', nom: NF.t('Écriture'), icone: '✍️', desc: NF.t('Poèmes, nouvelles, articles. Pour le moral d\'abord, pour l\'argent ensuite.'), lieu: 'bibliotheque', cout: 0, annexe: true },
  { id: 'photographie', nom: NF.t('Photographie'), icone: '📷', desc: NF.t('Cadrer, saisir la lumière. Il faut au moins un téléphone.'), lieu: 'bibliotheque', cout: 0, annexe: true },
  { id: 'jardinage', nom: NF.t('Jardinage'), icone: '🌱', desc: NF.t('Faire pousser des légumes dans un jardin partagé ou sur un rebord de fenêtre.'), lieu: 'parc', cout: 0, annexe: true },
  { id: 'couture', nom: NF.t('Couture'), icone: '🧵', desc: NF.t('Raccommoder, coudre des vêtements chauds, faire des retouches.'), lieu: 'ressourcerie', cout: 3, annexe: true },
  { id: 'theatre', nom: NF.t('Théâtre et prise de parole'), icone: '🎭', desc: NF.t('Jouer, improviser, parler en public. Aide aux entretiens et aux contacts.'), lieu: 'centre_social', cout: 5, annexe: true },
  { id: 'danse', nom: NF.t('Danse'), icone: '💃', desc: NF.t('Hip-hop, salsa, tout ce qui bouge. Un talent de rue qui attire la foule.'), lieu: 'centre_social', cout: 5, annexe: true },
  { id: 'sport', nom: NF.t('Sport et forme physique'), icone: '🏋️', desc: NF.t('Course, natation, entraînement. Une meilleure santé, un corps qui tient.'), lieu: 'piscine', cout: 3, annexe: true },
  { id: 'jeux', nom: NF.t('Échecs et jeux de stratégie'), icone: '♟️', desc: NF.t('Les parties du parc, les tournois. Réflexion et petites mises.'), lieu: 'parc', cout: 0, annexe: true },
  { id: 'cirque', nom: NF.t('Jonglage et arts de rue'), icone: '🤹', desc: NF.t('Balles, massues, acrobaties. Un chapeau posé au sol et un public.'), lieu: 'parc', cout: 0, annexe: true },
  { id: 'meditation', nom: NF.t('Méditation'), icone: '🧘', desc: NF.t('Respirer, se poser. Le moral s\'use moins vite chaque mois.'), lieu: 'association', cout: 0, annexe: true },
  { id: 'cueillette', nom: NF.t('Cueillette et plantes'), icone: '🍄', desc: NF.t('Reconnaître champignons, baies et plantes comestibles. Les erreurs se paient.'), lieu: 'parc', cout: 0, annexe: true },
  { id: 'animaux', nom: NF.t('Soins aux animaux'), icone: '🐕', desc: NF.t('Promener, garder, soigner les bêtes des autres.'), lieu: 'association', cout: 5, annexe: true },
  { id: 'coiffure', nom: NF.t('Coiffure'), icone: '💇', desc: NF.t('Couper les cheveux : les siens d\'abord, puis ceux des autres contre quelques pièces.'), lieu: 'association', cout: 5, annexe: true },
  { id: 'culture', nom: NF.t('Culture générale'), icone: '🏛️', desc: NF.t('Histoire, sciences, actualité. Les quiz rapportent, et on apprend tout plus vite.'), lieu: 'bibliotheque', cout: 0, annexe: true },
  { id: 'magie', nom: NF.t('Magie et illusion'), icone: '🎩', desc: NF.t('Tours de cartes, pièces qui disparaissent. Un numéro de rue qui étonne.'), lieu: 'bibliotheque', cout: 5, annexe: true },
];
