/* =====================================================================
 * COMPTEURS GLOBAUX – joueurs et vies, tous joueurs confondus
 * ---------------------------------------------------------------------
 * Le site est statique (GitHub Pages) : les compteurs vivent sur un
 * service public gratuit et sans compte, Abacus
 * (https://abacus.jasoncameron.dev), qui stocke de simples entiers par
 * espace de noms (ESPACE) et par clé :
 *   joueurs : navigateurs ayant ouvert le jeu une première fois
 *   vies    : personnages créés (nouvelle partie ou héritier)
 * Rien de personnel n'est envoyé, juste un « +1 » ; le navigateur garde
 * seulement un repère local (localStorage nf_joueur) pour ne compter
 * qu'une fois. Les incréments ne partent que depuis le site publié
 * (HOTES) : en local ou depuis une copie, on lit sans compter. Sans
 * réseau, l'écran titre se passe simplement de la ligne.
 * Pour repartir de zéro : changer ESPACE. Le service est public : rien
 * n'empêche un petit malin de gonfler les chiffres.
 * ===================================================================== */
(function () {
  var K = NF.compteurs = {
    URL: 'https://abacus.jasoncameron.dev',
    ESPACE: 'nouvelle-fortune-newfortune',
    CLES: ['joueurs', 'vies'],
    HOTES: ['detectivepasteque-max.github.io'],
    valeurs: {},                                  // dernières valeurs lues, par clé
  };

  /** Vrai si la page est servie par le site publié (seul endroit d'où l'on compte) */
  K.estPublie = function () { return K.HOTES.indexOf(location.hostname) >= 0; };

  function requete(chemin, cb) {
    if (typeof fetch !== 'function') { cb(null); return; }
    fetch(K.URL + chemin, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { cb(j && typeof j.value === 'number' ? j.value : null); })
      .catch(function () { cb(null); });
  }

  /** +1 sur une clé, seulement depuis le site publié */
  K.toucher = function (cle) {
    if (!K.estPublie()) return;
    requete('/hit/' + K.ESPACE + '/' + cle, function (v) { if (v != null) { K.valeurs[cle] = v; K.afficher(); } });
  };

  /** Lit toutes les clés puis rafraîchit l'affichage (clé jamais touchée : 0) */
  K.lire = function () {
    K.CLES.forEach(function (cle) {
      requete('/get/' + K.ESPACE + '/' + cle, function (v) { if (v != null || K.valeurs[cle] == null) K.valeurs[cle] = v == null ? 0 : v; K.afficher(); });
    });
  };

  /** Texte de l'écran titre, ou '' tant que rien n'a été lu */
  K.texte = function () {
    var j = K.valeurs.joueurs, v = K.valeurs.vies;
    if (j == null && v == null) return '';
    var parts = [];
    if (j != null) parts.push(j + (j > 1 ? NF.t(' joueurs') : NF.t(' joueur')));
    if (v != null) parts.push(v + (v > 1 ? NF.t(' vies créées') : NF.t(' vie créée')));
    return '🌍 ' + parts.join(' · ');
  };

  /** Met à jour la ligne de l'écran titre si elle est affichée */
  K.afficher = function () {
    var el = document.getElementById('compteurs');
    if (el) el.textContent = K.texte();
  };

  /** Nouveau personnage (nouvelle partie ou héritier) : +1 vie */
  K.nouvelleVie = function () { K.toucher('vies'); };

  /** Première visite de ce navigateur : +1 joueur */
  K.premiereVisite = function () {
    try {
      if (localStorage.getItem('nf_joueur')) return;
      localStorage.setItem('nf_joueur', String(Date.now()));
    } catch (e) { return; }
    K.toucher('joueurs');
  };

  K.premiereVisite();
  K.lire();
})();
