/* =====================================================================
 * DÉROULEMENT D'UN TOUR (= un mois)
 * ---------------------------------------------------------------------
 * 1. phase 'actions'   : le joueur dépense ses points d'action
 * 2. finDuMois()       : économie, jauges, santé → bilan ; tirage des événements
 * 3. phase 'bilan'     : affichage du bilan
 * 4. phase 'evenement' : les événements un par un
 * 5. nouveauMois()     : mois suivant
 * La mort interrompt tout : phase 'mort' → héritier ou fin de lignée.
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /** Exécute une action de la liste NF.data.actions */
  C.executerAction = function (s, id, param) {
    var a = U.byId(NF.data.actions, id);
    if (!a) return { ok: false, texte: NF.t('Action inconnue.') };
    return C.actionGenerique(s, { pa: a.pa == null ? 1 : a.pa, nom: a.nom, conditions: a.conditions, condition: a.condition }, function () {
      return a.effet(s, param);
    });
  };

  /** Enveloppe générique : vérifie les PA et conditions, applique `fn`,
   *  calcule les différences de jauges. Utilisée par toutes les actions. */
  C.actionGenerique = function (s, opts, fn) {
    if (s.phase !== 'actions') return { ok: false, texte: NF.t('Terminez d\'abord ce qui est en cours.') };
    var cout = opts.pa == null ? 1 : opts.pa;
    if (s.pa < cout) return { ok: false, texte: NF.t('Plus assez de points d\'action ce mois-ci.') };
    if (opts.conditions) {
      var v = C.verifierConditions(s, opts.conditions);
      if (!v.ok) return { ok: false, texte: NF.i18n.sansMarqueur(NF.t('Impossible : ') + v.raisons.join(', ') + '.') };
    }
    if (typeof opts.condition === 'function' && !opts.condition(s)) return { ok: false, texte: NF.i18n.sansMarqueur(NF.t('Impossible pour le moment.')) };
    var avant = NF.api.instantane(s);
    var texte = fn();
    /* Un texte qui commence par « Impossible », « Il faut »… (liste NF.i18n.ECHEC
     * dans src/i18n.js) signale un échec : l'action n'a pas eu lieu et les PA ne
     * sont pas dépensés. Dans les autres langues, NF.t pose un marqueur invisible
     * devant ces textes ; on le retire avant tout affichage. */
    var echec = NF.i18n.estEchec(texte);
    texte = NF.i18n.sansMarqueur(texte);
    if (echec) return { ok: false, texte: texte };
    s.pa -= cout;
    s.stats.actions = (s.stats.actions || 0) + 1;
    var deltas = NF.api.difference(s, avant);
    if (opts.nom) NF.api.journal(s, '▸ ' + opts.nom + (texte ? ' — ' + texte : ''), 'action');
    C.verifierMort(s);
    C.recalculerClasse(s);
    if (s.mort) s.phase = 'mort';
    else if (s.evenementsEnAttente.length) { s.retourPhase = 'actions'; C.demarrerEvenement(s); }
    return { ok: true, texte: texte || '', deltas: deltas };
  };

  /** Fin du mois : calcule le bilan et tire les événements */
  C.finDuMois = function (s) {
    if (s.phase !== 'actions') return null;
    var bilan = { mois: s.temps.mois, annee: s.temps.annee, revenus: [], depenses: [], textes: [], jaugesAvant: NF.api.instantane(s) };
    C.moisEmploi(s, bilan);
    C.moisFormation(s, bilan);
    C.moisEntreprise(s, bilan);
    C.moisAides(s, bilan);
    C.moisFamille(s, bilan);
    C.moisImpots(s, bilan);
    C.moisLogement(s, bilan);
    C.moisTrainDeVie(s, bilan);
    C.moisJauges(s, bilan);        // l'usure du mois d'abord : la nourriture achetée ensuite nourrit le mois qui commence
    C.moisNourriture(s, bilan);
    C.moisDettes(s, bilan);
    C.reglerBilan(s, bilan);
    C.moisSante(s, bilan);
    C.usureObjets(s, bilan);
    C.moisConjoncture(s);
    C.moisVieillesse(s);
    if (s.temps.mois === 1) NF.api.drapeau(s, 'hiver_survecu', true);
    C.recalculerClasse(s);
    C.verifierSucces(s, bilan);
    C.verifierMort(s);
    bilan.deltas = NF.api.difference(s, bilan.jaugesAvant);
    bilan.conjoncture = C.texteConjoncture(s);
    if (!s.mort) {
      C.declencherProgrammes(s);
      C.tirerEvenements(s);
    }
    s.bilan = bilan;
    s.retourPhase = null;
    s.phase = s.mort ? 'mort' : 'bilan';
    NF.api.journal(s, NF.t('📅 Fin ') + U.MOIS[bilan.mois] + NF.t(', année ') + bilan.annee + NF.t(' — solde ') + (bilan.solde >= 0 ? '+' : '') + U.euros(bilan.solde) + '.', 'bilan');
    return bilan;
  };

  /** Après le bilan : premier événement, ou mois suivant s'il n'y en a pas */
  C.apresBilan = function (s) {
    if (s.mort) { s.phase = 'mort'; return; }
    if (!C.demarrerEvenement(s)) C.nouveauMois(s);
  };

  /** Après un événement : suivant, retour aux actions, ou mois suivant */
  C.apresEvenement = function (s) {
    if (s.mort) { s.phase = 'mort'; s.evenementCourant = null; return; }
    if (C.evenementSuivant(s)) return;
    if (s.retourPhase === 'actions') { s.retourPhase = null; s.phase = 'actions'; return; }
    C.nouveauMois(s);
  };
})();
