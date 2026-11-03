/* =====================================================================
 * ÉTAT DE LA PARTIE – création, ville, personnage, calculs dérivés
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /* ----- Génération de la ville à partir de la graine ----- */
  C.genererVille = function (rng) {
    var V = NF.data.ville;
    var nom = rng.pick(V.prefixes) + '-' + rng.pick(V.racines) + rng.pick(V.suffixes);
    var quartiers = rng.shuffle(V.quartiers).slice(0, 5);
    var lieux = {};
    V.lieux.forEach(function (l) { if (l.toujours) lieux[l.id] = { qualite: U.round(rng.entre(0.7, 1.3), 2) }; });
    var restants = rng.shuffle(V.lieux.filter(function (l) { return !l.toujours; }));
    for (var i = 0; i < Math.min(V.nbLieuxTires, restants.length); i++) {
      lieux[restants[i].id] = { qualite: U.round(rng.entre(0.7, 1.3), 2) };
    }
    /* marché de l'emploi : multiplicateur par secteur */
    var secteurs = ['industrie', 'logistique', 'restauration', 'services', 'commerce', 'batiment', 'agriculture', 'sante', 'transport', 'bureau', 'securite', 'informatique', 'armee'];
    var marche = {};
    secteurs.forEach(function (sec) { marche[sec] = U.round(rng.entre(0.75, 1.25), 2); });
    return { nom: nom, quartiers: quartiers, quartier: quartiers[0], lieux: lieux, marche: marche };
  };

  /* ----- Création d'un personnage de départ (18 ans) ----- */
  C.genererPersonnage = function (rng, nomFamille) {
    var N = NF.data.noms, cfg = NF.data.config.depart;
    var traits = [];
    var pool = NF.data.traits.slice();
    while (traits.length < 2 && pool.length) {
      var t = rng.pick(pool);
      pool = pool.filter(function (x) { return x.id !== t.id; });
      /* éviter les traits contradictoires évidents */
      var incompatibles = { robuste: 'fragile', fragile: 'robuste', optimiste: 'anxieux', anxieux: 'optimiste', econome: 'depensier', depensier: 'econome', charismatique: 'timide', timide: 'charismatique' };
      if (traits.some(function (x) { return incompatibles[x] === t.id; })) continue;
      traits.push(t.id);
    }
    var origine = rng.pick(N.origines);
    var j = {
      prenom: rng.pick(N.prenoms),
      nom: nomFamille || rng.pick(N.noms),
      age: cfg.ageAnnees * 12,
      traits: traits,
      origine: origine.id,
      jauges: { sante: cfg.sante, nourriture: cfg.nourriture, energie: cfg.energie, hygiene: cfg.hygiene, moral: cfg.moral },
      argent: cfg.argent,
      dette: 0,
      reputation: cfg.reputation,
      competences: {},
      inventaire: {},
      emploi: null,
      experience: {},
      diplomes: [],
      formation: null,
      logement: 'rue',
      logementMois: 0,
      loyersImpayes: 0,
      domiciliation: false,
      permis: false,
      casier: false,
      aides: {},
      classe: 1,
      classeMax: 1,
      paBonus: 0,
      entreprise: null,
      famille: { partenaire: null, enfants: [] },
      drapeaux: {},
      cooldowns: {},
      programmes: [],
      maladie: null,
    };
    NF.data.competences.forEach(function (c) { j.competences[c.id] = 0; });
    /* variations aléatoires de départ */
    j.jauges.sante = U.clamp(j.jauges.sante + rng.int(-10, 10), 30, 100);
    j.jauges.moral = U.clamp(j.jauges.moral + rng.int(-10, 10), 10, 100);
    j.argent = Math.max(0, j.argent + rng.int(-30, 40));
    /* traits */
    traits.forEach(function (id) {
      var t = U.byId(NF.data.traits, id);
      if (t.depart) for (var k in t.depart) { if (k in j.jauges) j.jauges[k] = U.clamp(j.jauges[k] + t.depart[k], 0, 100); }
    });
    /* origine */
    if (origine.bonus) for (var b in origine.bonus) {
      if (b in j.competences) j.competences[b] += origine.bonus[b];
      else if (b in j.jauges) j.jauges[b] = U.clamp(j.jauges[b] + origine.bonus[b], 0, 100);
      else if (b === 'argent') j.argent += origine.bonus[b];
      else if (b === 'reputation') j.reputation = U.clamp(j.reputation + origine.bonus[b], 0, 100);
    }
    return j;
  };

  /* ----- Nouvelle partie ----- */
  C.nouvellePartie = function (graine, meta) {
    graine = (graine || '').trim() || NF.core.RNG.graineAleatoire();
    NF.rng = new NF.core.RNG(graine);
    var s = {
      version: 1,
      graine: graine,
      rng: null,
      temps: { mois: 8, annee: 1, moisAbsolu: 0 },   // on commence en septembre : l'hiver arrive vite
      conjoncture: NF.data.config.conjoncture.initiale,
      ville: C.genererVille(NF.rng),
      joueur: null,
      lignee: { generation: 1, membres: [], classeMax: 1, succes: [], fortuneTransmise: 0 },
      stats: { fabrications: 0, mendicite: 0, evenements: 0, emplois: 0, actions: 0 },
      pa: 0, paMax: 0,
      phase: 'actions',
      journal: [],
      bilan: null,
      evenementsEnAttente: [],
      evenementCourant: null,
      mort: null,
      metaBonus: meta ? U.clone(meta.bonus || {}) : {},
    };
    s.joueur = C.genererPersonnage(NF.rng);
    s.lignee.membres.push({ prenom: s.joueur.prenom, nom: s.joueur.nom, naissance: -18 * 12, generation: 1 });
    C.appliquerBonusMeta(s);
    C.recalculerClasse(s);
    NF.api.journal(s, NF.t('Septembre. Vous avez 18 ans et la ville de ') + s.ville.nom + NF.t(' devant vous. ') + U.byId(NF.data.noms.origines, s.joueur.origine).texte, 'titre');
    C.nouveauMois(s, true);
    return s;
  };

  C.appliquerBonusMeta = function (s) {
    for (var id in s.metaBonus) {
      var b = U.byId(NF.data.bonus, id);
      var n = s.metaBonus[id];
      if (b && n > 0 && typeof b.appliquer === 'function') b.appliquer(s, n);
    }
  };

  /* ----- Calculs dérivés ----- */
  C.ageAnnees = function (s) { return Math.floor(s.joueur.age / 12); };
  C.saison = function (s) { return U.saison(s.temps.mois); };
  C.logementActuel = function (s) { return U.byId(NF.data.logements, s.joueur.logement) || NF.data.logements[0]; };
  C.niveauCompetence = function (s, id) {
    return Math.min(NF.data.config.niveauMax, Math.floor((s.joueur.competences[id] || 0) / NF.data.config.xpParNiveau));
  };
  C.metierActuel = function (s) { return s.joueur.emploi ? U.byId(NF.data.metiers, s.joueur.emploi.id) : null; };
  C.aLieu = function (s, id) { return !!s.ville.lieux[id]; };
  C.qualiteLieu = function (s, id) { return s.ville.lieux[id] ? s.ville.lieux[id].qualite : 0.5; };
  C.aTrait = function (s, id) { return s.joueur.traits.indexOf(id) >= 0; };
  C.aDiplome = function (s, id) {
    if (Array.isArray(id)) return id.some(function (d) { return s.joueur.diplomes.indexOf(d) >= 0; });
    return s.joueur.diplomes.indexOf(id) >= 0;
  };

  /** Produit des multiplicateurs de traits pour une clé (ex. 'mendicite') */
  C.modifTrait = function (s, cle) {
    var m = 1;
    s.joueur.traits.forEach(function (id) {
      var t = U.byId(NF.data.traits, id);
      if (t && t.modif && typeof t.modif[cle] === 'number') m *= t.modif[cle];
    });
    return m;
  };

  /** Efficacité des actions (moral et énergie bas) */
  C.efficacite = function (s) {
    var cfg = NF.data.config, j = s.joueur.jauges, e = 1;
    if (j.moral < cfg.seuils.bas) e *= cfg.efficacite.moralBas;
    if (j.energie < cfg.seuils.bas) e *= cfg.efficacite.energieBas;
    return e;
  };

  /** Revenu mensuel estimé (salaire + entreprise + aides + partenaire) */
  C.revenuMensuel = function (s) {
    var r = 0;
    if (s.joueur.emploi) r += s.joueur.emploi.salaire;
    if (s.joueur.entreprise) r += (s.joueur.entreprise.remuneration || 0) + Math.max(0, s.joueur.entreprise.dernierBenefice || 0) * 0.5;
    for (var a in s.joueur.aides) if (s.joueur.aides[a]) r += NF.data.impots.aides[a] ? NF.data.impots.aides[a].montant : 0;
    if (s.joueur.famille.partenaire) r += s.joueur.famille.partenaire.revenu || 0;
    return Math.round(r);
  };

  /** Patrimoine : argent + logement possédé + entreprise - dettes */
  C.patrimoine = function (s) {
    var p = s.joueur.argent - s.joueur.dette;
    var l = C.logementActuel(s);
    if (l.proprietaire) p += l.prix;
    if (s.joueur.entreprise) p += C.valeurEntreprise ? C.valeurEntreprise(s) : 0;
    return Math.round(p);
  };

  C.emploiStable = function (s) {
    var m = C.metierActuel(s);
    return !!(m && !m.nonDeclare && m.pa >= 1 && s.joueur.emploi.mois >= 3) || !!(s.joueur.entreprise && s.joueur.entreprise.mois >= 6 && (s.joueur.entreprise.dernierBenefice || 0) > 0);
  };

  /* ----- Catégorie sociale ----- */
  C.recalculerClasse = function (s) {
    var l = C.logementActuel(s);
    var infos = {
      logement: l, ordreLogement: l.ordre, revenu: C.revenuMensuel(s),
      emploiStable: C.emploiStable(s), patrimoine: C.patrimoine(s),
    };
    var classes = NF.data.classes.slice().sort(function (a, b) { return b.niveau - a.niveau; });
    var ancienne = s.joueur.classe;
    for (var i = 0; i < classes.length; i++) {
      if (classes[i].condition(s, infos)) { s.joueur.classe = classes[i].niveau; break; }
    }
    if (s.joueur.classe > s.joueur.classeMax) s.joueur.classeMax = s.joueur.classe;
    if (s.joueur.classe > s.lignee.classeMax) s.lignee.classeMax = s.joueur.classe;
    if (ancienne >= 3 && s.joueur.classe === 1) NF.api.drapeau(s, 'retombe_rue', true);
    if (ancienne !== s.joueur.classe && ancienne > 0) {
      var c = U.byId(NF.data.classes.map(function (x) { return { id: x.niveau, nom: x.nom, icone: x.icone }; }), s.joueur.classe);
      NF.api.journal(s, (s.joueur.classe > ancienne ? NF.t('📈 Vous montez : ') : NF.t('📉 Vous descendez : ')) + c.icone + ' ' + c.nom + '.', s.joueur.classe > ancienne ? 'bon' : 'mauvais');
    }
    return s.joueur.classe;
  };
  C.classeActuelle = function (s) {
    for (var i = 0; i < NF.data.classes.length; i++) if (NF.data.classes[i].niveau === s.joueur.classe) return NF.data.classes[i];
    return NF.data.classes[0];
  };

  /* ----- Points d'action ----- */
  C.calculerPaMax = function (s) {
    var cfg = NF.data.config, j = s.joueur.jauges;
    var pa = cfg.paParMois + (s.joueur.paBonus || 0);
    s.joueur.traits.forEach(function (id) { var t = U.byId(NF.data.traits, id); if (t && t.pa) pa += t.pa; });
    if (j.energie < cfg.paMalusEnergie) pa -= 1;
    if (j.sante < cfg.paMalusSante) pa -= 1;
    var m = C.metierActuel(s);
    if (m) pa -= m.pa || 0;
    if (s.joueur.formation) pa -= 1;
    if (s.joueur.entreprise) pa -= 1;
    if (s.joueur.drapeaux.demarches_succession > 0) pa -= 1;
    /* on garde toujours au moins 1 PA : il reste possible de se reposer ou de manger */
    return U.clamp(pa, 1, cfg.paMax);
  };

  /** Démarre un nouveau mois : remet les points d'action */
  C.nouveauMois = function (s, premier) {
    if (!premier) {
      s.temps.mois++;
      if (s.temps.mois >= 12) { s.temps.mois = 0; s.temps.annee++; }
      s.temps.moisAbsolu++;
      s.joueur.age++;
      if (s.joueur.age % 12 === 0) NF.api.journal(s, NF.t('🎂 Vous fêtez vos ') + C.ageAnnees(s) + NF.t(' ans.'));
    }
    s.paMax = C.calculerPaMax(s);
    s.pa = s.paMax;
    s.phase = 'actions';
    s.bilan = null;
    s.evenementCourant = null;
    if (s.joueur.drapeaux.demarches_succession > 0) {
      s.joueur.drapeaux.demarches_succession--;
      if (s.joueur.drapeaux.demarches_succession <= 0) delete s.joueur.drapeaux.demarches_succession;
    }
  };

  /* ----- Vérification de conditions déclaratives -----
   * Utilisée par les événements, les choix, les actions.
   * Retourne { ok: bool, raisons: [textes] } */
  C.verifierConditions = function (s, c) {
    var r = [];
    if (!c) return { ok: true, raisons: r };
    var j = s.joueur;
    function dans(val, liste) { return Array.isArray(liste) ? liste.indexOf(val) >= 0 : liste === val; }
    if (c.saison && !dans(C.saison(s), c.saison)) r.push(NF.t('saison'));
    if (c.mois && !dans(s.temps.mois, c.mois)) r.push(NF.t('mois'));
    if (c.logement && !dans(j.logement, c.logement)) r.push(NF.t('logement'));
    var l = C.logementActuel(s);
    if (c.logementOrdreMin != null && l.ordre < c.logementOrdreMin) r.push(NF.t('logement trop précaire'));
    if (c.logementOrdreMax != null && l.ordre > c.logementOrdreMax) r.push(NF.t('logement'));
    if (c.expose === true && !l.expose) r.push(NF.t('logement'));
    if (c.expose === false && l.expose) r.push(NF.t('logement'));
    if (c.classeMin != null && j.classe < c.classeMin) r.push(NF.t('classe sociale'));
    if (c.classeMax != null && j.classe > c.classeMax) r.push(NF.t('classe sociale'));
    var age = C.ageAnnees(s);
    if (c.ageMin != null && age < c.ageMin) r.push(NF.t('âge minimum ') + c.ageMin);
    if (c.ageMax != null && age > c.ageMax) r.push(NF.t('âge'));
    var m = C.metierActuel(s);
    if (c.emploi === true && !m) r.push(NF.t('il faut un emploi'));
    if (c.emploi === false && m) r.push(NF.t('vous avez déjà un emploi'));
    if (typeof c.emploi === 'string' && (!m || m.id !== c.emploi)) r.push(NF.t('emploi'));
    if (Array.isArray(c.emploi) && (!m || c.emploi.indexOf(m.id) < 0)) r.push(NF.t('emploi'));
    if (c.emploiNiveauMin != null && (!m || m.niveau < c.emploiNiveauMin)) r.push(NF.t('emploi'));
    if (c.emploiNiveauMax != null && (!m || m.niveau > c.emploiNiveauMax)) r.push(NF.t('emploi'));
    if (c.secteur && (!m || !dans(m.secteur, c.secteur))) r.push(NF.t('secteur'));
    if (c.nonDeclare === true && (!m || !m.nonDeclare)) r.push(NF.t('emploi'));
    if (c.nonDeclare === false && m && m.nonDeclare) r.push(NF.t('emploi'));
    if (c.jauges) for (var g in c.jauges) {
      var cond = c.jauges[g], v = j.jauges[g];
      if (cond.min != null && v < cond.min) r.push(NF.api.LIBELLES[g].nom + NF.t(' insuffisante'));
      if (cond.max != null && v > cond.max) r.push(NF.api.LIBELLES[g].nom);
    }
    if (c.argentMin != null && j.argent < c.argentMin) r.push(NF.t('il faut ') + U.euros(c.argentMin));
    if (c.argentMax != null && j.argent > c.argentMax) r.push(NF.t('argent'));
    if (c.reputationMin != null && j.reputation < c.reputationMin) r.push(NF.t('réputation ') + c.reputationMin + NF.t(' requise'));
    if (c.reputationMax != null && j.reputation > c.reputationMax) r.push(NF.t('réputation'));
    if (c.competences) for (var k in c.competences) {
      if (C.niveauCompetence(s, k) < c.competences[k]) { var cc = U.byId(NF.data.competences, k); r.push((cc ? cc.nom : k) + NF.t(' niveau ') + c.competences[k]); }
    }
    if (c.competencesMax) for (var k2 in c.competencesMax) if (C.niveauCompetence(s, k2) > c.competencesMax[k2]) r.push(NF.t('compétence'));
    if (c.objet) { var objs = Array.isArray(c.objet) ? c.objet : [c.objet]; objs.forEach(function (o) { if (!NF.api.aObjet(s, o)) { var oo = U.byId(NF.data.objets, o); r.push(NF.t('objet : ') + (oo ? oo.nom : o)); } }); }
    if (c.objetAbsent) { var abs = Array.isArray(c.objetAbsent) ? c.objetAbsent : [c.objetAbsent]; abs.forEach(function (o) { if (NF.api.aObjet(s, o)) r.push(NF.t('objet')); }); }
    if (c.drapeau) { var dr = Array.isArray(c.drapeau) ? c.drapeau : [c.drapeau]; dr.forEach(function (d) { if (!j.drapeaux[d]) r.push(NF.t('condition')); }); }
    if (c.sansDrapeau) { var sd = Array.isArray(c.sansDrapeau) ? c.sansDrapeau : [c.sansDrapeau]; sd.forEach(function (d) { if (j.drapeaux[d]) r.push(NF.t('déjà fait')); }); }
    if (c.trait && !C.aTrait(s, c.trait)) r.push(NF.t('trait'));
    if (c.sansTrait && C.aTrait(s, c.sansTrait)) r.push(NF.t('trait'));
    if (c.partenaire === true && !j.famille.partenaire) r.push(NF.t('partenaire'));
    if (c.partenaire === false && j.famille.partenaire) r.push(NF.t('partenaire'));
    if (c.enfants === true && !j.famille.enfants.length) r.push(NF.t('enfants'));
    if (c.enfants === false && j.famille.enfants.length) r.push(NF.t('enfants'));
    if (c.enfantsMin != null && j.famille.enfants.length < c.enfantsMin) r.push(NF.t('enfants'));
    if (c.entreprise === true && !j.entreprise) r.push(NF.t('entreprise'));
    if (c.entreprise === false && j.entreprise) r.push(NF.t('entreprise'));
    if (c.formation === true && !j.formation) r.push(NF.t('formation'));
    if (c.formation === false && j.formation) r.push(NF.t('formation en cours'));
    if (c.domiciliation === true && !j.domiciliation) r.push(NF.t('domiciliation nécessaire'));
    if (c.domiciliation === false && j.domiciliation) r.push(NF.t('domiciliation'));
    if (c.adresse === true && !l.adresse) r.push(NF.t('un vrai logement est nécessaire'));
    if (c.casier === true && !j.casier) r.push(NF.t('casier'));
    if (c.casier === false && j.casier) r.push(NF.t('casier judiciaire'));
    if (c.permis === true && !j.permis) r.push(NF.t('permis de conduire'));
    if (c.diplome && !C.aDiplome(s, c.diplome)) r.push(NF.t('diplôme requis'));
    if (c.lieu && !C.aLieu(s, c.lieu)) { var li = U.byId(NF.data.ville.lieux, c.lieu); r.push(NF.t('pas de ') + (li ? NF.util.minuscule(li.nom) : c.lieu) + NF.t(' dans cette ville')); }
    if (c.dette === true && j.dette <= 0) r.push(NF.t('dette'));
    if (c.dette === false && j.dette > 0) r.push(NF.t('vous avez des dettes'));
    if (c.generationMin != null && s.lignee.generation < c.generationMin) r.push(NF.t('génération'));
    if (c.maladie === true && !j.maladie) r.push(NF.t('maladie'));
    if (c.maladie === false && j.maladie) r.push(NF.t('vous êtes malade'));
    if (c.telephone === true && !NF.api.passifBool(s, 'telephone')) r.push(NF.t('téléphone nécessaire'));
    if (c.hygiene != null && j.jauges.hygiene < c.hygiene) r.push(NF.t('hygiène ') + c.hygiene + NF.t(' requise'));
    if (c.experience) for (var sec in c.experience) if ((j.experience[sec] || 0) < c.experience[sec]) r.push(c.experience[sec] + NF.t(' mois d\'expérience (') + sec + ')');
    if (c.proba != null && !NF.rng.chance(c.proba)) r.push(NF.t('hasard'));
    return { ok: r.length === 0, raisons: r };
  };

  /* ----- Logement ----- */
  /** Conditions d'accès à un logement : { ok, raisons, depot, distance }.
   *  `distance` estime l'effort qui reste (0 = accessible, Infinity = impossible ici) et sert à
   *  désigner la « prochaine étape » de l'onglet Logement (C.prochainLogement). */
  C.conditionsLogement = function (s, id) {
    var l = U.byId(NF.data.logements, id);
    if (!l) return { ok: false, raisons: ['inconnu'], distance: Infinity };
    var r = [], d = 0;
    if (l.id === s.joueur.logement) { r.push(NF.t('vous y êtes déjà')); d = Infinity; }
    var a = l.acces || {};
    var depot = l.proprietaire ? l.prix : (l.loyer * NF.data.config.depotGarantie + l.loyer);
    var besoin = Math.max(a.argent || 0, depot), revenu = C.revenuMensuel(s);
    if (a.argent != null && s.joueur.argent < besoin) { r.push(NF.t('il faut ') + U.euros(besoin) + NF.t(' (dépôt et premier loyer ; vous avez ') + U.euros(s.joueur.argent) + ')'); d += (besoin - s.joueur.argent) / 300; }
    if (a.revenuMensuel != null && revenu < a.revenuMensuel) { r.push(NF.t('revenus de ') + U.euros(a.revenuMensuel) + NF.t('/mois exigés (vous avez ') + U.euros(revenu) + ')'); d += (a.revenuMensuel - revenu) / 300; }
    if (a.emploiMois != null) {
      var m = C.metierActuel(s);
      var ok = (m && !m.nonDeclare && s.joueur.emploi.mois >= a.emploiMois) || (s.joueur.entreprise && s.joueur.entreprise.mois >= a.emploiMois * 2);
      if (!ok) { r.push(a.emploiMois + NF.t(' mois d\'emploi déclaré exigés (fiches de paie)')); d += 2; }
    }
    if (a.domiciliation && !s.joueur.domiciliation) { r.push(NF.t('domiciliation nécessaire')); d += 1; }
    if (a.reputation != null && s.joueur.reputation < a.reputation) { r.push(NF.t('réputation ') + a.reputation + NF.t(' requise (vous avez ') + Math.round(s.joueur.reputation) + ')'); d += (a.reputation - s.joueur.reputation) / 5; }
    if (a.lieu && !C.aLieu(s, a.lieu)) { r.push(NF.t('pas de lieu adapté dans cette ville')); d = Infinity; }
    if (a.objet && !NF.api.aObjet(s, a.objet)) { var o = U.byId(NF.data.objets, a.objet); r.push(NF.t('il faut : ') + (o ? o.nom : a.objet)); d += 5; }
    if (a.drapeau && !s.joueur.drapeaux[a.drapeau]) { r.push(NF.t('personne ne vous a proposé ce logement')); d += 6; }
    if (a.secteurEmploi) { var mt = C.metierActuel(s); if (!mt || mt.secteur !== a.secteurEmploi) { r.push(NF.t('réservé aux personnels en service (') + a.secteurEmploi + ')'); d = Infinity; } }
    if (l.id === 'foyer' && s.joueur.drapeaux.foyer_interdit) { r.push(NF.t('vous êtes interdit de foyer pour le moment')); d += 3; }
    if (l.capacite < 1 + (s.joueur.famille.partenaire ? 1 : 0) + s.joueur.famille.enfants.length) { r.push(NF.t('trop petit pour votre famille')); d = Infinity; }
    return { ok: r.length === 0, raisons: r, depot: depot, distance: r.length ? d : 0 };
  };

  /** Le logement à viser : le moins élevé accessible dès maintenant au-dessus de l'actuel,
   *  sinon le plus proche (distance de conditionsLogement). Null si rien n'est atteignable. */
  C.prochainLogement = function (s) {
    var actuel = C.logementActuel(s), best = null;
    NF.data.logements.forEach(function (l) {
      if (l.ordre <= actuel.ordre) return;
      var v = C.conditionsLogement(s, l.id);
      if (!isFinite(v.distance)) return;
      var d = v.ok ? -1 : v.distance;
      if (!best || d < best.d || (d === best.d && l.ordre < best.l.ordre)) best = { l: l, v: v, d: d };
    });
    return best;
  };

  /** Déménage (en payant ce qu'il faut). Retourne un texte. */
  C.changerLogement = function (s, id) {
    var v = C.conditionsLogement(s, id);
    if (!v.ok) return NF.t('Impossible : ') + v.raisons.join(', ') + '.';
    var ancien = C.logementActuel(s);
    var l = U.byId(NF.data.logements, id);
    var texte = '';
    if (ancien.proprietaire) {
      var vente = Math.round(ancien.prix * 0.9);
      NF.api.ajouterArgent(s, vente);
      texte += NF.t('Vous vendez votre ') + NF.util.minuscule(ancien.nom) + NF.t(' pour ') + U.euros(vente) + '. ';
    }
    if (l.proprietaire) {
      NF.api.retirerArgent(s, l.prix, false);
      texte += NF.t('Vous achetez ') + NF.util.minuscule(l.nom) + NF.t(' pour ') + U.euros(l.prix) + '.';
    } else if (l.loyer > 0) {
      NF.api.retirerArgent(s, v.depot, false);
      texte += NF.t('Vous emménagez : ') + l.nom + NF.t('. Dépôt de garantie et premier loyer : ') + U.euros(v.depot) + '.';
    } else {
      texte += NF.t('Vous vous installez : ') + l.nom + '.';
    }
    if (l.id === 'heberge') delete s.joueur.drapeaux.hebergement_propose;
    s.joueur.logement = id;
    s.joueur.logementMois = 0;
    s.joueur.loyersImpayes = 0;
    if (l.adresse) s.joueur.domiciliation = true;
    NF.api.journal(s, l.icone + ' ' + texte, l.ordre > ancien.ordre ? 'bon' : 'mauvais');
    C.recalculerClasse(s);
    return texte;
  };

  /** Impose un logement (expulsion, événement) sans conditions */
  C.forcerLogement = function (s, id) {
    var l = U.byId(NF.data.logements, id);
    if (!l) return;
    var ancien = C.logementActuel(s);
    if (ancien.proprietaire && !l.proprietaire) NF.api.ajouterArgent(s, Math.round(ancien.prix * 0.5));
    s.joueur.logement = id;
    s.joueur.logementMois = 0;
    s.joueur.loyersImpayes = 0;
    C.recalculerClasse(s);
  };
})();
