/* =====================================================================
 * Générateur de nombres aléatoires à graine (sfc32 + hachage cyrb128)
 * ---------------------------------------------------------------------
 * Toute l'aléatoire du jeu passe par ici, ce qui permet de rejouer
 * exactement la même partie à partir d'une graine ("seed").
 * L'état interne (4 entiers) est sauvegardé avec la partie.
 * ===================================================================== */
(function () {
  function cyrb128(str) {
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  function RNG(seed) {
    this.seed = String(seed);
    var s = cyrb128(this.seed);
    this.a = s[0]; this.b = s[1]; this.c = s[2]; this.d = s[3];
    // quelques tours pour mélanger
    for (var i = 0; i < 12; i++) this.random();
  }

  /** Nombre dans [0, 1) */
  RNG.prototype.random = function () {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    var t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  /** Entier dans [min, max] inclus */
  RNG.prototype.int = function (min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  };

  /** Nombre réel dans [min, max] */
  RNG.prototype.entre = function (min, max) {
    return min + this.random() * (max - min);
  };

  /** Vrai avec une probabilité p (0..1) */
  RNG.prototype.chance = function (p) {
    return this.random() < p;
  };

  /** Élément au hasard d'un tableau */
  RNG.prototype.pick = function (arr) {
    if (!arr || !arr.length) return undefined;
    return arr[Math.floor(this.random() * arr.length)];
  };

  /** Mélange (copie) */
  RNG.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /** Tirage pondéré : items = [{poids: n, ...}] ou fonction de poids */
  RNG.prototype.pondere = function (items, poidsFn) {
    var total = 0, poids = [];
    for (var i = 0; i < items.length; i++) {
      var p = poidsFn ? poidsFn(items[i]) : items[i].poids;
      p = Math.max(0, p || 0);
      poids.push(p);
      total += p;
    }
    if (total <= 0) return undefined;
    var r = this.random() * total;
    for (var j = 0; j < items.length; j++) {
      r -= poids[j];
      if (r < 0) return items[j];
    }
    return items[items.length - 1];
  };

  RNG.prototype.getState = function () {
    return [this.a, this.b, this.c, this.d];
  };
  RNG.prototype.setState = function (s) {
    this.a = s[0]; this.b = s[1]; this.c = s[2]; this.d = s[3];
  };

  /** Génère une graine lisible aléatoire (non déterministe) */
  RNG.graineAleatoire = function () {
    var mots = ['BRUME', 'ASPHALTE', 'NEON', 'PLUIE', 'GARE', 'PAVE', 'TOIT', 'METRO', 'CARTON', 'LUMIERE', 'HIVER', 'QUAI', 'BETON', 'ZINC', 'PONT'];
    var m = mots[Math.floor(Math.random() * mots.length)];
    return m + '-' + Math.floor(1000 + Math.random() * 9000);
  };

  NF.core.RNG = RNG;
  /** Instance courante (recréée à chaque nouvelle partie / chargement) */
  NF.rng = new RNG('defaut');
})();
