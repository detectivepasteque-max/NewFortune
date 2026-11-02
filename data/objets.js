/* =====================================================================
 * OBJETS ET MATÉRIAUX
 * ---------------------------------------------------------------------
 * L'inventaire est limité (config.inventaireBase + sac à dos).
 * Un objet occupe `taille` emplacements (par unité).
 *
 * Champs :
 *   id, nom, icone, desc
 *   type     : 'materiau' | 'objet' | 'consommable'
 *   taille   : emplacements occupés par unité (défaut 1)
 *   prix     : prix d'achat (0 = introuvable en magasin)
 *   vente    : prix de revente
 *   fouille  : poids relatif quand on fouille (0 = jamais trouvé)
 *   passif   : effets permanents tant que l'objet est dans l'inventaire
 *       mendicite      : multiplicateur des gains de mendicité
 *       fouille        : multiplicateur de ce que l'on trouve
 *       froid          : multiplicateur des dégâts de l'hiver à la rue (0.5 = moitié)
 *       usureEnergie / usureHygiene / usureMoral / usureNourriture : multiplicateurs
 *       inventaire     : emplacements en plus
 *       emploi         : multiplicateur de chance à l'embauche
 *       apprentissage  : multiplicateur d'xp
 *       vol            : multiplicateur du risque de vol (sac visible…)
 *       telephone      : true = compte comme un téléphone pour les métiers
 *       velo           : true = compte comme un vélo
 *       peche / dessin / couture : multiplicateurs des actions de loisirs
 *                        correspondantes (canne à pêche, carnet, nécessaire)
 *       spectacle      : multiplicateur des gains du spectacle de rue
 *   usage    : effet quand on "utilise" un consommable { nourriture: 30, sante: 10 … }
 *   fragile  : chance par mois d'être perdu/cassé quand on vit à la rue
 * ===================================================================== */
NF.data.objets = [
  /* ----- Matériaux ----- */
  { id: 'carton', nom: NF.t('Carton'), icone: '📦', desc: NF.t('Des cartons d\'emballage, secs si possible.'), type: 'materiau', prix: 0, vente: 0, fouille: 10 },
  { id: 'ficelle', nom: NF.t('Ficelle et scotch'), icone: '🧵', desc: NF.t('De quoi attacher.'), type: 'materiau', prix: 3, vente: 0, fouille: 6 },
  { id: 'tissu', nom: NF.t('Tissu'), icone: '🧶', desc: NF.t('Vieux vêtements, chutes de tissu.'), type: 'materiau', prix: 4, vente: 1, fouille: 6 },
  { id: 'bois', nom: NF.t('Bois de palette'), icone: '🪵', desc: NF.t('Planches récupérées.'), type: 'materiau', taille: 2, prix: 5, vente: 2, fouille: 5 },
  { id: 'ferraille', nom: NF.t('Ferraille'), icone: '🔩', desc: NF.t('Métal à revendre ou à bricoler.'), type: 'materiau', taille: 2, prix: 0, vente: 8, fouille: 5 },
  { id: 'bache', nom: NF.t('Bâche'), icone: '🟦', desc: NF.t('Du plastique épais, imperméable.'), type: 'materiau', prix: 8, vente: 2, fouille: 3 },
  { id: 'boite_conserve', nom: NF.t('Boîte de conserve vide'), icone: '🥫', desc: NF.t('Peut servir de réchaud ou de gamelle.'), type: 'materiau', prix: 0, vente: 0, fouille: 7 },
  { id: 'bouteille', nom: NF.t('Bouteille en plastique'), icone: '🧴', desc: NF.t('Toujours utile.'), type: 'materiau', prix: 0, vente: 0, fouille: 8 },
  { id: 'briquet', nom: NF.t('Briquet'), icone: '🔥', desc: NF.t('Du feu.'), type: 'materiau', prix: 2, vente: 0, fouille: 3 },
  { id: 'piece_velo', nom: NF.t('Pièces de vélo'), icone: '⚙️', desc: NF.t('Roues, chaîne, cadre tordu.'), type: 'materiau', taille: 2, prix: 15, vente: 5, fouille: 2 },

  /* ----- Consommables ----- */
  { id: 'conserve', nom: NF.t('Repas en conserve'), icone: '🍲', desc: NF.t('Un repas complet, se garde longtemps.'), type: 'consommable', prix: 4, vente: 1, fouille: 4, usage: { nourriture: 18 } },
  { id: 'sandwich', nom: NF.t('Sandwich'), icone: '🥪', desc: NF.t('À manger vite.'), type: 'consommable', prix: 5, vente: 0, fouille: 2, usage: { nourriture: 12, moral: 2 } },
  { id: 'medicaments', nom: NF.t('Médicaments'), icone: '💊', desc: NF.t('Antidouleurs, antibiotiques de base.'), type: 'consommable', prix: 12, vente: 4, fouille: 1, usage: { sante: 12 } },
  { id: 'savon', nom: NF.t('Savon et serviette'), icone: '🧼', desc: NF.t('Pour se laver convenablement.'), type: 'consommable', prix: 4, vente: 0, fouille: 2, usage: { hygiene: 20 } },
  { id: 'cafe', nom: NF.t('Café et biscuits'), icone: '☕', desc: NF.t('Un coup de fouet.'), type: 'consommable', prix: 3, vente: 0, fouille: 2, usage: { energie: 8, moral: 4 } },

  /* ----- Objets ----- */
  { id: 'sac_a_dos', nom: NF.t('Sac à dos'), icone: '🎒', desc: NF.t('Permet de porter plus de choses.'), type: 'objet', prix: 25, vente: 8, fouille: 1,
    passif: { inventaire: 6 }, fragile: 0.01 },
  { id: 'couverture', nom: NF.t('Couverture'), icone: '🛌', desc: NF.t('Une vieille couverture. Mieux que rien.'), type: 'objet', prix: 15, vente: 3, fouille: 2,
    passif: { froid: 0.75, usureEnergie: 0.9 }, fragile: 0.04 },
  { id: 'couverture_rapiecee', nom: NF.t('Couverture rapiécée'), icone: '🧣', desc: NF.t('Doublée, recousue, épaisse. Protège bien du froid.'), type: 'objet', prix: 0, vente: 10, fouille: 0,
    passif: { froid: 0.5, usureEnergie: 0.85 }, fragile: 0.02 },
  { id: 'abri_carton', nom: NF.t('Abri en carton'), icone: '🏕️', desc: NF.t('Un abri bricolé qui coupe le vent et les regards.'), type: 'objet', taille: 3, prix: 0, vente: 0, fouille: 0,
    passif: { froid: 0.6, usureEnergie: 0.75, usureMoral: 0.8 }, fragile: 0.08 },
  { id: 'tente', nom: NF.t('Tente'), icone: '⛺', desc: NF.t('Une vraie tente. Permet de s\'installer dans un campement.'), type: 'objet', taille: 3, prix: 60, vente: 20, fouille: 0,
    passif: { froid: 0.5, usureEnergie: 0.7, usureMoral: 0.8 }, fragile: 0.03 },
  { id: 'rechaud', nom: NF.t('Réchaud de fortune'), icone: '🔥', desc: NF.t('Chauffer de l\'eau, cuire un repas. La nourriture coûte moins.'), type: 'objet', prix: 0, vente: 5, fouille: 0,
    passif: { nourritureCout: 0.6, froid: 0.9 }, fragile: 0.03 },
  { id: 'panneau', nom: NF.t('Panneau de mendicité'), icone: '🪧', desc: NF.t('Un message qui touche. La mendicité rapporte plus.'), type: 'objet', prix: 0, vente: 0, fouille: 0,
    passif: { mendicite: 1.5 }, fragile: 0.05 },
  { id: 'vetements_chauds', nom: NF.t('Vêtements chauds'), icone: '🧥', desc: NF.t('Manteau, bonnet, chaussures solides.'), type: 'objet', prix: 40, vente: 10, fouille: 1,
    passif: { froid: 0.6, usureHygiene: 0.9 }, fragile: 0.01 },
  { id: 'vetements_propres', nom: NF.t('Tenue propre'), icone: '👔', desc: NF.t('Une tenue correcte pour un entretien d\'embauche.'), type: 'objet', prix: 35, vente: 8, fouille: 0,
    passif: { emploi: 1.3 }, fragile: 0.02 },
  { id: 'telephone', nom: NF.t('Téléphone'), icone: '📱', desc: NF.t('Indispensable pour être rappelé par un employeur.'), type: 'objet', prix: 60, vente: 20, fouille: 0,
    passif: { telephone: true, emploi: 1.25 }, fragile: 0.02 },
  { id: 'velo', nom: NF.t('Vélo'), icone: '🚲', desc: NF.t('Se déplacer vite, livrer des repas.'), type: 'objet', taille: 2, prix: 120, vente: 45, fouille: 0,
    passif: { velo: true, fouille: 1.2 }, fragile: 0.03 },
  { id: 'lampe', nom: NF.t('Lampe de poche'), icone: '🔦', desc: NF.t('Lire le soir, fouiller la nuit.'), type: 'objet', prix: 8, vente: 2, fouille: 2,
    passif: { fouille: 1.15, apprentissage: 1.1 }, fragile: 0.02 },
  { id: 'trousse_soins', nom: NF.t('Trousse de soins'), icone: '🩹', desc: NF.t('Pansements, désinfectant. Limite les dégâts.'), type: 'objet', prix: 20, vente: 5, fouille: 1,
    passif: { maladie: 0.8 }, fragile: 0.01 },
  { id: 'livre', nom: NF.t('Livres'), icone: '📚', desc: NF.t('Quelques livres à soi. Apprendre partout.'), type: 'objet', prix: 10, vente: 2, fouille: 2,
    passif: { apprentissage: 1.15, usureMoral: 0.9 }, fragile: 0.02 },
  { id: 'outils', nom: NF.t('Outils'), icone: '🧰', desc: NF.t('Tournevis, pince, couteau, marteau. Pour bricoler sérieusement.'), type: 'objet', taille: 2, prix: 45, vente: 15, fouille: 1,
    passif: { bricolage: 1.3 }, fragile: 0.01 },
  { id: 'radio', nom: NF.t('Petite radio'), icone: '📻', desc: NF.t('De la musique, des voix. Le moral tient mieux.'), type: 'objet', prix: 15, vente: 4, fouille: 1,
    passif: { usureMoral: 0.8 }, fragile: 0.02 },
  { id: 'cadenas', nom: NF.t('Cadenas et chaîne'), icone: '🔒', desc: NF.t('Pour attacher ses affaires. Moins de vols.'), type: 'objet', prix: 10, vente: 2, fouille: 1,
    passif: { vol: 0.5 }, fragile: 0.0 },
  { id: 'ordinateur', nom: NF.t('Ordinateur portable'), icone: '💻', desc: NF.t('Travailler, apprendre, chercher un emploi.'), type: 'objet', taille: 2, prix: 350, vente: 120, fouille: 0,
    passif: { apprentissage: 1.3, emploi: 1.2 }, fragile: 0.03 },
  { id: 'voiture', nom: NF.t('Voiture d\'occasion'), icone: '🚗', desc: NF.t('Nécessite le permis. Ouvre des métiers, coûte en entretien.'), type: 'objet', taille: 0, prix: 2500, vente: 1200, fouille: 0,
    passif: { voiture: true, emploi: 1.1, depensesFixes: 120 }, fragile: 0.0 },

  /* ----- Loisirs et talents (voir data/competences.js, compétences annexes) ----- */
  { id: 'canne_a_peche', nom: NF.t('Canne à pêche'), icone: '🎣', desc: NF.t('Une vraie canne avec moulinet. La pêche rapporte bien plus qu\'avec une ligne de fortune.'), type: 'objet', taille: 2, prix: 30, vente: 10, fouille: 1,
    passif: { peche: 1.5 }, fragile: 0.02 },
  { id: 'guitare', nom: NF.t('Guitare d\'occasion'), icone: '🎸', desc: NF.t('Rayée, désaccordée, mais elle sonne. Les spectacles de rue attirent plus de monde.'), type: 'objet', taille: 2, prix: 80, vente: 30, fouille: 0,
    passif: { spectacle: 1.4, usureMoral: 0.9 }, fragile: 0.03 },
  { id: 'carnet_dessin', nom: NF.t('Carnet et crayons'), icone: '🖍️', desc: NF.t('De quoi croquer les passants. Les dessins se vendent mieux.'), type: 'objet', prix: 8, vente: 1, fouille: 2,
    passif: { dessin: 1.3, apprentissage: 1.05 }, fragile: 0.03 },
  { id: 'balles_jonglage', nom: NF.t('Balles de jonglage'), icone: '🤹', desc: NF.t('Trois balles cousues main. Le numéro de rue gagne en allure.'), type: 'objet', prix: 0, vente: 3, fouille: 0,
    passif: { spectacle: 1.2 }, fragile: 0.03 },
  { id: 'necessaire_couture', nom: NF.t('Nécessaire de couture'), icone: '🪡', desc: NF.t('Aiguilles, fil, ciseaux, dé. Indispensable pour coudre des vêtements.'), type: 'objet', prix: 6, vente: 1, fouille: 2,
    passif: { couture: 1.3 }, fragile: 0.01 },
];
