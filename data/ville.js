/* =====================================================================
 * GÉNÉRATION DE LA VILLE
 * ---------------------------------------------------------------------
 * À partir de la graine, le jeu choisit un nom de ville, des quartiers
 * et des lieux. Chaque lieu peut avoir une "qualité" (0.5 à 1.5) qui
 * module les actions liées (ex. une bonne bibliothèque = plus d'xp).
 *
 * `lieux` : liste des types de lieux possibles. Le générateur en tire
 * certains ; un lieu absent de la ville rend l'action correspondante
 * moins efficace (voir src/core/state.js, fonction genererVille).
 * ===================================================================== */
NF.data.ville = {
  prefixes: [NF.t('Saint'), NF.t('Port'), NF.t('Val'), NF.t('Mont'), NF.t('Villeneuve'), NF.t('Pont'), NF.t('Fort'), NF.t('Belle')],
  racines: [NF.t('Argent'), NF.t('Brume'), NF.t('Fer'), NF.t('Loire'), NF.t('Vierge'), NF.t('Cendre'), NF.t('Sel'), NF.t('Aubrac'), NF.t('Ombre'), NF.t('Rive'), NF.t('Garonne'), NF.t('Claire')],
  suffixes: [NF.t('-sur-Mer'), NF.t('-la-Neuve'), NF.t('-les-Bains'), '', '', NF.t('-en-Val'), NF.t('-le-Haut'), ''],

  quartiers: [
    NF.t('la Gare'), NF.t('les Docks'), NF.t('le Vieux-Port'), NF.t('la Zone industrielle'), NF.t('les Halles'), NF.t('le Centre'),
    NF.t('les Hauts-Clos'), NF.t('la Cité des Tilleuls'), NF.t('le Faubourg'), NF.t('la Plaine'), NF.t('Bellevue'), NF.t('les Rotondes'),
    NF.t('la Butte'), NF.t('le Marais-Neuf'), NF.t('les Quais'), NF.t('la Vallée'), NF.t('Montclair'), NF.t('les Grands-Moulins'),
  ],

  lieux: [
    { id: 'foyer', nom: NF.t('Foyer d\'hébergement d\'urgence'), icone: '🏚️', desc: NF.t('Un lit pour la nuit, quand il reste de la place.'), toujours: true },
    { id: 'bibliotheque', nom: NF.t('Bibliothèque municipale'), icone: '📚', desc: NF.t('Chaleur, livres et ordinateurs en libre accès.'), toujours: true },
    { id: 'association', nom: NF.t('Association d\'aide'), icone: '🤝', desc: NF.t('Repas, vestiaire, domiciliation et écoute.'), toujours: true },
    { id: 'mission', nom: NF.t('Mission locale'), icone: '🏢', desc: NF.t('Accompagnement vers l\'emploi pour les jeunes.') },
    { id: 'hopital', nom: NF.t('Hôpital public'), icone: '🏥', desc: NF.t('Les urgences ne refusent personne, mais l\'attente est longue.'), toujours: true },
    { id: 'marche', nom: NF.t('Marché couvert'), icone: '🥕', desc: NF.t('Invendus en fin de marché, petits boulots de manutention.') },
    { id: 'parc', nom: NF.t('Grand parc'), icone: '🌳', desc: NF.t('Un endroit calme pour dormir, l\'été.') },
    { id: 'gare', nom: NF.t('Gare centrale'), icone: '🚉', desc: NF.t('Du passage, donc de la mendicité… et des contrôles.') },
    { id: 'zone', nom: NF.t('Zone industrielle'), icone: '🏭', desc: NF.t('Ferraille à récupérer, chantiers, intérim.') },
    { id: 'piscine', nom: NF.t('Piscine municipale'), icone: '🏊', desc: NF.t('Des douches pour pas cher.') },
    { id: 'bains', nom: NF.t('Bains-douches municipaux'), icone: '🚿', desc: NF.t('Douches gratuites, horaires limités.') },
    { id: 'ressourcerie', nom: NF.t('Ressourcerie'), icone: '♻️', desc: NF.t('Matériaux et objets d\'occasion pour presque rien.') },
    { id: 'squat', nom: NF.t('Immeuble abandonné'), icone: '🏚', desc: NF.t('Un squat toléré… pour le moment.') },
    { id: 'universite', nom: NF.t('Université'), icone: '🎓', desc: NF.t('Cours du soir et bibliothèque universitaire.') },
    { id: 'pole', nom: NF.t('Agence pour l\'emploi'), icone: '📋', desc: NF.t('Offres, formations et paperasse.'), toujours: true },
    { id: 'eglise', nom: NF.t('Paroisse solidaire'), icone: '⛪', desc: NF.t('Soupe populaire certains soirs.') },
    { id: 'centre_social', nom: NF.t('Centre social'), icone: '🏘️', desc: NF.t('Ateliers, aide aux démarches, garde d\'enfants.') },
  ],

  nbLieuxTires: 7,   // nombre de lieux tirés en plus des lieux "toujours" présents
};
