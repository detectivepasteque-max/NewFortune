/* =====================================================================
 * ÉVÉNEMENTS – RISQUES MORTELS (vie civile)
 * ---------------------------------------------------------------------
 * Situations rares où la mort est une issue possible : route, chantier,
 * alcool, grand froid, rixe, maladie grave, électricité de squat,
 * baignade, malaise cardiaque, braquage.
 *
 * Règles suivies ici (voir docs/03-evenements.md, « Issues mortelles ») :
 *   - chaque événement garde au moins un choix prudent sans issue mortelle ;
 *   - la mort n'est jamais seule : elle figure dans un `aleatoire` à côté
 *     d'issues indemnes et blessées ;
 *   - son poids passe par NF.api.poidsMortel (traits chanceux / robuste /
 *     fragile, compétence protectrice facultative).
 * Les risques militaires (opérations, entraînement, interventions) sont
 * dans armee.js. Familles : securite, sante, travail, divers selon le cas.
 * ===================================================================== */
(function () {
  var U = NF.util;

  /** Poids d'une issue mortelle : base modulée par les traits et une compétence (voir NF.api.poidsMortel) */
  function mortel(base, comp) { return function (s) { return NF.api.poidsMortel(s, base, comp); }; }
  function niveau(s, comp) { return NF.core.niveauCompetence(s, comp); }
  function metier(s) { return NF.core.metierActuel(s); }
  function estChauffeur(s) { var m = metier(s); return !!(m && m.secteur === 'transport'); }
  function bienCouvert(s) { return NF.api.aObjet(s, 'vetements_chauds') || NF.api.aObjet(s, 'tente'); }

  NF.ajouterEvenements([

    /* ---------------- 1. Route ---------------- */
    { id: 'ris_route_nuit', famille: 'securite', icone: '🚗', titre: NF.t('Longue route'),
      texte: function (s) { return (estChauffeur(s) ? NF.t('Dernière livraison de la journée, trois heures de route encore, et la pluie qui redouble. ') : NF.t('Retour de nuit au volant, trois heures de route, et la pluie qui redouble. ')) + NF.t('Les paupières sont lourdes, les phares d\'en face se dédoublent.'); },
      poids: function (s) { return estChauffeur(s) ? 2.5 : 1.2; }, delai: 14,
      condition: function (s) { return estChauffeur(s) || NF.api.aObjet(s, 'voiture'); },
      choix: [
        { texte: NF.t('M\'arrêter dormir une heure sur une aire'),
          effets: function (s) { return { energie: 4, moral: -1, argent: estChauffeur(s) ? -20 : 0 }; },
          resultat: function (s) { return NF.t('Le siège incliné, le moteur coupé. Vous repartez à l\'aube') + (estChauffeur(s) ? NF.t(', avec un retard que le patron retient sur la prime') : '') + '.'; } },
        { texte: NF.t('Rouler doucement, fenêtre ouverte'),
          aleatoire: [
            { poids: 8, effets: { energie: -8, moral: -2 }, resultat: NF.t('Deux heures de plus, l\'air froid sur le visage. Vous arrivez vidé, mais vous arrivez.') },
            { poids: 2, effets: { sante: -8, energie: -10, moral: -5, argent: -150 }, resultat: NF.t('Un coup de volant trop tard : la glissière. Tôle froissée, nuque raide, et une franchise à payer.') },
            { poids: mortel(0.25, 'conduite'), effets: { mort: NF.t('dans un accident de la route') }, resultat: NF.t('Les yeux se ferment une seconde. Le camion d\'en face n\'a pas le temps de freiner.') }
          ] },
        { texte: NF.t('Continuer, il faut arriver'),
          aleatoire: [
            { poids: 6, effets: { energie: -12, moral: 1 }, resultat: NF.t('Vous arrivez à l\'heure, les mains crispées sur le volant. Vous ne vous souvenez pas des vingt derniers kilomètres.') },
            { poids: 3, effets: function (s) { var e = { sante: -14, energie: -14, moral: -6, argent: -150, maladie: { nom: NF.t('Coup du lapin'), duree: 1, sante: 4 } }; if (!estChauffeur(s) && NF.api.aObjet(s, 'voiture')) e.objets = { voiture: -1 }; return e; },
              resultat: NF.t('Un arbre, à cinquante à l\'heure. Les pompiers vous désincarcèrent. La voiture est bonne pour la casse.') },
            { poids: mortel(0.8, 'conduite'), effets: { mort: NF.t('dans un accident de la route') }, resultat: NF.t('Les yeux se ferment une seconde. Le camion d\'en face n\'a pas le temps de freiner.') }
          ] }
      ] },

    /* ---------------- 2. Chantier ---------------- */
    { id: 'ris_echafaudage', famille: 'travail', icone: '🏗️', titre: NF.t('Sans harnais'),
      texte: NF.t('Le chantier a pris du retard. Le chef vous envoie au troisième niveau de l\'échafaudage, celui où les garde-corps ne sont pas encore posés. Les harnais sont restés dans la camionnette, et personne n\'a l\'air de vouloir aller les chercher.'),
      poids: 2, delai: 14,
      conditions: { secteur: 'batiment', emploiNiveauMax: 3 },
      choix: [
        { texte: NF.t('Refuser de monter sans harnais'),
          aleatoire: [
            { poids: 6, effets: { moral: 3, reputation: 1, xp: { administratif: 4 } }, resultat: NF.t('Le chef râle, puis envoie l\'apprenti chercher les harnais. Vous montez une heure plus tard, attaché.') },
            { poids: 4, effets: { moral: -4, reputation: -2 }, resultat: NF.t('« Si c\'est trop dangereux pour toi, il y en a d\'autres qui attendent. » Vous montez le lendemain, attaché, mais le chef a retenu votre nom.') }
          ] },
        { texte: NF.t('Installer une ligne de vie moi-même'), conditions: { competences: { bricolage: 2 } },
          effets: { energie: -8, moral: 2, reputation: 2, xp: { bricolage: 8, technique: 4 } },
          resultat: NF.t('Une sangle, deux mousquetons, un point d\'ancrage solide. Le chef hausse les épaules, puis finit par en faire poser sur les autres niveaux.') },
        { texte: NF.t('Monter quand même'),
          aleatoire: [
            { poids: 7, effets: { energie: -10, moral: -2, reputation: 1 }, resultat: NF.t('Une journée à travailler sans regarder en bas. Le soir, les jambes tremblent encore.') },
            { poids: 2, effets: { sante: -16, energie: -12, moral: -6, maladie: { nom: NF.t('Fractures'), duree: 3, sante: 5 } }, resultat: NF.t('Une planche qui bascule, trois mètres de chute sur un tas de parpaings. Bassin fêlé, deux mois de rééducation.') },
            { poids: mortel(0.6), effets: { mort: NF.t('d\'une chute sur un chantier') }, resultat: NF.t('Une planche qui bascule. Douze mètres. Le chantier sera fermé trois jours pour l\'enquête.') }
          ] }
      ] },

    /* ---------------- 3. Alcool ---------------- */
    { id: 'ris_coma_ethylique', famille: 'sante', icone: '🍾', titre: NF.t('Une soirée de trop'),
      texte: NF.t('Une bouteille partagée, puis une autre, puis une que personne ne partage plus. La soirée se brouille. Quelqu\'un propose de finir ce qui reste.'),
      poids: 2.5, delai: 10,
      conditions: { drapeau: 'alcool' },
      choix: [
        { texte: NF.t('M\'arrêter là et rentrer'), effets: { sante: -3, moral: -2, energie: -4 }, resultat: NF.t('Vous rentrez en titubant, mais vous rentrez. Le réveil est difficile, pas plus.') },
        { texte: NF.t('Demander de l\'aide, pour de bon'), conditions: { lieu: 'association' },
          aleatoire: [
            { poids: 5, effets: { moral: 4, sante: 2, drapeaux: { alcool: false } }, resultat: NF.t('Le lendemain, vous poussez la porte de l\'association. Un groupe de parole, un suivi. Vous ne buvez plus, pour l\'instant.') },
            { poids: 5, effets: { moral: -3, sante: -3 }, resultat: NF.t('Vous prenez rendez-vous. Vous n\'y allez pas.') }
          ] },
        { texte: NF.t('Finir la bouteille'),
          aleatoire: [
            { poids: 7, effets: { sante: -10, hygiene: -10, energie: -12, moral: -6, argent: -20 }, resultat: NF.t('Trou noir. Vous vous réveillez par terre, sans savoir où, avec un portefeuille plus léger.') },
            { poids: 2, effets: { sante: -18, energie: -15, moral: -10, maladie: { nom: NF.t('Pancréatite'), duree: 2, sante: 6 } }, resultat: NF.t('Les urgences, un lavage d\'estomac, et un médecin qui ne mâche pas ses mots. Le foie et le pancréas ont souffert.') },
            { poids: mortel(0.6), effets: { mort: NF.t('d\'un coma éthylique') }, resultat: NF.t('Vous vous endormez sur le dos. Personne ne vous retourne.') }
          ] }
      ] },

    /* ---------------- 4. Grand froid ---------------- */
    { id: 'ris_grand_froid', famille: 'sante', icone: '🥶', titre: NF.t('Nuit de grand froid'),
      texte: NF.t('Moins douze annoncés cette nuit, et le vent en plus. Les maraudes passent tôt et proposent le gymnase ouvert en urgence. Ceux qui restent dehors le savent : ce n\'est pas une nuit comme les autres.'),
      poids: function (s) { return s.joueur.jauges.sante < 50 || s.joueur.jauges.energie < 35 ? 3.5 : 2; }, delai: 10,
      conditions: { expose: true, saison: 'hiver' },
      choix: [
        { texte: NF.t('Monter dans le camion de la maraude'), conditions: { sansDrapeau: 'foyer_interdit' },
          effets: { energie: 4, hygiene: -2, moral: 1, drapeaux: { contact_association: true } },
          resultat: NF.t('Un gymnase ouvert pour la nuit, des lits de camp alignés, de la soupe. Pas vraiment de sommeil, mais de la chaleur.') },
        { texte: NF.t('Passer la nuit à la gare'), conditions: { lieu: 'gare' },
          aleatoire: [
            { poids: 6, effets: { energie: -8, moral: -3 }, resultat: NF.t('Le hall reste ouvert. Vous dormez assis, réveillé par chaque annonce. Vous êtes vivant au matin.') },
            { poids: 4, effets: { energie: -10, moral: -6, sante: -4 }, resultat: NF.t('La sécurité vous fait sortir à deux heures du matin. Vous marchez jusqu\'au jour pour ne pas vous endormir.') }
          ] },
        { texte: NF.t('Rester dans mon abri, emmitouflé'),
          aleatoire: [
            { poids: function (s) { return bienCouvert(s) ? 8 : 5; }, effets: { sante: -8, energie: -10, moral: -4 }, resultat: NF.t('Vous ne dormez pas, vous attendez. Les doigts bleus au matin, mais le matin arrive.') },
            { poids: 2, effets: { sante: -16, energie: -12, moral: -8, maladie: { nom: NF.t('Engelures'), duree: 2, sante: 5 } }, resultat: NF.t('Les maraudeurs vous trouvent à l\'aube, à moitié conscient. Hôpital, et deux orteils qui ne reviendront pas.') },
            { poids: function (s) { return NF.api.poidsMortel(s, bienCouvert(s) ? 0.4 : 1); }, effets: { mort: NF.t('de froid, une nuit d\'hiver') }, resultat: NF.t('Vers quatre heures, vous n\'avez plus froid. C\'est le signe que tout le monde redoute.') }
          ] }
      ] },

    /* ---------------- 5. Rixe ---------------- */
    { id: 'ris_rixe', famille: 'securite', icone: '🔪', titre: NF.t('Ça dégénère'),
      texte: NF.t('Deux hommes se disputent à quelques mètres, pour une place, pour une dette, pour rien. Les voix montent, un cercle se forme. L\'un des deux glisse la main dans sa poche.'),
      poids: 1.5, delai: 12,
      conditions: { logementOrdreMax: 2 },
      choix: [
        { texte: NF.t('M\'éloigner sans me retourner'), effets: { moral: -2 }, resultat: NF.t('Vous entendez les cris de loin, puis les sirènes. Ce n\'était pas votre histoire.') },
        { texte: NF.t('Appeler la police'), conditions: { telephone: true },
          aleatoire: [
            { poids: 6, effets: { moral: 2, reputation: 1 }, resultat: NF.t('La patrouille arrive avant le pire. L\'un des deux part menotté, l\'autre à l\'hôpital.') },
            { poids: 4, effets: { moral: -3, reputation: -2 }, resultat: NF.t('Quelqu\'un vous a vu téléphoner. Dans le quartier, on sait maintenant que vous appelez la police.') }
          ] },
        { texte: NF.t('M\'interposer'),
          aleatoire: [
            { poids: 6, effets: { moral: 4, reputation: 4, sante: -4, energie: -6 }, resultat: NF.t('Vous vous mettez entre les deux. Une bousculade, des insultes, puis ça retombe. On vous en saura gré.') },
            { poids: 3, effets: { sante: -18, energie: -12, moral: -8, maladie: { nom: NF.t('Plaie profonde'), duree: 2, sante: 5 }, drapeaux: { agression_subie: true } }, resultat: NF.t('La lame était pour l\'autre. C\'est vous qu\'elle trouve, au bras et au flanc. Les urgences, douze points de suture.') },
            { poids: mortel(0.7, 'sport'), effets: { mort: NF.t('poignardé dans une rixe') }, resultat: NF.t('La lame était pour l\'autre. Vous ne la voyez pas venir.') }
          ] }
      ] },

    /* ---------------- 6. Maladie grave ---------------- */
    { id: 'ris_diagnostic', famille: 'sante', icone: '🏥', titre: NF.t('Le diagnostic'),
      texte: NF.t('Une fatigue qui ne passe pas, du poids perdu sans raison, puis des examens. Le médecin pose les résultats sur le bureau et prend son temps pour parler. Il faut se soigner, vite, et le traitement sera long.'),
      poids: function (s) { var p = 1; if (s.joueur.jauges.sante < 50) p *= 2; if (s.joueur.drapeaux.alcool) p *= 1.5; if (NF.core.ageAnnees(s) >= 50) p *= 1.5; return p; }, delai: 36,
      conditions: { ageMin: 35, maladie: false },
      choix: [
        { texte: NF.t('Suivre le traitement à l\'hôpital'), conditions: { lieu: 'hopital' },
          effets: { energie: -12, moral: -6, maladie: { nom: NF.t('Traitement lourd'), duree: 3, sante: 3 }, xp: { soins: 10 } },
          resultat: NF.t('Trois mois de rendez-vous, de salles d\'attente et de nausées. Le corps encaisse, et finit par répondre.') },
        { texte: NF.t('Faire une demande de prise en charge'), conditions: { domiciliation: true },
          effets: { energie: -10, moral: -5, maladie: { nom: NF.t('Traitement lourd'), duree: 4, sante: 4 }, xp: { administratif: 10, soins: 6 } },
          resultat: NF.t('Des formulaires, un dossier, trois semaines d\'attente avant le premier rendez-vous. Puis le traitement, long, mais pris en charge.') },
        { texte: NF.t('Me faire soigner en clinique (400 €)'), conditions: { argentMin: 400 },
          effets: { argent: -400, energie: -8, moral: -3, maladie: { nom: NF.t('Traitement'), duree: 2, sante: 2 } },
          resultat: NF.t('Une chambre seule, un protocole plus court, des médecins disponibles. L\'argent achète du temps, et un peu de confort.') },
        { texte: NF.t('Ne pas me soigner'),
          aleatoire: [
            { poids: 4, effets: { sante: -12, moral: -8, maladie: { nom: NF.t('Maladie non soignée'), duree: 4, sante: 6 } }, resultat: NF.t('Vous rangez les résultats dans un sac. Les mois suivants sont longs, et le corps vous le fait payer.') },
            { poids: 2, effets: { sante: -6, moral: -4 }, resultat: NF.t('Contre toute attente, ça se stabilise. Le médecin parle de rémission spontanée, sans trop y croire.') },
            { poids: mortel(1.2), effets: { mort: NF.t('d\'une maladie non soignée') }, resultat: NF.t('Vous rangez les résultats dans un sac. La maladie, elle, ne range rien.') }
          ] }
      ] },

    /* ---------------- 7. Électricité de squat ---------------- */
    { id: 'ris_branchement_squat', famille: 'divers', icone: '⚡', titre: NF.t('Du courant dans le squat'),
      texte: NF.t('Le compteur du bâtiment est encore sous tension. Quelqu\'un a repéré le câble d\'arrivée derrière le local poubelles : avec deux pinces et un peu de culot, tout le squat aurait de la lumière et un radiateur.'),
      poids: 2, delai: 14,
      conditions: { logement: 'squat' },
      choix: [
        { texte: NF.t('Faire le branchement moi-même'),
          aleatoire: [
            { poids: function (s) { return 5 + 2 * niveau(s, 'bricolage'); }, effets: { moral: 8, hygiene: 6, energie: 6, reputation: 3, xp: { bricolage: 14, technique: 6 } }, resultat: NF.t('Gants, pinces isolées, un geste sûr. La lumière revient dans les couloirs, et le squat vous regarde autrement.') },
            { poids: 2, effets: { sante: -14, energie: -12, moral: -6 }, resultat: NF.t('Un arc électrique, les mains brûlées. Vous lâchez tout. Quinze jours avec les doigts bandés.') },
            { poids: mortel(0.7, 'bricolage'), effets: { mort: NF.t('électrocuté dans un squat') }, resultat: NF.t('Les deux pinces se touchent. Le compteur disjoncte, trop tard.') }
          ] },
        { texte: NF.t('Payer quelqu\'un qui s\'y connaît (30 €)'), conditions: { argentMin: 30 },
          effets: { argent: -30, moral: 6, hygiene: 6, energie: 4, xp: { bricolage: 4 } },
          resultat: NF.t('Un ancien électricien du squat d\'à côté fait le branchement en vingt minutes, en vous expliquant chaque geste.') },
        { texte: NF.t('Laisser le câble où il est'), effets: { moral: -3 }, resultat: NF.t('Vous dites non, et les autres n\'osent pas sans vous. Le squat reste à la bougie, et vous avec.') }
      ] },

    /* ---------------- 8. Baignade ---------------- */
    { id: 'ris_baignade', famille: 'divers', icone: '🏊', titre: NF.t('Baignade'),
      texte: NF.t('Grosse chaleur, et l\'eau à portée de main : la rivière, la carrière inondée, la plage en bout de ligne. Des gens plongent depuis le ponton. Le courant, lui, ne se voit pas.'),
      poids: 1.2, delai: 20,
      conditions: { saison: 'ete' },
      choix: [
        { texte: NF.t('Rester près du bord'), effets: { moral: 5, hygiene: 8, energie: 2 }, resultat: NF.t('De l\'eau jusqu\'à la taille, le soleil sur les épaules. Une bonne journée, pour une fois.') },
        { texte: NF.t('Nager jusqu\'à la bouée'),
          aleatoire: [
            { poids: function (s) { return 7 + 2 * niveau(s, 'sport'); }, effets: { moral: 8, hygiene: 8, energie: -6, xp: { sport: 10 } }, resultat: NF.t('Deux cents mètres aller, deux cents retour. Vous ressortez essoufflé et content de vous.') },
            { poids: 2, effets: { sante: -8, energie: -14, moral: -6 }, resultat: NF.t('Le courant vous déporte. Un pêcheur vous tend une gaffe depuis la berge. Vous recrachez de l\'eau pendant une heure.') },
            { poids: mortel(0.4, 'sport'), effets: { mort: NF.t('noyé') }, resultat: NF.t('Le courant vous déporte. Personne ne vous voit couler.') }
          ] },
        { texte: NF.t('Pêcher plutôt que nager'), conditions: { competences: { peche: 1 } },
          effets: { moral: 4, nourriture: 8, energie: -2, xp: { peche: 8 } }, resultat: NF.t('Les pieds dans l\'eau, la ligne tendue. Deux poissons, et le calme.') }
      ] },

    /* ---------------- 9. Malaise cardiaque ---------------- */
    { id: 'ris_malaise_cardiaque', famille: 'sante', icone: '💔', titre: NF.t('Douleur dans la poitrine'),
      texte: NF.t('Une barre dans la poitrine, le bras gauche lourd, une sueur froide. Ça vient d\'un coup, en montant un escalier. Vous vous asseyez sur une marche.'),
      poids: function (s) { var p = 1; if (s.joueur.jauges.sante < 50) p *= 2; if (s.joueur.drapeaux.alcool) p *= 1.5; if (NF.core.ageAnnees(s) >= 60) p *= 1.5; return p; }, delai: 24,
      conditions: { ageMin: 45 },
      choix: [
        { texte: NF.t('Appeler les secours'), conditions: { telephone: true },
          effets: { sante: -8, energie: -10, moral: -4, maladie: { nom: NF.t('Convalescence'), duree: 2, sante: 2 }, xp: { soins: 6 } },
          resultat: NF.t('L\'ambulance en douze minutes. Un stent, quatre jours à l\'hôpital, un traitement à vie. Le médecin dit que vous avez bien fait d\'appeler tout de suite.') },
        { texte: NF.t('Demander à quelqu\'un d\'appeler les secours'),
          aleatoire: [
            { poids: 7, effets: { sante: -10, energie: -10, moral: -5, maladie: { nom: NF.t('Convalescence'), duree: 2, sante: 3 } }, resultat: NF.t('Un passant s\'arrête, compose le numéro, reste avec vous. Les secours arrivent à temps.') },
            { poids: 2, effets: { sante: -18, energie: -14, moral: -8, maladie: { nom: NF.t('Cœur fragilisé'), duree: 3, sante: 4 } }, resultat: NF.t('Les gens passent. Quelqu\'un finit par s\'arrêter, longtemps après. Le cœur a souffert.') },
            { poids: mortel(0.5), effets: { mort: NF.t('d\'un arrêt cardiaque') }, resultat: NF.t('Les gens passent. Vous vous allongez sur la marche.') }
          ] },
        { texte: NF.t('Attendre que ça passe'),
          aleatoire: [
            { poids: 5, effets: { sante: -14, energie: -12, moral: -6, maladie: { nom: NF.t('Cœur fragilisé'), duree: 3, sante: 5 } }, resultat: NF.t('Ça passe, après une heure. Le cœur y a laissé des plumes, et vous le saurez à chaque escalier.') },
            { poids: mortel(1.5), effets: { mort: NF.t('d\'un arrêt cardiaque') }, resultat: NF.t('Ça ne passe pas.') }
          ] }
      ] },

    /* ---------------- 10. Braquage ---------------- */
    { id: 'ris_braquage', famille: 'securite', icone: '🛡️', titre: NF.t('Braquage'),
      texte: NF.t('Fin de service, le rideau à moitié baissé. Deux hommes cagoulés entrent, et l\'un d\'eux pointe une arme sur la caissière. Vous êtes le seul en uniforme, et l\'uniforme ne protège de rien.'),
      poids: 2, delai: 16,
      conditions: { emploi: 'agent_securite' },
      choix: [
        { texte: NF.t('Obéir et ne pas bouger'), effets: { moral: -8, reputation: -1, energie: -6 }, resultat: NF.t('Ils vident la caisse et partent. Vous tremblez pendant une heure, et vous vous en voulez. Vous êtes vivant.') },
        { texte: NF.t('Déclencher l\'alarme discrètement'), conditions: { competences: { technique: 1 } },
          aleatoire: [
            { poids: 7, effets: { moral: 4, reputation: 5, energie: -8, xp: { technique: 6 } }, resultat: NF.t('Le boîtier est à portée de main. La sirène se déclenche quand ils sortent, et la police les cueille au coin de la rue.') },
            { poids: 2, effets: { sante: -12, energie: -10, moral: -8 }, resultat: NF.t('L\'un d\'eux a vu votre main. Un coup de crosse, et le noir.') },
            { poids: mortel(0.3), effets: { mort: NF.t('lors d\'un braquage') }, resultat: NF.t('L\'un d\'eux a vu votre main.') }
          ] },
        { texte: NF.t('M\'interposer'),
          aleatoire: [
            { poids: 5, effets: { moral: 6, reputation: 8, sante: -6, energie: -10, xp: { sport: 6 } }, resultat: NF.t('Vous désarmez le plus proche. L\'autre s\'enfuit. Votre photo est dans le journal, et le patron vous offre une prime.') },
            { poids: 3, effets: { sante: -20, energie: -14, moral: -10, reputation: 4, maladie: { nom: NF.t('Blessure par balle'), duree: 3, sante: 5 } }, resultat: NF.t('Le coup part. L\'épaule. Vous vous réveillez à l\'hôpital, avec un médecin et un policier au pied du lit.') },
            { poids: mortel(1), effets: { mort: NF.t('lors d\'un braquage') }, resultat: NF.t('Le coup part.') }
          ] }
      ] }
  ]);
})();
