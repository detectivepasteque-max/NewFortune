/* =====================================================================
 * ÉVÉNEMENTS – SANTÉ
 * ---------------------------------------------------------------------
 * Modèle à suivre pour écrire un événement (voir aussi docs/).
 *
 * NF.ajouterEvenements([ { id, famille, titre, icone, texte, poids,
 *   unique, delai, conditions, condition, choix: [ { texte, conditions,
 *   effets, resultat, aleatoire: [ { poids, effets, resultat } ] } ] } ]);
 *
 * `effets` peut être un objet déclaratif ({ sante: -5, argent: 20 … })
 * ou une fonction (s, donnees) qui retourne un tel objet.
 * ===================================================================== */
NF.ajouterEvenements([

  { id: 'grippe_hiver', famille: 'sante', icone: '🤧', titre: NF.t('Mauvaise toux'),
    texte: NF.t('Depuis quelques jours, une toux grasse vous réveille la nuit. Le froid n\'aide pas.'),
    poids: 3, delai: 8,
    conditions: { saison: ['hiver', 'automne'], expose: true, maladie: false },
    choix: [
      { texte: NF.t('Aller à la permanence d\'accès aux soins'), conditions: { lieu: 'hopital' },
        effets: { sante: -3, energie: -6, moral: 2 }, resultat: NF.t('Un sirop, des conseils, et la chaleur de la salle d\'attente.') },
      { texte: NF.t('Acheter des médicaments (12 €)'), conditions: { argentMin: 12 },
        effets: { argent: -12, sante: -2 }, resultat: NF.t('Ça calme la toux. Vous dormez un peu mieux.') },
      { texte: NF.t('Ignorer'),
        aleatoire: [
          { poids: 5, effets: { sante: -6 }, resultat: NF.t('La toux traîne pendant des semaines.') },
          { poids: 3, effets: { maladie: { nom: NF.t('Bronchite'), duree: 2, sante: 7 }, moral: -4 }, resultat: NF.t('Ça dégénère en bronchite.') },
          { poids: 2, effets: { sante: -1 }, resultat: NF.t('Finalement, ça passe tout seul.') },
        ] },
    ] },

  { id: 'dents', famille: 'sante', icone: '🦷', titre: NF.t('Rage de dents'),
    texte: NF.t('Une douleur lancinante à la mâchoire. Impossible de manger correctement.'),
    poids: 2, delai: 18,
    conditions: { jauges: { hygiene: { max: 45 } } },
    choix: [
      { texte: NF.t('Consulter un dentiste (60 €)'), conditions: { argentMin: 60 }, effets: { argent: -60, sante: 4, moral: 3 }, resultat: NF.t('Une dent soignée, la douleur disparaît.') },
      { texte: NF.t('Chercher un dentiste solidaire'), conditions: { lieu: 'association' },
        aleatoire: [
          { poids: 6, effets: { sante: 3, moral: 2, energie: -5 }, resultat: NF.t('Après trois semaines d\'attente, un dentiste bénévole vous soigne.') },
          { poids: 4, effets: { sante: -4, nourriture: -8, moral: -3 }, resultat: NF.t('Pas de rendez-vous avant des mois. Vous mangez mou et vous souffrez.') },
        ] },
      { texte: NF.t('Serrer les dents (c\'est le cas de le dire)'), effets: { sante: -5, nourriture: -10, moral: -6 }, resultat: NF.t('La douleur reste des semaines. Vous mangez moins.') },
    ] },

  { id: 'depression', famille: 'sante', icone: '🌧️', titre: NF.t('Le poids des jours'),
    texte: NF.t('Vous n\'avez plus envie de vous lever. Tout semble vain. Les journées se ressemblent.'),
    poids: function (s) { return s.joueur.jauges.moral < 25 ? 4 : 1; }, delai: 10,
    conditions: { jauges: { moral: { max: 40 } } },
    choix: [
      { texte: NF.t('En parler à quelqu\'un'), conditions: { lieu: 'association' },
        effets: { moral: 12, reputation: 1 }, resultat: NF.t('Un travailleur social vous écoute longtemps. Ce n\'est pas grand-chose, mais c\'est quelque chose.') },
      { texte: NF.t('Voir un médecin'), conditions: { lieu: 'hopital' },
        effets: { moral: 8, sante: 2, energie: -4 }, resultat: NF.t('Un traitement léger et un suivi. Petit à petit.') },
      { texte: NF.t('Me replier sur moi-même'), effets: { moral: -10, energie: 5, sante: -3 }, resultat: NF.t('Vous restez des jours sans parler à personne.') },
      { texte: NF.t('Me réfugier dans l\'alcool'), conditions: { argentMin: 10 }, effets: { argent: -10, moral: 4, sante: -6, hygiene: -8, drapeaux: { alcool: true } }, resultat: NF.t('Ça anesthésie. Un peu. Et ça coûte.') },
    ] },

  { id: 'intoxication', famille: 'sante', icone: '🤢', titre: NF.t('Intoxication alimentaire'),
    texte: NF.t('Ce que vous avez mangé hier soir n\'était vraiment plus bon.'),
    poids: 2, delai: 6,
    conditions: { logementOrdreMax: 2 },
    effets: { sante: -7, energie: -10, nourriture: -15 },
    resultat: NF.t('Deux jours de nausées. Vous ne mangerez plus jamais de poulet trouvé dans une benne.') },

  { id: 'coup_de_chaud', famille: 'sante', icone: '🥵', titre: NF.t('Canicule'),
    texte: NF.t('Le bitume fond, l\'air est irrespirable. Vous n\'avez pas d\'endroit frais où aller.'),
    poids: 2, delai: 12,
    conditions: { saison: ['ete'], expose: true },
    choix: [
      { texte: NF.t('Passer la journée à la bibliothèque'), conditions: { lieu: 'bibliotheque' }, effets: { energie: 4, xp: { lecture: 10 } }, resultat: NF.t('Climatisation et livres. Vous ressortez le soir.') },
      { texte: NF.t('Chercher de l\'ombre et de l\'eau'), effets: { sante: -3, energie: -6 }, resultat: NF.t('Une fontaine, un parc. Vous tenez le coup.') },
      { texte: NF.t('Continuer comme d\'habitude'), aleatoire: [
        { poids: 5, effets: { sante: -10, energie: -12 }, resultat: NF.t('Malaise en pleine rue. Les pompiers vous réhydratent.') },
        { poids: 5, effets: { sante: -4, energie: -6 }, resultat: NF.t('Journée pénible, mais ça passe.') },
      ] },
    ] },

  { id: 'blessure_rue', famille: 'sante', icone: '🩹', titre: NF.t('Mauvaise chute'),
    texte: NF.t('Un trottoir glissant, un escalier, une bousculade : vous tombez lourdement.'),
    poids: 1.5, delai: 10,
    conditions: { expose: true },
    choix: [
      { texte: NF.t('Aller aux urgences'), conditions: { lieu: 'hopital' }, effets: { sante: -5, energie: -8 }, resultat: NF.t('Radio, pansement, une nuit d\'observation.') },
      { texte: NF.t('Me soigner avec ma trousse'), conditions: { objet: 'trousse_soins' }, effets: { sante: -3 }, resultat: NF.t('Désinfectant et bandage. Ça tiendra.') },
      { texte: NF.t('Laisser cicatriser'), aleatoire: [
        { poids: 6, effets: { sante: -8 }, resultat: NF.t('Ça met du temps, mais ça guérit.') },
        { poids: 4, effets: { sante: -6, maladie: { nom: NF.t('Infection'), duree: 2, sante: 5 } }, resultat: NF.t('La plaie s\'infecte.') },
      ] },
    ] },

  { id: 'bilan_sante', famille: 'sante', icone: '🩺', titre: NF.t('Bilan de santé gratuit'),
    texte: NF.t('Un camion médical stationne sur la place : dépistage et bilan gratuits.'),
    poids: 1.5, delai: 18,
    conditions: { logementOrdreMax: 4 },
    choix: [
      { texte: NF.t('Y aller'), effets: { sante: 6, moral: 3, xp: { soins: 8 } }, resultat: NF.t('Vaccins à jour, tension, conseils. Vous repartez rassuré.') },
      { texte: NF.t('Pas le temps'), effets: {}, resultat: NF.t('Vous passez votre chemin.') },
    ] },

  { id: 'burnout', famille: 'sante', icone: '🫠', titre: NF.t('Épuisement'),
    texte: NF.t('Vous travaillez trop. Les mains tremblent, le sommeil ne vient plus, les erreurs s\'accumulent.'),
    poids: 3, delai: 12,
    conditions: { emploi: true, jauges: { energie: { max: 25 } } },
    choix: [
      { texte: NF.t('Demander un arrêt maladie'), conditions: { nonDeclare: false }, effets: { energie: 25, moral: 5, sante: 4 }, resultat: NF.t('Deux semaines d\'arrêt. Vous dormez enfin.') },
      { texte: NF.t('Tenir encore un peu'), aleatoire: [
        { poids: 5, effets: { sante: -8, moral: -8 }, resultat: NF.t('Vous tenez. À quel prix.') },
        { poids: 5, effets: { sante: -12, moral: -10, emploi: 'perdre', raison: 'effondrement' }, resultat: NF.t('Vous craquez en plein service. On vous remercie.') },
      ] },
    ] },

  { id: 'addiction_suite', famille: 'sante', icone: '🍺', titre: NF.t('L\'alcool prend de la place'),
    texte: NF.t('Ce qui aidait à tenir devient une habitude. Vous buvez tous les jours, maintenant.'),
    poids: 3, delai: 6,
    conditions: { drapeau: 'alcool' },
    choix: [
      { texte: NF.t('Arrêter, avec l\'aide d\'une association'), conditions: { lieu: 'association' }, aleatoire: [
        { poids: 6, effets: { moral: -5, sante: 3, drapeaux: { alcool: false } }, resultat: NF.t('Des semaines difficiles, mais vous tenez bon.') },
        { poids: 4, effets: { moral: -8 }, resultat: NF.t('Vous rechutez au bout de dix jours.') },
      ] },
      { texte: NF.t('Continuer'), effets: { argent: -40, sante: -8, hygiene: -6, reputation: -3 }, resultat: NF.t('Ça coûte cher, en argent et en santé.') },
    ] },

  { id: 'vieillesse_douleurs', famille: 'sante', icone: '🦴', titre: NF.t('Les années pèsent'),
    texte: NF.t('Le dos, les genoux, le souffle. Le corps réclame des comptes.'),
    poids: 2, delai: 12,
    conditions: { ageMin: 55 },
    choix: [
      { texte: NF.t('Suivre un traitement (100 €)'), conditions: { argentMin: 100 }, effets: { argent: -100, sante: 5, energie: 4 }, resultat: NF.t('Kiné et médicaments. Ça soulage.') },
      { texte: NF.t('Faire avec'), effets: { sante: -4, energie: -6 }, resultat: NF.t('Vous ralentissez.') },
    ] },
]);
