/* =====================================================================
 * ÉVÉNEMENTS – SÉCURITÉ
 * ---------------------------------------------------------------------
 * Vols, agressions, contrôles, expulsions, incendies, arnaques,
 * cambriolages. Même schéma que sante.js (voir src/core/evenements.js).
 *
 * Chaînes :
 *   sec_expulsion_squat / sec_demantelement → (sursis) → sec_squat_fin_sursis (programmé, force)
 *   sec_harcelement    → (plainte)          → sec_plainte_suite             (programmé, force)
 *   sec_cambriolage    → (assurance)        → sec_assurance_suite           (programmé, force)
 *   sec_agression_nuit → drapeau agression_subie → sec_apres_agression
 *   sec_serrure / sec_intrusion_propriete → drapeaux logement_fragile /
 *       logement_securise qui modulent le poids de sec_cambriolage
 *   sec_chien_errant   → drapeau chien_nourri (réduit le poids des vols
 *       et agressions à la rue)
 *
 * Drapeaux introduits : squat_sursis, plainte_deposee, cambriolage_declare,
 *   logement_fragile, logement_securise, agression_subie, chien_nourri
 * Drapeaux du moteur réutilisés : papiers_perdus, foyer_interdit,
 *   contact_association, hebergement_propose
 * ===================================================================== */
(function () {

  /** Retire jusqu'à "max" objets (hors matériaux et voiture), chacun avec une
   *  probabilité "proba" modulée par les passifs anti-vol (cadenas) et les
   *  traits. Retourne la liste des noms retirés, en minuscules. */
  function volerObjets(s, max, proba) {
    var pris = [];
    var p = proba * NF.api.passif(s, 'vol') * NF.core.modifTrait(s, 'vol');
    for (var id in s.joueur.inventaire) {
      var o = NF.util.byId(NF.data.objets, id);
      if (!o || o.type === 'materiau' || o.id === 'voiture') continue;
      if (NF.rng.chance(p)) {
        NF.api.retirerObjet(s, id, 1);
        pris.push(NF.util.minuscule(o.nom));
        if (pris.length >= max) break;
      }
    }
    return pris;
  }

  /** Texte de journal "Volé : a, b." ou chaîne vide */
  function journalVol(pris, prefixe) {
    return pris.length ? (prefixe || NF.t('Volé')) + ' : ' + pris.join(', ') + '.' : '';
  }

  /** Pertes d'un cambriolage : objets + une part de l'argent gardé chez soi */
  function pertesCambriolage(s) {
    var pris = volerObjets(s, 3, 0.5);
    var arg = Math.round(Math.min(s.joueur.argent * 0.15, 400));
    return { pris: pris, argent: arg };
  }

  NF.ajouterEvenements([

    /* ------------------------------------------------------------------
     * À LA RUE, AU SQUAT, SOUS LA TENTE
     * ---------------------------------------------------------------- */

    { id: 'sec_vol_sac', famille: 'securite', icone: '🎒', titre: NF.t('Sac volé'),
      texte: NF.t('Vous vous étiez assoupi quelques minutes. En rouvrant les yeux, quelqu\'un s\'éloigne à grands pas avec votre sac sous le bras.'),
      poids: function (s) { var p = NF.api.aObjet(s, 'cadenas') ? 1 : 2.5; if (s.joueur.drapeaux.chien_nourri) p *= 0.6; return p; },
      delai: 8,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Courir après lui'),
          aleatoire: [
            { poids: 4, effets: { energie: -8, moral: 3 }, resultat: NF.t('Il lâche le sac au bout de deux rues. Vous récupérez tout, le souffle court.') },
            { poids: 4, effets: function (s) { var pris = volerObjets(s, 2, 0.5); var arg = Math.round(s.joueur.argent * 0.4); return { argent: -arg, energie: -10, moral: -8, journal: journalVol(pris, NF.t('Perdu')) }; },
              resultat: NF.t('Il est plus rapide. Vous le perdez de vue dans la foule.') },
            { poids: 2, effets: function (s) { var pris = volerObjets(s, 1, 0.5); return { sante: -8, energie: -8, moral: -10, journal: journalVol(pris, NF.t('Perdu')) }; },
              resultat: NF.t('Vous le rattrapez. Il n\'est pas seul. Vous repartez avec un œil fermé et sans le sac.') },
          ] },
        { texte: NF.t('Mes affaires sont attachées'), conditions: { objet: 'cadenas' },
          effets: { moral: -2 }, resultat: NF.t('La chaîne a tenu. Il est parti avec la bandoulière et rien d\'autre.') },
        { texte: NF.t('Laisser filer'),
          effets: function (s) { var pris = volerObjets(s, 2, 0.6); var arg = Math.round(s.joueur.argent * 0.5); return { argent: -arg, moral: -8, journal: pris.length ? journalVol(pris) : NF.t('Il n\'y avait presque rien dedans.') }; },
          resultat: NF.t('Pas la force de courir. Vous faites l\'inventaire de ce qu\'il reste.') },
      ] },

    { id: 'sec_agression_nuit', famille: 'securite', icone: '🌑', titre: NF.t('Mauvaise rencontre'),
      texte: NF.t('Tard dans la nuit, trois silhouettes s\'arrêtent devant votre couchage. L\'un d\'eux vous demande ce que vous avez sur vous.'),
      poids: function (s) { var p = s.joueur.logement === 'rue' ? 2 : 1; if (s.joueur.drapeaux.chien_nourri) p *= 0.6; return p; },
      delai: 9,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Donner ce qu\'ils demandent'),
          effets: function (s) { var arg = Math.round(s.joueur.argent * 0.7); var pris = volerObjets(s, 1, 0.3); return { argent: -arg, moral: -8, journal: journalVol(pris, NF.t('Pris')) }; },
          resultat: NF.t('Ils vident vos poches et s\'en vont en riant. Vous ne dormirez plus cette nuit.') },
        { texte: NF.t('Me défendre'),
          aleatoire: [
            { poids: 4, effets: { sante: -5, moral: 4, reputation: 1 }, resultat: NF.t('Vous criez, vous frappez. Ils n\'attendaient pas ça et déguerpissent.') },
            { poids: 5, effets: function (s) { var arg = Math.round(s.joueur.argent * 0.6); return { sante: -14, energie: -10, moral: -10, argent: -arg, drapeaux: { agression_subie: true } }; },
              resultat: NF.t('Ils sont trois. Vous finissez au sol, et ils se servent quand même.') },
            { poids: 1, effets: { sante: -20, energie: -15, moral: -12, maladie: { nom: NF.t('Côtes fêlées'), duree: 2, sante: 4 }, drapeaux: { agression_subie: true } },
              resultat: NF.t('Coups de pied dans les côtes. Un passant appelle les secours. Des semaines à récupérer.') },
          ] },
        { texte: NF.t('Appeler les secours'), conditions: { telephone: true },
          aleatoire: [
            { poids: 5, effets: { moral: -4, energie: -6 }, resultat: NF.t('Une patrouille passe par là. Les trois disparaissent avant même qu\'elle s\'arrête.') },
            { poids: 5, effets: function (s) { var arg = Math.round(s.joueur.argent * 0.5); return { argent: -arg, objets: { telephone: -1 }, sante: -6, moral: -9 }; },
              resultat: NF.t('Le temps de composer le numéro, l\'un d\'eux vous arrache le téléphone. Ils partent avec.') },
          ] },
        { texte: NF.t('Fuir vers la gare, là où il y a de la lumière'), conditions: { lieu: 'gare' },
          aleatoire: [
            { poids: 7, effets: { energie: -10, moral: -5 }, resultat: NF.t('Vous courez sans vous retourner. Le hall, les néons, du monde. Ils n\'ont pas suivi.') },
            { poids: 3, effets: function (s) { var pris = volerObjets(s, 2, 0.7); return { energie: -10, moral: -8, journal: journalVol(pris, NF.t('Abandonné sur place')) }; },
              resultat: NF.t('Vous êtes sain et sauf, mais vos affaires sont restées là-bas. Au matin, il n\'en reste rien.') },
          ] },
      ] },

    { id: 'sec_apres_agression', famille: 'securite', icone: '😶', titre: NF.t('Après les coups'),
      texte: NF.t('Les bleus ont disparu, pas le reste. Vous sursautez au moindre pas derrière vous, et vous ne dormez plus qu\'au petit matin.'),
      poids: 2.5, delai: 12,
      conditions: { drapeau: 'agression_subie' },
      choix: [
        { texte: NF.t('En parler à quelqu\'un à l\'association'), conditions: { lieu: 'association' },
          effets: { moral: 8, energie: 4, drapeaux: { agression_subie: false } }, resultat: NF.t('Mettre des mots dessus. Une psychologue bénévole vous reçoit deux fois. Ça desserre.') },
        { texte: NF.t('Consulter à l\'hôpital'), conditions: { lieu: 'hopital' },
          effets: { moral: 5, sante: 2, energie: -4, drapeaux: { agression_subie: false } }, resultat: NF.t('Un certificat médical, un traitement léger pour dormir, un rendez-vous de suivi.') },
        { texte: NF.t('Dormir le jour, veiller la nuit'), effets: { energie: -10, moral: -4, drapeaux: { agression_subie: false } }, resultat: NF.t('Vous inversez vos journées. Moins de peur, plus de fatigue.') },
        { texte: NF.t('Faire comme si de rien n\'était'), effets: { moral: -8 }, resultat: NF.t('Ça ne part pas comme ça.') },
      ] },

    { id: 'sec_controle_identite', famille: 'securite', icone: '🪪', titre: NF.t('Contrôle d\'identité'),
      texte: function (s) { return NF.t('Une patrouille vous arrête ') + (NF.core.aLieu(s, 'gare') ? NF.t('dans le hall de la gare') : NF.t('au coin de la rue')) + NF.t('. « Pièce d\'identité, s\'il vous plaît. »'); },
      poids: 2, delai: 7,
      conditions: { logementOrdreMax: 2 },
      choix: [
        { texte: NF.t('Présenter mes papiers'), conditions: { sansDrapeau: 'papiers_perdus' },
          effets: { moral: -2, energie: -2 }, resultat: NF.t('Vérification, quelques questions, et ils vous laissent. Vingt minutes de perdues.') },
        { texte: NF.t('Expliquer que mes papiers ont été perdus'), conditions: { drapeau: 'papiers_perdus' },
          aleatoire: [
            { poids: 5, effets: { energie: -10, moral: -6 }, resultat: NF.t('Vérification d\'identité au commissariat : quatre heures sur un banc avant qu\'on vous laisse sortir.') },
            { poids: 5, effets: { moral: -3 }, resultat: NF.t('L\'un des agents soupire, note votre nom, et vous dit de refaire vos papiers rapidement.') },
          ] },
        { texte: NF.t('Rester calme et connaître mes droits'), conditions: { competences: { administratif: 1 } },
          effets: { moral: 2, xp: { administratif: 5 } }, resultat: NF.t('Vous répondez posément, sans en dire plus que nécessaire. Le contrôle est bref.') },
        { texte: NF.t('Tourner les talons'),
          aleatoire: [
            { poids: 4, effets: { energie: -6, moral: 1 }, resultat: NF.t('Ils ne vous suivent pas. Vous changez de quartier pour quelques jours.') },
            { poids: 4, effets: { energie: -10, moral: -8 }, resultat: NF.t('Rattrapé au bout de cinquante mètres. Contrôle au poste, ton sec, et une nuit en moins.') },
            { poids: 2, effets: { energie: -10, moral: -10, casier: true }, resultat: NF.t('Rattrapé, plaqué au sol. Garde à vue, puis une condamnation pour rébellion : une ligne dans votre casier.') },
          ] },
      ] },

    { id: 'sec_expulsion_squat', famille: 'securite', icone: '🚧', titre: NF.t('Avis d\'évacuation du squat'),
      texte: NF.t('Un huissier a affiché une décision de justice sur la porte : les occupants ont huit jours pour quitter les lieux.'),
      poids: 2.5, delai: 10,
      conditions: { logement: 'squat', sansDrapeau: 'squat_sursis' },
      choix: [
        { texte: NF.t('Partir avec mes affaires avant la police'),
          effets: { logement: 'rue', moral: -10, energie: -6 }, resultat: NF.t('Vous rangez tout dans deux sacs et vous refermez la porte derrière vous. Retour au trottoir.') },
        { texte: NF.t('Rester avec les autres occupants'),
          aleatoire: [
            { poids: 6, effets: function (s) { var pris = volerObjets(s, 1, 0.4); return { logement: 'rue', sante: -6, moral: -12, journal: journalVol(pris, NF.t('Perdu dans la bousculade')) }; },
              resultat: NF.t('À l\'aube du huitième jour, les CRS entrent. Tout le monde dehors en dix minutes, sans ménagement.') },
            { poids: 4, effets: { moral: 4, reputation: 2, drapeaux: { squat_sursis: true }, programmer: { evenement: 'sec_squat_fin_sursis', dans: 3 } },
              resultat: NF.t('Un collectif de soutien se mobilise. La préfecture accorde un délai de trois mois.') },
          ] },
        { texte: NF.t('Demander un délai au juge (compétence administrative)'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 7, effets: { moral: 3, xp: { administratif: 15 }, drapeaux: { squat_sursis: true }, programmer: { evenement: 'sec_squat_fin_sursis', dans: 3 } },
              resultat: NF.t('Votre courrier est lu à l\'audience. Trois mois de sursis pour tous les occupants.') },
            { poids: 3, effets: { logement: 'rue', moral: -8 }, resultat: NF.t('Le juge refuse. Vous partez le lendemain.') },
          ] },
        { texte: NF.t('Prévenir mon contact à l\'association'), conditions: { lieu: 'association', drapeau: 'contact_association' },
          aleatoire: [
            { poids: 5, effets: { logement: 'rue', moral: -4, drapeaux: { hebergement_propose: true } },
              resultat: NF.t('Votre contact passe des coups de fil. Quelqu\'un accepte de vous héberger un temps (voir l\'onglet Logement).') },
            { poids: 5, effets: { logement: 'rue', moral: -8 }, resultat: NF.t('Personne n\'a de place. Vous repartez à la rue, avec une promesse de rappel.') },
          ] },
      ] },

    { id: 'sec_squat_fin_sursis', famille: 'securite', force: true, icone: '⏳', titre: NF.t('Fin du sursis'),
      texte: function (s) {
        return s.joueur.logement === 'squat'
          ? NF.t('Le délai accordé par le tribunal expire cette semaine. Cette fois, l\'évacuation aura lieu.')
          : NF.t('Vous apprenez que le squat où vous avez vécu a été évacué. Vous n\'y habitiez plus, mais certains visages vous manqueront.');
      },
      choix: [
        { texte: NF.t('Partir avant l\'évacuation'), cache: true, condition: function (s) { return s.joueur.logement === 'squat'; },
          effets: { logement: 'rue', moral: -8, drapeaux: { squat_sursis: false } }, resultat: NF.t('Trois mois de gagnés, c\'est déjà ça. Vous quittez les lieux la veille.') },
        { texte: NF.t('Demander une place en foyer via l\'association'), cache: true, conditions: { lieu: 'association' },
          condition: function (s) { return s.joueur.logement === 'squat' && !s.joueur.drapeaux.foyer_interdit; },
          aleatoire: [
            { poids: 5, effets: { logement: 'foyer', moral: 2, drapeaux: { squat_sursis: false } }, resultat: NF.t('Grâce au relogement prévu par le tribunal, une place en foyer vous est attribuée.') },
            { poids: 5, effets: { logement: 'rue', moral: -8, drapeaux: { squat_sursis: false } }, resultat: NF.t('La liste d\'attente est longue. Vous repartez à la rue.') },
          ] },
        { texte: NF.t('Continuer'), cache: true, condition: function (s) { return s.joueur.logement !== 'squat'; },
          effets: { moral: -2, drapeaux: { squat_sursis: false } }, resultat: NF.t('Une page se tourne pour d\'autres.') },
      ] },

    { id: 'sec_rixe_foyer', famille: 'securite', icone: '🥊', titre: NF.t('Bagarre au foyer'),
      texte: NF.t('Au réfectoire, le ton monte entre deux résidents pour une histoire de place. Les chaises volent. Vous êtes juste à côté.'),
      poids: 2, delai: 8,
      conditions: { logement: 'foyer' },
      choix: [
        { texte: NF.t('Rester à l\'écart'), effets: { moral: -3 }, resultat: NF.t('Les veilleurs séparent tout le monde. Vous finissez votre assiette en silence.') },
        { texte: NF.t('Prévenir le personnel'), effets: { moral: 1, reputation: 1 }, resultat: NF.t('Les veilleurs interviennent vite. Personne n\'est blessé.') },
        { texte: NF.t('Tenter de calmer le jeu'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 6, effets: { moral: 3, reputation: 3 }, resultat: NF.t('Quelques mots au bon moment. Ça retombe. Le personnel l\'a remarqué.') },
            { poids: 4, effets: { sante: -6, moral: -4 }, resultat: NF.t('Vous prenez un coup qui ne vous était pas destiné.') },
          ] },
        { texte: NF.t('Rendre les coups quand ça déborde sur moi'),
          aleatoire: [
            { poids: 5, effets: { sante: -5, reputation: -2, moral: -2 }, resultat: NF.t('Ça se termine à trois contre trois. Le règlement intérieur vous est rappelé le lendemain.') },
            { poids: 5, effets: { sante: -7, moral: -10, logement: 'rue', drapeaux: { foyer_interdit: true }, programmer: { evenement: 'foyer_reouvert', dans: 3 } },
              resultat: NF.t('Exclusion immédiate pour tous les participants. Vos affaires sont sur le trottoir avant la nuit.') },
          ] },
      ] },

    { id: 'sec_incendie_campement', famille: 'securite', icone: '🔥', titre: NF.t('Incendie'),
      texte: function (s) {
        return s.joueur.logement === 'tente'
          ? NF.t('Un réchaud mal éteint dans la tente voisine. Les flammes gagnent les bâches en quelques secondes.')
          : NF.t('Une bougie, un matelas, un couloir sans extincteur. Au milieu de la nuit, le squat prend feu.');
      },
      poids: function (s) { return NF.core.saison(s) === 'hiver' ? 2 : 1; }, delai: 18,
      conditions: { logement: ['tente', 'squat'] },
      choix: [
        { texte: NF.t('Sortir immédiatement, sans rien prendre'),
          effets: function (s) {
            var e = { sante: -3, moral: -12, objets: {} };
            ['tente', 'abri_carton', 'couverture', 'couverture_rapiecee', 'rechaud', 'livre', 'radio'].forEach(function (id) { if (NF.api.aObjet(s, id) && NF.rng.chance(0.7)) e.objets[id] = -1; });
            if (s.joueur.logement === 'tente' && e.objets.tente) e.logement = 'rue';
            if (s.joueur.logement === 'squat' && NF.rng.chance(0.5)) { e.logement = 'rue'; e.journal = NF.t('Le bâtiment est déclaré inhabitable et muré.'); }
            return e;
          },
          resultat: NF.t('Vous êtes dehors, pieds nus, vivant. Ce qui est resté à l\'intérieur n\'existe plus.') },
        { texte: NF.t('Retourner chercher mes affaires'),
          aleatoire: [
            { poids: 6, effets: { sante: -8, energie: -10, moral: -6 }, resultat: NF.t('Vous ressortez en toussant, le sac à la main. Les pompiers vous passent un savon.') },
            { poids: 3, effets: function (s) {
                var e = { sante: -18, energie: -12, moral: -10, maladie: { nom: NF.t('Brûlures'), duree: 2, sante: 5 }, objets: {} };
                ['tente', 'abri_carton', 'couverture', 'rechaud'].forEach(function (id) { if (NF.api.aObjet(s, id)) e.objets[id] = -1; });
                if (s.joueur.logement === 'tente') e.logement = 'rue';
                return e;
              },
              resultat: NF.t('Une bâche enflammée vous tombe dessus. Hôpital, brûlures aux bras, et plus rien à récupérer.') },
            { poids: 1, effets: { mort: NF.t('asphyxie dans un incendie') }, resultat: NF.t('La fumée est plus rapide que vous.') },
          ] },
        { texte: NF.t('Aider les autres à sortir'), conditions: { competences: { soins: 1 } },
          effets: function (s) {
            var e = { sante: -7, energie: -10, moral: 2, reputation: 5, objets: {} };
            ['tente', 'abri_carton', 'couverture', 'rechaud'].forEach(function (id) { if (NF.api.aObjet(s, id) && NF.rng.chance(0.6)) e.objets[id] = -1; });
            if (s.joueur.logement === 'tente' && e.objets.tente) e.logement = 'rue';
            return e;
          },
          resultat: NF.t('Vous tirez une voisine hors de sa tente, puis vous faites les premiers gestes en attendant les secours. Vos affaires ont brûlé, mais tout le monde est là.') },
      ] },

    { id: 'sec_harcelement', famille: 'securite', icone: '🗯️', titre: NF.t('Harcèlement'),
      texte: NF.t('Depuis deux semaines, le même groupe passe chaque soir devant votre coin : insultes, canettes lancées, vidéos avec le téléphone. Ça empire.'),
      poids: 2, delai: 10,
      conditions: { expose: true, sansDrapeau: 'plainte_deposee' },
      choix: [
        { texte: NF.t('Changer de coin'), effets: { moral: -4, energie: -5 }, resultat: NF.t('Vous abandonnez un emplacement que vous connaissiez bien. Ailleurs, c\'est à recommencer.') },
        { texte: NF.t('Déposer plainte au commissariat'), conditions: { sansDrapeau: 'papiers_perdus' },
          effets: { moral: 2, energie: -4, drapeaux: { plainte_deposee: true }, programmer: { evenement: 'sec_plainte_suite', dans: 2 } },
          resultat: NF.t('Deux heures d\'attente, un agent qui tape lentement. La plainte est enregistrée. Reste à voir ce qu\'elle devient.') },
        { texte: NF.t('En parler au centre social'), conditions: { lieu: 'centre_social' },
          effets: { moral: 5, reputation: 2 }, resultat: NF.t('Un médiateur de rue connaît ces jeunes. Il ira leur parler. Ce n\'est pas une garantie, mais vous n\'êtes plus seul.') },
        { texte: NF.t('Les ignorer'),
          aleatoire: [
            { poids: 6, effets: { moral: -6 }, resultat: NF.t('Au bout de quelques semaines, ils se lassent. Vous, vous avez moins bien dormi.') },
            { poids: 4, effets: function (s) { var pris = volerObjets(s, 1, 0.5); return { sante: -8, moral: -10, journal: journalVol(pris, NF.t('Détruit')) }; },
              resultat: NF.t('Un soir, ça dégénère. Vos affaires finissent dans le caniveau, et vous avec.') },
          ] },
      ] },

    { id: 'sec_plainte_suite', famille: 'securite', force: true, icone: '📨', titre: NF.t('Suite de votre plainte'),
      texte: function (s) {
        return (s.joueur.domiciliation ? NF.t('Un courrier du commissariat') : NF.t('Un agent vous retrouve sur votre coin habituel')) + NF.t(' : vous êtes convoqué pour compléter votre déposition.');
      },
      choix: [
        { texte: NF.t('Me rendre à la convocation'),
          aleatoire: [
            { poids: 4, effets: { moral: 6, reputation: 2, drapeaux: { plainte_deposee: false } }, resultat: NF.t('Les auteurs ont été identifiés. Une mesure de médiation est prononcée. Ils ne sont plus revenus.') },
            { poids: 4, effets: { moral: -4, energie: -4, drapeaux: { plainte_deposee: false } }, resultat: NF.t('Classée sans suite, « auteurs non identifiés ». Vous avez quand même été entendu, et ça compte un peu.') },
            { poids: 2, effets: { moral: 3, xp: { administratif: 10 }, drapeaux: { plainte_deposee: false } }, resultat: NF.t('L\'enquêtrice vous oriente vers une association d\'aide aux victimes. Un accompagnement, et un dossier qui avance.') },
          ] },
        { texte: NF.t('Ne pas y aller'), effets: { moral: -2, drapeaux: { plainte_deposee: false } }, resultat: NF.t('Sans complément, le dossier est classé. Vous n\'en entendrez plus parler.') },
      ] },

    { id: 'sec_demantelement_campement', famille: 'securite', icone: '🚜', titre: NF.t('Démantèlement du campement'),
      texte: NF.t('Un arrêté municipal est placardé sur les grilles : le campement sera « évacué et nettoyé » jeudi à 6 heures. Des agents proposent un hébergement d\'urgence, sans préciser où.'),
      poids: function (s) { return NF.core.saison(s) === 'hiver' ? 1 : 2; }, delai: 10,
      conditions: { logement: 'tente' },
      choix: [
        { texte: NF.t('Plier la tente et partir avant jeudi'),
          effets: { logement: 'rue', moral: -8, energie: -6 }, resultat: NF.t('Vous gardez votre tente, sans endroit où la planter. Il faudra trouver un nouveau coin.') },
        { texte: NF.t('Accepter l\'hébergement proposé'), conditions: { sansDrapeau: 'foyer_interdit' },
          aleatoire: [
            { poids: 5, effets: { logement: 'foyer', moral: 3, hygiene: 5 }, resultat: NF.t('Un bus, puis un foyer à l\'autre bout de la ville. Un lit, une douche, un règlement.') },
            { poids: 3, effets: { logement: 'rue', moral: -10, objets: { tente: -1 } }, resultat: NF.t('Le bus vous dépose devant un centre déjà plein. « Repassez demain. » Vous dormez dehors, sans la tente restée sur place.') },
            { poids: 2, effets: { logement: 'rue', moral: -6, drapeaux: { contact_association: true } }, resultat: NF.t('Pas de place ce soir, mais la travailleuse sociale du bus note votre nom et vous donne le sien.') },
          ] },
        { texte: NF.t('Rester jusqu\'au bout'),
          aleatoire: [
            { poids: 6, effets: { logement: 'rue', moral: -12, objets: { tente: -1 } }, resultat: NF.t('À 6 heures, les pelleteuses. Les tentes partent dans la benne, la vôtre avec.') },
            { poids: 4, effets: { logement: 'rue', moral: -8, energie: -8 }, resultat: NF.t('Vous démontez tout sous les yeux des agents, à la dernière minute. La tente est sauvée.') },
          ] },
        { texte: NF.t('Contester l\'arrêté avec un collectif (compétence administrative)'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 3, effets: { moral: 6, reputation: 3, xp: { administratif: 15 } }, resultat: NF.t('Le tribunal administratif suspend l\'arrêté : pas de relogement prévu, pas d\'évacuation. Pour l\'instant.') },
            { poids: 7, effets: { logement: 'rue', moral: -6, xp: { administratif: 10 } }, resultat: NF.t('Le recours est rejeté. Au moins, vous avez eu le temps de démonter.') },
          ] },
      ] },

    { id: 'sec_chien_errant', famille: 'securite', icone: '🐕', titre: NF.t('Chien errant'),
      texte: NF.t('Un chien maigre, sans collier, rôde autour de votre couchage depuis le matin. Il grogne quand vous bougez, mais ne s\'en va pas.'),
      poids: 1.5, delai: 12,
      conditions: { expose: true, sansDrapeau: 'chien_nourri' },
      choix: [
        { texte: NF.t('Lui donner quelque chose à manger'), conditions: { objet: 'sandwich' },
          effets: { objets: { sandwich: -1 }, moral: 6, drapeaux: { chien_nourri: true } },
          resultat: NF.t('Il mange en vous surveillant, puis se couche à deux mètres. Le soir, il est encore là. Les rôdeurs y regarderont à deux fois.') },
        { texte: NF.t('Rester immobile et le laisser passer'),
          aleatoire: [
            { poids: 7, effets: { moral: -1 }, resultat: NF.t('Il finit par se désintéresser de vous et s\'éloigne vers les poubelles.') },
            { poids: 3, effets: { sante: -6, moral: -4, maladie: { nom: NF.t('Morsure infectée'), duree: 1, sante: 4 } }, resultat: NF.t('Un geste brusque, et il mord. La plaie à la main s\'infecte dans les jours qui suivent.') },
          ] },
        { texte: NF.t('Appeler la fourrière'), conditions: { telephone: true },
          effets: { moral: -2 }, resultat: NF.t('Une camionnette arrive dans l\'après-midi. Vous regardez l\'animal partir sans savoir ce qu\'il deviendra.') },
        { texte: NF.t('Le chasser avec un bâton'),
          aleatoire: [
            { poids: 6, effets: { energie: -3 }, resultat: NF.t('Il recule, aboie, puis part en trottinant.') },
            { poids: 4, effets: { sante: -8, moral: -5 }, resultat: NF.t('Il attaque. Une morsure au mollet, et une matinée aux urgences.') },
          ] },
      ] },

    /* ------------------------------------------------------------------
     * ARNAQUES
     * ---------------------------------------------------------------- */

    { id: 'sec_arnaque_logement', famille: 'securite', icone: '🗝️', titre: NF.t('Une chambre pas chère'),
      texte: NF.t('Un homme croisé à l\'association propose une chambre chez un particulier, sans dossier ni garant. Il demande 150 € d\'avance pour « réserver ». La visite, ce sera après.'),
      poids: 1.5, delai: 14,
      conditions: { logementOrdreMax: 2, argentMin: 150 },
      choix: [
        { texte: NF.t('Payer les 150 € d\'avance'),
          aleatoire: [
            { poids: 8, effets: { argent: -150, moral: -12 }, resultat: NF.t('Le numéro ne répond plus dès le lendemain. L\'adresse donnée est un parking.') },
            { poids: 2, effets: { argent: -150, moral: 6, drapeaux: { hebergement_propose: true } },
              resultat: NF.t('Contre toute attente, la chambre existe : un canapé-lit chez une dame âgée qui veut un peu de compagnie (voir l\'onglet Logement).') },
          ] },
        { texte: NF.t('Demander à visiter avant de payer'), conditions: { competences: { administratif: 1 } },
          effets: { moral: 2, xp: { administratif: 10 } }, resultat: NF.t('Il s\'énerve, puis disparaît. Pas de visite, pas d\'avance : vous avez évité le piège.') },
        { texte: NF.t('Vérifier auprès de mon contact à l\'association'), conditions: { lieu: 'association', drapeau: 'contact_association' },
          effets: { moral: 3, reputation: 1 }, resultat: NF.t('Votre contact le connaît : il a déjà fait le coup à deux personnes. L\'association le signale.') },
        { texte: NF.t('Refuser'), effets: { moral: -1 }, resultat: NF.t('Trop beau pour être vrai. Vous passez votre chemin, avec un pincement.') },
      ] },

    { id: 'sec_arnaque_banque', famille: 'securite', icone: '📞', titre: NF.t('Appel de votre « banque »'),
      texte: NF.t('Un numéro inconnu. Un conseiller très poli explique qu\'une opération frauduleuse vient d\'être détectée sur votre compte et qu\'il faut valider d\'urgence un transfert vers un « compte sécurisé ».'),
      poids: 1.5, delai: 14,
      conditions: { classeMin: 5, argentMin: 1000 },
      choix: [
        { texte: NF.t('Raccrocher et rappeler ma banque au numéro officiel'), conditions: { competences: { gestion: 1 } },
          effets: { moral: 2, xp: { gestion: 5 } }, resultat: NF.t('Aucune opération suspecte. La banque confirme : c\'était une tentative de fraude.') },
        { texte: NF.t('Vérifier le numéro en ligne avant d\'agir'), conditions: { competences: { informatique: 1 } },
          effets: { moral: 1, xp: { informatique: 5 } }, resultat: NF.t('Le numéro est signalé des dizaines de fois sur un forum. Vous bloquez le contact.') },
        { texte: NF.t('Suivre ses instructions'),
          aleatoire: [
            { poids: 7, effets: function (s) { var m = Math.min(4000, Math.round(s.joueur.argent * 0.35)); return { argent: -m, moral: -15, journal: NF.t('Virement frauduleux : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Le « compte sécurisé » est à l\'étranger. La banque ne rembourse pas un virement que vous avez validé vous-même.') },
            { poids: 3, effets: { moral: -5 }, resultat: NF.t('Au moment de valider, un doute. Vous raccrochez. Le numéro ne rappelle jamais.') },
          ] },
      ] },

    /* ------------------------------------------------------------------
     * QUAND ON EST LOGÉ
     * ---------------------------------------------------------------- */

    { id: 'sec_serrure', famille: 'securite', icone: '🚪', titre: NF.t('Une porte qui ne ferme plus'),
      texte: NF.t('La porte de l\'immeuble reste ouverte depuis que l\'interphone a rendu l\'âme, et votre propre serrure se force avec une carte de fidélité. Des inconnus dorment parfois dans la cage d\'escalier.'),
      poids: 1.5, delai: 18,
      conditions: { logementOrdreMin: 3, logementOrdreMax: 6, sansDrapeau: ['logement_securise', 'logement_fragile'] },
      choix: [
        { texte: NF.t('Faire changer la serrure (90 €)'), conditions: { argentMin: 90 },
          effets: { argent: -90, moral: 3, drapeaux: { logement_securise: true } }, resultat: NF.t('Un serrurier, une heure, trois points. Vous dormez mieux.') },
        { texte: NF.t('La renforcer moi-même'), conditions: { competences: { bricolage: 1 }, objet: 'outils' },
          effets: { argent: -20, moral: 2, xp: { bricolage: 12 }, drapeaux: { logement_securise: true } }, resultat: NF.t('Une gâche neuve, un verrou en plus. Pour 20 € de quincaillerie, c\'est solide.') },
        { texte: NF.t('Mettre le propriétaire en demeure'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 5, effets: { moral: 2, xp: { administratif: 10 }, drapeaux: { logement_securise: true } }, resultat: NF.t('Une lettre recommandée citant le bon article. Trois semaines plus tard, un serrurier passe aux frais du bailleur.') },
            { poids: 5, effets: { moral: -3, xp: { administratif: 5 }, drapeaux: { logement_fragile: true } }, resultat: NF.t('Il promet, puis plus rien. Vous relancerez.') },
          ] },
        { texte: NF.t('Laisser comme ça'), effets: { drapeaux: { logement_fragile: true } }, resultat: NF.t('Vous n\'avez rien à voler, de toute façon. Enfin, pas grand-chose.') },
      ] },

    { id: 'sec_intrusion_propriete', famille: 'securite', icone: '🏡', titre: NF.t('Traces d\'effraction'),
      texte: NF.t('Au matin, le portail est forcé et des traces de pas font le tour de la maison. Rien ne manque, cette fois. Le voisinage parle d\'une série de cambriolages.'),
      poids: 1.5, delai: 18,
      conditions: { logement: ['maison', 'villa'], sansDrapeau: 'logement_securise' },
      choix: [
        { texte: NF.t('Installer une alarme et des volets renforcés (1 200 €)'), conditions: { argentMin: 1200 },
          effets: { argent: -1200, moral: 3, drapeaux: { logement_securise: true, logement_fragile: false } }, resultat: NF.t('Capteurs, sirène, télésurveillance. La maison devient une forteresse discrète.') },
        { texte: NF.t('Renforcer moi-même les accès'), conditions: { competences: { bricolage: 2 }, objet: 'outils' },
          effets: { argent: -200, energie: -8, xp: { bricolage: 15 }, drapeaux: { logement_securise: true, logement_fragile: false } }, resultat: NF.t('Un week-end entier : barres, verrous, éclairage à détecteur. Du travail propre.') },
        { texte: NF.t('Signaler à la gendarmerie et organiser une vigilance entre voisins'),
          effets: { moral: 2, reputation: 3, energie: -3 }, resultat: NF.t('Des patrouilles passent plus souvent. Les voisins échangent leurs numéros. Pas de garantie, mais un quartier qui se parle.') },
        { texte: NF.t('Ne rien changer'), effets: { drapeaux: { logement_fragile: true } }, resultat: NF.t('Vous n\'allez pas vivre dans la peur. Vous laissez quand même une lumière allumée.') },
      ] },

    { id: 'sec_cambriolage', famille: 'securite', icone: '🪟', titre: NF.t('Cambriolage'),
      texte: function (s) {
        return NF.t('En rentrant, la porte est entrouverte. Tiroirs renversés, placards vidés. On est passé chez vous') +
          (s.joueur.drapeaux.logement_fragile ? NF.t(', par cette serrure que vous n\'avez jamais fait changer') : '') + '.';
      },
      poids: function (s) { var d = s.joueur.drapeaux; return d.logement_fragile ? 3 : (d.logement_securise ? 0.5 : 1.2); }, delai: 15,
      conditions: { logementOrdreMin: 3 },
      choix: [
        { texte: NF.t('Déposer plainte et déclarer le sinistre à l\'assurance'), conditions: { sansDrapeau: 'papiers_perdus' },
          effets: function (s) { var p = pertesCambriolage(s); return { argent: -p.argent, moral: -8, energie: -4, drapeaux: { cambriolage_declare: true }, programmer: { evenement: 'sec_assurance_suite', dans: 2 }, journal: journalVol(p.pris) }; },
          resultat: NF.t('Plainte, photos, liste des objets. L\'assurance « revient vers vous sous deux mois ».') },
        { texte: NF.t('Constater les dégâts et passer à autre chose'),
          effets: function (s) { var p = pertesCambriolage(s); return { argent: -p.argent, moral: -10, journal: journalVol(p.pris) }; },
          resultat: NF.t('Vous rangez, vous comptez ce qui manque, vous changez d\'avis sur le quartier.') },
        { texte: NF.t('Faire poser une porte blindée (350 €)'), conditions: { argentMin: 350 },
          effets: function (s) { var p = pertesCambriolage(s); return { argent: -(p.argent + 350), moral: -5, drapeaux: { logement_securise: true, logement_fragile: false }, journal: journalVol(p.pris) }; },
          resultat: NF.t('Ce qui a été pris est perdu, mais ça ne se reproduira pas de sitôt.') },
      ] },

    { id: 'sec_assurance_suite', famille: 'securite', force: true, icone: '📑', titre: NF.t('Réponse de l\'assurance'),
      texte: NF.t('Un courrier de l\'assureur au sujet du cambriolage. L\'enveloppe est fine.'),
      choix: [
        { texte: NF.t('Ouvrir'),
          aleatoire: [
            { poids: 5, effets: function (s) { var m = 150 + NF.rng.int(0, 25) * 10; return { argent: m, moral: 5, drapeaux: { cambriolage_declare: false }, journal: NF.t('Indemnisation : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Indemnisation partielle, vétusté déduite. Mieux que rien.') },
            { poids: 3, effets: { moral: -5, drapeaux: { cambriolage_declare: false } }, resultat: NF.t('« Absence d\'effraction caractérisée » : refus de prise en charge. Une serrure forcée sans trace ne compte pas.') },
            { poids: 2, effets: { moral: -2, xp: { administratif: 10 }, drapeaux: { cambriolage_declare: false } }, resultat: NF.t('Il manque une facture. Vous renvoyez le dossier, sans certitude.') },
          ] },
        { texte: NF.t('Relancer l\'assureur avec un dossier complet (compétence administrative)'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 7, effets: function (s) { var m = 250 + NF.rng.int(0, 30) * 10; return { argent: m, moral: 6, xp: { administratif: 15 }, drapeaux: { cambriolage_declare: false }, journal: NF.t('Indemnisation : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Vous citez les clauses, vous joignez le procès-verbal. L\'assureur révise sa position.') },
            { poids: 3, effets: { moral: -4, drapeaux: { cambriolage_declare: false } }, resultat: NF.t('Refus maintenu. Il faudrait un médiateur, et des mois.') },
          ] },
      ] },
  ]);
})();
