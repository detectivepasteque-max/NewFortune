/* =====================================================================
 * ÉVÉNEMENTS – FAMILLE
 * ---------------------------------------------------------------------
 * Tous ces événements exigent un partenaire ou des enfants.
 *   partenaire : { prenom, age (mois), relation 0-100, sante, revenu, metier, depuis }
 *   enfant     : { prenom, age (mois), relation, sante, education 0-100 }
 * Les prénoms sont mixtes : les textes évitent les accords de genre.
 * Les événements `naissance` et `rupture` sont dans systeme.js.
 *
 * Drapeaux introduits ici : partenaire_malade, ado_probleme.
 * Champs ajoutés aux objets famille : partenaire.marie, partenaire.ancienRevenu,
 *   enfant.majeurTraite, enfant.etudes.
 * ===================================================================== */
(function () {
  var U = NF.util;

  function famille(s) { return s.joueur.famille; }
  function partenaire(s) { return famille(s).partenaire; }
  function prenomP(s) { var p = partenaire(s); return p ? p.prenom : NF.t('Votre partenaire'); }
  function prenomE(e) { return e ? e.prenom : NF.t('Votre enfant'); }

  /** Premier enfant dont l'âge en années est compris entre minAns et maxAns */
  function enfantEntre(s, minAns, maxAns) {
    var l = famille(s).enfants;
    for (var i = 0; i < l.length; i++) {
      var a = Math.floor(l[i].age / 12);
      if (a >= minAns && a <= maxAns) return l[i];
    }
    return null;
  }
  /** Premier enfant majeur dont l'avenir n'a pas encore été discuté */
  function enfantMajeur(s) {
    var l = famille(s).enfants;
    for (var i = 0; i < l.length; i++) if (l[i].age >= 18 * 12 && !l[i].majeurTraite) return l[i];
    return null;
  }
  /** Personne fêtée : un enfant (tourne chaque mois), sinon le partenaire */
  function cibleAnniversaire(s) {
    var f = famille(s);
    if (f.enfants.length) return f.enfants[s.temps.moisAbsolu % f.enfants.length];
    return f.partenaire;
  }

  function relationP(s, delta) { var p = partenaire(s); if (p) p.relation = U.clamp(p.relation + delta, 0, 100); }
  function santeP(s, delta) { var p = partenaire(s); if (p) p.sante = U.clamp(p.sante + delta, 5, 100); }
  function modifE(e, champ, delta) { if (e) e[champ] = U.clamp((e[champ] || 0) + delta, champ === 'sante' ? 5 : 0, 100); }
  function tousEnfants(s, champ, delta) { famille(s).enfants.forEach(function (e) { modifE(e, champ, delta); }); }

  /** Le partenaire trouve un emploi (ou un meilleur poste s'il en a déjà un) */
  function nouveauRevenuP(s) {
    var p = partenaire(s);
    if (!p) return 0;
    if (p.revenu > 0) { p.revenu = Math.round(p.revenu * 1.15 / 10) * 10; return p.revenu; }
    var cl = s.joueur.classe;
    var base = cl <= 2 ? [500, 700, 900] : (cl <= 4 ? [900, 1200, 1400] : [1400, 1800, 2200]);
    p.revenu = (p.ancienRevenu && NF.rng.chance(0.5)) ? p.ancienRevenu : NF.rng.pick(base);
    delete p.ancienRevenu;
    if (!p.metier) p.metier = NF.rng.pick(['vendeur', NF.t('infirmière'), 'livreur', 'aide-soignant', NF.t('employé de bureau'), NF.t('cuisinière'), NF.t('agent d\'entretien'), 'technicien']);
    return p.revenu;
  }
  function texteRevenuP(s) { var p = partenaire(s); return p ? NF.t('Revenus de ') + p.prenom + ' : ' + U.euros(p.revenu) + NF.t(' par mois.') : ''; }

  NF.ajouterEvenements([

    /* ------------------------------------------------------------------
     * Couple
     * ---------------------------------------------------------------- */
    { id: 'fam_dispute', famille: 'famille', icone: '🗯️', titre: NF.t('Une dispute'),
      texte: function (s) { return NF.t('Le ton monte avec ') + prenomP(s) + NF.t('. L\'argent, le temps que vous passez dehors, la fatigue de chacun. Une porte claque.'); },
      poids: function (s) { var p = partenaire(s); return p && p.relation < 40 ? 4 : 2; }, delai: 4,
      conditions: { partenaire: true },
      choix: [
        { texte: NF.t('S\'excuser et discuter jusqu\'au bout'),
          effets: function (s) { relationP(s, 8); return { moral: -2, energie: -4 }; },
          resultat: NF.t('Une longue conversation, des larmes, puis le calme. Vous vous comprenez un peu mieux.') },
        { texte: NF.t('Proposer une sortie pour se retrouver (40 €)'), conditions: { argentMin: 40 },
          effets: function (s) { relationP(s, 12); return { argent: -40, moral: 4 }; },
          resultat: NF.t('Un restaurant de quartier, un film. Ce n\'est pas une solution, mais c\'est une trêve.') },
        { texte: NF.t('Laisser passer l\'orage'),
          aleatoire: [
            { poids: 5, effets: function (s) { relationP(s, -6); return { moral: -3 }; }, resultat: NF.t('Chacun dans son coin pendant des jours. Ça passe, sans vraiment passer.') },
            { poids: 5, effets: function (s) { relationP(s, -12); return { moral: -6 }; }, resultat: function (s) { return prenomP(s) + NF.t(' dort sur le canapé toute la semaine. Le silence s\'installe.'); } },
          ] },
        { texte: NF.t('Sortir prendre l\'air'),
          effets: function (s) { relationP(s, -4); return { moral: 3, energie: -3 }; },
          resultat: NF.t('Une longue marche. Vous rentrez tard, plus calme. Rien n\'est réglé.') },
      ] },

    { id: 'fam_maladie_proche', famille: 'famille', icone: '🤒', titre: NF.t('Un proche malade'),
      texte: function (s) { return prenomP(s) + NF.t(' est malade : fièvre, toux, plus de force. Ça traîne depuis dix jours.'); },
      poids: 2, delai: 10,
      conditions: { partenaire: true, sansDrapeau: 'partenaire_malade' },
      choix: [
        { texte: NF.t('L\'accompagner à l\'hôpital'), conditions: { lieu: 'hopital' },
          effets: function (s) { santeP(s, -3); relationP(s, 6); return { energie: -8, moral: 2 }; },
          resultat: NF.t('Des heures d\'attente, mais un diagnostic et un traitement. Vous tenez la main.') },
        { texte: NF.t('Payer une consultation (50 €)'), conditions: { argentMin: 50 },
          effets: function (s) { santeP(s, -2); relationP(s, 4); return { argent: -50 }; },
          resultat: NF.t('Un médecin de ville, une ordonnance, et le soulagement.') },
        { texte: NF.t('Utiliser vos médicaments'), conditions: { objet: 'medicaments' },
          effets: function (s) { santeP(s, -4); relationP(s, 3); return { objets: { medicaments: -1 } }; },
          resultat: NF.t('Vos antidouleurs et un peu de repos. Ça suffit, cette fois.') },
        { texte: NF.t('Attendre que ça passe'),
          aleatoire: [
            { poids: 5, effets: function (s) { santeP(s, -6); return { moral: -2 }; }, resultat: NF.t('Trois semaines au lit. Ça finit par passer.') },
            { poids: 5, effets: function (s) { santeP(s, -10); relationP(s, -5); return { moral: -5, drapeaux: { partenaire_malade: true }, programmer: { evenement: 'fam_maladie_proche_suite', dans: 1 } }; },
              resultat: NF.t('Ça empire. La toux ne lâche plus, la fièvre ne tombe pas.') },
          ] },
      ] },

    { id: 'fam_maladie_proche_suite', famille: 'famille', force: true, icone: '🏥', titre: NF.t('Ça s\'aggrave'),
      texte: function (s) {
        if (!partenaire(s)) return NF.t('Un message d\'une connaissance commune : la personne qui partageait votre vie a fini à l\'hôpital. Ça s\'est arrangé, sans vous.');
        return prenomP(s) + NF.t(' ne se lève plus. La fièvre ne tombe pas, la respiration siffle. Il faut faire quelque chose.');
      },
      poids: 1, delai: 1,
      conditions: { drapeau: 'partenaire_malade' },
      choix: [
        { texte: NF.t('Appeler les urgences'), conditions: { partenaire: true },
          effets: function (s) { santeP(s, -5); relationP(s, 10); delete s.joueur.drapeaux.partenaire_malade; return { energie: -10, moral: -3, argent: s.joueur.classe >= 3 ? -40 : 0 }; },
          resultat: NF.t('Hospitalisation, antibiotiques. Une semaine plus tard, le sourire revient.') },
        { texte: NF.t('Payer une clinique privée (300 €)'), conditions: { partenaire: true, argentMin: 300 },
          effets: function (s) { santeP(s, -2); relationP(s, 12); delete s.joueur.drapeaux.partenaire_malade; return { argent: -300, moral: 2 }; },
          resultat: NF.t('Chambre seule, soins rapides. Vous n\'avez pas hésité, et ça se voit.') },
        { texte: NF.t('Soigner à la maison'), conditions: { partenaire: true },
          aleatoire: [
            { poids: 4, effets: function (s) { santeP(s, -8); relationP(s, 2); delete s.joueur.drapeaux.partenaire_malade; return { energie: -8 }; },
              resultat: NF.t('Des nuits blanches, des tisanes, des linges frais. Ça passe, lentement.') },
            { poids: 6, effets: function (s) { santeP(s, -20); relationP(s, -8); delete s.joueur.drapeaux.partenaire_malade; return { moral: -8, energie: -10 }; },
              resultat: function (s) { return prenomP(s) + NF.t(' met deux mois à s\'en remettre. Et ne vous pardonne pas tout à fait d\'avoir attendu.'); } },
          ] },
        { texte: NF.t('Tourner la page'), cache: true, condition: function (s) { return !partenaire(s); },
          effets: function (s) { delete s.joueur.drapeaux.partenaire_malade; return { moral: -2 }; },
          resultat: NF.t('Vous n\'êtes plus ensemble. Vous y pensez quand même toute la journée.') },
      ] },

    { id: 'fam_demande_mariage', famille: 'famille', icone: '💍', titre: NF.t('Une demande'),
      texte: function (s) { return prenomP(s) + NF.t(' a préparé un vrai repas, sorti une bouteille, et pose la question, tout bas : « On se marie ? »'); },
      poids: 1.5, delai: 12,
      conditions: { partenaire: true },
      condition: function (s) { var p = partenaire(s); return !!p && !p.marie && p.relation >= 60 && (s.temps.moisAbsolu - (p.depuis || 0)) >= 12; },
      choix: [
        { texte: NF.t('Dire oui, et faire une vraie fête (500 €)'), conditions: { argentMin: 500 },
          effets: function (s) { var p = partenaire(s); if (p) p.marie = true; relationP(s, 18); return { argent: -500, moral: 12, reputation: 3 }; },
          resultat: NF.t('Mairie, puis une salle louée, des amis, de la musique. Un des plus beaux jours.') },
        { texte: NF.t('Dire oui, simplement, à la mairie (80 €)'), conditions: { argentMin: 80 },
          effets: function (s) { var p = partenaire(s); if (p) p.marie = true; relationP(s, 12); return { argent: -80, moral: 10 }; },
          resultat: NF.t('Deux témoins, un bouquet acheté au marché. C\'est fait.') },
        { texte: NF.t('Dire oui, mais plus tard, quand ça ira mieux'),
          effets: function (s) { relationP(s, -4); return { moral: 2 }; },
          resultat: function (s) { return prenomP(s) + NF.t(' sourit, mais le sourire ne va pas jusqu\'aux yeux. « D\'accord. Plus tard. »'); } },
        { texte: NF.t('Dire non'),
          effets: function (s) { relationP(s, -15); return { moral: -5 }; },
          resultat: NF.t('Vous ne vous voyez pas marié. Le repas finit dans le silence.') },
      ] },

    { id: 'fam_partenaire_perd_emploi', famille: 'famille', icone: '📉', titre: NF.t('Mauvaise nouvelle'),
      texte: function (s) { return prenomP(s) + NF.t(' rentre plus tôt que d\'habitude et s\'assoit sans rien dire. Fin de contrat. Plus de salaire le mois prochain.'); },
      poids: 2, delai: 12,
      conditions: { partenaire: true },
      condition: function (s) { var p = partenaire(s); return !!p && p.revenu > 0; },
      choix: [
        { texte: NF.t('Soutenir sans rien demander'),
          effets: function (s) { var p = partenaire(s); if (p) { p.ancienRevenu = p.revenu; p.revenu = 0; } relationP(s, 6); return { moral: -4 }; },
          resultat: NF.t('Vous encaissez le coup ensemble. À deux, c\'est moins lourd.') },
        { texte: NF.t('L\'aider à chercher tout de suite'), conditions: { competences: { administratif: 1 } },
          effets: function (s) { var p = partenaire(s); if (p) { p.ancienRevenu = p.revenu; p.revenu = 0; } relationP(s, 4); return { moral: -2, energie: -5, programmer: { evenement: 'fam_partenaire_trouve_emploi', dans: 2 } }; },
          resultat: NF.t('CV refait, inscriptions, candidatures envoyées le soir même. Ça occupe, et ça rassure.') },
        { texte: NF.t('Demander des comptes'),
          effets: function (s) { var p = partenaire(s); if (p) { p.ancienRevenu = p.revenu; p.revenu = 0; } relationP(s, -10); return { moral: -6 }; },
          resultat: NF.t('Vous posez des questions, trop vite, trop fort. Les mots dépassent votre pensée. Trop tard.') },
      ] },

    { id: 'fam_partenaire_trouve_emploi', famille: 'famille', icone: '📈', titre: NF.t('Un contrat'),
      texte: function (s) {
        var p = partenaire(s);
        if (p && p.revenu > 0) return prenomP(s) + NF.t(' a trouvé mieux : un poste plus stable, mieux payé. Le contrat est signé.');
        return prenomP(s) + NF.t(' rentre avec un contrat signé et des yeux qui brillent. Un emploi, enfin.');
      },
      poids: 2.5, delai: 6,
      conditions: { partenaire: true },
      condition: function (s) { var p = partenaire(s); return !!p && p.revenu === 0; },
      choix: [
        { texte: NF.t('Fêter ça (30 €)'), conditions: { argentMin: 30 },
          effets: function (s) { nouveauRevenuP(s); relationP(s, 8); return { argent: -30, moral: 8 }; },
          resultat: function (s) { return NF.t('Un repas dehors, un verre levé. ') + texteRevenuP(s); } },
        { texte: NF.t('Se réjouir sobrement'),
          effets: function (s) { nouveauRevenuP(s); relationP(s, 4); return { moral: 5 }; },
          resultat: function (s) { return NF.t('Une accolade, et des comptes refaits sur un coin de table. ') + texteRevenuP(s); } },
      ] },

    { id: 'fam_belle_famille', famille: 'famille', icone: '👵', titre: NF.t('La famille de l\'autre côté'),
      texte: function (s) {
        var p = prenomP(s), ordre = NF.core.logementActuel(s).ordre;
        var intro = ordre <= 2 ? NF.t('Les parents de ') + p + NF.t(' vous donnent rendez-vous dans un café. Ils ont compris la situation.') : NF.t('Les parents de ') + p + NF.t(' viennent dîner. Ils regardent l\'appartement, les factures sur la table.');
        return intro + NF.t(' En partant, la mère prend ') + p + NF.t(' à part, puis vous : « On peut aider, si vous acceptez. »');
      },
      poids: 1.5, delai: 12,
      conditions: { partenaire: true },
      choix: [
        { texte: NF.t('Accepter une aide financière'),
          effets: function (s) { var m = s.joueur.classe <= 2 ? 150 : 300; relationP(s, 3); s.joueur.drapeaux.aide_belle_famille = m; return { argent: m, moral: 3, reputation: -1 }; },
          resultat: function (s) { var m = s.joueur.drapeaux.aide_belle_famille; delete s.joueur.drapeaux.aide_belle_famille; return NF.t('Une enveloppe de ') + U.euros(m || 150) + NF.t('. Vous n\'avez rien demandé, et ça vous reste un peu en travers.'); } },
        { texte: NF.t('Accepter d\'être hébergés chez eux quelques semaines'), conditions: { logementOrdreMax: 2 },
          effets: function (s) { relationP(s, 6); tousEnfants(s, 'relation', 3); return { hygiene: 20, energie: 15, nourriture: 15, moral: 6 }; },
          resultat: NF.t('Une chambre d\'amis, des repas chauds, un peu de répit. Vous repartez remis d\'aplomb.') },
        { texte: NF.t('Accepter qu\'ils gardent les enfants de temps en temps'), conditions: { enfants: true },
          effets: function (s) { relationP(s, 5); tousEnfants(s, 'relation', 2); return { energie: 10, moral: 5 }; },
          resultat: NF.t('Un week-end par mois chez les grands-parents. Tout le monde y gagne.') },
        { texte: NF.t('Refuser poliment'),
          effets: function (s) { relationP(s, -5); return { moral: 2 }; },
          resultat: function (s) { return NF.t('Vous voulez y arriver seul. ') + prenomP(s) + NF.t(' ne dit rien, mais pense le contraire.'); } },
      ] },

    { id: 'fam_crise', famille: 'famille', icone: '💔', titre: NF.t('Les jours sans'),
      texte: function (s) { return NF.t('Entre vous et ') + prenomP(s) + NF.t(', il n\'y a plus que des silences. Vous dormez dos à dos. La question est là, et aucun de vous n\'ose la poser.'); },
      poids: 3, delai: 6,
      conditions: { partenaire: true },
      condition: function (s) { var p = partenaire(s); return !!p && p.relation < 35; },
      choix: [
        { texte: NF.t('Proposer une thérapie de couple (120 €)'), conditions: { argentMin: 120 },
          aleatoire: [
            { poids: 6, effets: function (s) { relationP(s, 18); return { argent: -120, moral: 4 }; }, resultat: NF.t('Trois séances. Vous réapprenez à parler, et à écouter.') },
            { poids: 4, effets: function (s) { relationP(s, 5); return { argent: -120, moral: -2 }; }, resultat: NF.t('Ça aide un peu. Pas assez.') },
          ] },
        { texte: NF.t('Ressortir les photos du mariage'), condition: function (s) { var p = partenaire(s); return !!p && !!p.marie; },
          effets: function (s) { relationP(s, 10); return { moral: 4 }; },
          resultat: NF.t('Vous vous souvenez de ce que vous vous étiez promis. Ça ne répare pas tout, mais ça rappelle pourquoi.') },
        { texte: NF.t('Tout mettre à plat, une nuit entière'),
          aleatoire: [
            { poids: 5, effets: function (s) { relationP(s, 12); return { energie: -8, moral: 3 }; }, resultat: NF.t('Au matin, vous êtes épuisés et plus proches.') },
            { poids: 5, effets: function (s) { relationP(s, -8); return { energie: -8, moral: -6 }; }, resultat: NF.t('Chaque reproche en appelle un autre. Le jour se lève sur un constat.') },
          ] },
        { texte: NF.t('Proposer de se séparer'),
          effets: function (s) { tousEnfants(s, 'relation', -5); NF.core.separer(s, NF.t('d\'un commun accord')); return { moral: 2 }; },
          resultat: NF.t('Vous partagez les affaires sans cris. C\'est fini, et c\'est presque un soulagement.') },
      ] },

    /* ------------------------------------------------------------------
     * Enfants
     * ---------------------------------------------------------------- */
    { id: 'fam_enfant_malade', famille: 'famille', icone: '🤧', titre: NF.t('Un enfant malade'),
      texte: function (s) { return prenomE(enfantEntre(s, 0, 17)) + NF.t(' a de la fièvre depuis trois jours et ne mange presque plus.'); },
      poids: 2.5, delai: 6,
      conditions: { enfants: true },
      condition: function (s) { return !!enfantEntre(s, 0, 17); },
      choix: [
        { texte: NF.t('Aller aux urgences pédiatriques'), conditions: { lieu: 'hopital' },
          effets: function (s) { var e = enfantEntre(s, 0, 17); modifE(e, 'sante', -2); modifE(e, 'relation', 4); return { energie: -8, moral: 1 }; },
          resultat: NF.t('Une nuit à l\'hôpital, puis le retour à la maison avec une ordonnance.') },
        { texte: NF.t('Acheter des médicaments (30 €)'), conditions: { argentMin: 30 },
          effets: function (s) { var e = enfantEntre(s, 0, 17); modifE(e, 'sante', -3); modifE(e, 'relation', 2); return { argent: -30 }; },
          resultat: NF.t('Sirop, paracétamol, et des nuits à surveiller la fièvre.') },
        { texte: NF.t('Utiliser vos médicaments'), conditions: { objet: 'medicaments' },
          effets: function (s) { var e = enfantEntre(s, 0, 17); modifE(e, 'sante', -4); return { objets: { medicaments: -1 } }; },
          resultat: NF.t('Vous partagez ce que vous avez. Ça fait l\'affaire.') },
        { texte: NF.t('Attendre'),
          aleatoire: [
            { poids: 5, effets: function (s) { modifE(enfantEntre(s, 0, 17), 'sante', -6); return { moral: -2 }; }, resultat: NF.t('Ça passe au bout d\'une semaine.') },
            { poids: 3, effets: function (s) { var e = enfantEntre(s, 0, 17); modifE(e, 'sante', -14); modifE(e, 'relation', -4); return { moral: -6, energie: -6 }; },
              resultat: NF.t('Ça dégénère. Il faut finalement courir à l\'hôpital, et c\'était moins une.') },
            { poids: 2, effets: function (s) { modifE(enfantEntre(s, 0, 17), 'sante', -3); return {}; }, resultat: NF.t('Finalement, deux jours de repos suffisent.') },
          ] },
      ] },

    { id: 'fam_ecole_difficultes', famille: 'famille', icone: '📝', titre: NF.t('Convocation à l\'école'),
      texte: function (s) { return NF.t('L\'école convoque les parents : ') + prenomE(enfantEntre(s, 6, 17)) + NF.t(' décroche. Notes en chute, absences, une bagarre. L\'enseignante demande, doucement, comment ça se passe à la maison.'); },
      poids: function (s) { return s.joueur.classe <= 2 ? 3 : 2; }, delai: 8,
      conditions: { enfants: true },
      condition: function (s) { return !!enfantEntre(s, 6, 17); },
      choix: [
        { texte: NF.t('Prendre du temps chaque soir pour les devoirs'),
          effets: function (s) { var e = enfantEntre(s, 6, 17); modifE(e, 'education', 6); modifE(e, 'relation', 5); return { energie: -8, moral: 2 }; },
          resultat: NF.t('Des soirées à la table de la cuisine. Lentement, les notes remontent.') },
        { texte: NF.t('Payer du soutien scolaire (80 €)'), conditions: { argentMin: 80 },
          effets: function (s) { modifE(enfantEntre(s, 6, 17), 'education', 10); return { argent: -80 }; },
          resultat: NF.t('Un étudiant vient deux fois par semaine. Ça aide, et ça vous soulage.') },
        { texte: NF.t('Demander de l\'aide au centre social'), conditions: { lieu: 'centre_social' },
          effets: function (s) { var e = enfantEntre(s, 6, 17); modifE(e, 'education', 5); modifE(e, 'relation', 2); return { moral: 1 }; },
          resultat: NF.t('Accompagnement scolaire gratuit. Et un adulte de plus qui s\'intéresse.') },
        { texte: NF.t('Laisser l\'école s\'en occuper'),
          aleatoire: [
            { poids: 5, effets: function (s) { modifE(enfantEntre(s, 6, 17), 'education', -4); return { moral: -1 }; }, resultat: NF.t('Rien ne change. Le bulletin suivant est pire.') },
            { poids: 5, effets: function (s) { var e = enfantEntre(s, 6, 17); modifE(e, 'education', -8); modifE(e, 'relation', -6); return { moral: -4 }; },
              resultat: function (s) { return prenomE(enfantEntre(s, 6, 17)) + NF.t(' comprend que vous ne regardez pas. Et arrête d\'essayer.'); } },
          ] },
      ] },

    { id: 'fam_garde_enfants', famille: 'famille', icone: '🧸', titre: NF.t('Une solution de garde'),
      texte: function (s) { return NF.t('Une mère rencontrée au square propose de garder ') + prenomE(enfantEntre(s, 0, 5)) + NF.t(' deux après-midis par semaine. Au centre social, une halte-garderie a aussi des places.'); },
      poids: 2, delai: 10,
      conditions: { enfants: true },
      condition: function (s) { return !!enfantEntre(s, 0, 5); },
      choix: [
        { texte: NF.t('Accepter, en la dédommageant (60 € ce mois-ci)'), conditions: { argentMin: 60 },
          effets: function (s) { modifE(enfantEntre(s, 0, 5), 'relation', -1); return { argent: -60, energie: 12, moral: 4 }; },
          resultat: NF.t('Deux après-midis pour souffler, chercher, dormir. Ça change tout.') },
        { texte: NF.t('La halte-garderie du centre social'), conditions: { lieu: 'centre_social' },
          effets: function (s) { modifE(enfantEntre(s, 0, 5), 'education', 3); return { energie: 10, moral: 3 }; },
          resultat: NF.t('Gratuit ou presque. Et votre enfant apprend à jouer avec d\'autres.') },
        { texte: NF.t('Proposer un échange de garde'),
          effets: function (s) { modifE(enfantEntre(s, 0, 5), 'relation', 1); return { energie: 5, moral: 2, reputation: 2 }; },
          resultat: NF.t('Vous gardez le sien, elle garde le vôtre. Du temps gagné, et une amitié.') },
        { texte: NF.t('Refuser : vous préférez tout faire vous-même'),
          effets: function (s) { modifE(enfantEntre(s, 0, 5), 'relation', 2); return { energie: -6, moral: -1 }; },
          resultat: NF.t('Vous tenez. À bout de bras.') },
      ] },

    { id: 'fam_ado_betise', famille: 'famille', icone: '🚨', titre: NF.t('Une bêtise'),
      texte: function (s) { return NF.t('Un appel du commissariat : on a surpris ') + prenomE(enfantEntre(s, 13, 17)) + NF.t(' avec des amis en train de taguer un mur du quartier. Pas de poursuites si les dégâts sont réparés.'); },
      poids: 2, delai: 10,
      conditions: { enfants: true, sansDrapeau: 'ado_probleme' },
      condition: function (s) { return !!enfantEntre(s, 13, 17); },
      choix: [
        { texte: NF.t('Discuter calmement, chercher à comprendre'),
          effets: function (s) { var e = enfantEntre(s, 13, 17); modifE(e, 'relation', 6); modifE(e, 'education', 2); return { energie: -4, moral: -2 }; },
          resultat: NF.t('Une longue soirée. Vous apprenez sur sa vie des choses que vous ignoriez.') },
        { texte: NF.t('Payer les dégâts (120 €)'), conditions: { argentMin: 120 },
          effets: function (s) { modifE(enfantEntre(s, 13, 17), 'relation', 2); return { argent: -120, reputation: 1 }; },
          resultat: NF.t('Vous réglez. L\'affaire est close, et le message est passé.') },
        { texte: NF.t('Punir sévèrement'),
          effets: function (s) { var e = enfantEntre(s, 13, 17); modifE(e, 'relation', -8); modifE(e, 'education', 3); return { moral: -3 }; },
          resultat: NF.t('Plus de sorties pendant un mois. Les portes claquent, mais les notes remontent.') },
        { texte: NF.t('Ignorer, vous avez d\'autres soucis'),
          effets: function (s) { modifE(enfantEntre(s, 13, 17), 'relation', -4); return { moral: -2, drapeaux: { ado_probleme: true }, programmer: { evenement: 'fam_ado_suite', dans: 2 } }; },
          resultat: NF.t('Vous laissez filer. Pour l\'instant.') },
      ] },

    { id: 'fam_ado_suite', famille: 'famille', force: true, icone: '⚖️', titre: NF.t('Convocation'),
      texte: function (s) { var e = enfantEntre(s, 13, 17) || enfantEntre(s, 13, 25); return prenomE(e) + NF.t(' a recommencé. Cette fois, le commissariat convoque les parents, et la mairie réclame le nettoyage des murs.'); },
      poids: 1, delai: 1,
      conditions: { enfants: true, drapeau: 'ado_probleme' },
      choix: [
        { texte: NF.t('Payer et être présent (200 €)'), conditions: { argentMin: 200 },
          effets: function (s) { var e = enfantEntre(s, 13, 17) || enfantEntre(s, 13, 25); delete s.joueur.drapeaux.ado_probleme; modifE(e, 'relation', 5); modifE(e, 'education', 2); return { argent: -200, moral: -3 }; },
          resultat: NF.t('Vous payez, et vous êtes là. Ça compte plus que la somme.') },
        { texte: NF.t('Négocier une réparation plutôt qu\'une amende'), conditions: { competences: { administratif: 1 } },
          effets: function (s) { var e = enfantEntre(s, 13, 17) || enfantEntre(s, 13, 25); delete s.joueur.drapeaux.ado_probleme; modifE(e, 'relation', 3); modifE(e, 'education', 4); return { energie: -5 }; },
          resultat: NF.t('Un samedi matin à repeindre le mur ensemble. Étrangement, ça rapproche.') },
        { texte: NF.t('Laisser la justice faire'),
          effets: function (s) { var e = enfantEntre(s, 13, 17) || enfantEntre(s, 13, 25); delete s.joueur.drapeaux.ado_probleme; modifE(e, 'relation', -12); modifE(e, 'education', -6); return { moral: -6, reputation: -3 }; },
          resultat: NF.t('Rappel à la loi, un éducateur qui passe. Votre enfant ne vous adresse plus la parole.') },
      ] },

    { id: 'fam_enfant_majeur', famille: 'famille', icone: '🎒', titre: NF.t('Dix-huit ans'),
      texte: function (s) { var p = prenomE(enfantMajeur(s)); return p + NF.t(' a dix-huit ans et des projets : partir étudier, trouver un travail, vivre ailleurs. ') + p + NF.t(' attend de savoir si vous pouvez aider.'); },
      poids: 3, delai: 6,
      conditions: { enfants: true },
      condition: function (s) { return !!enfantMajeur(s); },
      choix: [
        { texte: NF.t('Financer des études (800 €)'), conditions: { argentMin: 800 },
          effets: function (s) { var e = enfantMajeur(s); if (e) { modifE(e, 'education', 20); modifE(e, 'relation', 8); e.majeurTraite = true; e.etudes = true; } return { argent: -800, moral: 5 }; },
          resultat: NF.t('Inscription, loyer étudiant, un ordinateur d\'occasion. Vous donnez ce que vous n\'avez pas eu.') },
        { texte: NF.t('Aider au démarrage (200 €)'), conditions: { argentMin: 200 },
          effets: function (s) { var e = enfantMajeur(s); if (e) { modifE(e, 'education', 6); modifE(e, 'relation', 4); e.majeurTraite = true; } return { argent: -200, moral: 3 }; },
          resultat: NF.t('Une caution, un billet de train. Un début.') },
        { texte: NF.t('Proposer de rester en participant aux frais'),
          aleatoire: [
            { poids: 5, effets: function (s) { var e = enfantMajeur(s); if (e) { modifE(e, 'relation', -2); e.majeurTraite = true; } return { argent: 150, moral: 1 }; },
              resultat: function (s) { return NF.t('D\'accord pour rester un moment, et pour apporter un peu d\'argent chaque mois.'); } },
            { poids: 5, effets: function (s) { var e = enfantMajeur(s); if (e) { modifE(e, 'relation', -8); e.majeurTraite = true; } return { moral: -4 }; },
              resultat: NF.t('Non : partir, c\'est décidé. Vous recevrez un message de temps en temps.') },
          ] },
        { texte: NF.t('Laisser partir sans rien'),
          effets: function (s) { var e = enfantMajeur(s); if (e) { modifE(e, 'relation', -6); e.majeurTraite = true; } return { moral: -3 }; },
          resultat: NF.t('Un sac, une porte. Vous n\'aviez rien à donner.') },
      ] },

    /* ------------------------------------------------------------------
     * Toute la famille
     * ---------------------------------------------------------------- */
    { id: 'fam_anniversaire', famille: 'famille', icone: '🎂', titre: NF.t('Anniversaire'),
      texte: function (s) {
        var c = cibleAnniversaire(s), p = partenaire(s);
        if (!c) return NF.t('Un anniversaire approche dans la famille.');
        var t = NF.t('C\'est l\'anniversaire de ') + c.prenom + '. ';
        if (p && c !== p) t += p.prenom + NF.t(' compte sur vous pour marquer le coup.');
        else t += NF.t('Tout le monde attend un geste.');
        return t;
      },
      poids: 2, delai: 8,
      condition: function (s) { return !!partenaire(s) || famille(s).enfants.length > 0; },
      choix: [
        { texte: NF.t('Un vrai cadeau (50 €)'), conditions: { argentMin: 50 },
          effets: function (s) { var c = cibleAnniversaire(s); modifE(c, 'relation', 8); if (c !== partenaire(s)) relationP(s, 2); return { argent: -50, moral: 5 }; },
          resultat: NF.t('Des yeux qui brillent. Ça valait chaque euro.') },
        { texte: NF.t('Un gâteau fait maison'), conditions: { competences: { cuisine: 1 } },
          effets: function (s) { var c = cibleAnniversaire(s); modifE(c, 'relation', 6); if (c !== partenaire(s)) relationP(s, 2); return { argent: -8, moral: 5, xp: { cuisine: 5 } }; },
          resultat: NF.t('Vous passez la soirée en cuisine. Le gâteau est un peu raté, et parfait.') },
        { texte: NF.t('Un petit geste, fait main'),
          effets: function (s) { modifE(cibleAnniversaire(s), 'relation', 3); return { moral: 2 }; },
          resultat: NF.t('Une carte, un dessin. Ce n\'est pas grand-chose, et ça compte.') },
        { texte: NF.t('Oublier'),
          effets: function (s) { var c = cibleAnniversaire(s); modifE(c, 'relation', -6); if (c !== partenaire(s)) relationP(s, -3); return { moral: -4 }; },
          resultat: NF.t('Vous vous en rendez compte le lendemain. Le mal est fait.') },
      ] },
  ]);
})();
