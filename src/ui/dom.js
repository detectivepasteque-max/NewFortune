/* =====================================================================
 * UI – petits utilitaires DOM et fragments HTML réutilisables
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var esc = U.esc;

  UI.$ = function (sel) { return document.querySelector(sel); };

  /** Jetons de variation : [{cle, delta, nom, icone, argent}] -> HTML */
  UI.deltasHtml = function (deltas) {
    if (!deltas || !deltas.length) return '';
    return '<div class="deltas">' + deltas.map(function (d) {
      var v = d.argent ? (d.delta > 0 ? '+' : '') + U.euros(d.delta) : U.signe(d.delta);
      var cls = d.cle === 'dette' ? (d.delta > 0 ? 'moins' : 'plus') : (d.delta > 0 ? 'plus' : 'moins');
      return '<span class="delta ' + cls + '">' + d.icone + ' ' + v + ' ' + esc(d.nom) + '</span>';
    }).join('') + '</div>';
  };

  /** Couleur d'une jauge selon sa valeur */
  UI.couleurJauge = function (v) {
    if (v < 20) return '#eb5757';
    if (v < 40) return '#f2994a';
    if (v < 65) return '#f2c94c';
    return '#6fcf97';
  };

  UI.etatJauge = function (cle, v) {
    var mots = {
      sante: [NF.t('Mourant'), NF.t('Très malade'), NF.t('Affaibli'), NF.t('Correct'), NF.t('En forme')],
      nourriture: [NF.t('Affamé'), NF.t('Le ventre vide'), NF.t('Petit creux'), NF.t('Nourri'), NF.t('Rassasié')],
      energie: [NF.t('Épuisé'), NF.t('Exténué'), NF.t('Fatigué'), NF.t('Reposé'), NF.t('Plein d\'énergie')],
      hygiene: [NF.t('Repoussant'), NF.t('Sale'), NF.t('Négligé'), NF.t('Propre'), NF.t('Impeccable')],
      moral: [NF.t('Désespéré'), NF.t('Abattu'), NF.t('Morose'), NF.t('Serein'), NF.t('Heureux')],
    }[cle];
    if (!mots) return '';
    if (v < 15) return mots[0];
    if (v < 35) return mots[1];
    if (v < 55) return mots[2];
    if (v < 80) return mots[3];
    return mots[4];
  };

  /** Bouton d'action avec data-act / data-arg */
  UI.btn = function (act, arg, texte, cls, disabled, titre) {
    return '<button class="btn ' + (cls || '') + '" data-act="' + esc(act) + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') +
      (disabled ? ' disabled' : '') + (titre ? ' title="' + esc(titre) + '"' : '') + '>' + texte + '</button>';
  };

  /** Boutons de choix de la langue (écran titre). Changer de langue recharge la page. */
  UI.languesHtml = function () {
    return '<div class="langues" title="Langue / Language">🌐 ' + NF.i18n.LANGUES.map(function (l) {
      var actif = l.id === NF.i18n.langue;
      return UI.btn('langue', l.id, l.nom, 'btn-petit' + (actif ? ' btn-principal' : ''), actif);
    }).join('') + '</div>';
  };

  UI.etiquettePa = function (n) {
    if (n === 0) return NF.t('<span class="etiquette">0 PA</span>');
    return '<span class="etiquette pa">' + n + NF.t(' PA</span>');
  };

  /** Aperçu d'une action (champ `apercu` de data/actions.js) : pastilles vertes (gains),
   *  rouges (coûts), orange (risques), bleue (chance de réussite). Voir docs/06-actions.md. */
  UI.apercuHtml = function (s, a) {
    var ap = U.val(a.apercu, s);
    if (!ap) return '';
    var L = NF.api.LIBELLES, ORDRE = ['argent', 'nourriture', 'energie', 'hygiene', 'moral', 'sante', 'reputation', 'dette', 'xp', 'objets'];
    var tete = '', gains = [], couts = [], autres = [];
    function nombre(n) { n = Math.round(n); return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
    function fourchette(v, unite) {
      if (typeof v === 'number') return nombre(v) + unite;
      return nombre(v[0]) + NF.t(' à ') + (v[0] >= 0 && v[1] >= 0 ? Math.round(v[1]) : nombre(v[1])) + unite;
    }
    function pct(c) { return c == null || c >= 1 ? '' : ' (' + Math.round(c * 100) + NF.t(' %)'); }
    function pastille(classe, titre, contenu) { return '<span class="etiquette ' + classe + '"' + (titre ? ' title="' + esc(titre) + '"' : '') + '>' + contenu + '</span>'; }
    if (typeof ap.chance === 'number' && ap.chance < 1) tete = pastille('chance', NF.t('Chance de réussite'), '🎲 ' + Math.round(ap.chance * 100) + ' %');
    var cles = ORDRE.filter(function (k) { return k in ap; }).concat(Object.keys(ap).filter(function (k) { return k !== 'chance' && ORDRE.indexOf(k) < 0; }));
    cles.forEach(function (k) {
      var v = ap[k], chance = null, risque = false;
      if (v && typeof v === 'object' && !(v instanceof Array) && 'val' in v) { chance = v.chance; risque = !!v.risque; v = v.val; }
      if (v == null || v === 0) return;
      if (k === 'xp') {
        for (var id in v) {
          var c = U.byId(NF.data.competences, id);
          if (v[id]) gains.push(pastille('gain', NF.t('Expérience : ') + (c ? c.nom : id), (c ? c.icone : '📈') + ' +' + Math.round(v[id]) + NF.t(' xp') + pct(chance)));
        }
        return;
      }
      if (k === 'objets') {
        var n = typeof v === 'number' ? String(v) : Math.round(v[0]) + NF.t(' à ') + Math.round(v[1]);
        gains.push(pastille('gain', NF.t('Objets trouvés'), '📦 ' + n + NF.t(' objet(s)') + pct(chance)));
        return;
      }
      if (typeof v === 'string') { autres.push(pastille(risque ? 'risque' : 'neutre', '', esc(v) + pct(chance))); return; }
      if (k in s.joueur.jauges) {                          // une jauge va de 0 à 100 : on annonce ce qui peut vraiment entrer ou sortir
        var j = s.joueur.jauges[k], borne = function (x) { return Math.max(-j, Math.min(100 - j, x)); };
        v = typeof v === 'number' ? borne(v) : [borne(v[0]), borne(v[1])];
        if (typeof v !== 'number' && v[0] === v[1]) v = v[0];
      }
      if (typeof v !== 'number' && !v[0] && !v[1]) return;
      if (typeof v === 'number' && !v) return;
      var max = typeof v === 'number' ? v : Math.max(v[0], v[1]);
      var bon = k === 'dette' ? max < 0 : max > 0;        // une dette qui baisse est une bonne nouvelle
      var contenu = (L[k] ? L[k].icone + ' ' : '') + fourchette(v, k === 'argent' || k === 'dette' ? ' €' : '') + pct(chance);
      (bon ? gains : couts).push(pastille(bon ? 'gain' : 'cout', L[k] ? L[k].nom : k, contenu));
    });
    var h = tete + gains.join('') + couts.join('') + autres.join('');
    return h ? '<div class="carte-apercu" title="' + esc(NF.t('Ce que l\'action peut rapporter ou coûter dans votre situation, hors imprévus.')) + '">' + h + '</div>' : '';
  };

  /** Variations attendues en fin de mois (NF.core.usurePrevue), en pastilles signées */
  UI.usureHtml = function (u) {
    var L = NF.api.LIBELLES;
    return ['nourriture', 'energie', 'hygiene', 'moral', 'sante'].map(function (k) {
      var v = Math.round(u[k] + (k === 'energie' ? u.travail : 0));
      if (!v) return '';
      return '<span class="delta ' + (v > 0 ? 'plus' : 'moins') + '" title="' + esc(L[k].nom) + '">' + L[k].icone + ' ' + U.signe(v) + '</span>';
    }).join('');
  };

  UI.barreNiveau = function (niveau, max) {
    var h = '<span class="niveau-points">';
    for (var i = 0; i < (max || 5); i++) h += '<i class="' + (i < niveau ? 'plein' : '') + '"></i>';
    return h + '</span>';
  };

  UI.miniBarre = function (v, couleur) {
    return '<div class="mini-barre"><div style="width:' + U.clamp(v, 0, 100) + '%;background:' + (couleur || UI.couleurJauge(v)) + '"></div></div>';
  };

  /** Texte d'un âge en mois -> "3 ans" / "8 mois" */
  UI.ageTexte = function (mois) {
    if (mois < 12) return mois + NF.t(' mois');
    return Math.floor(mois / 12) + NF.t(' ans');
  };

  /** Décrit les effets passifs d'un objet */
  UI.passifTexte = function (o) {
    if (!o.passif) return o.usage ? NF.t('Utilisable : ') + UI.effetsTexte(o.usage) : '';
    var l = [], p = o.passif, pct = function (v) { return (v > 1 ? '+' : '') + Math.round((v - 1) * 100) + ' %'; };
    if (p.mendicite) l.push(NF.t('mendicité ') + pct(p.mendicite));
    if (p.fouille) l.push(NF.t('fouille ') + pct(p.fouille));
    if (p.froid) l.push(NF.t('froid ') + pct(p.froid));
    if (p.usureEnergie) l.push(NF.t('fatigue ') + pct(p.usureEnergie));
    if (p.usureHygiene) l.push(NF.t('saleté ') + pct(p.usureHygiene));
    if (p.usureMoral) l.push(NF.t('usure du moral ') + pct(p.usureMoral));
    if (p.nourritureCout) l.push(NF.t('coût des repas ') + pct(p.nourritureCout));
    if (p.inventaire) l.push('+' + p.inventaire + NF.t(' places'));
    if (p.emploi) l.push(NF.t('embauche ') + pct(p.emploi));
    if (p.apprentissage) l.push(NF.t('apprentissage ') + pct(p.apprentissage));
    if (p.vol) l.push(NF.t('vols ') + pct(p.vol));
    if (p.maladie) l.push(NF.t('maladies ') + pct(p.maladie));
    if (p.bricolage) l.push(NF.t('bricolage ') + pct(p.bricolage));
    if (p.peche) l.push(NF.t('pêche ') + pct(p.peche));
    if (p.dessin) l.push(NF.t('dessin ') + pct(p.dessin));
    if (p.couture) l.push(NF.t('couture ') + pct(p.couture));
    if (p.spectacle) l.push(NF.t('spectacle de rue ') + pct(p.spectacle));
    if (p.telephone) l.push(NF.t('téléphone'));
    if (p.velo) l.push(NF.t('vélo'));
    if (p.voiture) l.push(NF.t('voiture'));
    if (p.depensesFixes) l.push(NF.t('entretien ') + U.euros(p.depensesFixes) + NF.t('/mois'));
    return l.join(' · ');
  };

  UI.effetsTexte = function (e) {
    var l = [];
    for (var k in e) if (NF.api.LIBELLES[k]) l.push(NF.api.LIBELLES[k].icone + ' ' + U.signe(e[k]));
    return l.join(' ');
  };

  UI.toast = function (texte, duree) {
    var t = UI.$('#toast');
    t.textContent = texte;
    t.classList.remove('cachee');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(function () { t.classList.add('cachee'); }, duree || 2600);
  };

  UI.dateTexte = function (s) {
    return U.cap(U.MOIS[s.temps.mois]) + NF.t(', année ') + s.temps.annee;
  };

  UI.classeHtml = function (s) {
    var c = NF.core.classeActuelle(s);
    return c.icone + ' ' + esc(c.nom);
  };
})();
