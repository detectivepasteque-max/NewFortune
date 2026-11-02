/* =====================================================================
 * ENTREPRISE
 * ---------------------------------------------------------------------
 * s.joueur.entreprise = {
 *   secteur, statut ('micro'|'societe'), nom, mois, capital (trésorerie),
 *   employes, investissements, remuneration (du dirigeant),
 *   pret: { reste, mensualite } | null, malusConcurrence, dernierCA,
 *   dernierBenefice, aideRestante
 * }
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;
  var E = function () { return NF.data.entreprise; };

  C.secteurEntreprise = function (id) { return U.byId(E().secteurs, id); };

  /** Secteurs accessibles : métier exercé ≥ 6 mois dans le secteur ou compétence ≥ 3 */
  C.secteursPossibles = function (s) {
    return E().secteurs.filter(function (sec) {
      var exp = s.joueur.experience[sec.id] || 0;
      if (sec.id === 'securite') exp += s.joueur.experience.armee || 0;   // l'armée prépare à la sécurité privée
      return exp >= 6 || C.niveauCompetence(s, sec.competence) >= 3;
    });
  };

  C.peutCreerEntreprise = function (s, secteurId, statut) {
    var r = [];
    if (s.joueur.entreprise) r.push(NF.t('vous avez déjà une entreprise'));
    if (C.ageAnnees(s) < 18) r.push(NF.t('il faut 18 ans'));
    var sec = C.secteurEntreprise(secteurId);
    if (!sec) r.push(NF.t('secteur inconnu'));
    else {
      if (!C.secteursPossibles(s).some(function (x) { return x.id === sec.id; })) r.push(NF.t('il faut de l\'expérience ou une compétence (niveau 3) dans ce secteur'));
    }
    if (!s.joueur.domiciliation) r.push(NF.t('domiciliation nécessaire'));
    var st = E().statuts[statut];
    if (!st) r.push(NF.t('statut inconnu'));
    return { ok: r.length === 0, raisons: r, capitalMin: sec ? sec.capitalMin : 0, fraisCreation: st ? st.fraisCreation : 0 };
  };

  /** Crée l'entreprise. financement : { epargne, microcredit, pret } montants */
  C.creerEntreprise = function (s, secteurId, statut, financement) {
    var v = C.peutCreerEntreprise(s, secteurId, statut);
    if (!v.ok) return { ok: false, texte: NF.t('Impossible : ') + v.raisons.join(', ') + '.' };
    var sec = C.secteurEntreprise(secteurId), st = E().statuts[statut];
    financement = financement || {};
    var epargne = Math.min(s.joueur.argent, Math.max(0, financement.epargne || 0));
    var micro = Math.max(0, financement.microcredit || 0), pret = Math.max(0, financement.pret || 0);
    var raisons = [];
    if (micro > 0) {
      var mc = E().microcredit;
      if (micro > mc.max) raisons.push(NF.t('microcrédit limité à ') + U.euros(mc.max));
      if (s.joueur.reputation < mc.conditions.reputation) raisons.push(NF.t('réputation ') + mc.conditions.reputation + NF.t(' nécessaire pour un microcrédit'));
    }
    if (pret > 0) {
      var pb = E().pretBancaire;
      if (pret > pb.max) raisons.push(NF.t('prêt limité à ') + U.euros(pb.max));
      if (!C.logementActuel(s).adresse) raisons.push(NF.t('la banque exige une adresse'));
      if (C.revenuMensuel(s) < pb.conditions.revenuMensuel) raisons.push(NF.t('la banque exige des revenus stables (') + U.euros(pb.conditions.revenuMensuel) + NF.t('/mois)'));
    }
    var capital = epargne + micro + pret - st.fraisCreation;
    if (capital < sec.capitalMin) raisons.push(NF.t('capital insuffisant (') + U.euros(sec.capitalMin) + NF.t(' minimum après frais)'));
    if (raisons.length) return { ok: false, texte: NF.t('Impossible : ') + raisons.join(', ') + '.' };
    NF.api.retirerArgent(s, epargne, false);
    var mensualites = [];
    if (micro > 0) mensualites.push({ nom: NF.t('Microcrédit'), reste: micro, mensualite: Math.round(micro * (E().microcredit.taux + 1 / E().microcredit.duree)) });
    if (pret > 0) mensualites.push({ nom: NF.t('Prêt bancaire'), reste: pret, mensualite: Math.round(pret * (E().pretBancaire.taux + 1 / E().pretBancaire.duree)) });
    s.joueur.entreprise = {
      secteur: sec.id, statut: statut, nom: sec.nom + ' ' + s.joueur.nom, mois: 0,
      capital: capital, employes: 0, investissements: 0, remuneration: statut === 'micro' ? 0 : 1200,
      prets: mensualites, malusConcurrence: 0, dernierCA: 0, dernierBenefice: 0,
      aideRestante: E().aideCreation.duree, historique: [],
    };
    NF.api.drapeau(s, 'a_cree_entreprise', true);
    NF.api.journal(s, sec.icone + NF.t(' Vous créez votre entreprise : ') + s.joueur.entreprise.nom + ' (' + st.nom + ').', 'bon');
    s.paMax = C.calculerPaMax(s); s.pa = Math.min(s.pa, s.paMax);
    return { ok: true, texte: NF.t('Votre entreprise est créée avec ') + U.euros(capital) + NF.t(' de trésorerie.') };
  };

  C.valeurEntreprise = function (s) {
    var e = s.joueur.entreprise;
    if (!e) return 0;
    var benef = Math.max(0, e.dernierBenefice || 0);
    var dettes = 0; (e.prets || []).forEach(function (p) { dettes += p.reste; });
    return Math.max(0, Math.round(e.capital + benef * E().valorisationMois + e.investissements * 0.5 - dettes));
  };

  /* ----- Décisions ----- */
  C.entrepriseEmbaucher = function (s) {
    var e = s.joueur.entreprise, st = E().statuts[e.statut];
    if (e.employes >= st.employesMax) return NF.t('Ce statut ne permet pas d\'embaucher davantage (') + st.employesMax + NF.t(' max).');
    if (e.capital < E().employe.salaireBrut * 2) return NF.t('Trésorerie insuffisante pour embaucher (il faut deux mois de salaire).');
    e.employes++;
    NF.api.journal(s, NF.t('👥 Votre entreprise embauche (') + e.employes + (e.employes > 1 ? NF.t(' salariés') : NF.t(' salarié')) + ').');
    return NF.t('Nouvel employé embauché. Coût chargé : ') + U.euros(E().employe.salaireBrut * (1 + E().employe.chargesPatronales)) + NF.t('/mois.');
  };
  C.entrepriseLicencier = function (s) {
    var e = s.joueur.entreprise;
    if (e.employes <= 0) return NF.t('Aucun employé.');
    e.employes--;
    var indemnite = Math.round(E().employe.salaireBrut * 1.5);
    e.capital -= indemnite;
    NF.api.ajouterReputation(s, -2);
    return NF.t('Licenciement : indemnités de ') + U.euros(indemnite) + '.';
  };
  C.entrepriseInvestir = function (s) {
    var e = s.joueur.entreprise, inv = E().investissement;
    if (e.investissements >= inv.max) return NF.t('Plus d\'investissement utile.');
    if (e.capital < inv.tranche) return NF.t('Trésorerie insuffisante (') + U.euros(inv.tranche) + ').';
    e.capital -= inv.tranche;
    e.investissements++;
    return NF.t('Investissement de ') + U.euros(inv.tranche) + NF.t(' : chiffre d\'affaires durablement +') + Math.round(inv.bonusCA * 100) + ' %.';
  };
  C.entrepriseEmprunter = function (s, montant) {
    var e = s.joueur.entreprise, pb = E().pretBancaire;
    montant = Math.max(0, Math.round(montant || 0));
    if (montant <= 0) return NF.t('Montant invalide.');
    var total = 0; e.prets.forEach(function (p) { total += p.reste; });
    if (total + montant > pb.max) return NF.t('La banque refuse : encours maximal ') + U.euros(pb.max) + '.';
    if (e.statut !== 'societe' && montant > E().microcredit.max) return NF.t('Une micro-entreprise ne peut emprunter que via microcrédit (') + U.euros(E().microcredit.max) + NF.t(' max).');
    if (e.dernierBenefice < 0 && e.mois > 3) return NF.t('La banque refuse : vos derniers résultats sont négatifs.');
    e.prets.push({ nom: NF.t('Emprunt'), reste: montant, mensualite: Math.round(montant * (pb.taux + 1 / pb.duree)) });
    e.capital += montant;
    return NF.t('Emprunt de ') + U.euros(montant) + NF.t(' accordé.');
  };
  C.entrepriseRemuneration = function (s, montant) {
    var e = s.joueur.entreprise;
    montant = Math.max(0, Math.round(montant || 0));
    e.remuneration = montant;
    return NF.t('Rémunération du dirigeant fixée à ') + U.euros(montant) + NF.t('/mois.');
  };
  C.entrepriseChangerStatut = function (s) {
    var e = s.joueur.entreprise;
    if (e.statut === 'micro') {
      var st = E().statuts.societe;
      if (e.capital < st.fraisCreation) return NF.t('Il faut ') + U.euros(st.fraisCreation) + NF.t(' de trésorerie pour créer la société.');
      e.capital -= st.fraisCreation; e.statut = 'societe'; if (!e.remuneration) e.remuneration = 1200;
      return NF.t('Votre activité devient une société.');
    }
    if (e.employes > 0) return NF.t('Licenciez vos employés avant de repasser en micro-entreprise.');
    e.statut = 'micro'; e.remuneration = 0;
    return NF.t('Retour en micro-entreprise.');
  };
  C.entrepriseFermer = function (s) {
    var e = s.joueur.entreprise;
    if (!e) return NF.t('Pas d\'entreprise.');
    var dettes = 0; e.prets.forEach(function (p) { dettes += p.reste; });
    var indemnites = e.employes * Math.round(E().employe.salaireBrut * 1.5);
    var solde = e.capital - dettes - indemnites;
    var texte;
    if (solde >= 0) { NF.api.ajouterArgent(s, solde); texte = NF.t('Entreprise fermée proprement. Vous récupérez ') + U.euros(solde) + '.'; }
    else { NF.api.ajouterDette(s, -solde); texte = NF.t('Faillite : il reste ') + U.euros(-solde) + NF.t(' de dettes personnelles.'); NF.api.modifierJauge(s, 'moral', -15); NF.api.ajouterReputation(s, -8); }
    NF.api.journal(s, NF.t('🏚️ Fermeture de ') + e.nom + '. ' + texte, solde >= 0 ? 'info' : 'mauvais');
    s.joueur.entreprise = null;
    s.paMax = C.calculerPaMax(s);
    C.recalculerClasse(s);
    return texte;
  };

  /* ----- Mois d'entreprise ----- */
  C.moisEntreprise = function (s, bilan) {
    var e = s.joueur.entreprise;
    if (!e) return;
    var sec = C.secteurEntreprise(e.secteur), st = E().statuts[e.statut], cfgE = E();
    e.mois++;
    /* chiffre d'affaires */
    var comp = C.niveauCompetence(s, sec.competence);
    var ca = sec.caBase * (0.6 + 0.12 * comp) * (0.8 + 0.4 * s.joueur.reputation / 100);
    ca *= sec.saisonnalite[C.saison(s)] || 1;
    ca *= s.conjoncture;
    ca *= 1 + e.employes * cfgE.employe.caParEmploye;
    ca *= 1 + e.investissements * cfgE.investissement.bonusCA;
    ca *= 1 - e.malusConcurrence;
    ca *= C.efficacite(s);
    ca *= NF.rng.entre(0.75, 1.25);
    if (e.statut === 'micro' && ca > st.plafondCA) { ca = st.plafondCA; bilan.textes.push(NF.t('🧾 Plafond de la micro-entreprise atteint : passez en société pour grandir.')); }
    ca = Math.round(ca);
    var lignes = [{ nom: NF.t('Chiffre d\'affaires'), montant: ca }];
    var charges = 0;
    /* risques */
    var risques = cfgE.risques;
    if (NF.rng.chance(risques.impaye)) { var perte = Math.round(ca * NF.rng.entre(0.2, 0.6)); ca -= perte; lignes.push({ nom: NF.t('Impayé client'), montant: -perte }); }
    if (NF.rng.chance(risques.concurrence)) { e.malusConcurrence = Math.min(0.5, e.malusConcurrence + 0.15); bilan.textes.push(NF.t('🏪 Un concurrent s\'installe : chiffre d\'affaires durablement réduit.')); }
    if (NF.rng.chance(risques.controle)) C.forcerEvenement(s, 'controle_entreprise');
    /* charges */
    var fixes = Math.round(sec.chargesFixes * (e.aideRestante > 0 ? 1 - cfgE.aideCreation.reduction * 0.5 : 1));
    charges += fixes; lignes.push({ nom: NF.t('Charges fixes'), montant: -fixes });
    var tva = Math.round(ca * cfgE.tva); charges += tva; lignes.push({ nom: NF.t('TVA reversée'), montant: -tva });
    if (e.employes > 0) { var sal = Math.round(e.employes * cfgE.employe.salaireBrut * (1 + cfgE.employe.chargesPatronales)); charges += sal; lignes.push({ nom: NF.t('Salaires chargés (') + e.employes + ')', montant: -sal }); }
    if (st.comptable) { charges += st.comptable; lignes.push({ nom: NF.t('Comptable'), montant: -st.comptable }); }
    var reduc = e.aideRestante > 0 ? 1 - cfgE.aideCreation.reduction : 1;
    if (e.statut === 'micro') {
      var cot = Math.round(ca * st.cotisations * reduc); charges += cot; lignes.push({ nom: NF.t('Cotisations (') + Math.round(st.cotisations * 100) + ' %)', montant: -cot });
    }
    /* prêts */
    e.prets = e.prets.filter(function (p) {
      var m = Math.min(p.reste, p.mensualite); p.reste -= m; charges += m; lignes.push({ nom: p.nom, montant: -m }); return p.reste > 0;
    });
    var resultat = ca - charges;
    /* rémunération du dirigeant */
    var remu = 0;
    if (e.statut === 'micro') {
      remu = Math.max(0, resultat);
      e.capital += 0;
      if (remu > 0) bilan.revenus.push({ nom: NF.t('Revenu de la micro-entreprise'), montant: remu, imposable: true });
      resultat = 0;
    } else {
      var chargesDir = Math.round(e.remuneration * st.chargesDirigeant * reduc);
      var coutRemu = e.remuneration + chargesDir;
      if (e.capital + resultat >= coutRemu) {
        remu = e.remuneration; resultat -= coutRemu; lignes.push({ nom: NF.t('Rémunération dirigeant + charges'), montant: -coutRemu });
        if (remu > 0) bilan.revenus.push({ nom: NF.t('Salaire de dirigeant'), montant: remu, imposable: true });
      } else bilan.textes.push(NF.t('🏢 Trésorerie insuffisante : vous ne pouvez pas vous verser de salaire ce mois.'));
      /* impôt sur les sociétés */
      if (resultat > 0) {
        var is = 0, bas = 0;
        st.impotSocietes.forEach(function (t) { if (resultat > bas) is += (Math.min(resultat, t.jusqua) - bas) * t.taux; bas = t.jusqua; });
        is = Math.round(is); resultat -= is; lignes.push({ nom: NF.t('Impôt sur les sociétés'), montant: -is });
      }
      e.capital += resultat;
      /* dividendes si trésorerie confortable */
      if (e.capital > 15000) { var div = Math.round((e.capital - 15000) * 0.5); e.capital -= div; bilan.revenus.push({ nom: NF.t('Dividendes (après 30 % de flat tax)'), montant: Math.round(div * 0.7), imposable: false }); lignes.push({ nom: NF.t('Dividendes versés'), montant: -div }); }
    }
    if (e.statut === 'micro') e.capital += resultat; // = 0
    e.dernierCA = ca; e.dernierBenefice = e.statut === 'micro' ? remu : resultat;
    if (e.aideRestante > 0) e.aideRestante--;
    /* épuisement du dirigeant */
    NF.api.modifierJauge(s, 'energie', -8 - 2 * e.employes);
    if (NF.rng.chance(cfgE.risques.epuisement)) NF.api.modifierJauge(s, 'moral', -6);
    bilan.entreprise = { lignes: lignes, resultat: e.statut === 'micro' ? remu : resultat, capital: e.capital };
    e.historique.push(e.dernierBenefice); if (e.historique.length > 12) e.historique.shift();
    /* faillite */
    if (e.capital < -3000) {
      bilan.textes.push(NF.t('💥 Votre entreprise est en cessation de paiements.'));
      C.forcerEvenement(s, 'faillite');
    }
  };
})();
