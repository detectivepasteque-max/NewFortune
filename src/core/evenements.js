/* =====================================================================
 * MOTEUR D'ÉVÉNEMENTS
 * ---------------------------------------------------------------------
 * Un événement (voir data/evenements/*.js) :
 *   {
 *     id, famille, titre, icone,
 *     texte       : string | function (s, donnees)
 *     poids       : number | function (s)   (défaut 1)
 *     unique      : true  = une seule fois par personnage
 *     delai       : nombre de mois avant de pouvoir se reproduire (défaut 6)
 *     force       : true  = n'arrive jamais au hasard, seulement via
 *                   NF.core.forcerEvenement / NF.api.programmer
 *     conditions  : objet déclaratif (voir NF.core.verifierConditions)
 *     condition   : function (s) -> booléen (optionnel)
 *     choix       : [ { texte, conditions, condition, effets, resultat,
 *                       aleatoire: [ { poids, resultat, effets } ] } ]
 *   }
 * Un événement sans `choix` est purement informatif (bouton "Continuer")
 * et peut porter `effets` directement.
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /** À utiliser dans les fichiers de données : NF.ajouterEvenements([...]) */
  NF.ajouterEvenements = function (liste) {
    liste.forEach(function (ev) {
      if (!ev.id) { console.warn(NF.t('Événement sans id ignoré'), ev); return; }
      if (U.byId(NF.data.evenements, ev.id)) { console.warn(NF.t('Événement en double : ') + ev.id); return; }
      if (ev.delai == null) ev.delai = 6;
      if (ev.poids == null) ev.poids = 1;
      if (!ev.famille) ev.famille = 'divers';
      NF.data.evenements.push(ev);
    });
  };

  C.evenementParId = function (id) { return U.byId(NF.data.evenements, id); };

  C.evenementEligible = function (s, ev) {
    if (ev.force) return false;
    if (ev.unique && s.joueur.drapeaux['_ev_' + ev.id]) return false;
    var dernier = s.joueur.cooldowns[ev.id];
    if (dernier != null && s.temps.moisAbsolu - dernier < ev.delai) return false;
    if (ev.conditions && !C.verifierConditions(s, ev.conditions).ok) return false;
    if (typeof ev.condition === 'function' && !ev.condition(s)) return false;
    return true;
  };

  /** Tire les événements aléatoires du mois et les met en attente */
  C.tirerEvenements = function (s) {
    var cfg = NF.data.config;
    var eligibles = NF.data.evenements.filter(function (ev) { return C.evenementEligible(s, ev); });
    var nb = cfg.evenementsParMois.min;
    if (NF.rng.chance(cfg.chanceSecondEvenement)) nb = cfg.evenementsParMois.max;
    var dejaPris = s.evenementsEnAttente.map(function (e) { return e.id; });
    var familles = s.evenementsEnAttente.map(function (e) { var ev = C.evenementParId(e.id); return ev ? ev.famille : ''; });
    for (var i = 0; i < nb && eligibles.length; i++) {
      var ev = NF.rng.pondere(eligibles, function (e) {
        var p = U.val(e.poids, s);
        /* éviter deux événements de la même famille le même mois */
        if (familles.indexOf(e.famille) >= 0) p *= 0.3;
        if (e.famille === 'bonne_nouvelle' || (e.bonne && true)) p *= C.modifTrait(s, 'chance');
        return p;
      });
      if (!ev) break;
      dejaPris.push(ev.id);
      familles.push(ev.famille);
      eligibles = eligibles.filter(function (e) { return e.id !== ev.id; });
      s.evenementsEnAttente.push({ id: ev.id, donnees: null });
    }
  };

  /** Ajoute un événement précis (accident, licenciement…). Retourne vrai s'il existe. */
  C.forcerEvenement = function (s, id, donnees) {
    var ev = C.evenementParId(id);
    if (!ev) { console.warn(NF.t('Événement forcé introuvable : ') + id); return false; }
    if (s.evenementsEnAttente.some(function (e) { return e.id === id; })) return true;
    s.evenementsEnAttente.push({ id: id, donnees: donnees || null });
    return true;
  };

  /** Déclenche les événements programmés arrivés à échéance */
  C.declencherProgrammes = function (s) {
    var restants = [];
    s.joueur.programmes.forEach(function (p) {
      if (p.mois <= s.temps.moisAbsolu) {
        if (C.evenementParId(p.evenement)) s.evenementsEnAttente.unshift({ id: p.evenement, donnees: p.donnees });
      } else restants.push(p);
    });
    s.joueur.programmes = restants;
  };

  /** Prend le prochain événement en attente et le prépare pour l'affichage.
   *  Retourne l'objet préparé ou null. */
  C.demarrerEvenement = function (s) {
    while (s.evenementsEnAttente.length) {
      var e = s.evenementsEnAttente.shift();
      var ev = C.evenementParId(e.id);
      if (!ev) continue;
      /* même forcé ou programmé, un événement dont les conditions ne tiennent
       * plus (emploi perdu entre-temps, séparation…) est abandonné */
      try {
        if (ev.conditions && !C.verifierConditions(s, ev.conditions).ok) continue;
        if (typeof ev.condition === 'function' && !ev.condition(s, e.donnees)) continue;
      } catch (err) { console.error(NF.t('Événement ') + ev.id + NF.t(' : erreur de condition'), err); continue; }
      var choix = (ev.choix || []).map(function (c, i) {
        var v = { ok: true, raisons: [] };
        if (c.conditions) v = C.verifierConditions(s, c.conditions);
        if (v.ok && typeof c.condition === 'function' && !c.condition(s, e.donnees)) { v.ok = false; v.raisons.push(NF.t('indisponible')); }
        return { index: i, texte: U.val(c.texte, s, e.donnees), ok: v.ok, raisons: v.raisons, cache: c.cache && !v.ok };
      }).filter(function (c) { return !c.cache; });
      if (ev.choix && ev.choix.length && !choix.some(function (c) { return c.ok; })) {
        /* aucun choix possible : on rend le premier accessible pour ne pas bloquer */
        choix[0].ok = true;
      }
      var titre, texte;
      try { titre = U.val(ev.titre, s, e.donnees); texte = U.val(ev.texte, s, e.donnees); }
      catch (err2) { console.error(NF.t('Événement ') + ev.id + NF.t(' : erreur dans titre/texte'), err2); continue; }
      s.evenementCourant = {
        id: ev.id, donnees: e.donnees, titre: titre, icone: ev.icone || '❔',
        famille: ev.famille, texte: texte, choix: choix, resultat: null, deltas: null,
      };
      s.phase = 'evenement';
      s.stats.evenements = (s.stats.evenements || 0) + 1;
      return s.evenementCourant;
    }
    return null;
  };

  /** Applique le choix `index` de l'événement courant.
   *  Retourne { resultat, deltas } et laisse l'événement affiché en mode "résultat". */
  C.choisir = function (s, index) {
    var cur = s.evenementCourant;
    if (!cur) return null;
    var ev = C.evenementParId(cur.id);
    var avant = NF.api.instantane(s);
    var resultat = '';
    var choix = ev.choix && ev.choix.length ? ev.choix[index] : null;
    /* un événement mal écrit ne doit pas bloquer la partie : on journalise l'erreur */
    try {
      if (choix) {
        if (choix.aleatoire && choix.aleatoire.length) {
          var issue = NF.rng.pondere(choix.aleatoire, function (a) { var p = U.val(a.poids, s, cur.donnees); return p == null ? 1 : p; });
          if (issue) {
            NF.api.appliquerEffets(s, typeof issue.effets === 'function' ? issue.effets(s, cur.donnees) : issue.effets);
            resultat = U.val(issue.resultat, s, cur.donnees) || '';
          }
        } else {
          NF.api.appliquerEffets(s, typeof choix.effets === 'function' ? choix.effets(s, cur.donnees) : choix.effets);
          resultat = U.val(choix.resultat, s, cur.donnees) || '';
        }
      } else if (ev.effets) {
        NF.api.appliquerEffets(s, typeof ev.effets === 'function' ? ev.effets(s, cur.donnees) : ev.effets);
        resultat = U.val(ev.resultat, s, cur.donnees) || '';
      }
    } catch (err) {
      console.error(NF.t('Événement ') + cur.id + NF.t(' : erreur dans les effets'), err);
      resultat = resultat || '…';
    }
    s.joueur.cooldowns[cur.id] = s.temps.moisAbsolu;
    if (ev.unique) NF.api.drapeau(s, '_ev_' + cur.id, true);
    cur.resultat = resultat;
    cur.deltas = NF.api.difference(s, avant);
    var ligne = cur.icone + ' ' + cur.titre + (choix ? ' — ' + U.val(choix.texte, s, cur.donnees) : '');
    NF.api.journal(s, ligne, 'evenement');
    if (resultat) NF.api.journal(s, resultat, 'resultat');
    C.verifierMort(s);
    C.recalculerClasse(s);
    return { resultat: resultat, deltas: cur.deltas };
  };

  /** Ferme l'événement courant ; retourne le suivant ou null */
  C.evenementSuivant = function (s) {
    s.evenementCourant = null;
    if (s.mort) return null;
    return C.demarrerEvenement(s);
  };
})();
