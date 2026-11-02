/* =====================================================================
 * MÉTIERS
 * ---------------------------------------------------------------------
 * Une quarantaine de métiers répartis en 5 niveaux.
 *
 * Champs :
 *   id, nom, icone, niveau (1 à 5), secteur, desc
 *   salaire      : [min, max] net mensuel ; le salaire réel est tiré à
 *                  l'embauche puis modulé par la conjoncture
 *   penibilite   : énergie perdue chaque mois (5 = facile, 30 = épuisant)
 *   risque       : chance d'accident du travail chaque mois (0 à 0.06)
 *   pa           : points d'action consommés chaque mois (0 = temps partiel / à la tâche, 1 = temps plein)
 *   nonDeclare   : true = pas d'impôt, pas de protection, risque de contrôle
 *   saisons      : liste des saisons où le métier existe (optionnel)
 *   xp           : xp gagnée chaque mois { competence: xp }
 *   prerequis    :
 *       competences   : { id: niveau minimum }
 *       hygiene       : hygiène minimum pour être embauché
 *       domiciliation : true = adresse administrative nécessaire
 *       adresse       : true = vrai logement nécessaire
 *       diplome       : id de formation (voir formations.js) ou tableau d'ids (un seul suffit)
 *       permis        : true = permis de conduire (compétence conduite ≥ 2)
 *       telephone     : true = téléphone dans l'inventaire
 *       objet         : id d'objet nécessaire
 *       reputation    : réputation minimum
 *       experience    : { secteur: mois } mois d'expérience dans un secteur
 *       casierVierge  : true = pas de casier judiciaire
 *       lieu          : lieu de la ville nécessaire
 *       ageMin / ageMax : âge en années
 *       jauges        : { sante: { min: 50 } } (condition sur une jauge)
 *   stabilite    : chance mensuelle de licenciement (défaut config)
 *   chance       : chance de base à l'embauche (sinon selon le niveau : 75 % … 22 %) ;
 *                  utile pour les concours et sélections (armée, gendarmerie, pompiers)
 *   Les promotions internes sont définies en bas du fichier (NF.data.promotions).
 * ===================================================================== */
NF.data.metiers = [

  /* =============== NIVEAU 1 – SURVIE =============== */
  { id: 'ferrailleur', nom: NF.t('Ramasseur de ferraille'), icone: '🔩', niveau: 1, secteur: 'industrie',
    desc: NF.t('Récupérer du métal dans les bennes et le revendre au poids.'),
    salaire: [220, 420], penibilite: 18, risque: 0.02, pa: 0, nonDeclare: true,
    xp: { technique: 6, bricolage: 4 }, prerequis: {} },

  { id: 'manutentionnaire_journee', nom: NF.t('Manutentionnaire à la journée'), icone: '📦', niveau: 1, secteur: 'logistique',
    desc: NF.t('Décharger des camions au marché ou à la zone, payé le soir même.'),
    salaire: [380, 650], penibilite: 22, risque: 0.025, pa: 0,
    xp: { technique: 3 }, prerequis: { hygiene: 15 } },

  { id: 'plongeur', nom: NF.t('Plongeur en restauration'), icone: '🍽️', niveau: 1, secteur: 'restauration',
    desc: NF.t('La vaisselle du restaurant, en cuisine, loin des clients.'),
    salaire: [620, 880], penibilite: 16, risque: 0.01, pa: 1,
    xp: { cuisine: 8 }, prerequis: { hygiene: 25 } },

  { id: 'livreur_velo', nom: NF.t('Livreur à vélo'), icone: '🚲', niveau: 1, secteur: 'logistique',
    desc: NF.t('Livrer des repas via une application. Payé à la course.'),
    salaire: [450, 900], penibilite: 20, risque: 0.03, pa: 0,
    xp: { conduite: 3, commerce: 2 }, prerequis: { objet: 'velo', telephone: true, hygiene: 20 } },

  { id: 'prospectus', nom: NF.t('Distributeur de prospectus'), icone: '📰', niveau: 1, secteur: 'services',
    desc: NF.t('Marcher toute la journée pour glisser des papiers dans les boîtes.'),
    salaire: [280, 480], penibilite: 15, risque: 0.005, pa: 0,
    xp: {}, prerequis: { hygiene: 10 } },

  { id: 'vendeur_sauvette', nom: NF.t('Vendeur à la sauvette'), icone: '🕶️', niveau: 1, secteur: 'commerce',
    desc: NF.t('Vendre des babioles à la sortie du métro. Attention à la police.'),
    salaire: [250, 700], penibilite: 10, risque: 0.01, pa: 0, nonDeclare: true,
    xp: { commerce: 8, langues: 2 }, prerequis: {} },

  { id: 'aide_demenageur', nom: NF.t('Aide déménageur'), icone: '🛋️', niveau: 1, secteur: 'logistique',
    desc: NF.t('Porter des armoires dans les escaliers. Dur, mais payé.'),
    salaire: [480, 780], penibilite: 25, risque: 0.03, pa: 0,
    xp: { technique: 3 }, prerequis: { hygiene: 20 } },

  { id: 'saisonnier', nom: NF.t('Cueilleur saisonnier'), icone: '🍎', niveau: 1, secteur: 'agriculture',
    desc: NF.t('Récolter dans les champs autour de la ville. L\'été et l\'automne seulement.'),
    salaire: [700, 1000], penibilite: 22, risque: 0.015, pa: 1, saisons: ['ete', 'automne'],
    xp: { cuisine: 3, cueillette: 6 }, prerequis: {} },

  { id: 'nettoyeur_chantier', nom: NF.t('Nettoyeur de chantier'), icone: '🧹', niveau: 1, secteur: 'batiment',
    desc: NF.t('Évacuer les gravats, non déclaré, payé en liquide.'),
    salaire: [500, 800], penibilite: 24, risque: 0.04, pa: 0, nonDeclare: true,
    xp: { technique: 6 }, prerequis: {} },

  { id: 'figurant', nom: NF.t('Figurant / enquêtes rémunérées'), icone: '🎬', niveau: 1, secteur: 'services',
    desc: NF.t('Petites missions ponctuelles : figuration, tests de produits, sondages.'),
    salaire: [150, 400], penibilite: 5, risque: 0, pa: 0,
    xp: { commerce: 2, theatre: 4 }, prerequis: { telephone: true, hygiene: 30 } },

  /* =============== NIVEAU 2 – EMPLOI PEU QUALIFIÉ =============== */
  { id: 'agent_entretien', nom: NF.t('Agent d\'entretien'), icone: '🧽', niveau: 2, secteur: 'services',
    desc: NF.t('Nettoyer des bureaux tôt le matin ou tard le soir.'),
    salaire: [1150, 1350], penibilite: 14, risque: 0.01, pa: 1,
    xp: {}, prerequis: { hygiene: 40, domiciliation: true, telephone: true } },

  { id: 'serveur', nom: NF.t('Serveur'), icone: '☕', niveau: 2, secteur: 'restauration',
    desc: NF.t('Service en salle, pourboires compris.'),
    salaire: [1200, 1550], penibilite: 16, risque: 0.01, pa: 1,
    xp: { commerce: 6, langues: 3 }, prerequis: { hygiene: 55, domiciliation: true, telephone: true, competences: { commerce: 1 } } },

  { id: 'caissier', nom: NF.t('Caissier'), icone: '🛒', niveau: 2, secteur: 'commerce',
    desc: NF.t('Tenir une caisse de supermarché.'),
    salaire: [1200, 1400], penibilite: 10, risque: 0.005, pa: 1,
    xp: { commerce: 4, gestion: 2 }, prerequis: { hygiene: 50, domiciliation: true, telephone: true, competences: { lecture: 1 } } },

  { id: 'aide_cuisinier', nom: NF.t('Aide-cuisinier'), icone: '🔪', niveau: 2, secteur: 'restauration',
    desc: NF.t('Éplucher, préparer, dresser. Le début d\'un parcours en cuisine.'),
    salaire: [1200, 1450], penibilite: 18, risque: 0.02, pa: 1,
    xp: { cuisine: 12 }, prerequis: { hygiene: 50, domiciliation: true, telephone: true, competences: { cuisine: 1 } } },

  { id: 'ouvrier_batiment', nom: NF.t('Ouvrier du bâtiment'), icone: '🧱', niveau: 2, secteur: 'batiment',
    desc: NF.t('Sur les chantiers, déclaré cette fois.'),
    salaire: [1300, 1650], penibilite: 24, risque: 0.04, pa: 1,
    xp: { technique: 10, bricolage: 6 }, prerequis: { hygiene: 30, domiciliation: true, competences: { technique: 1 } } },

  { id: 'preparateur_commandes', nom: NF.t('Préparateur de commandes'), icone: '🏷️', niveau: 2, secteur: 'logistique',
    desc: NF.t('Dans un entrepôt, avec un scanner et des cadences.'),
    salaire: [1250, 1450], penibilite: 20, risque: 0.02, pa: 1,
    xp: { technique: 4, informatique: 3 }, prerequis: { hygiene: 35, domiciliation: true, telephone: true, competences: { lecture: 1 } } },

  { id: 'employe_libre_service', nom: NF.t('Employé libre-service'), icone: '🥫', niveau: 2, secteur: 'commerce',
    desc: NF.t('Mise en rayon, inventaires, horaires décalés.'),
    salaire: [1200, 1400], penibilite: 15, risque: 0.01, pa: 1,
    xp: { commerce: 4 }, prerequis: { hygiene: 45, domiciliation: true, telephone: true } },

  { id: 'jardinier', nom: NF.t('Jardinier d\'espaces verts'), icone: '🌿', niveau: 2, secteur: 'services',
    desc: NF.t('Entretenir parcs et jardins pour la mairie ou une entreprise.'),
    salaire: [1250, 1500], penibilite: 18, risque: 0.02, pa: 1,
    xp: { bricolage: 6, jardinage: 8 }, prerequis: { hygiene: 35, domiciliation: true, telephone: true, competences: { bricolage: 1 } } },

  { id: 'aide_domicile', nom: NF.t('Aide à domicile'), icone: '🏠', niveau: 2, secteur: 'sante',
    desc: NF.t('Accompagner des personnes âgées ou dépendantes chez elles.'),
    salaire: [1200, 1450], penibilite: 16, risque: 0.01, pa: 1,
    xp: { soins: 10 }, prerequis: { hygiene: 55, domiciliation: true, telephone: true, competences: { soins: 1 } } },

  { id: 'chauffeur_vtc', nom: NF.t('Chauffeur VTC'), icone: '🚕', niveau: 2, secteur: 'transport',
    desc: NF.t('Conduire des clients. Il faut une voiture et le permis.'),
    salaire: [1300, 2000], penibilite: 16, risque: 0.02, pa: 1,
    xp: { conduite: 8, commerce: 4 }, prerequis: { hygiene: 50, permis: true, objet: 'voiture', telephone: true, domiciliation: true } },

  { id: 'agent_accueil', nom: NF.t('Agent d\'accueil'), icone: '🛎️', niveau: 2, secteur: 'bureau',
    desc: NF.t('Accueillir, renseigner, orienter dans un bâtiment public.'),
    salaire: [1250, 1450], penibilite: 8, risque: 0, pa: 1,
    xp: { administratif: 6, langues: 4 }, prerequis: { hygiene: 60, domiciliation: true, telephone: true, competences: { lecture: 2 } } },

  /* =============== NIVEAU 3 – MÉTIER QUALIFIÉ =============== */
  { id: 'electricien', nom: NF.t('Électricien'), icone: '⚡', niveau: 3, secteur: 'batiment',
    desc: NF.t('Installer et réparer. Métier recherché.'),
    salaire: [1700, 2300], penibilite: 16, risque: 0.025, pa: 1,
    xp: { technique: 12 }, prerequis: { hygiene: 40, adresse: true, diplome: 'cap', competences: { technique: 2 } } },

  { id: 'cuisinier', nom: NF.t('Cuisinier'), icone: '👨‍🍳', niveau: 3, secteur: 'restauration',
    desc: NF.t('Aux fourneaux d\'un restaurant.'),
    salaire: [1600, 2200], penibilite: 22, risque: 0.02, pa: 1,
    xp: { cuisine: 12, gestion: 3 }, prerequis: { hygiene: 55, adresse: true, diplome: 'cap', competences: { cuisine: 3 } } },

  { id: 'aide_soignant', nom: NF.t('Aide-soignant'), icone: '🩺', niveau: 3, secteur: 'sante',
    desc: NF.t('À l\'hôpital ou en maison de retraite.'),
    salaire: [1600, 1950], penibilite: 20, risque: 0.015, pa: 1,
    xp: { soins: 12 }, prerequis: { hygiene: 60, adresse: true, diplome: 'diplome_aide_soignant', competences: { soins: 2 } } },

  { id: 'chauffeur_routier', nom: NF.t('Chauffeur routier'), icone: '🚛', niveau: 3, secteur: 'transport',
    desc: NF.t('Des semaines sur la route, bien payées.'),
    salaire: [1800, 2400], penibilite: 20, risque: 0.02, pa: 1,
    xp: { conduite: 10 }, prerequis: { adresse: true, diplome: 'permis_poids_lourd', competences: { conduite: 3 } } },

  { id: 'agent_securite', nom: NF.t('Agent de sécurité'), icone: '🛡️', niveau: 3, secteur: 'securite',
    desc: NF.t('Surveillance de magasins, de sites, d\'événements.'),
    salaire: [1500, 1900], penibilite: 14, risque: 0.02, pa: 1,
    xp: { soins: 3 }, prerequis: { hygiene: 55, domiciliation: true, diplome: 'carte_pro_securite', casierVierge: true } },

  { id: 'plombier', nom: NF.t('Plombier'), icone: '🔧', niveau: 3, secteur: 'batiment',
    desc: NF.t('Fuites, chauffe-eau, urgences le dimanche.'),
    salaire: [1800, 2500], penibilite: 18, risque: 0.02, pa: 1,
    xp: { technique: 10, bricolage: 8 }, prerequis: { hygiene: 40, adresse: true, diplome: 'cap', competences: { technique: 2, bricolage: 2 } } },

  { id: 'mecanicien', nom: NF.t('Mécanicien automobile'), icone: '🔩', niveau: 3, secteur: 'industrie',
    desc: NF.t('Réparer des voitures dans un garage.'),
    salaire: [1700, 2200], penibilite: 16, risque: 0.02, pa: 1,
    xp: { technique: 12 }, prerequis: { hygiene: 40, adresse: true, diplome: 'cap', competences: { technique: 2 } } },

  { id: 'commercial', nom: NF.t('Commercial terrain'), icone: '🤝', niveau: 3, secteur: 'commerce',
    desc: NF.t('Vendre, démarcher, convaincre. Salaire variable.'),
    salaire: [1700, 2800], penibilite: 14, risque: 0.005, pa: 1,
    xp: { commerce: 12, conduite: 3 }, prerequis: { hygiene: 65, adresse: true, telephone: true, diplome: 'bac', competences: { commerce: 3 } } },

  { id: 'secretaire', nom: NF.t('Secrétaire'), icone: '🗂️', niveau: 3, secteur: 'bureau',
    desc: NF.t('Gérer l\'administratif d\'une entreprise ou d\'un cabinet.'),
    salaire: [1500, 1900], penibilite: 8, risque: 0, pa: 1,
    xp: { administratif: 10, informatique: 6 }, prerequis: { hygiene: 65, adresse: true, diplome: 'bac', competences: { lecture: 3, informatique: 2 } } },

  { id: 'boulanger', nom: NF.t('Boulanger'), icone: '🥖', niveau: 3, secteur: 'restauration',
    desc: NF.t('Debout à 4 heures du matin. Le pain, toujours.'),
    salaire: [1600, 2100], penibilite: 24, risque: 0.015, pa: 1,
    xp: { cuisine: 10, commerce: 3 }, prerequis: { hygiene: 55, adresse: true, diplome: 'cap', competences: { cuisine: 2 } } },

  /* =============== NIVEAU 4 – TECHNICIEN =============== */
  { id: 'technicien_info', nom: NF.t('Technicien informatique'), icone: '🖥️', niveau: 4, secteur: 'informatique',
    desc: NF.t('Dépanner, installer, administrer des parcs d\'ordinateurs.'),
    salaire: [2000, 2800], penibilite: 8, risque: 0, pa: 1,
    xp: { informatique: 12 }, prerequis: { hygiene: 60, adresse: true, diplome: ['bts', 'licence', 'master'], competences: { informatique: 3 } } },

  { id: 'comptable', nom: NF.t('Comptable'), icone: '🧮', niveau: 4, secteur: 'bureau',
    desc: NF.t('Les comptes des autres. Précision et rigueur.'),
    salaire: [2100, 3000], penibilite: 8, risque: 0, pa: 1,
    xp: { gestion: 12, administratif: 5 }, prerequis: { hygiene: 65, adresse: true, diplome: ['bts', 'licence', 'master'], competences: { gestion: 3, lecture: 3 } } },

  { id: 'infirmier', nom: NF.t('Infirmier'), icone: '💉', niveau: 4, secteur: 'sante',
    desc: NF.t('Soins, nuits, responsabilités.'),
    salaire: [2000, 2700], penibilite: 20, risque: 0.015, pa: 1,
    xp: { soins: 12 }, prerequis: { hygiene: 65, adresse: true, diplome: 'diplome_infirmier', competences: { soins: 3 } } },

  { id: 'chef_chantier', nom: NF.t('Chef de chantier'), icone: '👷', niveau: 4, secteur: 'batiment',
    desc: NF.t('Diriger une équipe sur un chantier.'),
    salaire: [2500, 3400], penibilite: 16, risque: 0.02, pa: 1,
    xp: { technique: 8, gestion: 8 }, prerequis: { hygiene: 45, adresse: true, competences: { technique: 3, gestion: 1 }, experience: { batiment: 24 } } },

  { id: 'chef_cuisine', nom: NF.t('Chef de cuisine'), icone: '🍳', niveau: 4, secteur: 'restauration',
    desc: NF.t('Votre carte, votre brigade.'),
    salaire: [2300, 3200], penibilite: 22, risque: 0.015, pa: 1,
    xp: { cuisine: 8, gestion: 8 }, prerequis: { hygiene: 60, adresse: true, diplome: 'cap', competences: { cuisine: 4, gestion: 1 }, experience: { restauration: 24 } } },

  { id: 'developpeur', nom: NF.t('Développeur'), icone: '👩‍💻', niveau: 4, secteur: 'informatique',
    desc: NF.t('Écrire du code pour une entreprise.'),
    salaire: [2500, 4000], penibilite: 8, risque: 0, pa: 1,
    xp: { informatique: 12, langues: 3 }, prerequis: { hygiene: 55, adresse: true, diplome: ['bts', 'licence', 'master'], competences: { informatique: 4 } } },

  { id: 'traducteur', nom: NF.t('Traducteur'), icone: '🌐', niveau: 4, secteur: 'bureau',
    desc: NF.t('Traduire des documents pour des entreprises et des tribunaux.'),
    salaire: [2000, 3200], penibilite: 6, risque: 0, pa: 1,
    xp: { langues: 12, lecture: 5 }, prerequis: { hygiene: 55, adresse: true, diplome: ['licence', 'master'], competences: { langues: 4, lecture: 3 } } },

  { id: 'responsable_magasin', nom: NF.t('Responsable de magasin'), icone: '🏬', niveau: 4, secteur: 'commerce',
    desc: NF.t('Gérer une équipe, un stock, un chiffre.'),
    salaire: [2300, 3200], penibilite: 14, risque: 0.005, pa: 1,
    xp: { commerce: 8, gestion: 10 }, prerequis: { hygiene: 65, adresse: true, diplome: 'bac', competences: { commerce: 3, gestion: 2 }, experience: { commerce: 24 } } },

  /* =============== NIVEAU 5 – CADRE =============== */
  { id: 'ingenieur', nom: NF.t('Ingénieur'), icone: '📐', niveau: 5, secteur: 'industrie',
    desc: NF.t('Concevoir, calculer, diriger des projets techniques.'),
    salaire: [3500, 5500], penibilite: 10, risque: 0.003, pa: 1,
    xp: { technique: 10, gestion: 6 }, prerequis: { hygiene: 65, adresse: true, diplome: 'master', competences: { technique: 4 } } },

  { id: 'cadre_commercial', nom: NF.t('Cadre commercial'), icone: '📈', niveau: 5, secteur: 'commerce',
    desc: NF.t('Diriger la vente, négocier les gros contrats.'),
    salaire: [3800, 6500], penibilite: 14, risque: 0.003, pa: 1,
    xp: { commerce: 10, gestion: 8 }, prerequis: { hygiene: 70, adresse: true, diplome: ['licence', 'master'], competences: { commerce: 4, gestion: 3 }, experience: { commerce: 36 } } },

  { id: 'medecin', nom: NF.t('Médecin'), icone: '⚕️', niveau: 5, secteur: 'sante',
    desc: NF.t('Après des années d\'études, soigner.'),
    salaire: [4500, 8000], penibilite: 18, risque: 0.005, pa: 1,
    xp: { soins: 10 }, prerequis: { hygiene: 70, adresse: true, diplome: 'medecine', competences: { soins: 5 } } },

  { id: 'directeur', nom: NF.t('Directeur'), icone: '🏛️', niveau: 5, secteur: 'bureau',
    desc: NF.t('À la tête d\'une structure, avec les responsabilités qui vont avec.'),
    salaire: [5000, 9000], penibilite: 16, risque: 0.003, pa: 1,
    xp: { gestion: 10, commerce: 4 }, prerequis: { hygiene: 70, adresse: true, diplome: 'master', competences: { gestion: 4 }, experience: { bureau: 36 } } },

  { id: 'architecte', nom: NF.t('Architecte'), icone: '🏗️', niveau: 5, secteur: 'batiment',
    desc: NF.t('Dessiner des bâtiments, suivre leur construction.'),
    salaire: [3500, 6000], penibilite: 10, risque: 0.003, pa: 1,
    xp: { technique: 8, gestion: 6 }, prerequis: { hygiene: 65, adresse: true, diplome: 'master', competences: { technique: 3, lecture: 3 } } },

  /* =============== ARMÉE ET SÉCURITÉ PUBLIQUE ===============
   * Le secteur 'armee' loge ses personnels en caserne (voir logements.js) ;
   * l'expérience militaire compte pour créer une entreprise de sécurité. */
  { id: 'legionnaire', nom: NF.t('Légionnaire'), icone: '🪖', niveau: 2, secteur: 'armee',
    desc: NF.t('La Légion étrangère recrute sans papiers ni passé. Cinq ans d\'engagement, une discipline de fer, un toit.'),
    salaire: [1300, 1450], penibilite: 26, risque: 0.03, pa: 1, stabilite: 0.004, chance: 0.2,
    xp: { technique: 6, soins: 4, langues: 6, conduite: 3 }, prerequis: { hygiene: 35, ageMax: 39, jauges: { sante: { min: 60 }, energie: { min: 40 } } } },

  { id: 'militaire_du_rang', nom: NF.t('Militaire du rang'), icone: '🎖️', niveau: 2, secteur: 'armee',
    desc: NF.t('Engagé volontaire dans l\'armée de terre. Logé, nourri, formé.'),
    salaire: [1350, 1500], penibilite: 22, risque: 0.025, pa: 1, stabilite: 0.004, chance: 0.35,
    xp: { technique: 6, soins: 5, conduite: 4 }, prerequis: { hygiene: 40, domiciliation: true, casierVierge: true, ageMax: 30, jauges: { sante: { min: 55 }, energie: { min: 40 } } } },

  { id: 'sous_officier', nom: NF.t('Sous-officier'), icone: '🎖️', niveau: 3, secteur: 'armee',
    desc: NF.t('Sergent, puis adjudant : commander une section, former les jeunes recrues.'),
    salaire: [1800, 2300], penibilite: 18, risque: 0.02, pa: 1, stabilite: 0.003,
    xp: { technique: 6, gestion: 6, soins: 3 }, prerequis: { hygiene: 50, casierVierge: true, competences: { lecture: 2, technique: 1 }, experience: { armee: 24 } } },

  { id: 'gendarme', nom: NF.t('Gendarme'), icone: '👮', niveau: 3, secteur: 'armee',
    desc: NF.t('Militaire au service de la sécurité publique. Logé en caserne.'),
    salaire: [1900, 2300], penibilite: 16, risque: 0.02, pa: 1, stabilite: 0.003, chance: 0.3,
    xp: { administratif: 6, soins: 4, conduite: 4 }, prerequis: { hygiene: 60, domiciliation: true, casierVierge: true, diplome: 'bac', ageMax: 35, jauges: { sante: { min: 55 } } } },

  { id: 'pompier', nom: NF.t('Sapeur-pompier'), icone: '🚒', niveau: 3, secteur: 'securite',
    desc: NF.t('Secours aux personnes, incendies, accidents. Physique et nerfs solides.'),
    salaire: [1700, 2100], penibilite: 20, risque: 0.03, pa: 1, chance: 0.3,
    xp: { soins: 10, technique: 4 }, prerequis: { hygiene: 55, domiciliation: true, casierVierge: true, competences: { soins: 2 }, ageMax: 40, jauges: { sante: { min: 60 } } } },

  { id: 'officier', nom: NF.t('Officier'), icone: '⭐', niveau: 4, secteur: 'armee',
    desc: NF.t('Lieutenant, capitaine : commander une compagnie, gérer des hommes et du matériel.'),
    salaire: [2600, 3400], penibilite: 16, risque: 0.015, pa: 1, stabilite: 0.002,
    xp: { gestion: 10, technique: 4 }, prerequis: { hygiene: 60, adresse: true, casierVierge: true, diplome: ['bac', 'licence', 'master'], competences: { gestion: 2, lecture: 3 }, experience: { armee: 36 } } },

  { id: 'officier_superieur', nom: NF.t('Officier supérieur'), icone: '🌟', niveau: 5, secteur: 'armee',
    desc: NF.t('Commandant, colonel : à la tête d\'un régiment ou d\'un état-major.'),
    salaire: [4000, 6000], penibilite: 14, risque: 0.005, pa: 1, stabilite: 0.002,
    xp: { gestion: 8 }, prerequis: { hygiene: 65, adresse: true, casierVierge: true, competences: { gestion: 4 }, experience: { armee: 120 } } },

  /* =============== LOISIRS ET TALENTS (compétences annexes) ===============
   * Des métiers ouverts par les compétences annexes de data/competences.js.
   * Ils restent dans les secteurs existants (services, bureau, informatique). */
  { id: 'musicien_bar', nom: NF.t('Musicien de bar'), icone: '🎸', niveau: 2, secteur: 'services',
    desc: NF.t('Jouer dans les bars et les fêtes privées. Payé au cachet, souvent en liquide.'),
    salaire: [500, 1100], penibilite: 12, risque: 0.005, pa: 0, nonDeclare: true,
    xp: { musique: 10, commerce: 2 }, prerequis: { hygiene: 35, competences: { musique: 3 } } },

  { id: 'coiffeur', nom: NF.t('Coiffeur'), icone: '💇', niveau: 2, secteur: 'services',
    desc: NF.t('Dans un salon de quartier. Des clients à fidéliser, des pourboires.'),
    salaire: [1200, 1500], penibilite: 14, risque: 0.005, pa: 1,
    xp: { coiffure: 10, commerce: 4 }, prerequis: { hygiene: 55, domiciliation: true, telephone: true, competences: { coiffure: 2 } } },

  { id: 'toiletteur', nom: NF.t('Toiletteur et gardien d\'animaux'), icone: '🐩', niveau: 2, secteur: 'services',
    desc: NF.t('Pension, toilettage, promenades pour un salon ou une plateforme de garde.'),
    salaire: [1100, 1400], penibilite: 14, risque: 0.015, pa: 1,
    xp: { animaux: 10, soins: 2 }, prerequis: { hygiene: 40, domiciliation: true, telephone: true, competences: { animaux: 2 } } },

  { id: 'animateur', nom: NF.t('Animateur'), icone: '🎈', niveau: 2, secteur: 'services',
    desc: NF.t('Centres de loisirs, périscolaire, colonies. Faire jouer, rassurer, encadrer.'),
    salaire: [1100, 1400], penibilite: 14, risque: 0.01, pa: 1,
    xp: { theatre: 6, jeux: 4, soins: 2 }, prerequis: { hygiene: 50, domiciliation: true, telephone: true, casierVierge: true, competences: { theatre: 1, jeux: 1 } } },

  { id: 'prof_musique', nom: NF.t('Professeur de musique'), icone: '🎼', niveau: 3, secteur: 'services',
    desc: NF.t('Cours particuliers et école de musique associative.'),
    salaire: [1500, 2100], penibilite: 8, risque: 0, pa: 1,
    xp: { musique: 8, theatre: 2 }, prerequis: { hygiene: 55, adresse: true, telephone: true, competences: { musique: 4, lecture: 2 } } },

  { id: 'photographe', nom: NF.t('Photographe'), icone: '📷', niveau: 3, secteur: 'services',
    desc: NF.t('Mariages, portraits, reportages pour la presse locale.'),
    salaire: [1400, 2200], penibilite: 10, risque: 0.005, pa: 1, stabilite: 0.02,
    xp: { photographie: 8, commerce: 4, informatique: 2 }, prerequis: { hygiene: 55, adresse: true, telephone: true, competences: { photographie: 3, commerce: 1 } } },

  { id: 'coach_sportif', nom: NF.t('Coach sportif'), icone: '🏋️', niveau: 3, secteur: 'services',
    desc: NF.t('Salle de sport, cours collectifs, coaching à domicile.'),
    salaire: [1500, 2100], penibilite: 18, risque: 0.02, pa: 1,
    xp: { sport: 8, soins: 3, commerce: 2 }, prerequis: { hygiene: 60, adresse: true, telephone: true, competences: { sport: 3, soins: 1 }, jauges: { sante: { min: 55 } } } },

  { id: 'ecrivain_public', nom: NF.t('Écrivain public et rédacteur'), icone: '✍️', niveau: 3, secteur: 'bureau',
    desc: NF.t('Lettres, CV, dossiers pour les uns ; articles et contenus pour les autres.'),
    salaire: [1300, 1900], penibilite: 8, risque: 0, pa: 1,
    xp: { ecriture: 8, administratif: 4, lecture: 2 }, prerequis: { hygiene: 50, adresse: true, telephone: true, competences: { ecriture: 3, lecture: 3 } } },

  { id: 'graphiste', nom: NF.t('Graphiste'), icone: '🖌️', niveau: 4, secteur: 'informatique',
    desc: NF.t('Affiches, logos, sites : dessiner pour des clients, sur ordinateur.'),
    salaire: [1900, 2800], penibilite: 10, risque: 0, pa: 1,
    xp: { dessin: 6, informatique: 6, commerce: 2 }, prerequis: { hygiene: 55, adresse: true, telephone: true, objet: 'ordinateur', competences: { dessin: 3, informatique: 2 } } },
];

/* =====================================================================
 * FILIÈRES DE CARRIÈRE (promotions internes)
 * ---------------------------------------------------------------------
 * Après config.moisAvantPromotion mois dans un métier, une promotion peut
 * survenir chaque mois (config.chancePromotion). Si le métier a une suite
 * ici et que le joueur en remplit les prérequis (le diplôme est remplacé
 * par config.validationAcquisMois mois d'expérience dans le secteur),
 * l'événement `promotion` propose le nouveau poste ; sinon, une simple
 * augmentation. Ajoutez une ligne pour créer une filière.
 * ===================================================================== */
NF.data.promotions = {
  plongeur: 'aide_cuisinier', aide_cuisinier: 'cuisinier', cuisinier: 'chef_cuisine',
  manutentionnaire_journee: 'preparateur_commandes', preparateur_commandes: 'responsable_magasin',
  caissier: 'responsable_magasin', employe_libre_service: 'responsable_magasin', responsable_magasin: 'directeur',
  nettoyeur_chantier: 'ouvrier_batiment', ouvrier_batiment: 'chef_chantier', electricien: 'chef_chantier', plombier: 'chef_chantier',
  aide_domicile: 'aide_soignant',
  agent_accueil: 'secretaire', secretaire: 'comptable', comptable: 'directeur',
  technicien_info: 'developpeur', developpeur: 'ingenieur', ingenieur: 'directeur',
  commercial: 'cadre_commercial', cadre_commercial: 'directeur',
  legionnaire: 'sous_officier', militaire_du_rang: 'sous_officier', sous_officier: 'officier', officier: 'officier_superieur',
  gendarme: 'officier',
  musicien_bar: 'prof_musique',
};
