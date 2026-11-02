/* =====================================================================
 * ÉVÉNEMENTS – TRAVAIL
 * ---------------------------------------------------------------------
 * Offres d'emploi inattendues, intérim, grève, harcèlement, travail au
 * noir, primes, erreurs de paie, débauchage, reconversion…
 * Les événements déclenchés par le moteur (accident_travail,
 * licenciement, promotion, controle_travail_non_declare) sont dans
 * systeme.js : ne pas les redéfinir ici.
 *
 * Chaînes (un choix pose un drapeau et/ou programme une suite) :
 *   tra_offre_interim         → tra_interim_suite       (drapeau interim_remarque)
 *   tra_mission_locale        → tra_mission_suite       (drapeau mission_suivi)
 *   tra_greve                 → tra_greve_suite         (drapeaux greve_en_cours, greve_porte_parole)
 *   tra_harcelement           → tra_harcelement_suite   (drapeau harcelement_signale)
 *   tra_travail_noir_collegue → tra_travail_noir_suite  (drapeau travail_noir_weekend, tirage aléatoire)
 *   tra_erreur_paie           → tra_erreur_paie_suite   (données { montant }, drapeau trop_percu_reserve)
 *   tra_reconversion          → tra_reconversion_suite  (drapeau reconversion_dossier)
 * ===================================================================== */
(function () {
  var U = NF.util;

  /** Salaire mensuel actuel (0 sans emploi) */
  function salaire(s) { return s.joueur.emploi ? s.joueur.emploi.salaire : 0; }
  function arrondi10(v) { return Math.round(v / 10) * 10; }
  /** Nom du métier actuel en minuscules, ou un mot neutre */
  function nomMetier(s) { var m = NF.core.metierActuel(s); return m ? NF.util.minuscule(m.nom) : NF.t('salarié'); }
  /** Vrai si le joueur remplit les prérequis du métier `id` */
  function peutPrendre(s, id) { var m = U.byId(NF.data.metiers, id); return !!(m && NF.core.prerequisMetier(s, m).ok); }
  /** Embauche le joueur sur le métier `id` et retourne les effets complémentaires */
  function embauche(s, id, effetsSup) {
    var m = U.byId(NF.data.metiers, id);
    var e = effetsSup || {};
    if (m) NF.core.embaucher(s, m);
    return e;
  }
  /** Texte de résultat standard après une embauche */
  function texteEmbauche(s, intro) { return s.joueur.emploi ? intro + ' ' + U.euros(s.joueur.emploi.salaire) + NF.t(' net par mois.') : intro; }
  /** Première compétence travaillée par le métier actuel */
  function competencePrincipale(s) {
    var m = NF.core.metierActuel(s);
    if (m && m.xp) for (var k in m.xp) return k;
    return 'technique';
  }
  /** Métier de niveau 5 correspondant au secteur du joueur (offre pour les cadres) */
  function metierCadre(s) {
    var m = NF.core.metierActuel(s);
    var table = { commerce: 'cadre_commercial', bureau: 'directeur', industrie: 'ingenieur', informatique: 'ingenieur', batiment: 'architecte', sante: 'medecin', agriculture: 'ingenieur' };
    var id = table[m ? m.secteur : ''] || 'directeur';
    return U.byId(NF.data.metiers, id);
  }
  function finGreve() { return { greve_en_cours: false, greve_porte_parole: false }; }

  NF.ajouterEvenements([

    /* ---------------- Intérim d'un jour → rappel de l'agence ---------------- */
    { id: 'tra_offre_interim', famille: 'travail', icone: '🏗️', titre: NF.t('Une journée d\'intérim'),
      texte: NF.t('Une agence d\'intérim cherche des bras pour demain matin : déchargement de camions, sept heures, payé en fin de semaine.'),
      poids: 3, delai: 5,
      conditions: { classeMax: 3, jauges: { hygiene: { min: 15 }, energie: { min: 20 } } },
      condition: function (s) { var m = NF.core.metierActuel(s); return !m || m.pa === 0; },
      choix: [
        { texte: NF.t('Y aller'),
          aleatoire: [
            { poids: 6, effets: { argent: 75, energie: -15, xp: { technique: 4 }, reputation: 1 }, resultat: NF.t('Sept heures de cartons. L\'enveloppe arrive le vendredi : 75 €.') },
            { poids: 3, effets: { argent: 60, energie: -20, sante: -4 }, resultat: NF.t('La mission est plus dure que prévu : des palettes de carrelage. Vous rentrez cassé, avec 60 €.') },
            { poids: 1, effets: { energie: -5, moral: -4 }, resultat: NF.t('À l\'arrivée, la mission est annulée. Personne ne vous dédommage le déplacement.') },
          ] },
        { texte: NF.t('Y aller avec une tenue correcte'), conditions: { objet: 'vetements_propres' },
          effets: { argent: 80, energie: -14, reputation: 2, xp: { technique: 4 }, drapeaux: { interim_remarque: true }, programmer: { evenement: 'tra_interim_suite', dans: 2 } },
          resultat: NF.t('Ponctuel, propre, efficace : le chef d\'équipe note votre nom. « On vous rappellera. » Peut-être pour de vrai, cette fois.') },
        { texte: NF.t('Demander une mission plus qualifiée'), conditions: { competences: { technique: 1 } },
          effets: { argent: 95, energie: -14, xp: { technique: 6 }, reputation: 1 },
          resultat: NF.t('On vous met sur le montage des rayonnages plutôt que sur les cartons. Mieux payé : 95 €.') },
        { texte: NF.t('Décliner'), effets: {}, resultat: NF.t('Vous laissez passer.') },
      ] },

    { id: 'tra_interim_suite', famille: 'travail', force: true, icone: '📞', titre: NF.t('L\'agence rappelle'),
      texte: NF.t('L\'agence d\'intérim vous rappelle : le chef d\'équipe a demandé après vous. Un poste de préparateur de commandes se libère en entrepôt, avec embauche à la clé.'),
      conditions: { drapeau: 'interim_remarque' },
      choix: [
        { texte: NF.t('Accepter le poste'), conditions: { emploi: false, hygiene: 35, domiciliation: true },
          condition: function (s) { return peutPrendre(s, 'preparateur_commandes'); },
          effets: function (s) { return embauche(s, 'preparateur_commandes', { moral: 8, drapeaux: { interim_remarque: false } }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Scanner, cadences, pointeuse. Un vrai contrat :')); } },
        { texte: NF.t('Prendre seulement une semaine de mission'),
          effets: { argent: 190, energie: -15, xp: { technique: 5 }, drapeaux: { interim_remarque: false } },
          resultat: NF.t('Une semaine d\'entrepôt, 190 € en fin de mois. L\'agence note que vous n\'êtes pas disponible pour plus.') },
        { texte: NF.t('Je ne suis pas disponible'), effets: { drapeaux: { interim_remarque: false }, moral: -1 }, resultat: NF.t('L\'agence appellera quelqu\'un d\'autre.') },
      ] },

    /* ---------------- Offre de niveau 1 ---------------- */
    { id: 'tra_offre_plongeur', famille: 'travail', icone: '🍽️', titre: NF.t('Un patron pressé'),
      texte: NF.t('Le gérant d\'une brasserie vous aborde : son plongeur est parti ce matin. « Vous commencez ce soir si vous voulez. Déclaré, temps plein. »'),
      poids: 2, delai: 10,
      conditions: { emploi: false, classeMax: 3 },
      choix: [
        { texte: NF.t('Accepter'), conditions: { hygiene: 25 }, condition: function (s) { return peutPrendre(s, 'plongeur'); },
          effets: function (s) { return embauche(s, 'plongeur', { moral: 6, energie: -8 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Premier service le soir même. Les mains dans l\'eau grasse, mais un contrat :')); } },
        { texte: NF.t('Demander un essai payé à la journée'), conditions: { competences: { commerce: 1 }, hygiene: 25 }, condition: function (s) { return peutPrendre(s, 'plongeur'); },
          aleatoire: [
            { poids: 6, effets: function (s) { return embauche(s, 'plongeur', { argent: 55, moral: 6, energie: -10 }); }, resultat: function (s) { return texteEmbauche(s, NF.t('Une journée d\'essai à 55 €, puis il vous garde :')); } },
            { poids: 4, effets: { argent: 55, energie: -10, moral: -2 }, resultat: NF.t('Il vous paie la journée, puis prend quelqu\'un de sa famille. Au moins, 55 €.') },
          ] },
        { texte: NF.t('Refuser'), effets: { moral: -1 }, resultat: NF.t('Il hausse les épaules et aborde quelqu\'un d\'autre.') },
      ] },

    /* ---------------- Mission locale → suivi ---------------- */
    { id: 'tra_mission_locale', famille: 'travail', icone: '🏢', titre: NF.t('Contrat jeune'),
      texte: NF.t('Votre conseillère de la mission locale a quelque chose : un contrat aidé d\'employé libre-service, six mois en supermarché, avec un tuteur. « Il faut répondre cette semaine. »'),
      poids: 2.5, delai: 10,
      conditions: { emploi: false, ageMax: 25, lieu: 'mission' },
      choix: [
        { texte: NF.t('Signer le contrat'), conditions: { hygiene: 45, domiciliation: true }, condition: function (s) { return peutPrendre(s, 'employe_libre_service'); },
          effets: function (s) { return embauche(s, 'employe_libre_service', { moral: 8, reputation: 2 }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Mise en rayon à six heures, inventaires le soir. Un contrat et un tuteur :')); } },
        { texte: NF.t('Demander d\'abord un accompagnement'),
          effets: { xp: { administratif: 10 }, moral: 3, drapeaux: { mission_suivi: true }, programmer: { evenement: 'tra_mission_suite', dans: 2 } },
          resultat: NF.t('Elle ouvre un dossier : papiers, santé, logement. « On se revoit dans deux mois avec quelque chose de solide. »') },
        { texte: NF.t('Refuser'), effets: { reputation: -2, moral: -1 }, resultat: NF.t('Elle note votre refus. Les contrats aidés ne reviennent pas tous les jours.') },
      ] },

    { id: 'tra_mission_suite', famille: 'travail', force: true, icone: '📋', titre: NF.t('Rendez-vous à la mission locale'),
      texte: function (s) {
        var t = NF.t('Votre conseillère vous reçoit avec un dossier épais. ');
        if (!s.joueur.domiciliation) return t + NF.t('Première chose : sans adresse administrative, aucun employeur ne pourra vous déclarer. Elle peut régler ça aujourd\'hui.');
        if (!s.joueur.emploi) return t + NF.t('Elle a un poste d\'agent d\'entretien dans une société de nettoyage, et une place en formation de remise à niveau.');
        return t + NF.t('Elle constate que vous avez trouvé du travail entre-temps, et vous propose malgré tout une remise à niveau.');
      },
      conditions: { drapeau: 'mission_suivi' },
      choix: [
        { texte: NF.t('Faire ma domiciliation avec elle'), conditions: { domiciliation: false },
          effets: { domiciliation: true, xp: { administratif: 8 }, moral: 4, drapeaux: { mission_suivi: false } },
          resultat: NF.t('Une attestation, un tampon, une adresse où recevoir le courrier. Ça change tout.') },
        { texte: NF.t('Accepter le poste d\'agent d\'entretien'), conditions: { emploi: false, hygiene: 40, domiciliation: true }, condition: function (s) { return peutPrendre(s, 'agent_entretien'); },
          effets: function (s) { return embauche(s, 'agent_entretien', { moral: 6, reputation: 2, drapeaux: { mission_suivi: false } }); },
          resultat: function (s) { return texteEmbauche(s, NF.t('Bureaux vides à cinq heures du matin, aspirateur et poubelles. Déclaré :')); } },
        { texte: NF.t('Suivre la remise à niveau'),
          effets: { xp: { lecture: 25, administratif: 10 }, energie: -6, moral: 3, drapeaux: { mission_suivi: false } },
          resultat: NF.t('Trois semaines de français, de calcul et de recherche d\'emploi. Vous repartez avec un CV propre.') },
        { texte: NF.t('Ne pas donner suite'), effets: { drapeaux: { mission_suivi: false }, reputation: -1 }, resultat: NF.t('Vous ne rappelez pas.') },
      ] },

    /* ---------------- Grève → fin du mouvement ---------------- */
    { id: 'tra_greve', famille: 'travail', icone: '✊', titre: NF.t('Appel à la grève'),
      texte: NF.t('Les syndicats appellent à la grève dans votre entreprise : salaires gelés, cadences, primes supprimées. Vos collègues se regardent. Chaque jour de grève est un jour non payé.'),
      poids: 1.5, delai: 14,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 2, sansDrapeau: 'greve_en_cours' },
      choix: [
        { texte: NF.t('Faire grève avec les collègues'),
          effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.1), moral: 4, reputation: 2, drapeaux: { greve_en_cours: true }, programmer: { evenement: 'tra_greve_suite', dans: 1 } }; },
          resultat: NF.t('Trois jours de piquet devant la grille, trois jours de retenue sur salaire. Et une drôle de chaleur dans le groupe.') },
        { texte: NF.t('Prendre la parole devant les autres'), conditions: { competences: { commerce: 2 } },
          effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.1), moral: 6, reputation: 4, xp: { commerce: 8 }, drapeaux: { greve_en_cours: true, greve_porte_parole: true }, programmer: { evenement: 'tra_greve_suite', dans: 1 } }; },
          resultat: NF.t('Vous parlez bien, les collègues vous suivent. La direction retient votre nom, elle aussi.') },
        { texte: NF.t('Continuer à travailler'),
          aleatoire: [
            { poids: 6, effets: { moral: -3, reputation: -2 }, resultat: NF.t('Vous franchissez le piquet sous les regards. L\'ambiance restera froide pendant des semaines.') },
            { poids: 4, effets: { moral: -1, reputation: -1, argent: 40 }, resultat: NF.t('Le chef apprécie et vous glisse quelques heures supplémentaires. Les collègues, moins.') },
          ] },
      ] },

    { id: 'tra_greve_suite', famille: 'travail', force: true, icone: '🤝', titre: NF.t('Fin du mouvement'),
      texte: function (s) {
        if (!s.joueur.emploi) return NF.t('Le mouvement s\'est terminé sans vous : vous n\'êtes plus dans l\'entreprise.');
        return NF.t('Après trois semaines, la direction ouvre des négociations. Les syndicats proposent de reprendre le travail') + (s.joueur.drapeaux.greve_porte_parole ? NF.t(', et vous demandent d\'être à la table.') : '.');
      },
      conditions: { drapeau: 'greve_en_cours' },
      choix: [
        { texte: NF.t('Reprendre le travail avec l\'accord obtenu'), conditions: { emploi: true },
          aleatoire: [
            { poids: function (s) { return s.joueur.drapeaux.greve_porte_parole ? 7 : 5; },
              effets: function (s) { if (s.joueur.emploi) s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.04); return { moral: 5, drapeaux: finGreve() }; },
              resultat: function (s) { return NF.t('Une augmentation de 4 % et la prime rétablie. Nouveau salaire : ') + U.euros(salaire(s)) + '.'; } },
            { poids: 4, effets: { argent: 50, moral: -3, drapeaux: finGreve() }, resultat: NF.t('Un accord maigre : une prime unique de 50 € et des promesses. Les jours de grève restent perdus.') },
            { poids: function (s) { return s.joueur.drapeaux.greve_porte_parole ? 2 : 1; },
              effets: function (s) { var ind = arrondi10(salaire(s) * 0.5); return { argent: ind, moral: -8, emploi: 'perdre', raison: NF.t('fin de contrat après la grève'), drapeaux: finGreve(), journal: NF.t('Indemnité : ') + U.euros(ind) + '.' }; },
              resultat: NF.t('Votre contrat n\'est « pas renouvelé ». Officiellement sans rapport avec la grève.') },
          ] },
        { texte: NF.t('Tenir une semaine de plus'), conditions: { emploi: true, jauges: { moral: { min: 30 } } },
          aleatoire: [
            { poids: 4, effets: function (s) { var ret = arrondi10(salaire(s) * 0.08); if (s.joueur.emploi) s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.07); return { argent: -ret, moral: 6, reputation: 2, drapeaux: finGreve() }; },
              resultat: function (s) { return NF.t('La direction cède : 7 % d\'augmentation. Nouveau salaire : ') + U.euros(salaire(s)) + '.'; } },
            { poids: 4, effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.12), moral: -5, drapeaux: finGreve() }; },
              resultat: NF.t('Le mouvement s\'essouffle. Vous reprenez sans rien, avec une semaine de salaire en moins.') },
            { poids: 2, effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.12), moral: -10, emploi: 'perdre', raison: NF.t('fin de contrat après la grève'), drapeaux: finGreve() }; },
              resultat: NF.t('La direction fait un exemple. Votre contrat s\'arrête là.') },
          ] },
        { texte: NF.t('Prendre acte'), conditions: { emploi: false }, effets: { drapeaux: finGreve() }, resultat: NF.t('Une page se tourne.') },
      ] },

    /* ---------------- Harcèlement → enquête interne ---------------- */
    { id: 'tra_harcelement', famille: 'travail', icone: '😶', titre: NF.t('Harcèlement au travail'),
      texte: NF.t('Un supérieur s\'acharne : remarques devant tout le monde, horaires modifiés à la dernière minute, tâches impossibles. Vous dormez mal, vous redoutez le lundi.'),
      poids: 1.5, delai: 16,
      conditions: { emploi: true, emploiNiveauMin: 2, sansDrapeau: 'harcelement_signale' },
      choix: [
        { texte: NF.t('Alerter les représentants du personnel'), conditions: { nonDeclare: false },
          aleatoire: [
            { poids: 6, effets: { moral: 4, drapeaux: { harcelement_signale: true }, programmer: { evenement: 'tra_harcelement_suite', dans: 2 } }, resultat: NF.t('Le délégué prend votre témoignage par écrit. Une enquête interne est ouverte.') },
            { poids: 4, effets: { moral: -4, sante: -3 }, resultat: NF.t('« Ne faites pas de vagues. » Rien ne bouge, et les remarques continuent.') },
          ] },
        { texte: NF.t('Confronter la personne calmement'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 5, effets: { moral: 8, reputation: 2 }, resultat: NF.t('Vous posez les choses, devant témoins. Il recule. Ça s\'arrête.') },
            { poids: 5, effets: { moral: -6, sante: -3 }, resultat: NF.t('Il prend ça pour une provocation. C\'est pire ensuite.') },
          ] },
        { texte: NF.t('Tenir sans rien dire'), effets: { moral: -10, sante: -5, energie: -6 }, resultat: NF.t('Vous encaissez. Ça vous use de l\'intérieur.') },
        { texte: NF.t('Démissionner'), effets: { emploi: 'perdre', raison: NF.t('harcèlement'), moral: -4, sante: 2 }, resultat: NF.t('Vous partez sans indemnité, mais vous respirez.') },
      ] },

    { id: 'tra_harcelement_suite', famille: 'travail', force: true, icone: '📂', titre: NF.t('Conclusions de l\'enquête'),
      texte: function (s) {
        if (!s.joueur.emploi) return NF.t('L\'enquête interne rend ses conclusions… mais vous avez quitté l\'entreprise entre-temps.');
        return NF.t('L\'enquête interne rend ses conclusions. La direction vous convoque.');
      },
      conditions: { drapeau: 'harcelement_signale' },
      choix: [
        { texte: NF.t('Écouter la décision'), conditions: { emploi: true },
          aleatoire: [
            { poids: 5, effets: { moral: 10, reputation: 2, drapeaux: { harcelement_signale: false } }, resultat: NF.t('La personne est mutée dans un autre service. Les lundis redeviennent des lundis.') },
            { poids: 3, effets: { moral: -6, sante: -3, drapeaux: { harcelement_signale: false } }, resultat: NF.t('« Des maladresses de management. » Un rappel à l\'ordre, et rien d\'autre.') },
            { poids: 2, effets: function (s) { var ind = arrondi10(salaire(s) * 1.5); return { argent: ind, moral: -5, emploi: 'perdre', raison: NF.t('rupture conventionnelle'), drapeaux: { harcelement_signale: false }, journal: NF.t('Indemnité : ') + U.euros(ind) + '.' }; },
              resultat: NF.t('On vous propose une rupture conventionnelle « pour apaiser ». Vous signez, avec une indemnité, et vous partez.') },
          ] },
        { texte: NF.t('Négocier mon départ avec une indemnité'), conditions: { emploi: true, competences: { administratif: 2 } },
          effets: function (s) { var ind = arrondi10(salaire(s) * 2.5); return { argent: ind, moral: 2, emploi: 'perdre', raison: NF.t('rupture conventionnelle'), drapeaux: { harcelement_signale: false }, journal: NF.t('Indemnité : ') + U.euros(ind) + '.' }; },
          resultat: NF.t('Vous connaissez vos droits et le dossier est solide. L\'entreprise préfère payer.') },
        { texte: NF.t('Tourner la page'), conditions: { emploi: false }, effets: { drapeaux: { harcelement_signale: false }, moral: 2 }, resultat: NF.t('Ce n\'est plus votre problème.') },
      ] },

    /* ---------------- Travail au noir proposé par un collègue → engrenage ---------------- */
    { id: 'tra_travail_noir_collegue', famille: 'travail', icone: '🤫', titre: NF.t('Un coup de main le week-end'),
      texte: NF.t('Un collègue fait des chantiers chez des particuliers le week-end, en liquide. « J\'ai besoin de quelqu\'un samedi. 120 € la journée, pas de papiers. »'),
      poids: 2, delai: 10,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMax: 3, sansDrapeau: 'travail_noir_weekend' },
      choix: [
        { texte: NF.t('Accepter, et régulièrement'), effets: { argent: 240, energie: -14, xp: { bricolage: 6 }, drapeaux: { travail_noir_weekend: true } }, resultat: NF.t('Deux samedis, 240 € dans la poche. Il compte sur vous le mois prochain.') },
        { texte: NF.t('Une seule fois'), effets: { argent: 120, energie: -7, xp: { bricolage: 3 } }, resultat: NF.t('Un samedi à poser du carrelage. 120 €, et vous en restez là.') },
        { texte: NF.t('Lui proposer de passer par une facture'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 4, effets: { argent: 110, energie: -7, xp: { administratif: 6 }, reputation: 2 }, resultat: NF.t('Il grogne, puis accepte de déclarer la journée. Un peu moins en net, mais propre.') },
            { poids: 6, effets: { moral: -1 }, resultat: NF.t('« Trop compliqué. » Il trouve quelqu\'un d\'autre.') },
          ] },
        { texte: NF.t('Refuser poliment'), effets: { reputation: 1, energie: 3 }, resultat: NF.t('Vous gardez vos week-ends. Il n\'insiste pas.') },
      ] },

    { id: 'tra_travail_noir_suite', famille: 'travail', icone: '🚧', titre: NF.t('Les samedis s\'enchaînent'),
      texte: NF.t('Les week-ends au noir sont devenus une habitude. Votre collègue parle maintenant d\'un gros chantier : une maison entière, trois semaines, en liquide.'),
      poids: 3, delai: 6,
      conditions: { drapeau: 'travail_noir_weekend' },
      choix: [
        { texte: NF.t('Continuer'),
          aleatoire: [
            { poids: 6, effets: { argent: 320, energie: -18, sante: -3, xp: { bricolage: 8, technique: 4 } }, resultat: NF.t('Trois semaines de doubles journées. 320 € de plus, et le dos qui proteste.') },
            { poids: 3, effets: function (s) { var a = NF.data.config.amendeNonDeclare; return { argent: -a, dette: Math.max(0, a - s.joueur.argent), moral: -8, drapeaux: { travail_noir_weekend: false, connu_inspection: true } }; },
              resultat: NF.t('Contrôle de l\'URSSAF sur le chantier. Amende, et votre nom dans un fichier. Le collègue ne répond plus.') },
            { poids: 1, effets: { sante: -12, energie: -10, moral: -5, drapeaux: { travail_noir_weekend: false } }, resultat: NF.t('Une chute d\'échelle. Pas de déclaration d\'accident, pas de prise en charge : vous vous soignez seul.') },
          ] },
        { texte: NF.t('Exiger d\'être déclaré pour ce chantier'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 4, effets: { argent: 280, energie: -16, xp: { technique: 6 }, reputation: 2, drapeaux: { travail_noir_weekend: false } }, resultat: NF.t('Il passe par une agence d\'intérim pour vous. Moins en net, mais couvert.') },
            { poids: 6, effets: { drapeaux: { travail_noir_weekend: false }, moral: -2 }, resultat: NF.t('« Alors ce sera sans vous. » Fin de l\'arrangement.') },
          ] },
        { texte: NF.t('Arrêter là'), effets: { drapeaux: { travail_noir_weekend: false }, moral: 1, energie: 5 }, resultat: NF.t('Vous récupérez vos week-ends. Le collègue fait la tête quelques jours.') },
      ] },

    /* ---------------- Patron qui ne paie pas (travail non déclaré) ---------------- */
    { id: 'tra_patron_ne_paie_pas', famille: 'travail', icone: '💸', titre: NF.t('L\'enveloppe n\'arrive pas'),
      texte: function (s) { return NF.t('Fin de semaine : le patron n\'a pas l\'enveloppe. « Lundi. » Lundi non plus. Il vous doit deux semaines de travail, soit environ ') + U.euros(arrondi10(salaire(s) * 0.5)) + NF.t('. Sans contrat, pas de fiche de paie, pas de preuve.'); },
      poids: 2.5, delai: 8,
      conditions: { emploi: true, nonDeclare: true },
      choix: [
        { texte: NF.t('Insister, fermement'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 5, effets: { moral: 2 }, resultat: NF.t('Il finit par payer, en râlant. Vous gardez un œil sur lui.') },
            { poids: 3, effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.5), emploi: 'perdre', raison: NF.t('salaire impayé'), moral: -6 }; }, resultat: NF.t('« Pas content ? La porte. » Vous ne reverrez pas cet argent.') },
            { poids: 2, effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.25), moral: -3 }; }, resultat: NF.t('Il paie la moitié, « le reste plus tard ». Le reste ne viendra pas.') },
          ] },
        { texte: NF.t('Menacer de prévenir l\'inspection du travail'), conditions: { competences: { lecture: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { return { argent: arrondi10(salaire(s) * 0.15), moral: 4 }; }, resultat: NF.t('Il blêmit, paie tout, et ajoute un billet « pour que ça reste entre nous ».') },
            { poids: 4, effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.5), emploi: 'perdre', raison: NF.t('salaire impayé'), reputation: -2, moral: -6 }; }, resultat: NF.t('Il rit. « Allez-y, et dites-leur que vous bossiez au noir. » Vous partez les mains vides.') },
          ] },
        { texte: NF.t('Encaisser et continuer'), effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.5), moral: -7 }; }, resultat: NF.t('Deux semaines de travail envolées. Il recommencera.') },
        { texte: NF.t('Partir'), effets: function (s) { return { argent: -arrondi10(salaire(s) * 0.5), emploi: 'perdre', raison: NF.t('patron indélicat'), moral: -4 }; }, resultat: NF.t('Vous laissez l\'argent et le patron derrière vous.') },
      ] },

    /* ---------------- Formation proposée par l'employeur ---------------- */
    { id: 'tra_formation_employeur', famille: 'travail', icone: '🎓', titre: NF.t('Formation proposée'),
      texte: NF.t('Votre employeur propose une formation de trois semaines, prise en charge : certification, nouvelles machines, nouveaux outils. Les journées seront longues, mais le salaire est maintenu.'),
      poids: 2, delai: 14,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 2, formation: false },
      choix: [
        { texte: NF.t('Accepter'), effets: function (s) { var x = {}; x[competencePrincipale(s)] = 40; return { xp: x, energie: -8, moral: 3 }; }, resultat: NF.t('Trois semaines denses. Vous revenez avec une attestation et des gestes plus sûrs.') },
        { texte: NF.t('Accepter, et proposer de former les collègues ensuite'), conditions: { competences: { lecture: 2 } },
          effets: function (s) { var x = { gestion: 15 }; x[competencePrincipale(s)] = 40; return { xp: x, energie: -12, reputation: 3, moral: 4 }; },
          resultat: NF.t('Vous transmettez ce que vous avez appris. On commence à vous regarder comme un référent.') },
        { texte: NF.t('Refuser, trop de fatigue'), effets: { energie: 4, moral: -1 }, resultat: NF.t('Vous restez sur votre poste. L\'occasion ne se représentera pas tout de suite.') },
      ] },

    /* ---------------- Changement d'horaires ---------------- */
    { id: 'tra_changement_horaires', famille: 'travail', icone: '🕒', titre: NF.t('Nouveaux horaires'),
      texte: NF.t('La direction réorganise les plannings : on vous propose de passer en horaires de nuit, avec majoration. Réponse attendue avant la fin de la semaine.'),
      poids: 2, delai: 12,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 2, emploiNiveauMax: 4 },
      choix: [
        { texte: NF.t('Accepter les nuits'), effets: function (s) { s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.08); return { energie: -10, sante: -3, moral: -3 }; },
          resultat: function (s) { return NF.t('Le corps met du temps à s\'habituer. Nouveau salaire : ') + U.euros(s.joueur.emploi.salaire) + '.'; } },
        { texte: NF.t('Négocier un aménagement'), conditions: { competences: { commerce: 2 } }, effets: { moral: 3, reputation: 1 }, resultat: NF.t('Deux nuits par semaine seulement, sans toucher au salaire. Tout le monde y trouve son compte.') },
        { texte: NF.t('Refuser, j\'ai des enfants'), conditions: { enfants: true }, effets: { moral: 2 }, resultat: NF.t('La loi est de votre côté. Vous gardez vos horaires.') },
        { texte: NF.t('Refuser'),
          aleatoire: [
            { poids: 6, effets: { moral: 2 }, resultat: NF.t('On trouve un volontaire. Rien ne change pour vous.') },
            { poids: 4, effets: { moral: -3, reputation: -2 }, resultat: NF.t('Le chef le prend mal. Les semaines suivantes, vous héritez des pires créneaux.') },
          ] },
      ] },

    /* ---------------- Prime exceptionnelle ---------------- */
    { id: 'tra_prime_exceptionnelle', famille: 'travail', icone: '🎁', titre: NF.t('Prime exceptionnelle'),
      texte: function (s) { return NF.t('Bonne année pour l\'entreprise : la direction verse une prime exceptionnelle. Pour vous, ') + U.euros(arrondi10(salaire(s) * 0.5)) + '.'; },
      poids: 1.5, delai: 14,
      conditions: { emploi: true, nonDeclare: false },
      choix: [
        { texte: NF.t('Mettre de côté'), effets: function (s) { return { argent: arrondi10(salaire(s) * 0.5), moral: 4 }; }, resultat: NF.t('La prime dort sur le compte. On ne sait jamais.') },
        { texte: NF.t('Rembourser mes dettes'), conditions: { dette: true },
          effets: function (s) { var p = arrondi10(salaire(s) * 0.5); return { argent: Math.round(p * 0.3), dette: -Math.round(p * 0.7), moral: 5 }; },
          resultat: NF.t('Les deux tiers partent dans la dette. Ça fait du bien de la voir fondre.') },
        { texte: NF.t('Payer des cours du soir'), conditions: { lieu: 'universite' },
          effets: function (s) { return { argent: arrondi10(salaire(s) * 0.25), xp: { gestion: 15, informatique: 10 }, energie: -8, moral: 3 }; },
          resultat: NF.t('La moitié de la prime finance un trimestre de cours du soir. Investissement.') },
        { texte: NF.t('Fêter ça avec les collègues'), effets: function (s) { return { argent: arrondi10(salaire(s) * 0.4), moral: 9, reputation: 2, nourriture: 10 }; }, resultat: NF.t('Une soirée au restaurant. Une partie de la prime y passe, mais quelle soirée.') },
      ] },

    /* ---------------- Erreur de paie → trop-perçu réclamé ---------------- */
    { id: 'tra_erreur_paie', famille: 'travail', icone: '🧾', titre: NF.t('Erreur de paie'),
      texte: function (s) { return NF.t('Votre virement est plus élevé que prévu : ') + U.euros(arrondi10(salaire(s) * 0.3)) + NF.t(' de trop. Sur la fiche de paie, une prime que vous n\'avez jamais eue.'); },
      poids: 1.5, delai: 14,
      conditions: { emploi: true, nonDeclare: false },
      choix: [
        { texte: NF.t('Prévenir le service paie'), effets: { reputation: 2, moral: 1 }, resultat: NF.t('On vous remercie. La régularisation se fait le mois suivant, sans histoire.') },
        { texte: NF.t('Ne rien dire'), effets: function (s) { var t = arrondi10(salaire(s) * 0.3); return { argent: t, programmer: { evenement: 'tra_erreur_paie_suite', dans: 2, donnees: { montant: t } } }; }, resultat: NF.t('L\'argent reste sur le compte. Vous essayez de ne pas y penser.') },
        { texte: NF.t('Ne rien dire, mais mettre la somme de côté'), conditions: { competences: { gestion: 1 } },
          effets: function (s) { var t = arrondi10(salaire(s) * 0.3); return { argent: t, drapeaux: { trop_percu_reserve: true }, programmer: { evenement: 'tra_erreur_paie_suite', dans: 2, donnees: { montant: t } } }; },
          resultat: NF.t('Vous ne touchez pas à cet argent. S\'ils le réclament, il sera là.') },
      ] },

    { id: 'tra_erreur_paie_suite', famille: 'travail', force: true, icone: '📨', titre: NF.t('Trop-perçu réclamé'),
      texte: function (s, d) { var m = d && d.montant ? d.montant : 200; return NF.t('Le service paie a repéré l\'erreur : un courrier réclame le remboursement de ') + U.euros(m) + NF.t(' de trop-perçu.'); },
      choix: [
        { texte: NF.t('Rembourser avec la somme mise de côté'), conditions: { drapeau: 'trop_percu_reserve' },
          effets: function (s, d) { var m = d && d.montant ? d.montant : 200; NF.api.retirerArgent(s, m, true); return { moral: 1, reputation: 1, drapeaux: { trop_percu_reserve: false } }; },
          resultat: NF.t('L\'argent était là. Vous le rendez sans sourciller.') },
        { texte: NF.t('Rembourser'), conditions: { sansDrapeau: 'trop_percu_reserve' },
          effets: function (s, d) { var m = d && d.montant ? d.montant : 200; NF.api.retirerArgent(s, m, true); return { moral: -4 }; },
          resultat: NF.t('Vous rendez ce qui n\'était pas à vous. Le compte fait grise mine ; s\'il manque, le reste devient une dette.') },
        { texte: NF.t('Demander un étalement'), conditions: { competences: { administratif: 1 } },
          effets: function (s, d) { var m = d && d.montant ? d.montant : 200; return { dette: m, moral: -1, drapeaux: { trop_percu_reserve: false } }; },
          resultat: NF.t('Retenue en plusieurs fois sur les prochaines paies. Une dette, mais une dette douce.') },
        { texte: NF.t('Contester'), conditions: { competences: { lecture: 2 } },
          aleatoire: [
            { poids: 3, effets: { moral: 2, drapeaux: { trop_percu_reserve: false } }, resultat: NF.t('Vous invoquez une clause mal rédigée et le délai dépassé. Ils abandonnent.') },
            { poids: 7, effets: function (s, d) { var m = d && d.montant ? d.montant : 200; NF.api.retirerArgent(s, m, true); return { moral: -5, reputation: -3, drapeaux: { trop_percu_reserve: false } }; }, resultat: NF.t('Le droit est clair : vous devez rembourser. Et la direction se souviendra que vous aviez gardé l\'argent.') },
          ] },
      ] },

    /* ---------------- Débauchage par un concurrent ---------------- */
    { id: 'tra_debauchage', famille: 'travail', icone: '📬', titre: NF.t('Un concurrent vous veut'),
      texte: function (s) { return NF.t('Un concurrent de votre employeur vous contacte discrètement : même poste de ') + nomMetier(s) + NF.t(', 12 % de plus, à partir du mois prochain.'); },
      poids: 1.5, delai: 16,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 3 },
      choix: [
        { texte: NF.t('Accepter'), effets: function (s) { s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.12); s.joueur.emploi.mois = 0; return { moral: 5, energie: -5 }; },
          resultat: function (s) { return NF.t('Nouveaux locaux, nouveaux collègues, et ') + U.euros(s.joueur.emploi.salaire) + NF.t(' par mois. Votre ancienneté repart de zéro.'); } },
        { texte: NF.t('M\'en servir pour négocier avec mon employeur'), conditions: { competences: { commerce: 3 } },
          aleatoire: [
            { poids: 6, effets: function (s) { s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.08); return { moral: 4, reputation: 2 }; }, resultat: function (s) { return NF.t('Votre employeur s\'aligne en partie : ') + U.euros(s.joueur.emploi.salaire) + NF.t(' par mois, et vous restez.'); } },
            { poids: 4, effets: { moral: -3, reputation: -1 }, resultat: NF.t('« Si vous voulez partir, partez. » Vous restez, et il s\'en souviendra.') },
          ] },
        { texte: NF.t('Décliner'), effets: { moral: 2, reputation: 1 }, resultat: NF.t('Vous êtes bien où vous êtes. Le concurrent n\'insiste pas.') },
      ] },

    /* ---------------- Chantier qui ferme ---------------- */
    { id: 'tra_chantier_ferme', famille: 'travail', icone: '🚧', titre: NF.t('Le chantier ferme'),
      texte: NF.t('Le promoteur a cessé de payer : le chantier s\'arrête du jour au lendemain. Les grues restent figées, l\'équipe est dispersée.'),
      poids: 2, delai: 12,
      conditions: { emploi: true, secteur: 'batiment' },
      choix: [
        { texte: NF.t('Suivre le chef sur un autre chantier'), conditions: { competences: { technique: 2 } },
          aleatoire: [
            { poids: 6, effets: { energie: -6, moral: -2 }, resultat: NF.t('Le chef vous emmène sur sa prochaine affaire. Plus loin, mais le travail continue.') },
            { poids: 4, effets: { emploi: 'perdre', raison: NF.t('chantier fermé'), moral: -6 }, resultat: NF.t('Il n\'a de place que pour deux personnes. Pas pour vous.') },
          ] },
        { texte: NF.t('Toucher l\'indemnité de fin de chantier'), conditions: { nonDeclare: false },
          effets: function (s) { var ind = arrondi10(salaire(s) * 0.6); return { argent: ind, emploi: 'perdre', raison: NF.t('fin de chantier'), moral: -4, journal: NF.t('Indemnité : ') + U.euros(ind) + '.' }; },
          resultat: NF.t('Solde de tout compte, et la porte.') },
        { texte: NF.t('Récupérer ce qui traîne avant de partir'), conditions: { nonDeclare: true },
          effets: { objets: { ferraille: 2, bois: 1 }, emploi: 'perdre', raison: NF.t('chantier fermé'), moral: -4 },
          resultat: NF.t('Personne ne vous doit rien, et personne ne surveille. Vous repartez avec du métal et des planches.') },
        { texte: NF.t('Attendre une reprise'),
          aleatoire: [
            { poids: 3, effets: { moral: -3, energie: 5 }, resultat: NF.t('Un mois de flottement, puis un repreneur. Le chantier redémarre.') },
            { poids: 7, effets: { emploi: 'perdre', raison: NF.t('chantier fermé'), moral: -8 }, resultat: NF.t('Personne ne reprend. Vous l\'apprenez par un collègue.') },
          ] },
      ] },

    /* ---------------- Reconversion → dossier accepté ---------------- */
    { id: 'tra_reconversion', famille: 'travail', icone: '🔄', titre: NF.t('Envie d\'autre chose'),
      texte: function (s) { return NF.t('Un collègue a quitté l\'entreprise pour se former à autre chose, financé par son compte formation. Vous y pensez : ') + nomMetier(s) + NF.t(' jusqu\'à la retraite ?'); },
      poids: 1.2, delai: 18,
      conditions: { emploi: true, emploiNiveauMin: 2, emploiNiveauMax: 3, ageMin: 23, formation: false, sansDrapeau: 'reconversion_dossier' },
      choix: [
        { texte: NF.t('Monter un dossier de financement'), conditions: { lieu: 'pole' },
          effets: { xp: { administratif: 12 }, moral: 3, drapeaux: { reconversion_dossier: true }, programmer: { evenement: 'tra_reconversion_suite', dans: 3 } },
          resultat: NF.t('Un conseiller vous aide à compléter le dossier. Réponse dans quelques mois.') },
        { texte: NF.t('Suivre des cours du soir'), conditions: { lieu: 'universite', argentMin: 120 },
          effets: { argent: -120, xp: { gestion: 20, informatique: 15 }, energie: -10, moral: 2 },
          resultat: NF.t('Deux soirs par semaine à l\'université. Fatigant, mais la tête s\'ouvre.') },
        { texte: NF.t('Rester où je suis'), effets: { moral: -1 }, resultat: NF.t('Ce n\'est pas le moment. Peut-être jamais.') },
      ] },

    { id: 'tra_reconversion_suite', famille: 'travail', force: true, icone: '📬', titre: NF.t('Dossier accepté'),
      texte: NF.t('Votre dossier de formation est accepté : quatre semaines financées, à choisir avant la fin du mois.'),
      conditions: { drapeau: 'reconversion_dossier' },
      choix: [
        { texte: NF.t('Une formation technique (électricité, mécanique)'), conditions: { formation: false },
          effets: { xp: { technique: 35, bricolage: 15 }, energie: -12, moral: 5, drapeaux: { reconversion_dossier: false } },
          resultat: NF.t('Quatre semaines d\'atelier. Vous repartez avec une attestation et des bases solides.') },
        { texte: NF.t('Une formation tertiaire (gestion, bureautique)'), conditions: { formation: false, lieu: 'universite' },
          effets: { xp: { gestion: 30, informatique: 20 }, energie: -10, moral: 5, drapeaux: { reconversion_dossier: false } },
          resultat: NF.t('Tableurs, comptabilité, courriers types. Moins de sueur, plus d\'écran.') },
        { texte: NF.t('Finalement, non'), effets: { drapeaux: { reconversion_dossier: false }, moral: -2 }, resultat: NF.t('Le financement retourne dans le pot commun.') },
      ] },

    /* ---------------- Offre pour les cadres ---------------- */
    { id: 'tra_offre_cadre', famille: 'travail', icone: '🎯', titre: NF.t('Approche d\'un cabinet de recrutement'),
      texte: function (s) {
        var m = metierCadre(s);
        if (!m) return NF.t('Un cabinet de recrutement vous contacte pour un poste de cadre.');
        var v = NF.core.prerequisMetier(s, m);
        var t = NF.t('Un cabinet de recrutement vous contacte : un poste de ') + NF.util.minuscule(m.nom) + NF.t(' s\'ouvre chez un client. Entretien discret, réponse rapide.');
        if (!v.ok) t += NF.t(' Pour être retenu, il faudrait : ') + v.raisons.join(', ') + '.';
        return t;
      },
      poids: 1.5, delai: 16,
      conditions: { emploi: true, nonDeclare: false, emploiNiveauMin: 4, emploiNiveauMax: 4 },
      choix: [
        { texte: function (s) { var m = metierCadre(s); return NF.t('Accepter le poste de ') + (m ? NF.util.minuscule(m.nom) : 'cadre'); },
          condition: function (s) { var m = metierCadre(s); return !!(m && NF.core.prerequisMetier(s, m).ok); },
          effets: function (s) { var m = metierCadre(s); if (m) NF.core.embaucher(s, m); return { moral: 8, reputation: 3, energie: -6 }; },
          resultat: function (s) { return texteEmbauche(s, NF.t('Vous changez de bureau et d\'étage.')); } },
        { texte: NF.t('Demander une contre-proposition à mon employeur'), conditions: { competences: { commerce: 3 } },
          aleatoire: [
            { poids: 6, effets: function (s) { s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.08); return { moral: 4, reputation: 1 }; }, resultat: function (s) { return NF.t('Votre employeur préfère vous garder : ') + U.euros(s.joueur.emploi.salaire) + NF.t(' par mois.'); } },
            { poids: 4, effets: { moral: -2 }, resultat: NF.t('« Nous n\'avons pas de marge cette année. » Vous restez, sans plus.') },
          ] },
        { texte: NF.t('Décliner'), effets: { moral: 1 }, resultat: NF.t('Vous gardez la carte de visite, au cas où.') },
      ] },
  ]);
})();
