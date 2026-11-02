/* =====================================================================
 * ÉVÉNEMENTS – ARMÉE ET SÉCURITÉ PUBLIQUE
 * ---------------------------------------------------------------------
 * Carrière militaire (légionnaire, militaire du rang, sous-officier,
 * officier, officier supérieur, gendarme) et métiers de secours
 * (pompier, agent de sécurité) : opération extérieure et ses missions
 * (la mort y est une issue possible, voir docs/03 « Issues mortelles »),
 * blessures, permissions, fin de contrat, bizutage, décoration, stages,
 * reconversion, couple à distance, vie de caserne, recrutement à la rue,
 * saut d'entraînement, franchissement, forcené. La compétence sport
 * (principale) réduit les risques physiques et progresse en caserne.
 * Famille 'travail'. Les ids de métiers sont ceux de data/metiers.js
 * (secteur 'armee' et 'securite') ; les militaires sont logés en
 * caserne (logement 'caserne').
 *
 * Chaînes (un choix pose un drapeau et/ou programme une suite) :
 *   arm_opex          → arm_mission_*           (drapeau en_opex ; une ou deux missions mises
 *                     → arm_opex_retour          en tête de la file du mois, puis le retour, qui
 *                     → arm_retour_opex          pose parfois retour_opex ; cette suite revient
 *                                                au tirage tant que le drapeau tient)
 *   arm_bizutage      → arm_bizutage_suite      (drapeau bizutage_signale + programmer)
 *   arm_fin_contrat   → arm_reconversion        (drapeau reconversion_armee + programmer,
 *                                                données { salaire })
 *   arm_controle_rue  → arm_contact_armee_suite (drapeau contact_armee + programmer)
 * Drapeau partagé : alcool (chaîne santé, voir sante.js : addiction_suite).
 * ===================================================================== */
(function () {
  var U = NF.util;

  /** Métiers strictement militaires (hors gendarmerie) : ceux qui partent en opération */
  var MILITAIRES = ['legionnaire', 'militaire_du_rang', 'sous_officier', 'officier', 'officier_superieur'];

  /** Salaire mensuel actuel (0 sans emploi) */
  function salaire(s) { return s.joueur.emploi ? s.joueur.emploi.salaire : 0; }
  function arrondi10(v) { return Math.round(v / 10) * 10; }
  function moisEmploi(s) { return s.joueur.emploi ? s.joueur.emploi.mois : 0; }
  function metier(s) { return NF.core.metierActuel(s); }
  /** Vrai si le joueur est militaire (secteur armee, gendarmes compris) */
  function estMilitaire(s) { var m = metier(s); return !!(m && m.secteur === 'armee'); }
  function estCivil(s) { return !estMilitaire(s); }
  /** Vrai si le joueur porte l'uniforme : militaire, gendarme ou pompier */
  function enUniforme(s) { var m = metier(s); return !!(m && (m.secteur === 'armee' || m.id === 'pompier')); }
  function estPompier(s) { var m = metier(s); return !!(m && m.id === 'pompier'); }
  function estGendarme(s) { var m = metier(s); return !!(m && m.id === 'gendarme'); }
  /** Vrai si le joueur remplit les prérequis du métier `id` (et si ce métier existe) */
  function peutPrendre(s, id) { var m = U.byId(NF.data.metiers, id); return !!(m && NF.core.prerequisMetier(s, m).ok); }
  /** Embauche le joueur sur le métier `id` et retourne les effets complémentaires */
  function embauche(s, id, effetsSup) { var m = U.byId(NF.data.metiers, id); if (m) NF.core.embaucher(s, m); return effetsSup || {}; }
  /** Texte de résultat standard après une embauche */
  function texteEmbauche(s, intro) { return s.joueur.emploi ? intro + ' ' + U.euros(s.joueur.emploi.salaire) + NF.t(' net par mois.') : intro; }
  function partenaire(s) { return s.joueur.famille.partenaire; }
  function prenomP(s) { var p = partenaire(s); return p ? p.prenom : NF.t('votre partenaire'); }
  function relationP(s, delta) { var p = partenaire(s); if (p) p.relation = U.clamp(p.relation + delta, 0, 100); }
  /** Ligne de journal pour une prime */
  function journalPrime(libelle, montant) { return libelle + ' : ' + U.euros(montant) + '.'; }
  /** Poids d'une issue mortelle : base modulée par les traits et une compétence (voir NF.api.poidsMortel) */
  function mortel(base, comp) { return function (s) { return NF.api.poidsMortel(s, base, comp); }; }
  function niveau(s, comp) { return NF.core.niveauCompetence(s, comp); }
  /** Missions possibles pendant une opération extérieure (tirées au sort au départ) */
  var MISSIONS = ['arm_mission_convoi', 'arm_mission_patrouille', 'arm_mission_blesse', 'arm_mission_helico', 'arm_mission_engin', 'arm_mission_fievre'];
  /** Place des événements en tête de la file du mois, dans l'ordre donné */
  function enchainer(s, ids) {
    for (var i = ids.length - 1; i >= 0; i--) s.evenementsEnAttente.unshift({ id: ids[i], donnees: null });
  }
  /** Départ en opération : pose le drapeau en_opex, tire une ou deux missions, puis le retour.
   *  Tout se joue dans le même mois (les quatre mois sont résumés), comme avant. */
  function partirEnOpex(s, soutien) {
    var ids = soutien ? ['arm_mission_base'] : NF.rng.shuffle(MISSIONS).slice(0, NF.rng.chance(0.4) ? 2 : 1);
    enchainer(s, ids.concat(['arm_opex_retour']));
    return { energie: -5, moral: -2, drapeaux: { en_opex: true, opex_soutien: !!soutien, opex_blesse: false } };
  }

  NF.ajouterEvenements([

    /* ---------------- 1. Opération extérieure → missions → retour (→ nuits d'après) ---------------- */
    { id: 'arm_opex', famille: 'travail', icone: '🪖', titre: NF.t('Départ en opération extérieure'),
      texte: function (s) { return NF.t('Votre unité est désignée pour une opération extérieure : quatre mois loin de tout, sous un autre ciel. Le commandement cherche des volontaires. La solde est majorée, environ ') + U.euros(arrondi10(salaire(s) * 1.5)) + NF.t(' de prime au retour.') + ' ' + NF.t('Là-bas, les risques sont réels : des camarades ne sont pas rentrés.'); },
      poids: 2, delai: 14,
      conditions: { emploi: MILITAIRES, sansDrapeau: ['retour_opex', 'en_opex'] },
      choix: [
        { texte: NF.t('Me porter volontaire'),
          effets: function (s) { return partirEnOpex(s, false); },
          resultat: NF.t('Embarquement à l\'aube, le paquetage dans la soute. Quatre mois commencent, et ce qui s\'y passera ne dépendra pas que de vous.') },
        { texte: NF.t('Me porter volontaire pour un poste de soutien (logistique, transmissions)'), conditions: { competences: { technique: 2 } },
          effets: function (s) { return partirEnOpex(s, true); },
          resultat: NF.t('Base arrière : groupes électrogènes, convois, inventaires. Moins de risques, moins de prime. Mais une base arrière reste une cible.') },
        { texte: NF.t('Ne pas me porter volontaire'), effets: { moral: 1, reputation: -2 }, resultat: NF.t('D\'autres partent à votre place. Personne ne vous le reproche à voix haute.') }
      ] },

    /* ---------------- 1b. Missions en opération (tirées par arm_opex, jamais au hasard) ---------------- */
    { id: 'arm_mission_convoi', famille: 'travail', force: true, icone: '🚚', titre: NF.t('Escorte de convoi'),
      texte: NF.t('Cent vingt kilomètres de piste pour ravitailler un poste avancé. La veille, un engin a sauté sur le même itinéraire. Le chef de détachement compose le dispositif.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Ouvrir la route, en tête de convoi'),
          aleatoire: [
            { poids: 6.5, effets: { energie: -10, moral: 2, reputation: 3, xp: { conduite: 8, technique: 4 } }, resultat: NF.t('Six heures à scruter la piste, chaque remblai, chaque carcasse. Le convoi arrive entier. Le chef vous serre la main.') },
            { poids: 2, effets: { sante: -12, energie: -14, moral: -6, reputation: 2, drapeaux: { opex_blesse: true } }, resultat: NF.t('L\'engin saute sous le véhicule de tête. Le blindage tient, pas vos tympans ni vos cervicales. Une semaine à l\'antenne chirurgicale.') },
            { poids: 1, effets: { sante: -22, energie: -20, moral: -10, reputation: 3, maladie: { nom: NF.t('Blessure de guerre'), duree: 3, sante: 6 }, drapeaux: { opex_blesse: true } }, resultat: NF.t('L\'engin saute sous le véhicule de tête. Rapatriement sanitaire, deux opérations. Vous garderez des éclats dans la jambe.') },
            { poids: mortel(0.9), effets: { mort: NF.t('sur un engin explosif, en opération') }, resultat: NF.t('L\'engin saute sous le véhicule de tête. Votre nom sera gravé sur un monument, dans une ville que vous ne connaissiez pas.') }
          ] },
        { texte: NF.t('Rester au milieu du dispositif'),
          aleatoire: [
            { poids: 8, effets: { energie: -8, moral: 1, reputation: 1, xp: { conduite: 4 } }, resultat: NF.t('Le convoi avance au pas, s\'arrête, repart. Le poste est ravitaillé à la nuit. Rien à signaler, pour vous.') },
            { poids: 1.5, effets: { sante: -10, energie: -12, moral: -5, drapeaux: { opex_blesse: true } }, resultat: NF.t('Le véhicule de tête saute. Le vôtre percute l\'arrière du blindé en freinant. Côtes fêlées, et les images du premier véhicule.') },
            { poids: mortel(0.35), effets: { mort: NF.t('sur un engin explosif, en opération') }, resultat: NF.t('Le deuxième engin était pour le milieu du convoi.') }
          ] },
        { texte: NF.t('Faire reconnaître l\'itinéraire avant de partir'), conditions: { competences: { technique: 2 } },
          aleatoire: [
            { poids: 9, effets: { energie: -12, moral: 2, reputation: 2, xp: { technique: 8, gestion: 4 } }, resultat: NF.t('Deux heures de retard, un engin trouvé et neutralisé par les démineurs à vingt kilomètres. Le convoi passe. Personne ne dira que vous avez perdu du temps.') },
            { poids: 1, effets: { sante: -8, energie: -14, moral: -3, drapeaux: { opex_blesse: true } }, resultat: NF.t('La reconnaissance en trouve un ; il y en avait deux. Le second fait des dégâts, moins qu\'il aurait pu.') },
            { poids: mortel(0.2), effets: { mort: NF.t('sur un engin explosif, en opération') }, resultat: NF.t('La reconnaissance en trouve un ; il y en avait deux.') }
          ] }
      ] },

    { id: 'arm_mission_patrouille', famille: 'travail', force: true, icone: '🌒', titre: NF.t('Patrouille de nuit'),
      texte: NF.t('Patrouille à pied dans un village que la carte dit vide. À la sortie, les premières rafales partent des murets. La section se couche. La radio crache des ordres.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Me mettre à couvert et demander l\'appui'),
          aleatoire: [
            { poids: 8, effets: { energie: -10, moral: -2, reputation: 1, xp: { technique: 4 } }, resultat: NF.t('Vingt minutes derrière un muret, à compter les coups. L\'appui arrive, les tirs cessent. Tout le monde rentre.') },
            { poids: 1.5, effets: { sante: -12, energie: -12, moral: -6, drapeaux: { opex_blesse: true } }, resultat: NF.t('Un éclat de muret dans l\'épaule avant que l\'appui n\'arrive. Rien de grave, dit l\'infirmier. Ça ne fait pas cet effet-là.') },
            { poids: mortel(0.3), effets: { mort: NF.t('sous le feu, en patrouille') }, resultat: NF.t('Le muret ne couvre pas tout.') }
          ] },
        { texte: NF.t('Riposter et manœuvrer avec le groupe'),
          aleatoire: [
            { poids: 6, effets: { energie: -14, moral: 3, reputation: 4, xp: { sport: 6, technique: 4 } }, resultat: NF.t('Vous débordez par la droite, les tireurs décrochent. La section rentre entière. Le chef de section vous cite au rapport.') },
            { poids: 2.5, effets: { sante: -16, energie: -16, moral: -6, reputation: 3, drapeaux: { opex_blesse: true } }, resultat: NF.t('Une balle dans la cuisse pendant le bond. Le garrot, l\'évacuation, l\'hôpital de campagne. Vous rentrez en boitant, avec une citation.') },
            { poids: 1, effets: { sante: -24, energie: -20, moral: -10, reputation: 4, maladie: { nom: NF.t('Blessure de guerre'), duree: 3, sante: 6 }, drapeaux: { opex_blesse: true } }, resultat: NF.t('Touché au ventre. Rapatriement, trois opérations. Vous rentrez bien avant les autres, et pas entier.') },
            { poids: mortel(0.9, 'sport'), effets: { mort: NF.t('sous le feu, en patrouille') }, resultat: NF.t('Le bond suivant est trop long. La section vous ramène, mais pas vivant.') }
          ] },
        { texte: NF.t('Couvrir le repli de la section'),
          aleatoire: [
            { poids: 5.5, effets: { energie: -16, moral: 4, reputation: 6, xp: { technique: 6 } }, resultat: NF.t('Vous tenez le muret pendant que les autres décrochent. Le dernier chargeur vidé, vous courez. Citation à l\'ordre de la brigade.') },
            { poids: 3, effets: { sante: -18, energie: -18, moral: -6, reputation: 5, drapeaux: { opex_blesse: true } }, resultat: NF.t('Vous tenez, trop longtemps. Touché à l\'épaule en courant rejoindre les autres. Ils vous portent sur le dernier kilomètre.') },
            { poids: mortel(1.4, 'sport'), effets: { mort: NF.t('en couvrant le repli de sa section') }, resultat: NF.t('Vous tenez. Les autres rentrent. Le muret, lui, n\'a tenu que le temps qu\'il fallait.') }
          ] }
      ] },

    { id: 'arm_mission_blesse', famille: 'travail', force: true, icone: '🩸', titre: NF.t('Camarade à terre'),
      texte: NF.t('Un tir isolé, et un camarade s\'effondre à trente mètres, en terrain découvert. Il bouge encore. Le tireur, lui, attend que quelqu\'un aille le chercher.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Aller le chercher, maintenant'),
          aleatoire: [
            { poids: function (s) { return 5.5 + niveau(s, 'soins'); }, effets: { energie: -16, moral: 5, reputation: 6, xp: { soins: 12, sport: 6 } }, resultat: NF.t('Trente mètres aller, trente retour en le traînant par le gilet. Le garrot, l\'évacuation. Il vivra, et il le sait.') },
            { poids: 2.5, effets: { sante: -18, energie: -18, moral: -4, reputation: 5, drapeaux: { opex_blesse: true } }, resultat: NF.t('Vous le ramenez, touché vous-même au passage. Deux civières côte à côte dans l\'hélicoptère.') },
            { poids: mortel(1.3, 'sport'), effets: { mort: NF.t('en allant chercher un camarade blessé') }, resultat: NF.t('Le tireur attendait ça. Vous tombez à dix mètres de lui.') }
          ] },
        { texte: NF.t('Attendre le binôme d\'extraction, sous couverture'),
          aleatoire: [
            { poids: 7, effets: { energie: -10, moral: -4, reputation: 1, xp: { technique: 4 } }, resultat: NF.t('Le groupe fixe le tireur, le binôme va le chercher sous fumigène. Il perd une jambe. Il vivra.') },
            { poids: 3, effets: { energie: -10, moral: -12 }, resultat: NF.t('Le binôme arrive trop tard. Vous l\'avez regardé bouger, puis arrêter de bouger.') },
            { poids: mortel(0.25), effets: { mort: NF.t('sous le feu, en opération') }, resultat: NF.t('Le tireur n\'attendait pas que lui.') }
          ] },
        { texte: NF.t('Guider l\'extraction par radio depuis le couvert'), conditions: { competences: { gestion: 1 } },
          aleatoire: [
            { poids: 9, effets: { energie: -10, moral: 2, reputation: 3, xp: { gestion: 8, technique: 4 } }, resultat: NF.t('Fumigène, appui, binôme : vous coordonnez tout depuis le muret. Il est récupéré en quatre minutes, vivant.') },
            { poids: 1, effets: { sante: -10, energie: -12, moral: -6, drapeaux: { opex_blesse: true } }, resultat: NF.t('Le tireur change de position. Un éclat vous trouve derrière le muret pendant que vous parlez à la radio.') },
            { poids: mortel(0.15), effets: { mort: NF.t('sous le feu, en opération') }, resultat: NF.t('Le tireur change de position.') }
          ] }
      ] },

    { id: 'arm_mission_helico', famille: 'travail', force: true, icone: '🚁', titre: NF.t('Relève de nuit'),
      texte: NF.t('Relève d\'un poste isolé, à cent cinquante kilomètres. Deux moyens : l\'hélicoptère, qui décolle à deux heures du matin, ou le convoi routier, douze heures de piste. On vous laisse choisir, pour une fois.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Monter dans l\'hélicoptère'),
          aleatoire: [
            { poids: 9, effets: { energie: -6, moral: 2, xp: { technique: 3 } }, resultat: NF.t('Quarante minutes de vol, les portes ouvertes, le désert sous la lune. Posé en douceur. Vous ne l\'oublierez pas.') },
            { poids: 1.2, effets: { sante: -14, energie: -12, moral: -6, drapeaux: { opex_blesse: true } }, resultat: NF.t('Atterrissage dur dans la poussière, l\'appareil qui bascule. Trois blessés, dont vous. L\'hélicoptère ne revolera pas.') },
            { poids: mortel(0.45), effets: { mort: NF.t('dans un accident d\'hélicoptère, en opération') }, resultat: NF.t('L\'appareil accroche une crête dans le noir. Il n\'y a pas de survivant.') }
          ] },
        { texte: NF.t('Partir avec le convoi routier'),
          aleatoire: [
            { poids: 8.5, effets: { energie: -14, moral: -2, xp: { conduite: 6 } }, resultat: NF.t('Douze heures de piste, de poussière et de crampes. Le poste est relevé à la nuit tombée. Vous avez mal partout, mais tout est entier.') },
            { poids: 1.5, effets: { sante: -12, energie: -16, moral: -5, drapeaux: { opex_blesse: true } }, resultat: NF.t('Le véhicule verse dans un oued. Le blindé est sur le toit, et vous avez l\'épaule démise.') },
            { poids: mortel(0.35), effets: { mort: NF.t('dans un accident de véhicule, en opération') }, resultat: NF.t('Le véhicule verse dans un oued. Le blindé est sur le toit, et vous dessous.') }
          ] }
      ] },

    { id: 'arm_mission_engin', famille: 'travail', force: true, icone: '💣', titre: NF.t('Engin suspect'),
      texte: NF.t('Un sac abandonné au bord de la piste, des fils qui dépassent, et une colonne de véhicules arrêtée derrière. Les démineurs sont à deux heures. Le chef de détachement vous regarde.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Baliser la zone et attendre les démineurs'),
          effets: { energie: -10, moral: -2, reputation: 1, xp: { technique: 4 } },
          resultat: NF.t('Deux heures à plat ventre dans la poussière, à surveiller les abords. Les démineurs font sauter l\'engin sur place. La colonne repart.') },
        { texte: NF.t('Neutraliser l\'engin moi-même'), conditions: { competences: { technique: 1 } },
          aleatoire: [
            { poids: function (s) { return 5 + 1.5 * niveau(s, 'technique'); }, effets: { energie: -14, moral: 4, reputation: 6, xp: { technique: 12 } }, resultat: NF.t('Le fil coupé, le détonateur dans la main, la colonne qui redémarre. Les démineurs, en arrivant, vous passent un savon. Le chef, lui, vous propose pour une citation.') },
            { poids: 2, effets: { sante: -20, energie: -18, moral: -8, reputation: 3, maladie: { nom: NF.t('Blessure de guerre'), duree: 3, sante: 6 }, drapeaux: { opex_blesse: true } }, resultat: NF.t('Une charge secondaire, plus petite. Vous gardez vos mains, pas tous vos doigts.') },
            { poids: mortel(1.3, 'technique'), effets: { mort: NF.t('en neutralisant un engin explosif') }, resultat: NF.t('Une charge secondaire. On ne retrouve pas grand-chose.') }
          ] }
      ] },

    { id: 'arm_mission_fievre', famille: 'travail', force: true, icone: '🦟', titre: NF.t('La fièvre'),
      texte: NF.t('Troisième semaine sur la base avancée. Frissons le soir, quarante de fièvre la nuit, des courbatures qui vous plient en deux. Le médecin d\'unité est à deux cents kilomètres, et le mandat n\'est pas fini.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Demander l\'évacuation vers l\'antenne médicale'),
          effets: { sante: -8, energie: -14, moral: -4, reputation: -1, xp: { soins: 6 } },
          resultat: NF.t('Paludisme. Perfusions, dix jours sous moustiquaire à l\'antenne médicale, puis retour sur la base. Le chef note que vous avez manqué, sans en faire une histoire.') },
        { texte: NF.t('Tenir jusqu\'à la fin du mandat'),
          aleatoire: [
            { poids: 5, effets: { sante: -14, energie: -18, moral: -6, reputation: 2, drapeaux: { opex_blesse: true } }, resultat: NF.t('Vous tenez, à coups de cachets et de nuits sans sommeil. Les autres couvrent vos gardes. Vous rentrez avec dix kilos de moins.') },
            { poids: 3, effets: { sante: -22, energie: -20, moral: -10, maladie: { nom: NF.t('Paludisme'), duree: 3, sante: 6 }, drapeaux: { opex_blesse: true } }, resultat: NF.t('Vous vous effondrez pendant une garde. Évacuation d\'urgence, et un paludisme qui reviendra pendant des mois.') },
            { poids: mortel(0.6, 'soins'), effets: { mort: NF.t('d\'une fièvre contractée en opération') }, resultat: NF.t('Vous vous effondrez pendant une garde. L\'hélicoptère sanitaire arrive au matin.') }
          ] }
      ] },

    { id: 'arm_mission_base', famille: 'travail', force: true, icone: '🏕️', titre: NF.t('Alerte sur la base'),
      texte: NF.t('Deux heures du matin, la sirène. Des roquettes tombent sur la base arrière, une sur le parc à véhicules, une près des conteneurs d\'habitation. Des cris du côté des transmissions.'),
      delai: 1, conditions: { drapeau: 'en_opex' },
      choix: [
        { texte: NF.t('Rejoindre l\'abri bétonné'),
          aleatoire: [
            { poids: 9, effets: { energie: -8, moral: -4, xp: { technique: 2 } }, resultat: NF.t('Une heure dans l\'abri, casque sur la tête, à compter les impacts. Fin d\'alerte. Deux blessés légers, aucun chez vous.') },
            { poids: 1, effets: { sante: -10, energie: -12, moral: -6, drapeaux: { opex_blesse: true } }, resultat: NF.t('Une roquette tombe à vingt mètres pendant que vous courez vers l\'abri. Éclats dans le dos, rien de vital.') },
            { poids: mortel(0.15), effets: { mort: NF.t('lors d\'une attaque de la base, en opération') }, resultat: NF.t('Une roquette tombe à cinq mètres pendant que vous courez vers l\'abri.') }
          ] },
        { texte: NF.t('Aller aider du côté des cris'),
          aleatoire: [
            { poids: function (s) { return 6 + niveau(s, 'soins'); }, effets: { energie: -14, moral: 3, reputation: 5, xp: { soins: 12 } }, resultat: NF.t('Deux blessés sous un conteneur éventré. Garrot, pansement, brancard, jusqu\'au poste de secours. Ils s\'en sortent, et le médecin vous garde pour la nuit.') },
            { poids: 2, effets: { sante: -14, energie: -16, moral: -6, reputation: 3, drapeaux: { opex_blesse: true } }, resultat: NF.t('La deuxième salve tombe pendant que vous portez le brancard. Éclats dans les jambes. Vous finissez à côté de ceux que vous portiez.') },
            { poids: mortel(0.5, 'soins'), effets: { mort: NF.t('lors d\'une attaque de la base, en opération') }, resultat: NF.t('La deuxième salve tombe pendant que vous portez le brancard.') }
          ] }
      ] },

    { id: 'arm_opex_retour', famille: 'travail', force: true, icone: '✈️', titre: NF.t('Retour d\'opération'),
      texte: function (s) { return NF.t('Fin de mandat. L\'avion se pose à l\'aube, la prime est virée dans le mois, et la caserne a l\'air plus petite qu\'avant. ') + (s.joueur.drapeaux.opex_blesse ? NF.t('Vous rentrez avec des cicatrices, et des images qui ne partiront pas tout de suite.') : NF.t('Vous rentrez entier, avec des images qui ne partiront pas tout de suite.')); },
      delai: 1, conditions: { drapeau: 'en_opex' },
      effets: function (s) {
        var soutien = !!s.joueur.drapeaux.opex_soutien, blesse = !!s.joueur.drapeaux.opex_blesse;
        var p = arrondi10(salaire(s) * (soutien ? 1 : 1.5));
        s.stats.opex = (s.stats.opex || 0) + 1;
        var e = { argent: p, energie: -10, moral: blesse ? -6 : -2, reputation: soutien ? 2 : 4,
                  xp: soutien ? { technique: 12, gestion: 6 } : { technique: 10, soins: 5 },
                  drapeaux: { en_opex: false, opex_soutien: false, opex_blesse: false },
                  journal: journalPrime(NF.t('Prime d\'opération'), p) };
        if (NF.rng.chance(blesse ? 0.8 : soutien ? 0.2 : 0.5)) e.drapeaux.retour_opex = true;
        return e;
      },
      resultat: NF.t('La prime sur le compte, le paquetage au pied du lit, et quatre mois à raconter à ceux qui n\'étaient pas là.') },

    { id: 'arm_retour_opex', famille: 'travail', icone: '🌙', titre: NF.t('Les nuits d\'après'),
      texte: function (s) { return NF.t('Depuis le retour d\'opération, vous dormez mal. Les mêmes images reviennent la nuit, une porte qui claque vous fait sursauter') + (partenaire(s) ? ', ' + prenomP(s) + NF.t(' ne sait plus comment vous parler') : '') + '. ' + (estMilitaire(s) ? NF.t('À la caserne, personne n\'en parle.') : NF.t('Vous avez quitté l\'uniforme, pas les images.')); },
      poids: 4, delai: 3,
      conditions: { drapeau: 'retour_opex' },
      choix: [
        { texte: function (s) { return estMilitaire(s) ? NF.t('Consulter le service de santé des armées') : NF.t('Consulter un psychologue en ville (60 €)'); },
          condition: function (s) { return estMilitaire(s) || s.joueur.argent >= 60; },
          effets: function (s) { return { argent: estMilitaire(s) ? 0 : -60, moral: 6, sante: 2, energie: 4, xp: { soins: 4 }, drapeaux: { retour_opex: false } }; },
          resultat: NF.t('Un médecin, puis un psychologue. Des mots sur ce qui s\'est passé. Les nuits redeviennent des nuits, lentement.') },
        { texte: function (s) { return NF.t('En parler à ') + prenomP(s); }, conditions: { partenaire: true },
          aleatoire: [
            { poids: 5, effets: function (s) { relationP(s, 6); return { moral: 5, drapeaux: { retour_opex: false } }; }, resultat: function (s) { return prenomP(s) + NF.t(' écoute, longtemps, sans rien dire. Quelque chose se desserre.'); } },
            { poids: 5, effets: function (s) { relationP(s, 3); return { moral: 2 }; }, resultat: NF.t('Ça fait du bien de le dire. Ça ne suffit pas encore.') }
          ] },
        { texte: NF.t('Boire pour dormir'), conditions: { argentMin: 30 },
          effets: { argent: -30, moral: 2, sante: -5, hygiene: -5, energie: 2, drapeaux: { alcool: true } },
          resultat: NF.t('Deux ou trois verres le soir, puis quatre. Vous dormez, d\'un sommeil qui ne repose pas.') },
        { texte: NF.t('Tenir, ça passera'),
          aleatoire: [
            { poids: 4, effets: { moral: -4, energie: -5, drapeaux: { retour_opex: false } }, resultat: NF.t('Les semaines passent. Les images s\'espacent, puis s\'effacent presque.') },
            { poids: 6, effets: { moral: -10, sante: -4, energie: -8 }, resultat: NF.t('Ça ne passe pas. Vous vous emportez pour rien, vous évitez les autres.') }
          ] }
      ] },

    /* ---------------- 2. Blessure à l'entraînement ---------------- */
    { id: 'arm_blessure_entrainement', famille: 'travail', icone: '🩹', titre: NF.t('Blessé à l\'entraînement'),
      texte: function (s) { return (estPompier(s) ? NF.t('Exercice d\'évacuation sur la tour de manœuvre : ') : NF.t('Parcours du combattant sous la pluie, sac de vingt kilos : ')) + NF.t('une mauvaise réception, la cheville qui tourne. La douleur monte dans la jambe.'); },
      poids: 2, delai: 10,
      conditions: { emploi: true },
      condition: enUniforme,
      choix: [
        { texte: NF.t('Passer à l\'infirmerie'), effets: { sante: -7, energie: -8, moral: -2, xp: { soins: 4 } }, resultat: NF.t('Strapping, anti-inflammatoires, dix jours d\'exemption de sport. Le médecin note tout dans votre livret.') },
        { texte: NF.t('Serrer les dents pour ne pas rater la qualification'),
          aleatoire: [
            { poids: function (s) { return 5 + 1.5 * niveau(s, 'sport'); }, effets: { sante: -6, energie: -10, reputation: 2, xp: { technique: 4, sport: 4 } }, resultat: NF.t('Vous finissez l\'exercice en boitant. Le chef de section a vu, et a apprécié.') },
            { poids: 5, effets: { sante: -14, energie: -12, moral: -4, maladie: { nom: NF.t('Entorse mal soignée'), duree: 2, sante: 4 } }, resultat: NF.t('L\'entorse devient une déchirure. Six semaines d\'arrêt, et la qualification est repoussée de toute façon.') }
          ] },
        { texte: NF.t('Me soigner avec ma trousse'), conditions: { objet: 'trousse_soins' }, effets: { sante: -4, energie: -6 }, resultat: NF.t('Bande, glace, repos le soir. Ça tient.') }
      ] },

    /* ---------------- 3. Permission ---------------- */
    { id: 'arm_permission', famille: 'travail', icone: '🎒', titre: NF.t('Permission'),
      texte: function (s) { return NF.t('Dix jours de permission accordés. Le paquetage reste au pied du lit ; dehors, la vie civile continue sans vous') + (partenaire(s) ? NF.t(', et ') + prenomP(s) + NF.t(' attend des nouvelles') : '') + '.'; },
      poids: 2.5, delai: 8,
      conditions: { secteur: 'armee' },
      choix: [
        { texte: function (s) { return NF.t('Rentrer auprès de ') + prenomP(s); }, conditions: { partenaire: true },
          effets: function (s) { relationP(s, 8); return { moral: 10, energie: 6, argent: -60 }; },
          resultat: function (s) { return NF.t('Dix jours à deux, sans réveil à six heures. ') + prenomP(s) + NF.t(' vous retrouve, un peu.'); } },
        { texte: NF.t('Partir quelques jours, seul'), effets: { moral: 8, energie: 10, argent: -90 }, resultat: NF.t('Un train, une ville au hasard, des journées sans ordre. Vous revenez reposé.') },
        { texte: NF.t('Sortir avec la section'), effets: { moral: 9, energie: -5, argent: -120, hygiene: -6, reputation: 1 }, resultat: NF.t('Trois nuits dehors avec les camarades. Le portefeuille s\'en souvient, le groupe aussi.') },
        { texte: NF.t('Rester au quartier et économiser'), effets: { moral: 2, energie: 10, hygiene: 6 }, resultat: NF.t('La caserne à moitié vide, le calme. Vous dormez, vous lavez tout, vous ne dépensez rien.') }
      ] },

    /* ---------------- 4. Fin de contrat → reconversion ---------------- */
    { id: 'arm_fin_contrat', famille: 'travail', icone: '📄', titre: NF.t('Fin de contrat'),
      texte: function (s) { return NF.t('Votre contrat d\'engagement arrive à son terme après ') + Math.floor(moisEmploi(s) / 12) + NF.t(' ans de service. Le bureau du personnel vous reçoit : rengager, ou rendre le paquetage avec une prime de fin de contrat d\'environ ') + U.euros(arrondi10(salaire(s) * 2)) + NF.t('. Sans l\'armée, plus de chambre en caserne non plus.'); },
      poids: 2, delai: 24,
      conditions: { secteur: 'armee' },
      condition: function (s) { return !!s.joueur.emploi && s.joueur.emploi.mois >= 24; },
      choix: [
        { texte: NF.t('Rengager pour trois ans'),
          effets: function (s) { var p = arrondi10(salaire(s) * 0.5); return { argent: p, moral: 3, reputation: 2, journal: journalPrime(NF.t('Prime de rengagement'), p) }; },
          resultat: NF.t('Une signature, une prime de rengagement, et trois ans de plus. La vie continue au rythme du quartier.') },
        { texte: NF.t('Quitter l\'armée avec la prime de fin de contrat'),
          effets: function (s) { var p = arrondi10(salaire(s) * 2); return { argent: p, moral: -3, energie: 5, emploi: 'perdre', raison: NF.t('fin de contrat'), journal: journalPrime(NF.t('Prime de fin de contrat'), p) }; },
          resultat: NF.t('Vous rendez le paquetage, la carte, la chambre. Dehors, avec une prime et des habitudes qui ne servent plus à rien.') },
        { texte: NF.t('Quitter avec un accompagnement à la reconversion'),
          effets: function (s) { var sal = salaire(s); var p = arrondi10(sal * 1.5); return { argent: p, moral: -2, emploi: 'perdre', raison: NF.t('fin de contrat'), drapeaux: { reconversion_armee: true }, programmer: { evenement: 'arm_reconversion', dans: 1, donnees: { salaire: sal } }, journal: journalPrime(NF.t('Prime de fin de contrat'), p) }; },
          resultat: NF.t('Une partie de la prime finance l\'accompagnement, et un rendez-vous est fixé avec le service de reconversion. Vous quittez le quartier avec un dossier sous le bras.') }
      ] },

    { id: 'arm_reconversion', famille: 'travail', force: true, icone: '🧭', titre: NF.t('Service de reconversion'),
      texte: function (s, d) { var sal = d && d.salaire ? d.salaire : 1400; return NF.t('Le conseiller du service de reconversion des armées ouvre votre dossier : années de service, qualifications, souhaits. Il propose une formation financée de deux mois, ou un pécule de ') + U.euros(arrondi10(sal)) + NF.t(' pour vous installer.'); },
      poids: 1, delai: 1,
      conditions: { drapeau: 'reconversion_armee' },
      choix: [
        { texte: NF.t('Formation en gestion et management'), conditions: { formation: false },
          effets: { xp: { gestion: 45, administratif: 12 }, energie: -10, moral: 5, drapeaux: { reconversion_armee: false } },
          resultat: NF.t('Deux mois de comptabilité, de droit du travail et de conduite d\'équipe. Vous saviez commander ; vous apprenez à gérer.') },
        { texte: NF.t('Formation technique (maintenance, logistique)'), conditions: { formation: false },
          effets: { xp: { technique: 45, bricolage: 12 }, energie: -10, moral: 5, drapeaux: { reconversion_armee: false } },
          resultat: NF.t('Deux mois en atelier et en entrepôt. Les habilitations civiles s\'ajoutent aux qualifications militaires.') },
        { texte: NF.t('Prendre le pécule'),
          effets: function (s, d) { var p = arrondi10(d && d.salaire ? d.salaire : 1400); return { argent: p, moral: 2, drapeaux: { reconversion_armee: false }, journal: journalPrime(NF.t('Pécule de reconversion'), p) }; },
          resultat: NF.t('L\'argent sur le compte, et la liberté de ne rien demander à personne.') },
        { texte: NF.t('Ne pas donner suite'), effets: { drapeaux: { reconversion_armee: false }, moral: -2 }, resultat: NF.t('Vous ne retournez pas au rendez-vous suivant.') }
      ] },

    /* ---------------- 5. Bizutage → enquête de commandement ---------------- */
    { id: 'arm_bizutage', famille: 'travail', icone: '😶', titre: NF.t('La chambrée s\'acharne'),
      texte: NF.t('Depuis des semaines, les anciens de la chambrée vous prennent pour cible : corvées en double, paquetage retourné, « traditions » en pleine nuit, et le caporal qui regarde ailleurs. Ce n\'est pas de la cohésion.'),
      poids: 2, delai: 14,
      conditions: { secteur: 'armee', emploiNiveauMax: 2, sansDrapeau: 'bizutage_signale' },
      choix: [
        { texte: NF.t('Signaler les faits au commandement'),
          effets: { moral: 2, drapeaux: { bizutage_signale: true }, programmer: { evenement: 'arm_bizutage_suite', dans: 2 } },
          resultat: NF.t('Le chef de section prend votre témoignage par écrit. Une enquête de commandement est ouverte ; en attendant, la chambrée vous ignore.') },
        { texte: NF.t('Encaisser sans rien dire'), effets: { moral: -10, sante: -4, energie: -6 }, resultat: NF.t('Vous tenez. Ça use de l\'intérieur, et ça ne s\'arrête pas pour autant.') },
        { texte: NF.t('Répondre, à ma façon'),
          aleatoire: [
            { poids: 5, effets: { moral: 6, reputation: 2, sante: -3 }, resultat: NF.t('Une explication derrière le bâtiment des sports. Ça s\'arrête là, et on vous laisse tranquille.') },
            { poids: 4, effets: { moral: -5, sante: -8, energie: -8, reputation: -3 }, resultat: NF.t('Bagarre dans la chambrée. Quinze jours d\'arrêts pour tout le monde, et vous voilà catalogué.') },
            { poids: 1, effets: { moral: -12, emploi: 'perdre', raison: NF.t('faute disciplinaire') }, resultat: NF.t('Un ancien finit à l\'infirmerie. Conseil de discipline, résiliation du contrat. Vous rendez le paquetage le soir même.') }
          ] }
      ] },

    { id: 'arm_bizutage_suite', famille: 'travail', force: true, icone: '📂', titre: NF.t('Enquête de commandement'),
      texte: function (s) { return estMilitaire(s) ? NF.t('L\'enquête de commandement rend ses conclusions. Le capitaine vous convoque, porte fermée.') : NF.t('L\'enquête de commandement rend ses conclusions… mais vous avez quitté l\'armée entre-temps.'); },
      poids: 1, delai: 1,
      conditions: { drapeau: 'bizutage_signale' },
      choix: [
        { texte: NF.t('Maintenir mon témoignage'), condition: estMilitaire, cache: true,
          aleatoire: [
            { poids: 6, effets: { moral: 8, reputation: 2, drapeaux: { bizutage_signale: false } }, resultat: NF.t('Deux anciens sont sanctionnés et mutés. Le caporal change de ton. Le quartier redevient vivable.') },
            { poids: 4, effets: { moral: -6, reputation: -2, drapeaux: { bizutage_signale: false } }, resultat: NF.t('« Des traditions mal comprises. » Un rappel au règlement, rien de plus. Et la section sait qui a parlé.') }
          ] },
        { texte: NF.t('Demander une mutation dans une autre unité'), condition: estMilitaire, cache: true,
          effets: { moral: 4, energie: -6, drapeaux: { bizutage_signale: false } },
          resultat: NF.t('Le capitaine préfère ça aussi. Nouvelle compagnie, nouveaux visages, et un dossier qui vous suit.') },
        { texte: NF.t('Retirer ma plainte'), condition: estMilitaire, cache: true,
          effets: { moral: -5, drapeaux: { bizutage_signale: false } },
          resultat: NF.t('Vous dites que c\'était un malentendu. On vous laisse tranquille, cette fois.') },
        { texte: NF.t('Tourner la page'), condition: estCivil, cache: true,
          effets: { moral: 1, drapeaux: { bizutage_signale: false } },
          resultat: NF.t('Ce n\'est plus votre affaire.') }
      ] },

    /* ---------------- 6. Décoration (rare) ---------------- */
    { id: 'arm_decoration', famille: 'travail', icone: '🎖️', titre: NF.t('Citation à l\'ordre'),
      texte: function (s) {
        var quoi = estPompier(s) ? NF.t('une médaille pour acte de courage et de dévouement') : estGendarme(s) ? NF.t('une lettre de félicitations du commandant de groupement') : NF.t('une citation à l\'ordre du régiment');
        return NF.t('Le courrier arrive par la voie hiérarchique : votre conduite vaut ') + quoi + NF.t('. Remise officielle le mois prochain, sur la place d\'armes.');
      },
      poids: 0.6, delai: 30,
      conditions: { emploi: true },
      condition: function (s) { return enUniforme(s) && moisEmploi(s) >= 12; },
      choix: [
        { texte: NF.t('Recevoir la décoration devant les troupes'), effets: { reputation: 6, moral: 10 }, resultat: NF.t('Garde-à-vous, sonnerie, la médaille épinglée. Vous ne saviez pas que ça vous ferait cet effet.') },
        { texte: function (s) { return NF.t('Inviter ') + prenomP(s) + NF.t(' à la cérémonie'); }, conditions: { partenaire: true },
          effets: function (s) { relationP(s, 6); return { reputation: 6, moral: 12, argent: -40 }; },
          resultat: function (s) { return prenomP(s) + NF.t(' est au premier rang, en civil au milieu des uniformes. Vous dînez en ville ensuite.'); } },
        { texte: NF.t('Minimiser, je n\'ai fait que mon travail'), effets: { reputation: 3, moral: 4 }, resultat: NF.t('Vous recevez la médaille sans un mot de plus. Elle finit dans un tiroir, mais elle est là.') }
      ] },

    /* ---------------- 7. Stage de qualification ---------------- */
    { id: 'arm_formation_qualifiante', famille: 'travail', icone: '🎓', titre: NF.t('Stage de qualification'),
      texte: NF.t('Le bureau instruction ouvre des places en stage pour le prochain trimestre : secourisme au combat, permis militaire poids lourd et tout-terrain, maintenance et transmissions, ou moniteur d\'entraînement physique. Trois semaines, solde maintenue, journées longues.'),
      poids: 2, delai: 12,
      conditions: { secteur: 'armee', formation: false },
      choix: [
        { texte: NF.t('Secourisme au combat'), effets: { xp: { soins: 40 }, energie: -8, moral: 3 }, resultat: NF.t('Garrots, perfusions, évacuations sous pression. Vous repartez avec un brevet et des gestes qui ne s\'oublient pas.') },
        { texte: NF.t('Permis militaire (poids lourd, tout-terrain)'), effets: { xp: { conduite: 55 }, energie: -8, moral: 3 }, resultat: NF.t('Camions, pistes boueuses, conduite de nuit sans phares. Le brevet militaire se convertit en permis civil.') },
        { texte: NF.t('Maintenance et transmissions'), effets: { xp: { technique: 40, informatique: 8 }, energie: -8, moral: 3 }, resultat: NF.t('Moteurs, radios, câblages. Trois semaines d\'atelier et une qualification qui vaut aussi dehors.') },
        { texte: NF.t('Moniteur d\'entraînement physique'), effets: { xp: { sport: 40, soins: 6 }, energie: -10, moral: 3 }, resultat: NF.t('Trois semaines de parcours, de natation et de pédagogie. Vous repartez avec un brevet, et des recrues à faire courir.') },
        { texte: NF.t('Pas cette fois'), effets: { energie: 4 }, resultat: NF.t('Vous restez à l\'unité. Les places partent à d\'autres.') }
      ] },

    /* ---------------- 9. Éloignement et couple ---------------- */
    { id: 'arm_eloignement_couple', famille: 'travail', icone: '📞', titre: NF.t('Loin de la maison'),
      texte: function (s) { return NF.t('Manœuvres, gardes, semaines de terrain : vous voyez ') + prenomP(s) + NF.t(' deux jours par mois, quand tout va bien. Au téléphone, les silences s\'allongent. « Tu es où, en fait, dans cette vie ? »'); },
      poids: 2.5, delai: 8,
      conditions: { secteur: 'armee', partenaire: true },
      choix: [
        { texte: NF.t('Demander une mutation pour me rapprocher'),
          aleatoire: [
            { poids: 5, effets: function (s) { relationP(s, 10); return { moral: 5, reputation: -1 }; }, resultat: NF.t('Mutation accordée pour rapprochement de conjoint. Un autre régiment, mais la maison à vingt minutes.') },
            { poids: 5, effets: function (s) { relationP(s, -4); return { moral: -4 }; }, resultat: NF.t('« Pas de poste disponible avant deux ans. » Vous rentrez l\'annoncer, et la soirée est longue.') }
          ] },
        { texte: NF.t('Obtenir un logement familial au quartier'), conditions: { emploiNiveauMin: 3 },
          effets: function (s) { relationP(s, 8); return { moral: 4, argent: -150, energie: -4 }; },
          resultat: function (s) { return NF.t('Un appartement dans l\'enceinte, réservé aux cadres. ') + prenomP(s) + NF.t(' déménage à contrecœur, mais vous dormez enfin sous le même toit.'); } },
        { texte: NF.t('Appeler tous les soirs, quoi qu\'il arrive'), conditions: { telephone: true },
          effets: function (s) { relationP(s, -2); return { moral: -2, energie: -3 }; },
          resultat: NF.t('Vingt minutes chaque soir, entre deux gardes. Ça maintient le fil, sans le resserrer.') },
        { texte: NF.t('Laisser faire, c\'est le métier'),
          effets: function (s) { relationP(s, -12); return { moral: -5 }; },
          resultat: function (s) { return prenomP(s) + NF.t(' arrête de demander quand vous rentrez. Ce n\'est pas bon signe.'); } }
      ] },

    /* ---------------- 11. Proposition de passer gendarme ou pompier ---------------- */
    { id: 'arm_proposition_gendarme', famille: 'travail', icone: '👮', titre: NF.t('Changer d\'uniforme'),
      texte: function (s) {
        var t = NF.t('La gendarmerie et les sapeurs-pompiers recrutent en priorité parmi les militaires et les agents de sécurité expérimentés. Un officier recruteur vous reçoit : un poste de gendarme ou de sapeur-pompier professionnel, sélection allégée, affectation rapide.');
        var manque = [];
        var g = U.byId(NF.data.metiers, 'gendarme');
        var p = U.byId(NF.data.metiers, 'pompier');
        if (g) { var vg = NF.core.prerequisMetier(s, g); if (!vg.ok) manque.push(NF.t('gendarme : ') + vg.raisons.join(', ')); }
        if (p) { var vp = NF.core.prerequisMetier(s, p); if (!vp.ok) manque.push(NF.t('pompier : ') + vp.raisons.join(', ')); }
        if (manque.length) t += NF.t(' Il manque encore, pour ') + manque.join(NF.t(' ; pour ')) + '.';
        return t;
      },
      poids: 1.5, delai: 16,
      conditions: { emploi: ['legionnaire', 'militaire_du_rang', 'sous_officier', 'agent_securite'] },
      condition: function (s) { return moisEmploi(s) >= 12; },
      choix: [
        { texte: NF.t('Passer gendarme'), condition: function (s) { return peutPrendre(s, 'gendarme'); },
          effets: function (s) { return embauche(s, 'gendarme', { moral: 6, reputation: 2, energie: -6 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('École de gendarmerie, puis une brigade. Même rigueur, autre mission :')); } },
        { texte: NF.t('Passer sapeur-pompier professionnel'), condition: function (s) { return peutPrendre(s, 'pompier'); },
          effets: function (s) { return embauche(s, 'pompier', { moral: 6, reputation: 2, energie: -6 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Un centre de secours, des gardes de vingt-quatre heures :')); } },
        { texte: NF.t('Rester où je suis'), effets: { moral: 1 }, resultat: NF.t('Vous gardez la plaquette du recruteur. Peut-être plus tard.') }
      ] },

    /* ---------------- 12. Intervention héroïque (pompier, gendarme) ---------------- */
    { id: 'arm_intervention_heroique', famille: 'travail', icone: '🚒', titre: NF.t('Intervention'),
      texte: function (s) { return estGendarme(s) ? NF.t('Appel radio en pleine patrouille : une voiture dans le canal, le conducteur coincé, les secours à dix minutes. Vous êtes à trente secondes.') : NF.t('Feu d\'appartement au quatrième, une personne encore à l\'intérieur. L\'échelle n\'est pas déployée, la cage d\'escalier est enfumée.'); },
      poids: 2, delai: 12,
      conditions: { emploi: ['pompier', 'gendarme'] },
      choix: [
        { texte: NF.t('Y aller sans attendre'),
          aleatoire: [
            { poids: 6, effets: { reputation: 6, moral: 8, energie: -12, xp: { soins: 6 } }, resultat: NF.t('Vous ressortez avec la personne, vivante. Le lendemain, votre photo est dans le journal local, sous un titre un peu trop grand.') },
            { poids: 3, effets: { reputation: 5, moral: 2, sante: -14, energie: -14, maladie: { nom: NF.t('Brûlures'), duree: 1, sante: 5 } }, resultat: NF.t('La personne est sauvée. Vous, c\'est l\'hôpital : brûlures aux bras, fumées. Le journal vous appelle « le héros du quartier ».') },
            { poids: 1, effets: { reputation: 4, moral: -6, sante: -24, energie: -16, maladie: { nom: NF.t('Intoxication aux fumées'), duree: 2, sante: 6 } }, resultat: NF.t('Vous perdez connaissance dans la fumée. Ce sont vos collègues qui vous sortent, vous et la victime. Deux semaines de soins.') },
            { poids: mortel(0.5), effets: function (s) { return { mort: estGendarme(s) ? NF.t('noyé en intervention') : NF.t('dans un incendie, en intervention') }; },
              resultat: function (s) { return estGendarme(s) ? NF.t('Le courant emporte la voiture, et vous avec.') : NF.t('Le plancher du quatrième cède. Vos collègues vous sortent trop tard.'); } }
          ] },
        { texte: NF.t('Respecter la procédure et attendre les renforts'), effets: { reputation: 1, moral: -2, energie: -6 }, resultat: NF.t('Vous sécurisez le périmètre. Les renforts arrivent et font le travail. La personne s\'en sort, de justesse. Vous y repenserez.') },
        { texte: NF.t('Coordonner depuis l\'extérieur'), conditions: { competences: { gestion: 1 } }, effets: { reputation: 3, moral: 4, energie: -6, xp: { gestion: 8 } }, resultat: NF.t('Vous placez les équipes, guidez l\'échelle, tenez la radio. Pas de photo, mais le chef de centre a noté.') }
      ] },

    /* ---------------- 13. À la rue : un gendarme propose l'engagement → centre de recrutement ---------------- */
    { id: 'arm_controle_rue', famille: 'travail', icone: '🪪', titre: NF.t('Un contrôle qui tourne autrement'),
      texte: NF.t('Contrôle d\'identité devant la gare. Le gendarme regarde vos papiers, puis vous, plus longtemps que nécessaire. « Je vous ai déjà vu traîner ici. Vous avez quel âge ? » Il baisse la voix : « À votre âge, j\'étais à peu près au même endroit. L\'armée m\'a sorti de là. Ils prennent sans adresse, sans diplôme. Si vous voulez, je vous accompagne au centre de recrutement. »'),
      poids: 1.5, delai: 12,
      conditions: { expose: true, emploi: false, ageMax: 35, sansDrapeau: 'contact_armee' },
      choix: [
        { texte: NF.t('Accepter son aide'),
          effets: { moral: 4, drapeaux: { contact_armee: true }, programmer: { evenement: 'arm_contact_armee_suite', dans: 1 } },
          resultat: NF.t('Il note votre prénom et un lieu de rendez-vous. « Lundi, huit heures, propre si possible. »') },
        { texte: NF.t('Prendre la carte, sans promettre'), effets: { moral: 1, drapeaux: { contact_armee: true } }, resultat: NF.t('Une carte de visite au fond de la poche. Le centre de recrutement est à deux rues de la gare.') },
        { texte: NF.t('Décliner poliment'), effets: { moral: -1 }, resultat: NF.t('« Comme vous voulez. » Il vous rend vos papiers et s\'éloigne.') }
      ] },

    { id: 'arm_contact_armee_suite', famille: 'travail', force: true, icone: '🏛️', titre: NF.t('Au centre de recrutement'),
      texte: NF.t('Le gendarme est là, en civil, devant le centre d\'information et de recrutement. À l\'intérieur, un sous-officier déroule les contrats : engagement comme militaire du rang, ou la Légion étrangère, qui ne demande ni adresse ni casier vierge. Tests le matin, réponse le jour même.'),
      poids: 1, delai: 1,
      conditions: { drapeau: 'contact_armee', emploi: false },
      choix: [
        { texte: NF.t('Signer comme militaire du rang'), condition: function (s) { return peutPrendre(s, 'militaire_du_rang'); },
          effets: function (s) { return embauche(s, 'militaire_du_rang', { moral: 8, reputation: 2, hygiene: 10 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Contrat signé. Incorporation dans deux semaines, chambre en caserne, cheveux coupés :')); } },
        { texte: NF.t('Signer pour la Légion étrangère'), condition: function (s) { return peutPrendre(s, 'legionnaire'); },
          effets: function (s) { return embauche(s, 'legionnaire', { moral: 6, reputation: 1, hygiene: 10, energie: -8 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Un nouveau nom sur le registre, un képi à mériter. Cinq ans, sans retour en arrière :')); } },
        { texte: NF.t('Repartir sans signer'), effets: { moral: -2, drapeaux: { contact_armee: false } }, resultat: NF.t('Le gendarme n\'insiste pas. « La porte reste ouverte. » Vous repartez vers la gare.') }
      ] },

    /* ---------------- 14. Vie de caserne ---------------- */
    { id: 'arm_vie_caserne', famille: 'travail', icone: '🛏️', titre: NF.t('Vie de chambrée'),
      texte: NF.t('Huit lits, un placard chacun, revue de chambrée le vendredi. Le week-end, le quartier se vide : ceux qui restent organisent une soirée au foyer du soldat, et le cuisinier de l\'ordinaire cherche des bras.'),
      poids: 2, delai: 8,
      conditions: { logement: 'caserne' },
      choix: [
        { texte: NF.t('Soirée de cohésion au foyer'),
          aleatoire: [
            { poids: 7, effets: { moral: 8, argent: -30, hygiene: -4, energie: -4, reputation: 1 }, resultat: NF.t('Bières à prix militaire, karaoké, histoires d\'opérations. Les anciens vous adoptent un peu plus.') },
            { poids: 3, effets: { moral: 4, argent: -40, hygiene: -6, energie: -8, reputation: -2 }, resultat: NF.t('Retour après l\'appel, chambrée réveillée, rapport du sous-officier de permanence. Une bonne soirée, chère payée.') }
          ] },
        { texte: NF.t('Profiter du calme : lessive, rangement, sommeil'), effets: { hygiene: 12, energie: 10, moral: 2 }, resultat: NF.t('Le placard impeccable, les rangers cirées, dix heures de sommeil. La revue de vendredi sera une formalité.') },
        { texte: NF.t('Séance de sport avec la section'), effets: { xp: { sport: 14 }, sante: 3, energie: -6, moral: 3, reputation: 1 }, resultat: NF.t('Footing en formation, parcours d\'obstacles, pompes jusqu\'à la nausée. Le corps proteste, puis suit.') },
        { texte: NF.t('Donner un coup de main en cuisine'), effets: { xp: { cuisine: 10 }, nourriture: 12, reputation: 1, energie: -5 }, resultat: NF.t('Quatre cents couverts, et un plat à emporter en remerciement. Le cuisinier retiendra votre nom.') }
      ] },

    /* ---------------- 15. Saut d'entraînement ---------------- */
    { id: 'arm_saut', famille: 'travail', icone: '🪂', titre: NF.t('Saut d\'entraînement'),
      texte: NF.t('Séance de saut à l\'aube, quatre cents mètres, ouverture automatique. Le largueur vérifie les sangles à la chaîne. Dans l\'avion, personne ne parle.'),
      poids: 1.5, delai: 18,
      conditions: { emploi: MILITAIRES },
      choix: [
        { texte: NF.t('Vérifier mon parachute une deuxième fois'),
          aleatoire: [
            { poids: 9.5, effets: { energie: -8, moral: 5, reputation: 1, xp: { technique: 6, sport: 4 } }, resultat: NF.t('Une suspente mal rangée, corrigée au sol. Le saut est parfait, le silence sous la voile aussi.') },
            { poids: 0.8, effets: { sante: -12, energie: -10, moral: -4 }, resultat: NF.t('Mauvaise réception dans le vent. Cheville cassée, six semaines de plâtre.') },
            { poids: mortel(0.12, 'technique'), effets: { mort: NF.t('lors d\'un saut en parachute') }, resultat: NF.t('Le parachute de secours s\'ouvre trop bas.') }
          ] },
        { texte: NF.t('Sauter, comme les autres'),
          aleatoire: [
            { poids: 8, effets: { energie: -8, moral: 5, reputation: 1, xp: { sport: 6 } }, resultat: NF.t('Quatre secondes de chute, le choc de l\'ouverture, le silence. Vous vous posez dans l\'herbe mouillée.') },
            { poids: 1.5, effets: { sante: -14, energie: -12, moral: -5, maladie: { nom: NF.t('Fracture'), duree: 2, sante: 4 } }, resultat: NF.t('Torsion de la voile, réception brutale. Jambe cassée à deux endroits.') },
            { poids: mortel(0.35), effets: { mort: NF.t('lors d\'un saut en parachute') }, resultat: NF.t('La voile ne s\'ouvre pas. Le secours non plus.') }
          ] }
      ] },

    /* ---------------- 16. Franchissement ---------------- */
    { id: 'arm_franchissement', famille: 'travail', icone: '🌊', titre: NF.t('Franchissement'),
      texte: NF.t('Exercice de franchissement de rivière, en tenue, avec le sac et l\'arme. L\'eau est à huit degrés et le courant plus fort que prévu. Le chef de section demande qui passe en premier.'),
      poids: 1.5, delai: 18,
      conditions: { emploi: MILITAIRES },
      choix: [
        { texte: NF.t('Passer en premier'),
          aleatoire: [
            { poids: function (s) { return 7 + 1.5 * niveau(s, 'sport'); }, effets: { energie: -14, moral: 4, reputation: 3, xp: { sport: 10 } }, resultat: NF.t('Trente mètres de courant glacé, le sac qui tire vers le fond. Vous touchez l\'autre rive en claquant des dents. Les autres suivent sur votre corde.') },
            { poids: 2, effets: { sante: -12, energie: -16, moral: -5 }, resultat: NF.t('Le courant vous emporte vingt mètres en aval. Un camarade vous rattrape par le sac. Hypothermie légère, une nuit à l\'infirmerie.') },
            { poids: mortel(0.5, 'sport'), effets: { mort: NF.t('noyé pendant un exercice') }, resultat: NF.t('Le courant vous emporte. Le sac fait le reste.') }
          ] },
        { texte: NF.t('Passer en dernier, avec la corde de sécurité'),
          aleatoire: [
            { poids: 9, effets: { energie: -10, moral: 1, xp: { sport: 5 } }, resultat: NF.t('Accroché à la corde, le courant tire mais ne gagne pas. L\'autre rive, les lèvres bleues, et c\'est fini.') },
            { poids: 1, effets: { sante: -8, energie: -14, moral: -3 }, resultat: NF.t('Une crampe au milieu. La corde tient, les camarades tirent. Vous arrivez sur la berge en recrachant de l\'eau.') },
            { poids: mortel(0.12), effets: { mort: NF.t('noyé pendant un exercice') }, resultat: NF.t('Le mousqueton lâche au milieu du courant.') }
          ] },
        { texte: NF.t('Dire que je nage mal'), effets: { moral: -3, reputation: -2, energie: 2 }, resultat: NF.t('Le chef vous met à la sécurité sur la berge, avec la perche. Personne ne dit rien. Tout le monde a entendu.') }
      ] },

    /* ---------------- 17. Forcené (gendarme) ---------------- */
    { id: 'arm_forcene', famille: 'travail', icone: '🚔', titre: NF.t('Forcené'),
      texte: NF.t('Un homme s\'est retranché chez lui avec un fusil de chasse, après une dispute. Il a déjà tiré une fois, en l\'air. L\'unité spécialisée est à une heure de route. Vous êtes la première patrouille sur place, avec un collègue et deux gilets.'),
      poids: 2, delai: 16,
      conditions: { emploi: 'gendarme' },
      choix: [
        { texte: NF.t('Boucler le périmètre et attendre l\'unité spécialisée'),
          effets: { energie: -10, moral: -2, reputation: 1, xp: { gestion: 4 } },
          resultat: NF.t('Une heure à tenir les voisins à distance, le fusil derrière la fenêtre. L\'unité spécialisée arrive, négocie, et il sort les mains en l\'air. Rien à signaler, sauf la peur.') },
        { texte: NF.t('Lui parler, gagner du temps'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 8, effets: { energie: -12, moral: 4, reputation: 6, xp: { commerce: 8 } }, resultat: NF.t('Quarante minutes à lui parler depuis le portail, de sa femme, de son chien, de rien. Il pose le fusil avant l\'arrivée de l\'unité. Lettre de félicitations.') },
            { poids: 1.5, effets: { sante: -14, energie: -12, moral: -8, reputation: 3 }, resultat: NF.t('Il tire dans votre direction au milieu d\'une phrase. Des plombs dans le bras. Vous finissez la négociation depuis l\'ambulance, et il sort quand même.') },
            { poids: mortel(0.3), effets: { mort: NF.t('abattu en intervention') }, resultat: NF.t('Il tire dans votre direction au milieu d\'une phrase.') }
          ] },
        { texte: NF.t('Entrer en premier'),
          aleatoire: [
            { poids: 5.5, effets: { energie: -14, moral: 3, reputation: 7, xp: { sport: 6 } }, resultat: NF.t('La porte cède, il n\'a pas le temps d\'épauler. Menotté sur le sol de sa cuisine. Félicitations du commandant, et un rappel sur la procédure.') },
            { poids: 3, effets: { sante: -20, energie: -16, moral: -8, reputation: 5, maladie: { nom: NF.t('Blessure par balle'), duree: 3, sante: 5 } }, resultat: NF.t('Il tire au moment où la porte cède. Le gilet arrête l\'essentiel, pas tout. Trois semaines d\'hôpital.') },
            { poids: mortel(1.2), effets: { mort: NF.t('abattu en intervention') }, resultat: NF.t('Il tire au moment où la porte cède. Le gilet n\'arrête pas un fusil de chasse à deux mètres.') }
          ] }
      ] }
  ]);
})();
