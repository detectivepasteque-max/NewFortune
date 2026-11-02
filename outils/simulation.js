/* =====================================================================
 * OUTIL D'ÉQUILIBRAGE – simulation automatique de parties
 * ---------------------------------------------------------------------
 * Comment l'utiliser :
 *   1. Ouvrez le jeu dans le navigateur, puis la console (F12 > Console).
 *   2. Copiez-collez tout ce fichier dans la console et validez.
 *   3. Lancez :   NF.simuler(16, 360)      // 16 graines, 360 mois max
 *      ou         NF.simuler(8, 120, 'aleatoire')   // joueur qui agit au hasard
 *   4. Lisez le tableau : survie à 12 mois, à 5 ans, classe atteinte…
 *
 * La stratégie "sensee" imite un joueur prudent : il couvre d'abord ses
 * besoins (faim, fatigue, hygiène, santé, moral), fait les démarches,
 * achète un téléphone, postule, déménage dès que possible, étudie.
 * Modifiez-la librement pour tester d'autres façons de jouer.
 * ===================================================================== */
NF.simuler = function (nbGraines, moisMax, strategie) {
  nbGraines = nbGraines || 12; moisMax = moisMax || 240; strategie = strategie || 'sensee';
  var C = NF.core, A = NF.api;

  function jouerEvenements(s) {
    var g = 0;
    while (s.phase === 'evenement' && g++ < 10) {
      var ok = s.evenementCourant.choix.filter(function (c) { return c.ok; });
      C.choisir(s, ok.length ? ok[Math.floor(Math.random() * ok.length)].index : 0);
      C.apresEvenement(s);
    }
  }
  function agir(s, id) { var r = C.executerAction(s, id); if (!r.ok) return false; jouerEvenements(s); return true; }
  function special(s, pa, fn) { var r = C.actionGenerique(s, { pa: pa, nom: 'simulation' }, fn); if (r.ok) jouerEvenements(s); return r.ok; }

  function postuler(s) {
    if (s.joueur.emploi) return false;
    var cands = NF.data.metiers.filter(function (m) { return m.niveau <= 3 && C.prerequisMetier(s, m).ok; });
    if (!cands.length) return false;
    cands.sort(function (a, b) { return b.salaire[1] - a.salaire[1]; });
    return special(s, 1, function () { return C.postuler(s, cands[0].id).texte; });
  }
  function demenager(s) {
    var l = C.logementActuel(s);
    var cibles = NF.data.logements.filter(function (x) {
      return x.ordre > l.ordre && (x.ordre >= 3 || (l.ordre === 0 && x.id === 'foyer')) && !x.proprietaire &&
        C.conditionsLogement(s, x.id).ok && (x.loyer === 0 || s.joueur.argent > (x.loyer + x.charges) * 3);
    });
    if (!cibles.length) return false;
    cibles.sort(function (a, b) { return b.ordre - a.ordre; });
    return special(s, 1, function () { return C.changerLogement(s, cibles[0].id); });
  }

  function politiqueSensee(s) {
    var j = s.joueur.jauges;
    if (s.joueur.domiciliation && !A.passifBool(s, 'telephone') && s.joueur.argent >= 80) special(s, 0, function () { return C.acheterObjet(s, 'telephone'); });
    if (j.energie >= 20 && j.nourriture >= 20 && demenager(s)) return true;
    var besoins = [];
    if (j.nourriture < 40) besoins.push('chercher_nourriture', 'repas_association');
    if (j.energie < 45) besoins.push('dormir_foyer', 'se_reposer');
    if (j.hygiene < 35) besoins.push('se_laver');
    if (j.sante < 45) besoins.push('se_soigner');
    if (j.moral < 35) besoins.push('sport', 'repas_association');
    for (var b = 0; b < besoins.length; b++) if (agir(s, besoins[b])) return true;
    if (!s.joueur.domiciliation && agir(s, 'demarches')) return true;
    if (s.joueur.domiciliation && !s.joueur.emploi && j.hygiene >= 40 && postuler(s)) return true;
    if (s.joueur.famille.partenaire && !s.joueur.drapeaux.veut_enfant && s.joueur.classe >= 3) agir(s, 'vouloir_enfant');
    if (s.joueur.famille.enfants.length && Math.random() < 0.3 && agir(s, 'temps_famille')) return true;
    if (s.joueur.emploi && s.joueur.argent > 1000) {
      var cp = ['lecture', 'administratif', 'commerce', 'informatique'][Math.floor(Math.random() * 4)];
      if (special(s, 1, function () { return C.etudier(s, cp); })) return true;
    }
    var ordre = s.joueur.argent < 150 ? ['mendier', 'petit_boulot'] : ['petit_boulot', 'mendier'];
    ordre.push('fouiller', 'contacts', 'se_reposer');
    for (var i = 0; i < ordre.length; i++) if (agir(s, ordre[i])) return true;
    return false;
  }

  function politiqueAleatoire(s) {
    var acts = NF.data.actions.filter(function (a) { return (!a.visible || a.visible(s)) && (!a.conditions || C.verifierConditions(s, a.conditions).ok) && (!a.condition || a.condition(s)); });
    var a = acts[Math.floor(Math.random() * acts.length)];
    if (!a) return false;
    var r = C.executerAction(s, a.id);
    if (!r.ok) { s.pa--; return true; }
    jouerEvenements(s);
    return true;
  }

  var politique = strategie === 'aleatoire' ? politiqueAleatoire : politiqueSensee;
  var lignes = [], survie12 = 0, survie60 = 0, erreurs = 0;
  for (var seed = 1; seed <= nbGraines; seed++) {
    try {
      var s = C.nouvellePartie('SIM-' + seed, { bonus: {} });
      for (var mois = 0; mois < moisMax && s.phase !== 'fin'; mois++) {
        var g = 0;
        while (s.pa > 0 && s.phase === 'actions' && g++ < 12) if (!politique(s)) break;
        if (s.phase === 'actions') C.finDuMois(s);
        if (s.phase === 'bilan') C.apresBilan(s);
        jouerEvenements(s);
        if (s.phase === 'mort') {
          var h = C.heritiersPossibles(s);
          if (h.length) C.succession(s, 0); else { s.phase = 'fin'; }
        }
      }
      if (s.temps.moisAbsolu >= 12) survie12++;
      if (s.temps.moisAbsolu >= 60) survie60++;
      lignes.push({ graine: 'SIM-' + seed, mois: s.temps.moisAbsolu, generations: s.lignee.generation, classeMax: s.lignee.classeMax, argent: Math.round(s.joueur.argent), logement: s.joueur.logement, emploi: s.joueur.emploi ? s.joueur.emploi.id : '-', morts: s.lignee.membres.filter(function (m) { return m.mort != null; }).map(function (m) { return m.age + ' ans ' + (m.cause || ''); }).join(' / '), score: C.calculerScore(s).total });
    } catch (e) { erreurs++; lignes.push({ graine: 'SIM-' + seed, erreur: e.message + ' @ ' + (e.stack || '').split('\n')[1] }); }
  }
  if (console.table) console.table(lignes);
  console.log('Survie à 12 mois : ' + survie12 + '/' + nbGraines + ' · à 5 ans : ' + survie60 + '/' + nbGraines + ' · erreurs : ' + erreurs);
  return lignes;
};
console.log('Outil chargé. Lancez NF.simuler(16, 360) ou NF.simuler(8, 120, "aleatoire").');
