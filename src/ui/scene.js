/* =====================================================================
 * SCÈNE URBAINE (SVG) – change selon la saison, le logement et la ville
 * ---------------------------------------------------------------------
 * NF.ui.scene(s) retourne une chaîne SVG. La silhouette de la ville est
 * générée à partir de la graine (générateur séparé : ne consomme pas
 * l'aléatoire de la partie).
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var W = 960, H = 240;

  var PALETTES = {
    hiver: { ciel: ['#1d2436', '#4a5a7c'], lointain: '#2a3348', proche: '#1a2030', sol: '#d9dde6', solOmbre: '#b9c0cc', feuillage: null, astre: '#dfe6f5', astreGlow: 'rgba(223,230,245,.25)' },
    printemps: { ciel: ['#3f6fa8', '#a9cdf0'], lointain: '#5d6e8e', proche: '#2f3a52', sol: '#5c8a4a', solOmbre: '#4a7039', feuillage: '#7fc96b', astre: '#fff2b3', astreGlow: 'rgba(255,242,179,.3)' },
    ete: { ciel: ['#2f7fd6', '#ffd58a'], lointain: '#6f7a99', proche: '#353d57', sol: '#8aa04e', solOmbre: '#6f8340', feuillage: '#4f9a3f', astre: '#fff1a8', astreGlow: 'rgba(255,241,168,.4)' },
    automne: { ciel: ['#5a4a6e', '#e0a060'], lointain: '#6a5f7a', proche: '#3a3246', sol: '#8c6a3f', solOmbre: '#6e5230', feuillage: '#d9823b', astre: '#ffd9a0', astreGlow: 'rgba(255,217,160,.3)' },
  };

  function rngScene(s) { return new NF.core.RNG((s.graine || 'x') + '::scene'); }

  function batiments(r, y, hmin, hmax, couleur, fenetres, saison) {
    var h = '', x = -10;
    while (x < W + 20) {
      var w = r.int(36, 90), ht = r.int(hmin, hmax);
      h += '<rect x="' + x + '" y="' + (y - ht) + '" width="' + w + '" height="' + ht + '" fill="' + couleur + '"/>';
      if (r.chance(0.3)) h += '<rect x="' + (x + w * 0.3) + '" y="' + (y - ht - 10) + '" width="' + (w * 0.15) + '" height="10" fill="' + couleur + '"/>';
      if (fenetres) {
        for (var fy = y - ht + 10; fy < y - 12; fy += 14) {
          for (var fx = x + 6; fx < x + w - 8; fx += 12) {
            if (r.chance(saison === 'hiver' ? 0.55 : 0.3)) h += '<rect x="' + fx + '" y="' + fy + '" width="6" height="8" fill="#ffd27a" opacity="' + r.entre(0.4, 0.9).toFixed(2) + '"/>';
          }
        }
      }
      x += w + r.int(2, 14);
    }
    return h;
  }

  function arbre(x, y, taille, p, saison) {
    var h = '<rect x="' + (x - 3) + '" y="' + (y - taille) + '" width="6" height="' + taille + '" fill="#4a3426"/>';
    if (saison === 'hiver') {
      h += '<path d="M' + x + ' ' + (y - taille) + ' l-10 -14 M' + x + ' ' + (y - taille + 4) + ' l12 -16 M' + x + ' ' + (y - taille + 10) + ' l-8 -10 M' + x + ' ' + (y - taille - 2) + ' l6 -12" stroke="#4a3426" stroke-width="3" fill="none"/>';
      h += '<ellipse cx="' + x + '" cy="' + y + '" rx="14" ry="3" fill="#fff" opacity=".6"/>';
    } else {
      h += '<circle cx="' + x + '" cy="' + (y - taille - 6) + '" r="' + (taille * 0.55) + '" fill="' + p.feuillage + '"/>';
      h += '<circle cx="' + (x - 10) + '" cy="' + (y - taille + 2) + '" r="' + (taille * 0.4) + '" fill="' + p.feuillage + '" opacity=".9"/>';
      h += '<circle cx="' + (x + 11) + '" cy="' + (y - taille + 1) + '" r="' + (taille * 0.42) + '" fill="' + p.feuillage + '" opacity=".9"/>';
    }
    return h;
  }

  function personnage(x, y, saison, malade) {
    var h = '<g>';
    h += '<ellipse cx="' + x + '" cy="' + y + '" rx="12" ry="3" fill="rgba(0,0,0,.35)"/>';
    h += '<rect x="' + (x - 7) + '" y="' + (y - 34) + '" width="14" height="24" rx="4" fill="' + (saison === 'hiver' ? '#4b5a78' : '#6b5a4a') + '"/>';
    h += '<circle cx="' + x + '" cy="' + (y - 40) + '" r="7" fill="#e8c39e"/>';
    if (saison === 'hiver') h += '<path d="M' + (x - 8) + ' ' + (y - 42) + ' q8 -10 16 0 z" fill="#c0392b"/>';
    h += '<rect x="' + (x - 7) + '" y="' + (y - 11) + '" width="5" height="11" fill="#2d2d33"/><rect x="' + (x + 2) + '" y="' + (y - 11) + '" width="5" height="11" fill="#2d2d33"/>';
    if (malade) h += '<text x="' + (x + 10) + '" y="' + (y - 44) + '" font-size="12">🤒</text>';
    h += '</g>';
    return h;
  }

  function premierPlan(s, p, saison) {
    var l = NF.core.logementActuel(s);
    var y = H - 24, h = '';
    var malade = !!s.joueur.maladie;
    switch (l.id) {
      case 'rue':
        h += '<rect x="640" y="' + (y - 30) + '" width="90" height="8" fill="#5a4a3a"/><rect x="646" y="' + (y - 22) + '" width="6" height="22" fill="#3a3028"/><rect x="718" y="' + (y - 22) + '" width="6" height="22" fill="#3a3028"/>';
        h += '<rect x="560" y="' + (y - 22) + '" width="60" height="22" fill="#b89b6a" transform="skewX(-8)"/><rect x="575" y="' + (y - 36) + '" width="40" height="16" fill="#a3875a"/>';
        if (NF.api.aObjet(s, 'abri_carton')) h += '<path d="M700 ' + y + ' l0 -34 l60 -14 l0 48 z" fill="#c4a373"/><path d="M700 ' + (y - 34) + ' l60 -14 l24 10 l-60 14 z" fill="#d6b887"/>';
        if (NF.api.aObjet(s, 'panneau')) h += '<rect x="600" y="' + (y - 30) + '" width="26" height="18" fill="#e8d9b5" stroke="#5a4a3a"/><line x1="604" y1="' + (y - 24) + '" x2="620" y2="' + (y - 24) + '" stroke="#333" stroke-width="2"/><line x1="604" y1="' + (y - 18) + '" x2="616" y2="' + (y - 18) + '" stroke="#333" stroke-width="2"/>';
        h += personnage(640, y, saison, malade);
        break;
      case 'tente':
        h += '<path d="M560 ' + y + ' l45 -60 l45 60 z" fill="#4b7a5a"/><path d="M605 ' + (y - 60) + ' l45 60 l-45 0 z" fill="#3b6248"/><path d="M590 ' + y + ' l15 -28 l15 28 z" fill="#1b2a22"/>';
        h += personnage(680, y, saison, malade);
        break;
      case 'squat':
        h += '<rect x="540" y="' + (y - 150) + '" width="170" height="150" fill="#4a4249"/>';
        for (var i = 0; i < 3; i++) for (var j = 0; j < 4; j++) h += '<rect x="' + (555 + i * 52) + '" y="' + (y - 138 + j * 34) + '" width="26" height="22" fill="' + (((i * 7 + j * 3) % 5) < 2 ? '#2b2228' : '#ffd27a') + '" opacity=".8"/>';
        h += '<rect x="555" y="' + (y - 70) + '" width="26" height="22" fill="#6b4a2a"/><line x1="555" y1="' + (y - 70) + '" x2="581" y2="' + (y - 48) + '" stroke="#3a2a1a" stroke-width="3"/>';
        h += '<text x="620" y="' + (y - 8) + NF.t('" font-size="16" fill="#e74c3c" font-family="Impact, sans-serif" opacity=".8">SQUAT</text>');
        h += personnage(740, y, saison, malade);
        break;
      case 'foyer':
        h += '<rect x="540" y="' + (y - 130) + '" width="190" height="130" fill="#6c6f7c"/><rect x="620" y="' + (y - 40) + '" width="30" height="40" fill="#2b2f3a"/>';
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) h += '<rect x="' + (556 + a * 60) + '" y="' + (y - 118 + b * 30) + '" width="24" height="18" fill="#ffd27a" opacity=".85"/>';
        h += '<rect x="580" y="' + (y - 58) + '" width="110" height="14" fill="#2f6fb0"/><text x="635" y="' + (y - 47) + NF.t('" font-size="10" fill="#fff" text-anchor="middle" font-family="sans-serif">FOYER D\'ACCUEIL</text>');
        h += personnage(760, y, saison, malade);
        break;
      case 'heberge':
        h += '<rect x="560" y="' + (y - 110) + '" width="150" height="110" fill="#7a6a5a"/><path d="M550 ' + (y - 110) + ' l85 -40 l85 40 z" fill="#5a3f33"/>';
        h += '<rect x="585" y="' + (y - 80) + '" width="28" height="24" fill="#ffd27a"/><rect x="655" y="' + (y - 80) + '" width="28" height="24" fill="#ffd27a"/><rect x="620" y="' + (y - 36) + '" width="26" height="36" fill="#3a2a1a"/>';
        h += '<text x="635" y="' + (y - 50) + '" font-size="18" text-anchor="middle">🛋️</text>';
        h += personnage(740, y, saison, malade);
        break;
      case 'chambre': case 'studio': case 'appartement': case 'grand_appartement':
        var etages = { chambre: 4, studio: 5, appartement: 6, grand_appartement: 7 }[l.id];
        var hb = etages * 26 + 10;
        h += '<rect x="560" y="' + (y - hb) + '" width="170" height="' + hb + '" fill="#8d8a86"/>';
        for (var e = 0; e < etages; e++) for (var f = 0; f < 4; f++) {
          var mine = (e === Math.floor(etages / 2) && f === 1);
          h += '<rect x="' + (572 + f * 40) + '" y="' + (y - hb + 10 + e * 26) + '" width="24" height="16" fill="' + (mine ? '#ffe59a' : '#3a4150') + '" opacity="' + (mine ? 1 : 0.9) + '"/>';
          if (mine) h += '<rect x="' + (570 + f * 40) + '" y="' + (y - hb + 8 + e * 26) + '" width="28" height="20" fill="none" stroke="#f2b134" stroke-width="2"/>';
        }
        h += '<rect x="632" y="' + (y - 30) + '" width="26" height="30" fill="#2b2f3a"/>';
        h += personnage(750, y, saison, malade);
        break;
      case 'maison':
        h += '<rect x="560" y="' + (y - 90) + '" width="160" height="90" fill="#e8dcc8"/><path d="M548 ' + (y - 90) + ' l92 -50 l92 50 z" fill="#8c3b2e"/>';
        h += '<rect x="580" y="' + (y - 66) + '" width="30" height="26" fill="#ffe59a"/><rect x="670" y="' + (y - 66) + '" width="30" height="26" fill="#ffe59a"/><rect x="625" y="' + (y - 40) + '" width="28" height="40" fill="#5a3a2a"/>';
        h += '<rect x="690" y="' + (y - 128) + '" width="12" height="30" fill="#6b4a3a"/><circle class="fumee" cx="696" cy="' + (y - 134) + '" r="5" fill="#ccc"/>';
        h += '<rect x="740" y="' + (y - 20) + '" width="80" height="20" fill="' + p.solOmbre + '"/>';
        h += personnage(760, y, saison, malade);
        break;
      case 'villa':
        h += '<rect x="520" y="' + (y - 110) + '" width="240" height="110" fill="#f0e6d2"/><rect x="540" y="' + (y - 150) + '" width="120" height="40" fill="#f0e6d2"/><path d="M530 ' + (y - 150) + ' l70 -30 l70 30 z" fill="#4a5568"/>';
        for (var v = 0; v < 4; v++) h += '<rect x="' + (540 + v * 55) + '" y="' + (y - 86) + '" width="34" height="30" fill="#ffe59a"/>';
        h += '<rect x="620" y="' + (y - 44) + '" width="34" height="44" fill="#5a3a2a"/>';
        h += '<rect x="780" y="' + (y - 18) + '" width="120" height="18" rx="6" fill="#5bb3e8"/><rect x="786" y="' + (y - 14) + '" width="108" height="10" rx="4" fill="#8fd0f5"/>';
        h += '<rect x="500" y="' + (y - 40) + '" width="6" height="40" fill="#555"/><rect x="500" y="' + (y - 40) + '" width="420" height="4" fill="#555"/>';
        h += personnage(700, y, saison, malade);
        break;
      default:
        h += personnage(700, y, saison, malade);
    }
    return h;
  }

  function meteo(r, saison) {
    var h = '';
    if (saison === 'hiver') {
      for (var i = 0; i < 40; i++) h += '<circle class="flocon" cx="' + r.int(0, W) + '" cy="' + r.int(-20, 200) + '" r="' + r.entre(1.2, 3).toFixed(1) + '" fill="#fff" opacity=".85" style="animation-duration:' + r.entre(6, 12).toFixed(1) + 's;animation-delay:-' + r.entre(0, 10).toFixed(1) + 's"/>';
    } else if (saison === 'automne') {
      for (var j = 0; j < 14; j++) h += '<ellipse class="feuille" cx="' + r.int(0, W) + '" cy="' + r.int(-20, 120) + '" rx="5" ry="3" fill="' + r.pick(['#d9823b', '#c0392b', '#e0b040']) + '" style="animation-duration:' + r.entre(7, 13).toFixed(1) + 's;animation-delay:-' + r.entre(0, 12).toFixed(1) + 's"/>';
    } else if (saison === 'printemps' && r.chance(0.6)) {
      for (var k = 0; k < 60; k++) h += '<line class="goutte" x1="' + r.int(0, W) + '" y1="' + r.int(-40, 200) + '" x2="' + r.int(0, W) + '" y2="0" stroke="#cfe6ff" stroke-width="1.2" opacity=".5" style="animation-duration:' + r.entre(1.2, 2.2).toFixed(2) + 's;animation-delay:-' + r.entre(0, 2).toFixed(2) + 's" transform="translate(0,0)"/>';
    }
    return h;
  }

  UI.scene = function (s) {
    var saison = NF.core.saison(s);
    var p = PALETTES[saison];
    var r = rngScene(s);
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Scène urbaine">';
    h += '<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.ciel[0] + '"/><stop offset="1" stop-color="' + p.ciel[1] + '"/></linearGradient></defs>';
    h += '<rect width="' + W + '" height="' + H + '" fill="url(#ciel)"/>';
    /* astre */
    var ax = saison === 'hiver' ? 120 : 820, ay = saison === 'ete' ? 50 : 70;
    h += '<circle cx="' + ax + '" cy="' + ay + '" r="40" fill="' + p.astreGlow + '"/><circle cx="' + ax + '" cy="' + ay + '" r="22" fill="' + p.astre + '"/>';
    if (saison === 'hiver') h += '<circle cx="' + (ax + 10) + '" cy="' + (ay - 6) + '" r="18" fill="' + p.ciel[0] + '"/>';
    /* étoiles l'hiver */
    if (saison === 'hiver') for (var i = 0; i < 25; i++) h += '<circle cx="' + r.int(0, W) + '" cy="' + r.int(0, 100) + '" r="1" fill="#fff" opacity="' + r.entre(0.3, 0.9).toFixed(2) + '"/>';
    /* skyline */
    h += batiments(r, H - 60, 60, 150, p.lointain, false, saison);
    h += batiments(r, H - 30, 40, 120, p.proche, true, saison);
    /* sol */
    h += '<rect x="0" y="' + (H - 32) + '" width="' + W + '" height="32" fill="' + p.sol + '"/>';
    h += '<rect x="0" y="' + (H - 24) + '" width="' + W + '" height="4" fill="' + p.solOmbre + '"/>';
    /* lampadaires */
    for (var l = 80; l < W; l += 300) {
      h += '<rect x="' + l + '" y="' + (H - 100) + '" width="4" height="76" fill="#333"/><circle cx="' + (l + 2) + '" cy="' + (H - 102) + '" r="6" fill="#ffe59a" opacity=".9"/><circle cx="' + (l + 2) + '" cy="' + (H - 102) + '" r="18" fill="#ffe59a" opacity=".12"/>';
    }
    /* arbres */
    h += arbre(200, H - 24, 40, p, saison) + arbre(420, H - 24, 34, p, saison) + arbre(880, H - 24, 44, p, saison);
    /* premier plan */
    h += premierPlan(s, p, saison);
    /* météo */
    h += meteo(r, saison);
    /* étiquettes */
    h += '<rect x="10" y="10" width="300" height="26" rx="6" fill="rgba(0,0,0,.45)"/><text x="20" y="28" font-size="14" fill="#fff" font-family="Georgia, serif">' + U.esc(s.ville.nom) + ' · ' + U.esc(s.ville.quartier) + '</text>';
    h += '<rect x="' + (W - 150) + '" y="10" width="140" height="26" rx="6" fill="rgba(0,0,0,.45)"/><text x="' + (W - 80) + '" y="28" font-size="14" fill="#fff" text-anchor="middle" font-family="Georgia, serif">' + U.SAISONS[saison] + '</text>';
    h += '</svg>';
    return h;
  };

  /** Scène de l'écran titre (sans partie) */
  UI.sceneTitre = function () {
    var faux = { graine: 'titre-' + new Date().getMonth(), temps: { mois: new Date().getMonth() }, ville: { nom: NF.t('Nouvelle Fortune'), quartier: NF.t('la ville vous attend') }, joueur: { logement: 'rue', maladie: null, inventaire: {} } };
    return UI.scene(faux);
  };
})();
