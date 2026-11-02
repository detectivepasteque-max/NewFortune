/* =====================================================================
 * FAMILLE ET HÉRITAGE
 * ---------------------------------------------------------------------
 * partenaire : { prenom, age (mois), relation 0-100, sante, revenu, metier }
 * enfant     : { prenom, age (mois), relation, sante, education 0-100 }
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /** Crée un partenaire (appelé par les événements de rencontre) */
  C.formerCouple = function (s, options) {
    options = options || {};
    var age = s.joueur.age + NF.rng.int(-4 * 12, 5 * 12);
    var revenu = options.revenu != null ? options.revenu : NF.rng.pick([0, 0, 600, 1100, 1400, 1800, 2200]);
    if (s.joueur.classe <= 2 && revenu > 1200) revenu = NF.rng.pick([0, 500, 900]);
    s.joueur.famille.partenaire = {
      prenom: options.prenom || NF.rng.pick(NF.data.noms.prenoms),
      age: Math.max(18 * 12, age),
      relation: options.relation != null ? options.relation : 55,
      sante: NF.rng.int(60, 95),
      revenu: revenu,
      metier: revenu > 0 ? NF.rng.pick(['vendeur', NF.t('infirmière'), 'livreur', 'aide-soignant', NF.t('employé de bureau'), NF.t('cuisinière'), NF.t('agent d\'entretien'), 'technicien']) : null,
      depuis: s.temps.moisAbsolu,
    };
    NF.api.journal(s, NF.t('💞 Vous formez un couple avec ') + s.joueur.famille.partenaire.prenom + '.', 'bon');
    delete s.joueur.drapeaux.relation_en_cours;
    return s.joueur.famille.partenaire;
  };

  C.separer = function (s, raison) {
    var p = s.joueur.famille.partenaire;
    if (!p) return;
    NF.api.journal(s, NF.t('💔 Séparation avec ') + p.prenom + (raison ? ' (' + raison + ')' : '') + '.', 'mauvais');
    s.joueur.famille.partenaire = null;
    NF.api.modifierJauge(s, 'moral', -15);
    C.recalculerClasse(s);
  };

  C.naissance = function (s) {
    if (s.joueur.famille.enfants.length >= NF.data.config.maxEnfants) return null;
    var e = {
      prenom: NF.rng.pick(NF.data.noms.prenoms),
      age: 0, relation: 70, sante: NF.rng.int(70, 100), education: 0,
      naissance: s.temps.moisAbsolu,
    };
    s.joueur.famille.enfants.push(e);
    NF.api.journal(s, NF.t('👶 Naissance de ') + e.prenom + ' !', 'bon');
    return e;
  };

  /** Traitement mensuel de la famille */
  C.moisFamille = function (s, bilan) {
    var f = s.joueur.famille, cf = NF.data.config;
    var p = f.partenaire;
    if (p) {
      p.age++;
      if (!s.joueur.drapeaux.temps_famille) p.relation = U.clamp(p.relation - 2, 0, 100);
      if (s.joueur.jauges.moral < 25) p.relation = U.clamp(p.relation - 2, 0, 100);
      if (s.joueur.classe === 1) p.relation = U.clamp(p.relation - 1, 0, 100);
      if (p.revenu > 0) bilan.revenus.push({ nom: NF.t('Revenus de ') + p.prenom, montant: Math.round(p.revenu * 0.5), imposable: true });
      /* naissance */
      if (f.enfants.length < cf.maxEnfants && s.joueur.age < 45 * 12 && p.age < 45 * 12) {
        var pn = s.joueur.drapeaux.veut_enfant && p.relation >= 50 ? cf.chanceNaissanceCouple : cf.chanceNaissanceSurprise;
        if (NF.rng.chance(pn)) C.forcerEvenement(s, 'naissance');
      }
      if (p.relation <= 5) C.forcerEvenement(s, 'rupture');
    }
    /* enfants */
    f.enfants.forEach(function (e) {
      e.age++;
      if (!s.joueur.drapeaux.temps_famille) e.relation = U.clamp(e.relation - 1, 0, 100);
      var annees = Math.floor(e.age / 12);
      if (annees >= 3 && annees < 18) {
        var ecole = s.joueur.classe >= 3 ? 1 : 0.4;
        if (s.joueur.drapeaux.education_enfants) ecole += 0.8;
        e.education = U.clamp(e.education + ecole * NF.rng.entre(0.6, 1.2), 0, 100);
      }
      if (annees < 18) {
        var cout = Math.round(90 + 40 * Math.min(4, s.joueur.classe));
        bilan.depenses.push({ nom: NF.t('Enfant : ') + e.prenom, montant: cout });
      }
      if (e.age === 18 * 12) bilan.textes.push('🎓 ' + e.prenom + NF.t(' a 18 ans : un héritier possible.'));
    });
    delete s.joueur.drapeaux.temps_famille;
    delete s.joueur.drapeaux.education_enfants;
  };

  C.heritiersPossibles = function (s) {
    return s.joueur.famille.enfants.filter(function (e) { return e.sante > 0; });
  };

  /* ----- Calcul des droits de succession ----- */
  C.calculerSuccession = function (s, nbEnfants) {
    var I = NF.data.impots.succession, j = s.joueur;
    var l = C.logementActuel(s);
    var brut = j.argent;
    var logement = l.proprietaire ? l.prix : 0;
    var entreprise = j.entreprise ? C.valeurEntreprise(s) : 0;
    brut += logement + entreprise;
    var abattement = I.abattementParEnfant * Math.max(1, nbEnfants);
    var taxable = Math.max(0, brut - abattement);
    var droits = 0, bas = 0;
    for (var i = 0; i < I.tranches.length; i++) {
      var haut = I.tranches[i].jusqua;
      if (taxable > bas) droits += (Math.min(taxable, haut) - bas) * I.tranches[i].taux;
      bas = haut;
      if (taxable <= haut) break;
    }
    var reduction = j.drapeaux.reduction_succession || 0;
    droits = Math.round(droits * (1 - reduction));
    var notaire = Math.max(I.fraisNotaireMin, Math.round(brut * I.fraisNotaire));
    var retard = Math.round(brut * I.impotsEnRetard);
    var dettes = I.dettesTransmises ? j.dette : 0;
    var total = droits + notaire + retard + dettes;
    var net = brut - total;
    return { brut: brut, logement: logement, entreprise: entreprise, abattement: abattement, droits: droits, notaire: notaire, retard: retard, dettes: dettes, total: total, net: net, argentNet: j.argent + logement + entreprise - total };
  };

  /** L'héritier reprend la partie. Retourne un résumé pour l'affichage. */
  C.succession = function (s, indexEnfant) {
    var defunt = s.joueur;
    var enfant = defunt.famille.enfants[indexEnfant];
    var nbEnfants = C.heritiersPossibles(s).length;
    var calc = C.calculerSuccession(s, nbEnfants);
    var l = C.logementActuel(s);
    /* membre décédé */
    var membre = s.lignee.membres[s.lignee.membres.length - 1];
    if (membre) { membre.mort = s.temps.moisAbsolu; membre.cause = s.mort ? s.mort.cause : ''; membre.classeMax = defunt.classeMax; membre.age = C.ageAnnees(s); }
    /* nouvel individu */
    var rng = NF.rng;
    var nouveau = C.genererPersonnage(rng, defunt.nom);
    nouveau.prenom = enfant.prenom;
    nouveau.age = enfant.age;
    /* la santé et l'éducation de l'enfant comptent */
    nouveau.jauges.sante = U.clamp(Math.round((enfant.sante + 80) / 2), 30, 100);
    nouveau.jauges.moral = 50;
    nouveau.jauges.nourriture = 70; nouveau.jauges.energie = 70; nouveau.jauges.hygiene = 60;
    var edu = enfant.education / 100;
    NF.data.competences.forEach(function (c) { nouveau.competences[c.id] = Math.round(NF.data.config.xpParNiveau * 2.2 * edu * rng.entre(0.3, 1)); });
    if (edu > 0.7) nouveau.competences.lecture = Math.max(nouveau.competences.lecture, 2 * NF.data.config.xpParNiveau);
    /* argent net (le logement et l'entreprise sont conservés en nature si possible) */
    var argentNet = defunt.argent - calc.total;
    nouveau.argent = Math.max(0, argentNet);
    nouveau.dette = Math.max(0, -argentNet);
    if (l.proprietaire) { nouveau.logement = l.id; }
    else if (l.ordre >= 3 && nouveau.argent >= (l.loyer + l.charges) * 2) { nouveau.logement = l.id; }
    else if (l.ordre >= 1 && l.ordre < 3) nouveau.logement = l.id;
    else nouveau.logement = 'rue';
    nouveau.domiciliation = defunt.domiciliation;
    nouveau.reputation = Math.round(defunt.reputation * NF.data.impots.succession.reputationTransmise);
    nouveau.classe = defunt.classe; nouveau.classeMax = defunt.classe;
    nouveau.paBonus = 0;
    /* entreprise transmise */
    if (defunt.entreprise) { nouveau.entreprise = defunt.entreprise; nouveau.entreprise.mois = Math.max(0, nouveau.entreprise.mois); nouveau.drapeaux.a_cree_entreprise = true; }
    /* frères et sœurs restent dans la famille comme "proches" (non joués) */
    nouveau.famille = { partenaire: null, enfants: [] };
    nouveau.drapeaux.demarches_succession = NF.data.impots.succession.moisDemarches;
    nouveau.drapeaux.heritier = true;
    /* tutelle si mineur : on avance le temps jusqu'à 18 ans */
    var tutelle = 0;
    if (nouveau.age < 18 * 12) {
      tutelle = 18 * 12 - nouveau.age;
      var annees = tutelle / 12;
      nouveau.argent = Math.round(nouveau.argent * Math.pow(0.97, annees));   // frais de tutelle
      nouveau.age = 18 * 12;
      s.temps.moisAbsolu += tutelle;
      s.temps.annee += Math.floor((s.temps.mois + tutelle) / 12);
      s.temps.mois = (s.temps.mois + tutelle) % 12;
      /* l'éducation continue pendant la tutelle */
      var eduT = U.clamp(enfant.education + annees * (defunt.classe >= 3 ? 8 : 3), 0, 100) / 100;
      NF.data.competences.forEach(function (c) { nouveau.competences[c.id] = Math.max(nouveau.competences[c.id], Math.round(NF.data.config.xpParNiveau * 2.5 * eduT * rng.entre(0.4, 1))); });
      if (!l.proprietaire) nouveau.logement = l.ordre >= 3 && nouveau.argent > 2000 ? l.id : 'heberge';
      if (nouveau.logement === 'heberge') nouveau.drapeaux.hebergement_propose = true;
    }
    s.joueur = nouveau;
    s.lignee.generation++;
    s.lignee.fortuneTransmise += Math.max(0, calc.net);
    s.lignee.membres.push({ prenom: nouveau.prenom, nom: nouveau.nom, naissance: enfant.naissance, generation: s.lignee.generation });
    s.mort = null;
    s.evenementsEnAttente = [];
    s.evenementCourant = null;
    C.appliquerBonusMeta(s);
    C.recalculerClasse(s);
    NF.api.journal(s, '🧬 ' + nouveau.prenom + ' ' + nouveau.nom + NF.t(' reprend le flambeau (génération ') + s.lignee.generation + ').' + (tutelle ? NF.t(' Après ') + Math.round(tutelle / 12) + NF.t(' ans sous tutelle.') : ''), 'titre');
    C.nouveauMois(s, true);
    return { calc: calc, tutelle: tutelle, nouveau: nouveau };
  };
})();
