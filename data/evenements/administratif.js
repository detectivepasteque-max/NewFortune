/* =====================================================================
 * ÉVÉNEMENTS – ADMINISTRATIF
 * ---------------------------------------------------------------------
 * Papiers, domiciliation, aides, contrôles, courriers, amendes, impôts,
 * tribunal. Même schéma que sante.js (voir src/core/evenements.js).
 *
 * Chaînes :
 *   adm_papiers_perdus        → (association) → adm_papiers_refaits      (programmé, force)
 *   adm_domiciliation_reponse → (refus)       → adm_domiciliation_recours (drapeau domiciliation_refusee)
 *   adm_rdv_manque            → (radiation)   → adm_reinscription_pole   (drapeau radie_pole ;
 *                                                bloque aussi adm_formation_proposee)
 *   adm_erreur_virement       → (garder)      → adm_indu_reclame         (programmé, force)
 *
 * Drapeaux introduits : domiciliation_refusee, radie_pole, indu_en_attente
 * Drapeaux du moteur réutilisés : papiers_perdus, contact_association,
 *   connu_inspection
 * État utilisé : s.joueur.aides, s.joueur.domiciliation, s.joueur.casier,
 *   s.joueur.dette
 * ===================================================================== */
(function () {

  /** Identifiant de la première aide active du joueur, ou null */
  function aideActive(s) {
    for (var id in s.joueur.aides) if (s.joueur.aides[id]) return id;
    return null;
  }

  function nomAide(id) { return id ? id.toUpperCase() : 'aide'; }

  /** Suspend la première aide active ; retourne son identifiant (ou null) */
  function suspendreAide(s) {
    var id = aideActive(s);
    if (id) s.joueur.aides[id] = false;
    return id;
  }

  /** Reliquat d'impôt réclamé : environ la moitié d'un salaire, arrondi à la dizaine */
  function montantImpot(s) {
    var sal = s.joueur.emploi ? s.joueur.emploi.salaire : 400;
    return Math.max(150, Math.round(sal * 0.5 / 10) * 10);
  }

  /** Compétence enseignée par la formation proposée : celle du secteur qui recrute le plus dans la ville */
  function competenceFormation(s) {
    var secteurs = { technique: 'industrie', informatique: 'informatique', soins: 'sante', gestion: 'bureau', cuisine: 'restauration' };
    var meilleure = 'technique', max = -1;
    for (var comp in secteurs) {
      var m = (s.ville.marche && s.ville.marche[secteurs[comp]]) || 1;
      if (m > max) { max = m; meilleure = comp; }
    }
    return meilleure;
  }

  NF.ajouterEvenements([

    /* ------------------------------------------------------------------
     * PAPIERS ET DOMICILIATION
     * ---------------------------------------------------------------- */

    { id: 'adm_papiers_perdus', famille: 'administratif', icone: '🪪', titre: NF.t('Plus de papiers'),
      texte: NF.t('Votre pochette avec la carte d\'identité, la carte vitale et les derniers courriers a disparu. Volée, perdue dans un déménagement de fortune, peu importe : il n\'y a plus rien.'),
      poids: 2, delai: 14,
      conditions: { logementOrdreMax: 2, sansDrapeau: 'papiers_perdus' },
      choix: [
        { texte: NF.t('Déclarer la perte au commissariat'),
          effets: { moral: -5, energie: -3, drapeaux: { papiers_perdus: true } },
          resultat: NF.t('Un récépissé de déclaration de perte. Il faudra maintenant tout refaire (action Démarches).') },
        { texte: NF.t('Refaire le chemin de la veille, lampe en main'), conditions: { objet: 'lampe' },
          aleatoire: [
            { poids: 4, effets: { energie: -6, moral: 4 }, resultat: NF.t('Sous un banc, trempée mais entière : la pochette. Vous la serrez contre vous.') },
            { poids: 6, effets: { energie: -8, moral: -6, drapeaux: { papiers_perdus: true } }, resultat: NF.t('Rien. Les papiers sont partis pour de bon.') },
          ] },
        { texte: NF.t('Demander à mon contact de l\'association de m\'accompagner'), conditions: { lieu: 'association', drapeau: 'contact_association' },
          effets: { moral: -2, drapeaux: { papiers_perdus: true }, programmer: { evenement: 'adm_papiers_refaits', dans: 2 } },
          resultat: NF.t('Il connaît la procédure et le bon guichet. Il prend rendez-vous pour vous dans deux mois. En attendant, vous êtes sans papiers.') },
        { texte: NF.t('Remettre ça à plus tard'), effets: { moral: -3, drapeaux: { papiers_perdus: true } },
          resultat: NF.t('Sans papiers, chaque contrôle et chaque démarche deviendra un problème.') },
      ] },

    { id: 'adm_papiers_refaits', famille: 'administratif', force: true, icone: '✅', titre: NF.t('Rendez-vous en mairie'),
      texte: function (s) {
        return s.joueur.drapeaux.papiers_perdus
          ? NF.t('Le rendez-vous pris par l\'association : photos, formulaire, empreintes. Votre contact est assis à côté de vous.')
          : NF.t('Le rendez-vous pris par l\'association tombe, mais vos papiers sont déjà en règle. Un café ensemble, et c\'est tout.');
      },
      choix: [
        { texte: NF.t('Refaire mes papiers'), cache: true, condition: function (s) { return !!s.joueur.drapeaux.papiers_perdus; },
          effets: { moral: 6, xp: { administratif: 10 }, drapeaux: { papiers_perdus: false } },
          resultat: NF.t('Une carte provisoire dans la main. Vous existez de nouveau sur le papier.') },
        { texte: NF.t('Prendre un café'), cache: true, condition: function (s) { return !s.joueur.drapeaux.papiers_perdus; },
          effets: { moral: 2 }, resultat: NF.t('Un café avec quelqu\'un qui vous veut du bien.') },
      ] },

    { id: 'adm_domiciliation_reponse', famille: 'administratif', icone: '📬', titre: NF.t('Votre demande de domiciliation'),
      texte: NF.t('Le CCAS examine votre demande d\'adresse administrative. La réponse doit tomber ces jours-ci, et vous savez que le motif de refus habituel est l\'« absence de lien avec la commune ».'),
      poids: 2, delai: 8,
      conditions: { domiciliation: false, logementOrdreMax: 2, sansDrapeau: 'domiciliation_refusee' },
      choix: [
        { texte: NF.t('Attendre la réponse'),
          aleatoire: [
            { poids: 5, effets: { domiciliation: true, moral: 8, xp: { administratif: 10 } }, resultat: NF.t('Accordée. Une adresse pour recevoir du courrier, demander des aides, signer un contrat. Un premier ancrage.') },
            { poids: 5, effets: { moral: -6, drapeaux: { domiciliation_refusee: true } }, resultat: NF.t('Refusée : « absence de lien avec la commune ». Un recours est possible, dit la dernière ligne.') },
          ] },
        { texte: NF.t('Faire appuyer la demande par mon contact à l\'association'), conditions: { lieu: 'association', drapeau: 'contact_association' },
          aleatoire: [
            { poids: 8, effets: { domiciliation: true, moral: 8, reputation: 1 }, resultat: NF.t('Un coup de téléphone de votre contact a suffi à débloquer le dossier. Domiciliation accordée.') },
            { poids: 2, effets: { moral: -4, drapeaux: { domiciliation_refusee: true } }, resultat: NF.t('Même avec l\'appui de l\'association, le CCAS refuse. Il reste le recours.') },
          ] },
        { texte: NF.t('Compléter le dossier avant qu\'il soit examiné'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 7, effets: { domiciliation: true, moral: 7, xp: { administratif: 15 } }, resultat: NF.t('Une attestation de la bibliothèque, un courrier de l\'hôpital : le lien avec la commune est établi. Accordée.') },
            { poids: 3, effets: { moral: -4, drapeaux: { domiciliation_refusee: true } }, resultat: NF.t('Dossier jugé insuffisant. Refus, avec possibilité de recours.') },
          ] },
      ] },

    { id: 'adm_domiciliation_recours', famille: 'administratif', icone: '⚖️', titre: NF.t('Recours contre le refus'),
      texte: NF.t('Vous avez deux mois pour contester le refus de domiciliation. La lettre type est sur le site de la préfecture, à condition de savoir la remplir.'),
      poids: 3, delai: 6,
      conditions: { drapeau: 'domiciliation_refusee', domiciliation: false },
      choix: [
        { texte: NF.t('Rédiger le recours'), conditions: { competences: { lecture: 1 } },
          aleatoire: [
            { poids: 6, effets: { domiciliation: true, moral: 8, xp: { administratif: 20 }, drapeaux: { domiciliation_refusee: false } }, resultat: NF.t('La préfecture vous donne raison : le CCAS ne pouvait pas refuser. Domiciliation accordée.') },
            { poids: 4, effets: { moral: -5, xp: { administratif: 10 }, drapeaux: { domiciliation_refusee: false } }, resultat: NF.t('Recours rejeté. Il faudra redéposer une demande, ailleurs ou plus tard.') },
          ] },
        { texte: NF.t('Passer par une association agréée'), conditions: { lieu: 'association' },
          aleatoire: [
            { poids: 7, effets: { domiciliation: true, moral: 6, drapeaux: { domiciliation_refusee: false } }, resultat: NF.t('L\'association est elle-même agréée pour la domiciliation. Votre courrier arrivera chez elle. C\'est réglé.') },
            { poids: 3, effets: { moral: -3, drapeaux: { domiciliation_refusee: false } }, resultat: NF.t('L\'association a atteint son quota de domiciliations. Revenez dans quelques mois.') },
          ] },
        { texte: NF.t('Laisser tomber'), effets: { moral: -4, drapeaux: { domiciliation_refusee: false } }, resultat: NF.t('Sans adresse, tout le reste attendra.') },
      ] },

    { id: 'adm_courrier_perdu', famille: 'administratif', icone: '✉️', titre: NF.t('Un courrier qui ne vous a jamais trouvé'),
      texte: NF.t('Par hasard, vous apprenez qu\'une convocation importante vous attendait depuis des semaines. Sans adresse, elle est repartie à l\'expéditeur avec la mention « n\'habite pas à l\'adresse indiquée ».'),
      poids: 2, delai: 9,
      conditions: { domiciliation: false, logementOrdreMax: 2 },
      choix: [
        { texte: NF.t('Rappeler l\'expéditeur avant qu\'il soit trop tard'), conditions: { telephone: true },
          aleatoire: [
            { poids: 6, effets: { moral: 2, energie: -4 }, resultat: NF.t('Vingt minutes de musique d\'attente, puis une personne qui accepte de reporter le rendez-vous.') },
            { poids: 4, effets: { moral: -5 }, resultat: NF.t('« Le délai est dépassé. Il faut refaire une demande. »') },
          ] },
        { texte: NF.t('Demander une domiciliation d\'urgence à l\'association'), conditions: { lieu: 'association' },
          aleatoire: [
            { poids: 4, effets: { domiciliation: true, moral: 6 }, resultat: NF.t('L\'association vous domicilie dans la semaine. Le prochain courrier arrivera.') },
            { poids: 6, effets: { moral: -3, xp: { administratif: 5 } }, resultat: NF.t('Liste d\'attente. On vous explique au moins comment faire garder votre courrier en poste restante.') },
          ] },
        { texte: NF.t('Tant pis'), effets: { moral: -6 }, resultat: NF.t('Vous ne saurez jamais ce que contenait cette lettre.') },
      ] },

    /* ------------------------------------------------------------------
     * AIDES ET CAF
     * ---------------------------------------------------------------- */

    { id: 'adm_aide_suspendue', famille: 'administratif', icone: '📉', titre: NF.t('Aide suspendue'),
      texte: function (s) { return NF.t('Un courrier de la CAF : faute de déclaration trimestrielle de ressources, le versement de votre ') + nomAide(aideActive(s)) + NF.t(' est suspendu.'); },
      poids: 2, delai: 10,
      condition: function (s) { return !!aideActive(s); },
      choix: [
        { texte: NF.t('Faire la déclaration en ligne'), conditions: { competences: { informatique: 1 } },
          aleatoire: [
            { poids: 8, effets: { moral: 2, xp: { informatique: 5, administratif: 5 } }, resultat: NF.t('Dix minutes sur le site, une fois le mot de passe retrouvé. Le versement reprend le mois prochain.') },
            { poids: 2, effets: function (s) { var id = suspendreAide(s); return { moral: -4, journal: NF.t('Aide suspendue : ') + nomAide(id) + '.' }; },
              resultat: NF.t('Le site bloque sur une pièce manquante. Le versement est suspendu. Il faudra redéposer une demande (Démarches).') },
          ] },
        { texte: NF.t('Me rendre au guichet'), effets: { energie: -6, moral: -2, xp: { administratif: 8 } },
          resultat: NF.t('Une matinée de file d\'attente. La déclaration est faite, le versement reprend.') },
        { texte: NF.t('Ignorer le courrier'), effets: function (s) { var id = suspendreAide(s); return { moral: -3, journal: NF.t('Aide suspendue : ') + nomAide(id) + '.' }; },
          resultat: NF.t('Sans réponse de votre part, le dossier est clos. Tout est à recommencer.') },
      ] },

    { id: 'adm_controle_caf', famille: 'administratif', icone: '🔍', titre: NF.t('Contrôle de la CAF'),
      texte: NF.t('Un contrôleur de la CAF vous convoque : vérification de votre situation, de vos ressources et de votre logement sur les douze derniers mois.'),
      poids: function (s) { var m = NF.core.metierActuel(s); return m && m.nonDeclare ? 3 : 1.5; }, delai: 14,
      condition: function (s) { return !!aideActive(s); },
      choix: [
        { texte: NF.t('Préparer un dossier complet'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 7, effets: { moral: 3, xp: { administratif: 10 } }, resultat: NF.t('Relevés, attestations, bulletins. Le contrôleur n\'a rien à redire.') },
            { poids: 3, effets: function (s) { var m = 150 + NF.rng.int(0, 10) * 10; return { dette: m, moral: -4, journal: NF.t('Trop-perçu à rembourser : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Une ressource oubliée sur un trimestre : un petit trop-perçu à rembourser.') },
          ] },
        { texte: NF.t('Y aller avec ce que j\'ai'),
          aleatoire: [
            { poids: 4, effets: { moral: 1 }, resultat: NF.t('Le contrôleur est compréhensif. Rien à signaler.') },
            { poids: 4, effets: function (s) { var m = 250 + NF.rng.int(0, 15) * 10; return { dette: m, moral: -6, journal: NF.t('Trop-perçu à rembourser : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Des revenus non déclarés sur deux mois. Un trop-perçu, retenu sur vos prochains versements.') },
            { poids: 2, effets: function (s) { var id = suspendreAide(s); return { moral: -8, dette: 300, journal: NF.t('Aide suspendue : ') + nomAide(id) + '.' }; },
              resultat: NF.t('Incohérences dans le dossier : l\'aide est suspendue et un indu réclamé.') },
          ] },
        { texte: NF.t('Ne pas répondre à la convocation'),
          effets: function (s) { var id = suspendreAide(s); return { moral: -5, dette: 200, journal: NF.t('Aide suspendue : ') + nomAide(id) + '.' }; },
          resultat: NF.t('Absence au contrôle : droits suspendus, et un trop-perçu calculé par défaut.') },
      ] },

    { id: 'adm_erreur_virement', famille: 'administratif', icone: '💶', titre: NF.t('Un virement inattendu'),
      texte: NF.t('Sur votre relevé : 310 € versés par un organisme public, sans courrier d\'explication. Vous n\'avez rien demandé.'),
      poids: 1.5, delai: 18,
      conditions: { domiciliation: true, logementOrdreMin: 2, sansDrapeau: 'indu_en_attente' },
      choix: [
        { texte: NF.t('Signaler l\'erreur'), conditions: { competences: { administratif: 1 } },
          effets: { moral: 2, reputation: 2, xp: { administratif: 15 } },
          resultat: NF.t('Un rappel de droits versé à la mauvaise personne. L\'agent vous remercie ; l\'argent est repris, sans frais.') },
        { texte: NF.t('Demander des explications au guichet'),
          aleatoire: [
            { poids: 4, effets: { argent: 310, moral: 5 }, resultat: NF.t('C\'est un rattrapage légitime sur une aide calculée trop bas. L\'argent est bien à vous.') },
            { poids: 6, effets: { moral: -1, xp: { administratif: 5 } }, resultat: NF.t('Erreur de dossier. Le virement est annulé avant même d\'avoir pu être dépensé.') },
          ] },
        { texte: NF.t('Le garder sans rien dire'),
          effets: { argent: 310, moral: 3, drapeaux: { indu_en_attente: true }, programmer: { evenement: 'adm_indu_reclame', dans: 4 } },
          resultat: NF.t('Trois cent dix euros. Vous ne posez pas de question.') },
      ] },

    { id: 'adm_indu_reclame', famille: 'administratif', force: true, icone: '📮', titre: NF.t('Trop-perçu réclamé'),
      texte: NF.t('Lettre recommandée : l\'organisme a repéré son erreur. Les 310 € versés à tort sont à rembourser sous trente jours, majorés de 10 % au-delà.'),
      choix: [
        { texte: NF.t('Rembourser'), conditions: { argentMin: 310 },
          effets: { argent: -310, moral: -3, drapeaux: { indu_en_attente: false } }, resultat: NF.t('Vous rendez ce qui n\'était pas à vous. Dossier clos.') },
        { texte: NF.t('Demander un échéancier'),
          effets: { dette: 310, moral: -2, xp: { administratif: 5 }, drapeaux: { indu_en_attente: false } }, resultat: NF.t('Accepté : la somme est retenue petit à petit. Elle s\'ajoute à vos dettes.') },
        { texte: NF.t('Contester : l\'erreur vient d\'eux (compétence administrative)'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 3, effets: { moral: 4, xp: { administratif: 15 }, drapeaux: { indu_en_attente: false } }, resultat: NF.t('La commission de recours amiable reconnaît sa faute et vous accorde une remise de dette. Vous gardez la somme.') },
            { poids: 7, effets: { dette: 341, moral: -6, drapeaux: { indu_en_attente: false } }, resultat: NF.t('Recours rejeté, majoration appliquée. Il aurait mieux valu rembourser tout de suite.') },
          ] },
        { texte: NF.t('Ne pas répondre'), effets: { dette: 400, moral: -4, drapeaux: { indu_en_attente: false } }, resultat: NF.t('Majoration, puis mise en recouvrement forcé. La dette grossit.') },
      ] },

    /* ------------------------------------------------------------------
     * AGENCE POUR L'EMPLOI
     * ---------------------------------------------------------------- */

    { id: 'adm_rdv_manque', famille: 'administratif', icone: '⏰', titre: NF.t('Rendez-vous manqué'),
      texte: NF.t('Le rendez-vous de suivi à l\'agence pour l\'emploi était ce matin, 8 h 30. Vous vous en souvenez à 11 heures.'),
      poids: function (s) { return s.joueur.jauges.energie < 35 ? 3 : 1.5; }, delai: 8,
      conditions: { lieu: 'pole', emploi: false, domiciliation: true, sansDrapeau: 'radie_pole' },
      choix: [
        { texte: NF.t('Appeler tout de suite pour m\'excuser'), conditions: { telephone: true },
          effets: { moral: -2, xp: { administratif: 5 } }, resultat: NF.t('La conseillère déplace le rendez-vous à la semaine suivante. Un avertissement, pas plus.') },
        { texte: NF.t('Me présenter à l\'agence dans l\'après-midi'),
          aleatoire: [
            { poids: 6, effets: { energie: -5, moral: -2 }, resultat: NF.t('Une heure d\'attente et un nouveau rendez-vous. Ça passe.') },
            { poids: 4, effets: { moral: -6, reputation: -2, drapeaux: { radie_pole: true } }, resultat: NF.t('« Absence injustifiée. » Vous êtes radié de la liste pour deux mois. Plus d\'accompagnement, plus de propositions.') },
          ] },
        { texte: NF.t('Laisser tomber'), effets: { moral: -3, drapeaux: { radie_pole: true } }, resultat: NF.t('Un courrier de radiation suivra. Vous ne l\'ouvrirez pas.') },
      ] },

    { id: 'adm_reinscription_pole', famille: 'administratif', icone: '📋', titre: NF.t('Se réinscrire'),
      texte: NF.t('La période de radiation est terminée. Rien ne se passera tant que vous ne serez pas réinscrit à l\'agence pour l\'emploi.'),
      poids: 3, delai: 4,
      conditions: { drapeau: 'radie_pole', lieu: 'pole' },
      choix: [
        { texte: NF.t('Me réinscrire en ligne'), conditions: { competences: { informatique: 1 } },
          effets: { moral: 2, xp: { informatique: 5 }, drapeaux: { radie_pole: false } }, resultat: NF.t('Formulaire, pièces jointes, validation. Réinscrit.') },
        { texte: NF.t('Me réinscrire au guichet'), effets: { energie: -5, moral: 1, xp: { administratif: 5 }, drapeaux: { radie_pole: false } },
          resultat: NF.t('Une matinée, un dossier, un nouveau conseiller.') },
        { texte: NF.t('Pas maintenant'), effets: { moral: -2 }, resultat: NF.t('Vous verrez plus tard.') },
      ] },

    { id: 'adm_formation_proposee', famille: 'administratif', icone: '🎓', titre: NF.t('Proposition de formation'),
      texte: function (s) {
        var c = NF.util.byId(NF.data.competences, competenceFormation(s));
        return NF.t('Votre conseillère de l\'agence pour l\'emploi vous propose une formation courte, rémunérée, dans un secteur qui recrute ici : ') + (c ? NF.util.minuscule(c.nom) : 'technique') + NF.t('. Six semaines, à temps plein.');
      },
      poids: 1.5, delai: 14,
      conditions: { lieu: 'pole', domiciliation: true, formation: false, classeMax: 4, sansDrapeau: ['radie_pole', 'papiers_perdus'] },
      choix: [
        { texte: NF.t('Accepter'),
          effets: function (s) { var xp = {}; xp[competenceFormation(s)] = 60; return { xp: xp, argent: 300, energie: -12, moral: 4, reputation: 2 }; },
          resultat: NF.t('Six semaines à apprendre, une allocation modeste, une attestation à la fin. Et quelques numéros d\'employeurs.') },
        { texte: NF.t('Demander plutôt une aide au permis de conduire'), conditions: { competencesMax: { conduite: 1 } },
          aleatoire: [
            { poids: 5, effets: { xp: { conduite: 50 }, moral: 3 }, resultat: NF.t('Accordée : vingt heures de conduite financées. Le permis se rapproche.') },
            { poids: 5, effets: { moral: -2 }, resultat: NF.t('L\'enveloppe de l\'année est épuisée. Peut-être l\'an prochain.') },
          ] },
        { texte: NF.t('Refuser, je préfère chercher directement du travail'), effets: {}, resultat: NF.t('La conseillère note le refus. Au deuxième, ce sera un problème.') },
      ] },

    /* ------------------------------------------------------------------
     * AMENDES, IMPÔTS, JUSTICE
     * ---------------------------------------------------------------- */

    { id: 'adm_amende_majoree', famille: 'administratif', icone: '🚇', titre: NF.t('Amende majorée'),
      texte: NF.t('Un procès-verbal pour voyage sans titre de transport, datant d\'un jour que vous aviez oublié. Non payé dans les délais, il est passé de 50 à 180 €. Le Trésor public vous retrouve maintenant que vous avez une adresse.'),
      poids: 2, delai: 12,
      conditions: { domiciliation: true, classeMax: 4 },
      choix: [
        { texte: NF.t('Payer les 180 €'), conditions: { argentMin: 180 }, effets: { argent: -180, moral: -4 }, resultat: NF.t('Payé. Une leçon chère pour un trajet de dix minutes.') },
        { texte: NF.t('Contester : le PV ne m\'est jamais parvenu'), conditions: { competences: { lecture: 2 } },
          aleatoire: [
            { poids: 4, effets: { argent: -50, moral: 4, xp: { administratif: 10 } }, resultat: NF.t('La majoration est annulée. Vous ne payez que les 50 € initiaux.') },
            { poids: 6, effets: { dette: 180, moral: -5, xp: { administratif: 5 } }, resultat: NF.t('Contestation rejetée. La somme est mise en recouvrement.') },
          ] },
        { texte: NF.t('Demander une remise gracieuse avec l\'aide du centre social'), conditions: { lieu: 'centre_social' },
          aleatoire: [
            { poids: 5, effets: { argent: -50, moral: 2 }, resultat: NF.t('Avec une attestation de l\'assistante sociale, la majoration saute. 50 €, et c\'est réglé.') },
            { poids: 5, effets: { dette: 180, moral: -3 }, resultat: NF.t('Refusée. La dette court.') },
          ] },
        { texte: NF.t('Ignorer'), effets: { dette: 375, moral: -3 }, resultat: NF.t('Nouvelle majoration, puis titre exécutoire : 375 € désormais, saisissables sur votre compte.') },
      ] },

    { id: 'adm_regularisation_impots', famille: 'administratif', icone: '🧾', titre: NF.t('Régularisation d\'impôt'),
      texte: function (s) { return NF.t('Avis de l\'administration fiscale : votre prélèvement à la source a été calculé sur une situation dépassée. Un reliquat de ') + NF.util.euros(montantImpot(s)) + NF.t(' est dû.'); },
      poids: 1.5, delai: 16,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 2, domiciliation: true },
      choix: [
        { texte: NF.t('Payer en une fois'), condition: function (s) { return s.joueur.argent >= montantImpot(s); },
          effets: function (s) { return { argent: -montantImpot(s), moral: -3 }; }, resultat: NF.t('Réglé. Ça fait mal, mais c\'est derrière vous.') },
        { texte: NF.t('Demander un étalement sur plusieurs mois'),
          effets: function (s) { return { dette: montantImpot(s), moral: -2, xp: { administratif: 5 } }; }, resultat: NF.t('Accordé. La somme s\'ajoute à vos dettes, prélevée mois après mois.') },
        { texte: NF.t('Vérifier le calcul (compétence gestion)'), conditions: { competences: { gestion: 2 } },
          aleatoire: [
            { poids: 4, effets: function (s) { return { argent: -Math.round(montantImpot(s) / 2), moral: 3, xp: { gestion: 10 } }; }, resultat: NF.t('Erreur de taux : vous ne devez que la moitié. Vous la réglez.') },
            { poids: 6, effets: function (s) { return { dette: montantImpot(s), moral: -2, xp: { gestion: 5 } }; }, resultat: NF.t('Le calcul est juste. Vous demandez un étalement.') },
          ] },
      ] },

    { id: 'adm_controle_fiscal', famille: 'administratif', icone: '🏛️', titre: NF.t('Examen de votre situation fiscale'),
      texte: NF.t('Courrier de la direction des finances publiques : vos déclarations des trois dernières années font l\'objet d\'un examen contradictoire. Justificatifs à fournir sous trente jours.'),
      poids: 1.5, delai: 24,
      conditions: { classeMin: 5, entreprise: false },
      choix: [
        { texte: NF.t('Confier le dossier à un expert-comptable (600 €)'), conditions: { argentMin: 600 },
          aleatoire: [
            { poids: 8, effets: { argent: -600, moral: 2 }, resultat: NF.t('Tout est en ordre. Le contrôle se termine sans rectification.') },
            { poids: 2, effets: function (s) { var m = 300 + NF.rng.int(0, 30) * 10; return { argent: -(600 + m), moral: -4, journal: NF.t('Rectification : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Une déduction mal justifiée. Petite rectification, pas de pénalité.') },
          ] },
        { texte: NF.t('Répondre moi-même, pièces à l\'appui'), conditions: { competences: { gestion: 2 } },
          aleatoire: [
            { poids: 6, effets: { moral: 3, xp: { gestion: 15 } }, resultat: NF.t('Vos tableaux tiennent. Fin de contrôle sans suite.') },
            { poids: 4, effets: function (s) { var m = Math.min(3000, Math.max(300, Math.round(s.joueur.argent * 0.08))); return { argent: -m, dette: Math.max(0, m - s.joueur.argent), moral: -5, xp: { gestion: 10 }, journal: NF.t('Rectification : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Un revenu exceptionnel oublié. Rectification et intérêts de retard.') },
          ] },
        { texte: NF.t('Répondre comme je peux'),
          aleatoire: [
            { poids: 3, effets: { moral: -2, energie: -6 }, resultat: NF.t('Des soirées à chercher des factures. Finalement, rien à redire.') },
            { poids: 7, effets: function (s) { var m = Math.min(6000, Math.max(500, Math.round(s.joueur.argent * 0.15))); return { argent: -m, dette: Math.max(0, m - s.joueur.argent), moral: -10, journal: NF.t('Rectification et pénalités : ') + NF.util.euros(m) + '.' }; },
              resultat: NF.t('Justificatifs manquants, pénalités de 10 %. Une facture salée.') },
          ] },
      ] },

    { id: 'adm_casier_effacement', famille: 'administratif', icone: '🧹', titre: NF.t('Effacer le casier'),
      texte: NF.t('Une juriste rencontrée à une permanence vous l\'explique : avec le temps écoulé et une situation stable, vous pouvez demander l\'effacement de la condamnation inscrite à votre casier.'),
      poids: 2, delai: 14,
      conditions: { casier: true, logementOrdreMin: 2 },
      choix: [
        { texte: NF.t('Rédiger la requête moi-même'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { s.joueur.casier = false; return { moral: 10, xp: { administratif: 20 } }; }, resultat: NF.t('Six mois d\'attente, puis la décision : réhabilitation accordée. Le casier est de nouveau vierge.') },
            { poids: 4, effets: { moral: -4, xp: { administratif: 10 } }, resultat: NF.t('Rejet : le délai légal n\'est pas encore écoulé. Vous pourrez redéposer plus tard.') },
          ] },
        { texte: NF.t('Prendre un avocat (400 €)'), conditions: { argentMin: 400 },
          aleatoire: [
            { poids: 8, effets: function (s) { s.joueur.casier = false; return { argent: -400, moral: 8 }; }, resultat: NF.t('L\'avocat connaît le dossier type. Effacement obtenu.') },
            { poids: 2, effets: { argent: -400, moral: -6 }, resultat: NF.t('Rejeté malgré les honoraires. L\'avocat propose de refaire une demande dans un an, à nouveau payante.') },
          ] },
        { texte: NF.t('Demander l\'aide juridictionnelle via le centre social'), conditions: { lieu: 'centre_social' },
          aleatoire: [
            { poids: 5, effets: function (s) { s.joueur.casier = false; return { moral: 8, reputation: 1 }; }, resultat: NF.t('Avocat commis d\'office, demande déposée, effacement accordé. Pour vous, ça n\'a rien coûté.') },
            { poids: 5, effets: { moral: -3, energie: -5 }, resultat: NF.t('Le dossier d\'aide juridictionnelle traîne. Il faudra réessayer.') },
          ] },
        { texte: NF.t('Laisser le passé où il est'), effets: { moral: -2 }, resultat: NF.t('Certains métiers resteront fermés. Vous le savez.') },
      ] },

    { id: 'adm_convocation_tribunal', famille: 'administratif', icone: '⚖️', titre: NF.t('Convocation au tribunal'),
      texte: function (s) {
        return s.joueur.dette > 1500
          ? NF.t('Un créancier a saisi le juge : vous êtes convoqué pour une injonction de payer portant sur ') + NF.util.euros(s.joueur.dette) + NF.t(' de dettes.')
          : NF.t('Une vieille affaire remonte : vous êtes convoqué devant le tribunal pour une audience dont vous ne comprenez pas bien l\'objet.');
      },
      poids: 1.5, delai: 18,
      conditions: { domiciliation: true },
      condition: function (s) { return s.joueur.dette > 1500 || s.joueur.casier || !!s.joueur.drapeaux.connu_inspection; },
      choix: [
        { texte: NF.t('Préparer ma défense et m\'y rendre'), conditions: { competences: { administratif: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { var r = Math.round(s.joueur.dette * 0.2); s.joueur.dette = Math.max(0, s.joueur.dette - r); return { moral: 6, xp: { administratif: 15 }, journal: r > 0 ? NF.t('Délais de paiement accordés, dette réduite de ') + NF.util.euros(r) + '.' : '' }; },
              resultat: NF.t('Le juge accorde des délais et écarte les pénalités. Vous sortez soulagé.') },
            { poids: 4, effets: { moral: -4, argent: -150, dette: 100 }, resultat: NF.t('Condamné à payer, avec les frais. Mais sans aggravation.') },
          ] },
        { texte: NF.t('Demander l\'aide juridictionnelle'), conditions: { lieu: 'centre_social' },
          aleatoire: [
            { poids: 6, effets: { moral: 4, energie: -4 }, resultat: NF.t('Un avocat désigné plaide pour vous. Décision modérée, délais accordés.') },
            { poids: 4, effets: { moral: -3, dette: 150 }, resultat: NF.t('L\'aide arrive trop tard pour l\'audience. Vous êtes condamné aux frais.') },
          ] },
        { texte: NF.t('Y aller seul'),
          aleatoire: [
            { poids: 5, effets: { moral: -2, energie: -5 }, resultat: NF.t('Vous expliquez votre situation. Le juge écoute, décide dans la nuance.') },
            { poids: 5, effets: { moral: -6, dette: 250 }, resultat: NF.t('Sans pièces ni arguments, vous êtes condamné aux dépens.') },
          ] },
        { texte: NF.t('Ne pas y aller'),
          aleatoire: [
            { poids: 6, effets: { dette: 400, moral: -5 }, resultat: NF.t('Décision rendue en votre absence : vous devez payer, majoration comprise.') },
            { poids: 4, effets: function (s) { var e = { dette: 300, moral: -8 }; if (s.joueur.drapeaux.connu_inspection) e.casier = true; return e; },
              resultat: NF.t('Jugé par défaut, sans personne pour vous défendre. La note est lourde, et le dossier vous suivra.') },
          ] },
      ] },

    /* ------------------------------------------------------------------
     * DIVERS
     * ---------------------------------------------------------------- */

    { id: 'adm_recensement', famille: 'administratif', icone: '📊', titre: NF.t('Recensement'),
      texte: NF.t('Un agent recenseur, badge au cou, frappe à la porte. Quelques questions sur le logement et les personnes qui y vivent. C\'est obligatoire, et ça prend dix minutes.'),
      poids: 1, delai: 36,
      conditions: { adresse: true },
      choix: [
        { texte: NF.t('Répondre sur le pas de la porte'), effets: { moral: 1, xp: { administratif: 5 } },
          resultat: NF.t('Il remplit la feuille, vous remercie, et au passage vous signale une aide au logement à laquelle vous pourriez prétendre.') },
        { texte: NF.t('Répondre en ligne'), conditions: { competences: { informatique: 1 } }, effets: { xp: { informatique: 5 } },
          resultat: NF.t('Un code, un formulaire, cinq minutes. Fait.') },
        { texte: NF.t('Ne pas ouvrir'),
          aleatoire: [
            { poids: 7, effets: {}, resultat: NF.t('Il reviendra deux fois, puis laissera un formulaire dans la boîte.') },
            { poids: 3, effets: { moral: -2, argent: -38 }, resultat: NF.t('Après trois passages et un courrier, une contravention symbolique de 38 €. Ça existe.') },
          ] },
      ] },
  ]);
})();
