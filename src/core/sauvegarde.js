/* =====================================================================
 * SAUVEGARDE (localStorage) + EXPORT / IMPORT
 * ---------------------------------------------------------------------
 * nf_partie : la partie en cours (sauvegardée automatiquement)
 * ===================================================================== */
(function () {
  var C = NF.core;
  var CLE = 'nf_partie';

  C.sauvegarder = function (s) {
    if (!s) return false;
    s.rng = NF.rng.getState();
    s.sauvegardeLe = new Date().toISOString();
    try { localStorage.setItem(CLE, JSON.stringify(s)); return true; } catch (e) { console.warn(NF.t('Sauvegarde impossible'), e); return false; }
  };

  C.chargerPartie = function () {
    try {
      var s = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (!s || !s.joueur) return null;
      C.restaurerRng(s);
      return s;
    } catch (e) { return null; }
  };

  C.restaurerRng = function (s) {
    NF.rng = new NF.core.RNG(s.graine || 'defaut');
    if (Array.isArray(s.rng) && s.rng.length === 4) NF.rng.setState(s.rng);
  };

  C.effacerSauvegarde = function () {
    try { localStorage.removeItem(CLE); } catch (e) { /* ignore */ }
  };

  C.aSauvegarde = function () {
    try { return !!localStorage.getItem(CLE); } catch (e) { return false; }
  };

  /** Tout exporter (partie + méta + scores) en JSON */
  C.exporter = function (s) {
    if (s) s.rng = NF.rng.getState();
    return JSON.stringify({ format: 'nouvelle-fortune', version: NF.version, partie: s || null, meta: C.chargerMeta(), scores: C.chargerScores() }, null, 1);
  };

  /** Importe un JSON exporté. Retourne { ok, texte, partie } */
  C.importer = function (json) {
    var d;
    try { d = JSON.parse(json); } catch (e) { return { ok: false, texte: NF.t('Fichier illisible.') }; }
    if (!d || d.format !== 'nouvelle-fortune') return { ok: false, texte: NF.t('Ce fichier n\'est pas une sauvegarde de Nouvelle Fortune.') };
    if (d.meta) C.sauverMeta(d.meta);
    if (Array.isArray(d.scores)) { try { localStorage.setItem('nf_scores', JSON.stringify(d.scores)); } catch (e) { /* ignore */ } }
    if (d.partie && d.partie.joueur) { try { localStorage.setItem(CLE, JSON.stringify(d.partie)); } catch (e) { /* ignore */ } }
    return { ok: true, texte: NF.t('Sauvegarde importée.'), partie: d.partie && d.partie.joueur ? d.partie : null };
  };
})();
