/* =====================================================================
 * PRÉNOMS, NOMS, ORIGINES
 * ---------------------------------------------------------------------
 * Utilisés pour créer le personnage, les partenaires et les enfants.
 * Ajoutez librement des entrées dans les listes.
 * ===================================================================== */
NF.data.noms = {
  prenoms: [
    'Alex', 'Camille', 'Sacha', 'Noa', 'Charlie', 'Lou', 'Eden', 'Maxime', 'Dominique', 'Claude',
    'Léo', 'Inès', 'Yanis', 'Lina', 'Hugo', 'Maya', 'Nathan', 'Chloé', 'Mehdi', 'Jade',
    'Ethan', 'Anaïs', 'Rayan', 'Sofia', 'Tom', 'Léa', 'Idris', 'Manon', 'Amir', 'Zoé',
    'Malo', 'Nina', 'Ilyes', 'Louna', 'Enzo', 'Aya', 'Gabriel', 'Elsa', 'Kenza', 'Milo',
    'Samuel', 'Fatou', 'Théo', 'Mila', 'Ousmane', 'Clara', 'Adam', 'Yasmine', 'Jules', 'Émilie',
  ],
  noms: [
    'Martin', 'Bernard', 'Dubois', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Simon',
    'Michel', 'Lefebvre', 'Garcia', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Fontaine', 'Rousseau',
    'Benali', 'Diallo', 'Nguyen', 'Ferreira', 'Da Silva', 'Haddad', 'Traoré', 'Kowalski', 'Rossi', 'Mensah',
    'Cohen', 'Lopez', 'Ibrahim', 'Keita', 'Oliveira', 'Marchand', 'Blanc', 'Guerin', 'Boyer', 'Chevalier',
  ],
  /* Origine du personnage de départ : juste du texte d'ambiance + petits bonus */
  origines: [
    { id: 'ase', texte: NF.t('Sorti de l\'aide sociale à l\'enfance le jour de vos 18 ans, sans filet.'), bonus: { administratif: 40 } },
    { id: 'rupture', texte: NF.t('Une dispute de trop avec vos parents. Vous avez claqué la porte avec un sac.'), bonus: { moral: -5, argent: 60 } },
    { id: 'expulsion', texte: NF.t('Votre famille a été expulsée. Chacun s\'est débrouillé de son côté.'), bonus: { bricolage: 40 } },
    { id: 'arrivee', texte: NF.t('Arrivé de loin avec l\'espoir d\'une vie meilleure. La ville ne vous attendait pas.'), bonus: { langues: 60, reputation: -3 } },
    { id: 'deuil', texte: NF.t('Après le décès de la personne qui vous élevait, le logement a été repris.'), bonus: { lecture: 40, moral: -8 } },
    { id: 'etudes', texte: NF.t('Études abandonnées faute d\'argent, petits boulots perdus, puis plus rien.'), bonus: { lecture: 80, informatique: 40 } },
    { id: 'campagne', texte: NF.t('Monté de la campagne pour trouver du travail. Le travail n\'est pas venu.'), bonus: { cuisine: 40, sante: 5 } },
  ],
};
