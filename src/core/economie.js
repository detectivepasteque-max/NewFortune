/* =====================================================================
 * ÉCONOMIE MENSUELLE : impôts, logement, train de vie, aides, dettes,
 * nourriture, usure des jauges, santé, vieillesse, conjoncture
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;
  var cfg = function () { return NF.data.config; };

  /* ----- Impôt sur le revenu (barème mensuel progressif) ----- */
  C.impotRevenu = function (revenu) {
    var t = NF.data.impots.revenu, impot = 0, bas = 0;
    for (var i = 0; i < t.length; i++) {
      var haut = t[i].jusqua;
      if (revenu > bas) impot += (Math.min(revenu, haut) - bas) * t[i].taux;
      bas = haut;
      if (revenu <= haut) break;
    }
    return Math.round(impot);
  };

  C.moisImpots = function (s, bilan) {
    var imposable = 0;
    bilan.revenus.forEach(function (r) { if (r.imposable) imposable += r.montant; });
    var impot = C.impotRevenu(imposable);
    if (impot > 0) bilan.depenses.push({ nom: NF.t('Impôt sur le revenu'), montant: impot, obligatoire: true });
  };

  /* ----- Logement ----- */
  C.moisLogement = function (s, bilan) {
    var l = C.logementActuel(s);
    var j = s.joueur;
    j.logementMois++;
    var cout = (l.loyer || 0) + (l.charges || 0);
    if (l.proprietaire) {
      var tf = Math.round(l.prix * NF.data.impots.taxeFonciere / 12);
      bilan.depenses.push({ nom: NF.t('Taxe foncière'), montant: tf, obligatoire: true });
    }
    if (cout > 0) {
      if (l.loyer > 0 && j.argent + C.totalRevenus(bilan) < cout) {
        j.loyersImpayes++;
        bilan.textes.push(NF.t('Loyer impayé (') + j.loyersImpayes + NF.t(' mois).'));
        bilan.depenses.push({ nom: NF.t('Loyer et charges (impayé)'), montant: 0 });
        if (j.loyersImpayes >= 2) C.forcerEvenement(s, 'expulsion_loyer');
      } else {
        bilan.depenses.push({ nom: l.loyer ? NF.t('Loyer et charges') : NF.t('Charges du logement'), montant: cout, obligatoire: true });
        j.loyersImpayes = 0;
      }
    }
    /* logement lié à un emploi (caserne) : on part quand on ne sert plus */
    if (l.acces && l.acces.secteurEmploi) {
      var mt = C.metierActuel(s);
      if (!mt || mt.secteur !== l.acces.secteurEmploi) {
        bilan.textes.push(NF.t('Vous ne servez plus : il faut rendre votre logement de fonction (') + NF.util.minuscule(l.nom) + ').');
        C.forcerLogement(s, 'rue');
        return;
      }
    }
    if (l.dureeMax && j.logementMois >= l.dureeMax) {
      bilan.textes.push(NF.t('Votre hébergement (') + NF.util.minuscule(l.nom) + NF.t(') prend fin : il faut partir.'));
      if (l.id === 'foyer') { NF.api.drapeau(s, 'foyer_interdit', true); NF.api.programmer(s, 'foyer_reouvert', 4); }
      C.forcerLogement(s, 'rue');
    }
    /* bonus du logement */
    if (l.bonus) for (var k in l.bonus) NF.api.modifierJauge(s, k, l.bonus[k]);
  };

  C.totalRevenus = function (bilan) { var t = 0; bilan.revenus.forEach(function (r) { t += r.montant; }); return t; };

  /* ----- Train de vie ----- */
  C.moisTrainDeVie = function (s, bilan) {
    var cl = C.classeActuelle(s);
    var base = cl.trainDeVie || 0;
    var fam = 1 + (s.joueur.famille.partenaire ? 0.4 : 0) + 0.35 * s.joueur.famille.enfants.length;
    var montant = Math.round(base * fam * C.modifTrait(s, 'depenses'));
    montant += NF.api.passifSomme(s, 'depensesFixes');
    if (montant > 0) bilan.depenses.push({ nom: NF.t('Train de vie (') + NF.util.minuscule(cl.nom) + ')', montant: montant });
  };

  /* ----- Nourriture automatique (quand on a de l'argent) ----- */
  C.moisNourriture = function (s, bilan) {
    var l = C.logementActuel(s);
    var j = s.joueur;
    var manque = Math.max(0, 80 - j.jauges.nourriture);
    if (manque <= 0) return;
    var coutParPoint = l.cuisine ? 1.6 : 2.4;
    coutParPoint *= NF.api.passif(s, 'nourritureCout');
    coutParPoint *= 1 - 0.05 * C.niveauCompetence(s, 'cuisine');
    coutParPoint *= C.modifTrait(s, 'depenses');
    var cout = Math.round(manque * coutParPoint);
    var dispo = j.argent + C.totalRevenus(bilan) - C.totalDepensesObligatoires(bilan);
    if (dispo <= 0) return;
    var paye = Math.min(cout, Math.max(0, dispo));
    if (paye < 5) return;
    var points = Math.round(paye / coutParPoint);
    NF.api.modifierJauge(s, 'nourriture', points);
    bilan.depenses.push({ nom: NF.t('Nourriture'), montant: paye });
  };
  C.totalDepensesObligatoires = function (bilan) { var t = 0; bilan.depenses.forEach(function (d) { if (d.obligatoire) t += d.montant; }); return t; };

  /* ----- Aides sociales ----- */
  C.aideEligible = function (s, id) {
    var a = NF.data.impots.aides[id];
    if (!a) return { ok: false, raisons: ['inconnue'] };
    var c = a.conditions, r = [];
    var revenu = (s.joueur.emploi && !C.metierActuel(s).nonDeclare ? s.joueur.emploi.salaire : 0) + (s.joueur.entreprise ? (s.joueur.entreprise.remuneration || 0) : 0);
    if (c.ageMin != null && C.ageAnnees(s) < c.ageMin) r.push(NF.t('à partir de ') + c.ageMin + NF.t(' ans'));
    if (c.revenuMax != null && revenu > c.revenuMax) r.push(NF.t('revenus trop élevés'));
    if (c.revenuMin != null && revenu < c.revenuMin) r.push(NF.t('revenus déclarés insuffisants'));
    if (c.domiciliation && !s.joueur.domiciliation) r.push(NF.t('domiciliation nécessaire'));
    if (c.loyerMin != null && C.logementActuel(s).loyer < c.loyerMin) r.push(NF.t('il faut payer un loyer'));
    if (c.emploi && !(s.joueur.emploi && !C.metierActuel(s).nonDeclare)) r.push(NF.t('il faut un emploi déclaré'));
    if (c.enfantsMin != null && s.joueur.famille.enfants.length < c.enfantsMin) r.push(NF.t('au moins ') + c.enfantsMin + NF.t(' enfants'));
    if (!s.joueur.domiciliation) r.push(NF.t('domiciliation nécessaire'));
    return { ok: r.length === 0, raisons: r };
  };

  C.moisAides = function (s, bilan) {
    var A = NF.data.impots.aides;
    for (var id in s.joueur.aides) {
      if (!s.joueur.aides[id]) continue;
      if (!C.aideEligible(s, id).ok) {
        s.joueur.aides[id] = false;
        bilan.textes.push(NF.t('Aide suspendue : vous ne remplissez plus les conditions (') + id.toUpperCase() + ').');
        continue;
      }
      bilan.revenus.push({ nom: NF.t('Aide : ') + id.toUpperCase(), montant: A[id].montant, imposable: false });
    }
  };

  /* ----- Dettes ----- */
  C.moisDettes = function (s, bilan) {
    var j = s.joueur;
    if (j.dette <= 0) return;
    var interet = Math.round(j.dette * cfg().interetDette);
    j.dette += interet;
    bilan.textes.push(NF.t('Intérêts sur votre dette : ') + U.euros(interet) + NF.t(' (total ') + U.euros(j.dette) + ').');
    /* remboursement automatique partiel */
    var dispo = j.argent + C.totalRevenus(bilan) - C.totalDepensesTotal(bilan);
    if (dispo > 150) {
      var remb = Math.min(j.dette, Math.round((dispo - 150) * 0.3));
      if (remb > 0) { j.dette -= remb; bilan.depenses.push({ nom: NF.t('Remboursement de dette'), montant: remb }); }
    }
    if (j.dette > 3000 && NF.rng.chance(0.15)) C.forcerEvenement(s, 'huissier');
  };
  C.totalDepensesTotal = function (bilan) { var t = 0; bilan.depenses.forEach(function (d) { t += d.montant; }); return t; };

  /* ----- Règlement du bilan : encaisser revenus, payer dépenses ----- */
  C.reglerBilan = function (s, bilan) {
    var rev = C.totalRevenus(bilan);
    NF.api.ajouterArgent(s, rev);
    var paye = 0;
    bilan.depenses.forEach(function (d) {
      if (d.montant <= 0) return;
      var p = NF.api.retirerArgent(s, d.montant, !!d.obligatoire);
      paye += p;
      if (p < d.montant && !d.obligatoire) { d.nom += ' (partiel)'; d.montant = p; }
    });
    bilan.totalRevenus = rev;
    bilan.totalDepenses = paye;
    bilan.solde = rev - paye;
  };

  /* ----- Usure des jauges, saison, santé ----- */
  C.moisJauges = function (s, bilan) {
    var j = s.joueur, cf = cfg(), l = C.logementActuel(s), saison = C.saison(s);
    var us = l.usure || {};
    var deltaN = -cf.usure.nourriture * (us.nourriture != null ? us.nourriture : 1) * NF.api.passif(s, 'usureNourriture');
    var deltaE = -cf.usure.energie * (us.energie != null ? us.energie : 1) * NF.api.passif(s, 'usureEnergie') * C.modifTrait(s, 'usureEnergie');
    var deltaH = -cf.usure.hygiene * (us.hygiene != null ? us.hygiene : 1) * NF.api.passif(s, 'usureHygiene');
    var deltaM = -cf.usure.moral * (us.moral != null ? us.moral : 1) * NF.api.passif(s, 'usureMoral') * C.modifTrait(s, 'usureMoral')
      * (1 - 0.06 * C.niveauCompetence(s, 'meditation'));   // méditation : le moral s'use moins vite
    /* saison en extérieur */
    var sa = cf.saisons[saison];
    var deltaS = 0;
    if (l.expose) {
      var froid = NF.api.passif(s, 'froid');
      deltaS -= sa.santeRue * froid;
      deltaM -= sa.moralRue;
      deltaE -= sa.energieRue * froid;
      if (saison === 'hiver' && sa.santeRue * froid >= 4) bilan.textes.push(NF.t('❄️ Le froid vous use (') + (froid < 1 ? NF.t('votre équipement aide') : NF.t('rien pour vous protéger')) + ').');
    } else if (saison === 'ete') {
      deltaM += 2;
    }
    /* un vrai lit : on récupère un peu chaque mois */
    if (!l.expose) deltaE += cf.recuperationEnergieLoge || 0;
    /* récupération naturelle du moral quand le corps va bien */
    if (j.jauges.nourriture >= 40 && j.jauges.energie >= 40) deltaM += cf.recuperationMoral || 0;
    /* famille : le moral tient mieux avec une bonne relation */
    if (j.famille.partenaire && j.famille.partenaire.relation >= 60) deltaM += 3;
    if (j.famille.partenaire && j.famille.partenaire.relation < 30) deltaM -= 3;
    NF.api.modifierJauge(s, 'nourriture', deltaN);
    NF.api.modifierJauge(s, 'energie', deltaE);
    NF.api.modifierJauge(s, 'hygiene', deltaH);
    NF.api.modifierJauge(s, 'moral', deltaM);
    NF.api.modifierJauge(s, 'sante', deltaS);
  };

  C.moisSante = function (s, bilan) {
    var j = s.joueur, cf = cfg(), se = cf.seuils, g = j.jauges;
    var perte = 0, textes = [];
    if (g.nourriture < se.critique) { perte += se.santeFaim; textes.push(NF.t('la faim')); NF.api.modifierJauge(s, 'moral', -se.moralSiFaim); }
    else if (g.nourriture < se.bas) perte += se.santeFaim * 0.3;
    if (g.energie < se.critique) { perte += se.santeEnergie; textes.push(NF.t('l\'épuisement')); }
    if (g.hygiene < se.critique) { perte += se.santeHygiene; textes.push(NF.t('le manque d\'hygiène')); }
    if (g.moral < se.critique) { perte += se.santeMoralBas; textes.push(NF.t('le désespoir')); }
    /* maladie en cours */
    if (j.maladie) {
      perte += j.maladie.santeParMois * NF.api.passif(s, 'maladie');
      j.maladie.moisRestants--;
      textes.push(NF.util.minuscule(j.maladie.nom));
      if (j.maladie.moisRestants <= 0) { bilan.textes.push(NF.t('Vous êtes guéri : ') + j.maladie.nom + '.'); j.maladie = null; }
    } else {
      /* tomber malade */
      var pm = cf.saisons[C.saison(s)].maladie * C.modifTrait(s, 'maladie') * NF.api.passif(s, 'maladie');
      if (!C.logementActuel(s).expose) pm *= 0.45;
      if (g.hygiene < se.bas) pm *= 1.6;
      if (g.sante < se.bas) pm *= 1.3;
      if (C.ageAnnees(s) > 60) pm *= 1.4;
      if (NF.rng.chance(pm)) C.forcerEvenement(s, 'tomber_malade');
    }
    /* vieillesse */
    var age = C.ageAnnees(s), v = cf.vieillesse;
    if (age >= v.debut) perte += v.perteSanteParAn / 12 * (1 + (age - v.debut) / 15);
    /* récupération naturelle si tout va bien */
    if (perte === 0 && g.nourriture >= 60 && g.energie >= 50 && g.hygiene >= 50 && age < v.debut) NF.api.modifierJauge(s, 'sante', 4);
    else if (perte === 0 && g.nourriture >= 60 && g.energie >= 50) NF.api.modifierJauge(s, 'sante', 1.5);
    if (perte > 0) {
      NF.api.modifierJauge(s, 'sante', -perte);
      if (textes.length) bilan.textes.push(NF.t('❤️ Votre santé souffre (') + textes.join(', ') + ') : -' + Math.round(perte) + '.');
    }
  };

  /* ----- Mort ----- */
  C.verifierMort = function (s) {
    if (s.mort) return true;
    var j = s.joueur;
    if (j.jauges.sante <= 0) {
      var cause = NF.t('d\'épuisement');
      if (j.maladie) cause = NF.t('de maladie (') + NF.util.minuscule(j.maladie.nom) + ')';
      else if (j.jauges.nourriture < 20) cause = NF.t('de faim');
      else if (C.logementActuel(s).expose && C.saison(s) === 'hiver') cause = NF.t('de froid');
      NF.api.tuer(s, cause);
      return true;
    }
    return false;
  };

  C.moisVieillesse = function (s) {
    var v = cfg().vieillesse, age = C.ageAnnees(s);
    if (age < v.ageRisque) return;
    var p = v.chanceParMois + (age - v.ageRisque) * v.chanceParAnSupp;
    if (s.joueur.jauges.sante < 40) p *= 2;
    if (NF.rng.chance(p)) NF.api.tuer(s, NF.t('de vieillesse, à ') + age + NF.t(' ans'));
  };

  /* ----- Conjoncture économique (marche aléatoire) ----- */
  C.moisConjoncture = function (s) {
    var c = cfg().conjoncture;
    s.conjoncture = U.clamp(s.conjoncture + NF.rng.entre(-c.variationMensuelle, c.variationMensuelle) + (1 - s.conjoncture) * 0.05, c.min, c.max);
  };

  C.texteConjoncture = function (s) {
    var c = s.conjoncture;
    if (c < 0.75) return { nom: NF.t('Crise'), icone: '📉' };
    if (c < 0.92) return { nom: NF.t('Ralentissement'), icone: '🌧️' };
    if (c <= 1.08) return { nom: NF.t('Stable'), icone: '⛅' };
    if (c <= 1.25) return { nom: NF.t('Croissance'), icone: '🌤️' };
    return { nom: NF.t('Boom'), icone: '☀️' };
  };

  /* ----- Succès ----- */
  C.verifierSucces = function (s, bilan) {
    NF.data.succes.forEach(function (su) {
      if (s.lignee.succes.indexOf(su.id) >= 0) return;
      var ok = false;
      try { ok = su.condition(s); } catch (e) { ok = false; }
      if (ok) {
        s.lignee.succes.push(su.id);
        var t = NF.t('🏆 Accomplissement : ') + su.icone + ' ' + su.nom + ' — ' + su.desc;
        if (bilan) bilan.textes.push(t);
        NF.api.journal(s, t, 'bon');
      }
    });
  };
})();
