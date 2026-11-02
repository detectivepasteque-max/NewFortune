/* =====================================================================
 * SCORE, MÉTA-PROGRESSION, MEILLEURS SCORES
 * ---------------------------------------------------------------------
 * Stockage navigateur :
 *   nf_meta   : { points, bonus: { id: niveau }, parties, scoreTotal }
 *   nf_scores : [ { nom, graine, score, generations, annees, classeMax, date } ]
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;
  var CLE_META = 'nf_meta', CLE_SCORES = 'nf_scores';

  C.calculerScore = function (s) {
    var cf = NF.data.config.score;
    var annees = Math.floor(s.temps.moisAbsolu / 12);
    var details = [
      { nom: NF.t('Générations'), valeur: s.lignee.generation, points: s.lignee.generation * cf.parGeneration },
      { nom: NF.t('Années de survie'), valeur: annees, points: annees * cf.parAnnee },
      { nom: NF.t('Catégorie sociale maximale'), valeur: s.lignee.classeMax, points: s.lignee.classeMax * cf.parClasseMax },
      { nom: NF.t('Fortune transmise'), valeur: U.euros(s.lignee.fortuneTransmise), points: Math.round(s.lignee.fortuneTransmise / cf.fortuneDiviseur) },
      { nom: NF.t('Accomplissements'), valeur: s.lignee.succes.length, points: s.lignee.succes.length * cf.parSucces },
    ];
    var total = 0;
    details.forEach(function (d) { total += d.points; });
    return { total: total, details: details, points: Math.round(total * cf.pointsParScore) };
  };

  /* ----- Méta ----- */
  C.chargerMeta = function () {
    try {
      var m = JSON.parse(localStorage.getItem(CLE_META) || 'null');
      if (m && typeof m === 'object') return { points: m.points || 0, bonus: m.bonus || {}, parties: m.parties || 0, scoreTotal: m.scoreTotal || 0 };
    } catch (e) { /* ignore */ }
    return { points: 0, bonus: {}, parties: 0, scoreTotal: 0 };
  };
  C.sauverMeta = function (meta) {
    try { localStorage.setItem(CLE_META, JSON.stringify(meta)); } catch (e) { /* ignore */ }
  };
  C.acheterBonus = function (meta, id) {
    var b = U.byId(NF.data.bonus, id);
    if (!b) return NF.t('Bonus inconnu.');
    var niveau = meta.bonus[id] || 0;
    if (niveau >= (b.niveaux || 1)) return NF.t('Déjà au maximum.');
    if (meta.points < b.cout) return NF.t('Pas assez de points (') + b.cout + NF.t(' nécessaires).');
    meta.points -= b.cout;
    meta.bonus[id] = niveau + 1;
    C.sauverMeta(meta);
    return NF.t('Bonus débloqué : ') + b.nom + '.';
  };

  /* ----- Meilleurs scores ----- */
  C.chargerScores = function () {
    try { var l = JSON.parse(localStorage.getItem(CLE_SCORES) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  };
  C.ajouterScore = function (entree) {
    var l = C.chargerScores();
    l.push(entree);
    l.sort(function (a, b) { return b.score - a.score; });
    l = l.slice(0, NF.data.config.highscoresMax);
    try { localStorage.setItem(CLE_SCORES, JSON.stringify(l)); } catch (e) { /* ignore */ }
    return l;
  };

  /** Fin de lignée : calcule, enregistre, met à jour la méta. Idempotent. */
  C.finDeLignee = function (s) {
    if (s.resultatFinal) return s.resultatFinal;
    /* le dernier membre de la lignée est noté comme décédé */
    var membre = s.lignee.membres[s.lignee.membres.length - 1];
    if (membre && membre.mort == null) { membre.mort = s.temps.moisAbsolu; membre.cause = s.mort ? s.mort.cause : ''; membre.age = C.ageAnnees(s); membre.classeMax = s.joueur.classeMax; }
    var sc = C.calculerScore(s);
    var meta = C.chargerMeta();
    meta.points += sc.points;
    meta.parties++;
    meta.scoreTotal += sc.total;
    C.sauverMeta(meta);
    var entree = {
      nom: s.lignee.membres[0] ? s.lignee.membres[0].nom : '?', graine: s.graine, score: sc.total,
      generations: s.lignee.generation, annees: Math.floor(s.temps.moisAbsolu / 12), classeMax: s.lignee.classeMax,
      date: new Date().toISOString().slice(0, 10),
    };
    var liste = C.ajouterScore(entree);
    var rang = liste.indexOf(entree) + 1;
    s.resultatFinal = { score: sc, points: sc.points, rang: rang > 0 ? rang : null, meta: meta };
    s.phase = 'fin';
    C.effacerSauvegarde();
    return s.resultatFinal;
  };
})();
