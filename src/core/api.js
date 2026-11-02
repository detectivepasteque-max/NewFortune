/* =====================================================================
 * API DE JEU – fonctions utilisables partout (données, événements, UI)
 * ---------------------------------------------------------------------
 * Toutes les fonctions prennent l'état `s` en premier argument.
 * Exemple dans un événement :
 *     effets: function (s) { NF.api.ajouterArgent(s, 50); NF.api.modifierJauge(s, 'moral', 5); }
 * ===================================================================== */
(function () {
  var api = NF.api;
  var U = NF.util;

  /* ----- Jauges ----- */
  api.modifierJauge = function (s, id, delta) {
    var j = s.joueur.jauges;
    if (!(id in j)) return 0;
    var avant = j[id];
    j[id] = U.clamp(j[id] + delta, 0, 100);
    return j[id] - avant;
  };

  /* ----- Argent ----- */
  api.ajouterArgent = function (s, montant) {
    s.joueur.argent = Math.max(0, Math.round((s.joueur.argent + montant) * 100) / 100);
    if (montant > 0) s.stats.argentGagne = (s.stats.argentGagne || 0) + montant;
    return s.joueur.argent;
  };

  /** Retire de l'argent. Si `detteAutorisee`, le manque devient une dette.
   *  Retourne le montant effectivement payé. */
  api.retirerArgent = function (s, montant, detteAutorisee) {
    montant = Math.max(0, montant);
    if (s.joueur.argent >= montant) {
      s.joueur.argent = Math.round((s.joueur.argent - montant) * 100) / 100;
      return montant;
    }
    var paye = s.joueur.argent;
    var reste = montant - paye;
    s.joueur.argent = 0;
    if (detteAutorisee) {
      s.joueur.dette = Math.round((s.joueur.dette + reste) * 100) / 100;
      return montant;
    }
    return paye;
  };

  api.ajouterDette = function (s, montant) {
    s.joueur.dette = Math.max(0, Math.round((s.joueur.dette + montant) * 100) / 100);
  };

  /* ----- Réputation ----- */
  api.ajouterReputation = function (s, delta) {
    s.joueur.reputation = U.clamp(s.joueur.reputation + delta, 0, 100);
  };

  /* ----- Compétences ----- */
  api.ajouterXp = function (s, competence, xp) {
    if (!U.byId(NF.data.competences, competence)) return 0;
    var max = NF.data.config.niveauMax * NF.data.config.xpParNiveau;
    var avant = s.joueur.competences[competence] || 0;
    var niveauAvant = Math.floor(avant / NF.data.config.xpParNiveau);
    s.joueur.competences[competence] = U.clamp(avant + xp, 0, max);
    var niveauApres = Math.floor(s.joueur.competences[competence] / NF.data.config.xpParNiveau);
    if (niveauApres > niveauAvant) {
      var c = U.byId(NF.data.competences, competence);
      api.journal(s, c.icone + ' ' + c.nom + NF.t(' passe au niveau ') + niveauApres + ' !', 'bon');
      if (competence === 'conduite' && niveauApres >= 2 && !s.joueur.permis) {
        s.joueur.permis = true;
        api.journal(s, NF.t('🚗 Vous obtenez le permis de conduire.'), 'bon');
      }
    }
    return s.joueur.competences[competence] - avant;
  };

  /* ----- Inventaire ----- */
  api.capaciteInventaire = function (s) {
    return NF.data.config.inventaireBase + api.passifSomme(s, 'inventaire');
  };
  api.placeUtilisee = function (s) {
    var total = 0;
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (!o) continue;
      total += (o.taille == null ? 1 : o.taille) * s.joueur.inventaire[id];
    }
    return total;
  };
  api.placeLibre = function (s) {
    return api.capaciteInventaire(s) - api.placeUtilisee(s);
  };
  api.aObjet = function (s, id, qte) {
    return (s.joueur.inventaire[id] || 0) >= (qte || 1);
  };
  /** Ajoute jusqu'à `qte` unités ; retourne le nombre ajouté (limité par la place) */
  api.ajouterObjet = function (s, id, qte) {
    var o = U.byId(NF.data.objets, id);
    if (!o) { console.warn(NF.t('Objet inconnu : ') + id); return 0; }
    qte = qte == null ? 1 : qte;
    var taille = o.taille == null ? 1 : o.taille;
    var ajoutes = 0;
    while (ajoutes < qte) {
      if (taille > 0 && api.placeLibre(s) < taille) break;
      s.joueur.inventaire[id] = (s.joueur.inventaire[id] || 0) + 1;
      ajoutes++;
    }
    return ajoutes;
  };
  api.retirerObjet = function (s, id, qte) {
    qte = qte == null ? 1 : qte;
    if (!api.aObjet(s, id, qte)) return false;
    s.joueur.inventaire[id] -= qte;
    if (s.joueur.inventaire[id] <= 0) delete s.joueur.inventaire[id];
    return true;
  };
  /** Produit des multiplicateurs passifs d'une clé (ex. 'froid', 'mendicite') */
  api.passif = function (s, cle) {
    var m = 1;
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (o && o.passif && typeof o.passif[cle] === 'number') m *= o.passif[cle];
    }
    return m;
  };
  /** Somme des valeurs passives d'une clé (ex. 'inventaire', 'depensesFixes') */
  api.passifSomme = function (s, cle) {
    var t = 0;
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (o && o.passif && typeof o.passif[cle] === 'number') t += o.passif[cle] * s.joueur.inventaire[id];
    }
    return t;
  };
  /** Vrai si un objet de l'inventaire porte le drapeau passif (ex. 'telephone') */
  api.passifBool = function (s, cle) {
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (o && o.passif && o.passif[cle] === true) return true;
    }
    return false;
  };

  /* ----- Drapeaux (flags) : mémoire des choix pour les chaînes d'événements ----- */
  api.drapeau = function (s, cle, valeur) {
    s.joueur.drapeaux[cle] = valeur === undefined ? true : valeur;
  };
  api.aDrapeau = function (s, cle) {
    return !!s.joueur.drapeaux[cle];
  };
  api.effacerDrapeau = function (s, cle) {
    delete s.joueur.drapeaux[cle];
  };

  /* ----- Programmer un événement dans N mois ----- */
  api.programmer = function (s, evenementId, dansMois, donnees) {
    s.joueur.programmes.push({ evenement: evenementId, mois: s.temps.moisAbsolu + Math.max(1, dansMois || 1), donnees: donnees || null });
  };

  /* ----- Journal ----- */
  api.journal = function (s, texte, type) {
    s.journal.push({ mois: s.temps.mois, annee: s.temps.annee, texte: texte, type: type || 'info' });
    if (s.journal.length > 300) s.journal.splice(0, s.journal.length - 300);
  };

  /* ----- Maladie ----- */
  api.rendreMalade = function (s, nom, duree, santeParMois) {
    s.joueur.maladie = { nom: nom, moisRestants: duree, santeParMois: santeParMois };
  };
  api.guerir = function (s) {
    s.joueur.maladie = null;
  };

  /* ----- Mort ----- */
  api.tuer = function (s, cause) {
    if (s.mort) return;
    s.mort = { cause: cause, age: NF.core.ageAnnees(s), annee: s.temps.annee };
    s.joueur.jauges.sante = 0;
  };

  /* ----- Effets déclaratifs -----
   * effets = { sante: -5, argent: 20, reputation: 2, xp: { lecture: 10 },
   *            objets: { carton: 2 }, drapeaux: { a_vu_benevole: true },
   *            programmer: { evenement: 'x', dans: 3 }, emploi: 'perdre',
   *            logement: 'rue', maladie: { nom, duree, sante }, casier: true,
   *            domiciliation: true, dette: 200, mort: 'cause', journal: 'texte',
   *            fn: function (s) {} }
   */
  api.appliquerEffets = function (s, effets) {
    if (!effets) return;
    if (typeof effets === 'function') effets = effets(s);
    if (!effets || typeof effets !== 'object') return;
    var jauges = ['sante', 'nourriture', 'energie', 'hygiene', 'moral'];
    for (var i = 0; i < jauges.length; i++) if (typeof effets[jauges[i]] === 'number') api.modifierJauge(s, jauges[i], effets[jauges[i]]);
    if (typeof effets.argent === 'number') {
      if (effets.argent >= 0) api.ajouterArgent(s, effets.argent); else api.retirerArgent(s, -effets.argent, false);
    }
    if (typeof effets.dette === 'number') api.ajouterDette(s, effets.dette);
    if (typeof effets.reputation === 'number') api.ajouterReputation(s, effets.reputation);
    if (effets.xp) for (var c in effets.xp) api.ajouterXp(s, c, effets.xp[c]);
    if (effets.objets) for (var o in effets.objets) {
      if (effets.objets[o] > 0) api.ajouterObjet(s, o, effets.objets[o]); else api.retirerObjet(s, o, -effets.objets[o]);
    }
    if (effets.drapeaux) for (var d in effets.drapeaux) api.drapeau(s, d, effets.drapeaux[d]);
    if (effets.programmer) {
      var liste = Array.isArray(effets.programmer) ? effets.programmer : [effets.programmer];
      for (var p = 0; p < liste.length; p++) api.programmer(s, liste[p].evenement, liste[p].dans, liste[p].donnees);
    }
    if (effets.emploi === 'perdre') NF.core.perdreEmploi(s, effets.raison || NF.t('événement'));
    if (typeof effets.logement === 'string') NF.core.forcerLogement(s, effets.logement);
    if (effets.maladie) api.rendreMalade(s, effets.maladie.nom, effets.maladie.duree, effets.maladie.sante);
    if (effets.guerir) api.guerir(s);
    if (effets.casier === true) s.joueur.casier = true;
    if (typeof effets.domiciliation === 'boolean') s.joueur.domiciliation = effets.domiciliation;
    if (effets.formation === 'arreter') s.joueur.formation = null;
    if (typeof effets.conjoncture === 'number') s.conjoncture = U.clamp(s.conjoncture + effets.conjoncture, NF.data.config.conjoncture.min, NF.data.config.conjoncture.max);
    if (effets.mort) api.tuer(s, effets.mort);
    if (effets.journal) api.journal(s, effets.journal);
    if (typeof effets.fn === 'function') effets.fn(s);
  };

  /* ----- Instantané / différence, pour afficher "+12 nourriture, -5 €" ----- */
  api.instantane = function (s) {
    return {
      sante: s.joueur.jauges.sante, nourriture: s.joueur.jauges.nourriture, energie: s.joueur.jauges.energie,
      hygiene: s.joueur.jauges.hygiene, moral: s.joueur.jauges.moral,
      argent: s.joueur.argent, reputation: s.joueur.reputation, dette: s.joueur.dette,
    };
  };
  api.LIBELLES = {
    sante: { nom: NF.t('Santé'), icone: '❤️' }, nourriture: { nom: NF.t('Faim'), icone: '🍞' }, energie: { nom: NF.t('Énergie'), icone: '⚡' },
    hygiene: { nom: NF.t('Hygiène'), icone: '🧼' }, moral: { nom: NF.t('Moral'), icone: '🙂' }, argent: { nom: NF.t('Argent'), icone: '💶' },
    reputation: { nom: NF.t('Réputation'), icone: '⭐' }, dette: { nom: NF.t('Dette'), icone: '📉' },
  };
  api.difference = function (s, avant) {
    var apres = api.instantane(s), res = [];
    for (var k in apres) {
      var d = Math.round((apres[k] - avant[k]) * 100) / 100;
      if (Math.abs(d) >= 0.5) res.push({ cle: k, delta: d, nom: api.LIBELLES[k].nom, icone: api.LIBELLES[k].icone, argent: k === 'argent' || k === 'dette' });
    }
    return res;
  };
})();
