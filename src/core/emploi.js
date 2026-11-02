/* =====================================================================
 * EMPLOI, FORMATIONS, COMPÉTENCES
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /** Vérifie les prérequis d'un métier. Retourne { ok, raisons }.
   *  `interne` = promotion interne : le diplôme est remplacé par l'expérience
   *  (config.validationAcquisMois), téléphone et réputation ne comptent pas. */
  C.prerequisMetier = function (s, m, interne) {
    var p = m.prerequis || {};
    var acquis = interne && (s.joueur.experience[m.secteur] || 0) >= NF.data.config.validationAcquisMois;
    var cond = {
      competences: p.competences, hygiene: interne && p.hygiene ? p.hygiene - 10 : p.hygiene, domiciliation: p.domiciliation || undefined,
      adresse: p.adresse || undefined, diplome: acquis ? undefined : p.diplome, permis: p.permis || undefined,
      telephone: interne ? undefined : (p.telephone || undefined), objet: p.objet, reputationMin: interne ? undefined : p.reputation,
      experience: p.experience, casier: p.casierVierge ? false : undefined, lieu: p.lieu,
      saison: interne ? undefined : m.saisons, ageMin: p.ageMin, ageMax: p.ageMax, jauges: p.jauges,
    };
    var v = C.verifierConditions(s, cond);
    if (!interne && m.saisons && m.saisons.indexOf(C.saison(s)) < 0) {
      v.raisons = v.raisons.filter(function (x) { return x !== 'saison'; });
      v.raisons.push(NF.t('seulement en ') + m.saisons.map(function (x) { return NF.util.minuscule(U.SAISONS[x]); }).join(NF.t(' et ')));
      v.ok = false;
    }
    if (s.joueur.emploi && s.joueur.emploi.id === m.id) { v.ok = false; v.raisons.push(NF.t('c\'est votre emploi actuel')); }
    return v;
  };

  /** Promotion interne vers un autre métier (voir NF.data.promotions) */
  C.promouvoir = function (s, versId) {
    var vers = U.byId(NF.data.metiers, versId);
    if (!vers || !s.joueur.emploi) return false;
    var ancien = s.joueur.emploi;
    var nouveauSalaire = Math.max(C.salaireMetier(s, vers), Math.round(ancien.salaire * 1.1 / 10) * 10);
    s.joueur.emploi = { id: vers.id, salaire: nouveauSalaire, mois: Math.floor(ancien.mois / 2), secteur: vers.secteur };
    s.stats.promotions = (s.stats.promotions || 0) + 1;
    NF.api.journal(s, vers.icone + NF.t(' Promotion : ') + vers.nom + ' (' + U.euros(nouveauSalaire) + NF.t('/mois).'), 'bon');
    C.recalculerClasse(s);
    return true;
  };

  /** Chance d'être embauché (0.05 à 0.95) */
  C.chanceEmbauche = function (s, m) {
    var base = m.chance != null ? m.chance : ([0, 0.75, 0.55, 0.42, 0.32, 0.22][m.niveau] || 0.2);
    var j = s.joueur;
    var c = base;
    c *= 0.6 + 0.4 * (j.jauges.hygiene / 100);
    c *= 0.7 + 0.6 * (j.reputation / 100);
    c *= NF.api.passif(s, 'emploi');
    c *= C.modifTrait(s, 'social') * 0.5 + 0.5;
    c *= 1 + 0.04 * C.niveauCompetence(s, 'theatre');   // prise de parole : entretiens plus convaincants
    c *= 0.6 + 0.4 * s.conjoncture;
    c *= s.ville.marche[m.secteur] || 1;
    if (m.niveau <= 2 && C.aLieu(s, 'mission') && C.ageAnnees(s) <= 25) c *= 1 + 0.25 * C.qualiteLieu(s, 'mission');
    if (m.niveau <= 2 && C.aLieu(s, 'pole')) c *= 1.1;
    /* compétences au-delà du minimum : bonus */
    var p = m.prerequis || {};
    if (p.competences) for (var k in p.competences) c *= 1 + 0.08 * Math.max(0, C.niveauCompetence(s, k) - p.competences[k]);
    if (j.experience[m.secteur]) c *= 1 + Math.min(0.5, j.experience[m.secteur] / 48);
    if (j.casier && !m.nonDeclare) c *= 0.6;
    c *= C.efficacite(s);
    return U.clamp(c, 0.05, 0.95);
  };

  C.salaireMetier = function (s, m) {
    var mult = s.ville.marche[m.secteur] || 1;
    var sal = NF.rng.entre(m.salaire[0], m.salaire[1]) * (0.85 + 0.15 * mult);
    return Math.round(sal / 10) * 10;
  };

  /** Tente d'obtenir un métier. Retourne { ok, texte } */
  C.postuler = function (s, id) {
    var m = U.byId(NF.data.metiers, id);
    if (!m) return { ok: false, texte: NF.t('Métier inconnu.') };
    var v = C.prerequisMetier(s, m);
    if (!v.ok) return { ok: false, texte: NF.t('Prérequis manquants : ') + v.raisons.join(', ') + '.' };
    var chance = C.chanceEmbauche(s, m);
    s.stats.candidatures = (s.stats.candidatures || 0) + 1;
    if (NF.rng.chance(chance)) {
      C.embaucher(s, m);
      return { ok: true, texte: NF.t('Vous êtes pris ! ') + m.nom + ', ' + U.euros(s.joueur.emploi.salaire) + NF.t(' net par mois.') };
    }
    var excuses = [NF.t('« On vous rappellera. » Personne ne rappelle.'), NF.t('Le poste a été pourvu ce matin.'), NF.t('L\'entretien se passe mal : vous bafouillez, ils regardent vos chaussures.'), NF.t('Pas de réponse.'), NF.t('Un autre candidat avait plus d\'expérience.')];
    NF.api.modifierJauge(s, 'moral', -3);
    return { ok: false, texte: NF.rng.pick(excuses) };
  };

  C.embaucher = function (s, m) {
    if (s.joueur.emploi) C.perdreEmploi(s, NF.t('démission'), true);
    s.joueur.emploi = { id: m.id, salaire: C.salaireMetier(s, m), mois: 0, secteur: m.secteur };
    s.stats.emplois = (s.stats.emplois || 0) + 1;
    if (!m.nonDeclare) NF.api.drapeau(s, 'emploi_declare', true);
    NF.api.journal(s, m.icone + NF.t(' Embauché : ') + m.nom + ' (' + U.euros(s.joueur.emploi.salaire) + NF.t('/mois).'), 'bon');
    /* les militaires sans vrai logement sont logés en caserne */
    var caserne = U.byId(NF.data.logements, 'caserne');
    if (caserne && caserne.acces && caserne.acces.secteurEmploi === m.secteur && C.logementActuel(s).ordre < caserne.ordre && !s.joueur.famille.partenaire && !s.joueur.famille.enfants.length) {
      C.forcerLogement(s, 'caserne');
      s.joueur.domiciliation = true;
      NF.api.journal(s, caserne.icone + NF.t(' Vous êtes logé en caserne.'), 'bon');
    }
    C.recalculerClasse(s);
  };

  C.perdreEmploi = function (s, raison, silencieux) {
    if (!s.joueur.emploi) return;
    var m = C.metierActuel(s);
    s.joueur.emploi = null;
    if (!silencieux) NF.api.journal(s, NF.t('💼 Vous perdez votre emploi de ') + (m ? NF.util.minuscule(m.nom) : '?') + ' (' + raison + ').', 'mauvais');
    C.recalculerClasse(s);
  };

  /** Traitement mensuel de l'emploi : salaire, expérience, usure, risques.
   *  Remplit `bilan` et peut ajouter des événements forcés. */
  C.moisEmploi = function (s, bilan) {
    var m = C.metierActuel(s);
    if (!m) return;
    var e = s.joueur.emploi;
    var cfg = NF.data.config;
    e.mois++;
    /* métier saisonnier terminé */
    if (m.saisons && m.saisons.indexOf(C.saison(s)) < 0) {
      bilan.textes.push(NF.t('La saison est finie : votre travail de ') + NF.util.minuscule(m.nom) + NF.t(' s\'arrête.'));
      C.perdreEmploi(s, NF.t('fin de saison'), true);
      return;
    }
    /* salaire, modulé par la conjoncture pour les emplois précaires */
    var salaire = e.salaire;
    if (m.pa === 0) salaire = Math.round(salaire * (0.7 + 0.3 * s.conjoncture) * (0.8 + 0.4 * NF.rng.random()));
    if (!m.nonDeclare) {
      bilan.revenus.push({ nom: NF.t('Salaire (') + m.nom + ')', montant: salaire, imposable: true });
    } else {
      bilan.revenus.push({ nom: NF.t('Travail non déclaré (') + m.nom + ')', montant: salaire, imposable: false });
    }
    /* expérience et xp */
    s.joueur.experience[m.secteur] = (s.joueur.experience[m.secteur] || 0) + 1;
    if (m.xp) for (var k in m.xp) NF.api.ajouterXp(s, k, m.xp[k] * C.efficacite(s));
    /* pénibilité : un vrai lit le soir change tout (×0.7 quand on est logé) */
    var pen = (m.penibilite || 10) * (cfg.penibiliteMultiplicateur || 1) * (C.logementActuel(s).expose ? 1 : 0.7);
    NF.api.modifierJauge(s, 'energie', -pen);
    if (m.penibilite >= 20) NF.api.modifierJauge(s, 'moral', -2);
    /* accident */
    if (m.risque && NF.rng.chance(m.risque * (s.joueur.jauges.energie < cfg.seuils.bas ? 1.6 : 1))) {
      C.forcerEvenement(s, 'accident_travail', { metier: m.nom });
    }
    /* licenciement */
    var stab = m.stabilite != null ? m.stabilite : cfg.chanceLicenciementBase;
    if (m.pa >= 1 && !m.nonDeclare) {
      var risqueLic = stab * (s.conjoncture < 0.85 ? 2.5 : 1) * (s.joueur.jauges.hygiene < 25 ? 2 : 1);
      if (NF.rng.chance(risqueLic)) C.forcerEvenement(s, 'licenciement', { metier: m.nom });
    }
    /* promotion : augmentation, ou passage au métier suivant de la filière (NF.data.promotions) */
    if (e.mois >= (cfg.moisAvantPromotion || 12) && m.pa >= 1 && !m.nonDeclare && NF.rng.chance(cfg.chancePromotion * C.modifTrait(s, 'promotion') * C.efficacite(s))) {
      var versId = (NF.data.promotions || {})[m.id];
      var vers = versId ? U.byId(NF.data.metiers, versId) : null;
      if (vers && C.prerequisMetier(s, vers, true).ok) C.forcerEvenement(s, 'promotion', { metier: m.nom, vers: vers.id, versNom: vers.nom });
      else C.forcerEvenement(s, 'promotion', { metier: m.nom });
    }
    /* contrôle du travail non déclaré */
    if (m.nonDeclare && NF.rng.chance(cfg.chanceControleNonDeclare)) {
      C.forcerEvenement(s, 'controle_travail_non_declare', { metier: m.nom });
    }
  };

  /* ----- Formations ----- */
  C.prerequisFormation = function (s, f) {
    var p = f.prerequis || {};
    var r = [];
    if (s.joueur.diplomes.indexOf(f.id) >= 0) r.push(NF.t('déjà obtenu'));
    if (s.joueur.formation) r.push(NF.t('une formation est déjà en cours'));
    var v = C.verifierConditions(s, { competences: p.competences, diplome: p.diplome, ageMin: p.ageMin, casier: p.casierVierge ? false : undefined, permis: p.permis || undefined, lieu: f.lieu });
    r = r.concat(v.raisons);
    if (f.coutMensuel > 0 && s.joueur.argent < f.coutMensuel) r.push(NF.t('premier mois à payer : ') + U.euros(f.coutMensuel));
    return { ok: r.length === 0, raisons: r };
  };

  C.commencerFormation = function (s, id) {
    var f = U.byId(NF.data.formations, id);
    if (!f) return NF.t('Formation inconnue.');
    var v = C.prerequisFormation(s, f);
    if (!v.ok) return NF.t('Impossible : ') + v.raisons.join(', ') + '.';
    s.joueur.formation = { id: id, moisRestants: f.duree };
    NF.api.journal(s, f.icone + NF.t(' Vous commencez : ') + f.nom + ' (' + f.duree + NF.t(' mois).'), 'bon');
    s.paMax = C.calculerPaMax(s);
    s.pa = Math.min(s.pa, s.paMax);
    return NF.t('Inscription validée : ') + f.nom + NF.t('. Un point d\'action par mois y sera consacré.');
  };

  C.arreterFormation = function (s) {
    if (!s.joueur.formation) return;
    var f = U.byId(NF.data.formations, s.joueur.formation.id);
    NF.api.journal(s, NF.t('Vous abandonnez ') + (f ? f.nom : NF.t('votre formation')) + '.', 'mauvais');
    s.joueur.formation = null;
  };

  C.moisFormation = function (s, bilan) {
    var fo = s.joueur.formation;
    if (!fo) return;
    var f = U.byId(NF.data.formations, fo.id);
    if (!f) { s.joueur.formation = null; return; }
    if (f.coutMensuel > 0) {
      if (s.joueur.argent < f.coutMensuel) {
        bilan.textes.push(NF.t('Frais de formation impayés : le mois ne compte pas (') + f.nom + ').');
        return;
      }
      NF.api.retirerArgent(s, f.coutMensuel, false);
      bilan.depenses.push({ nom: NF.t('Formation (') + f.nom + ')', montant: f.coutMensuel });
    }
    if (f.xp) for (var k in f.xp) NF.api.ajouterXp(s, k, f.xp[k] * C.efficacite(s) * C.modifTrait(s, 'apprentissage'));
    fo.moisRestants--;
    if (fo.moisRestants <= 0) {
      s.joueur.diplomes.push(f.id);
      s.joueur.formation = null;
      NF.api.modifierJauge(s, 'moral', 10);
      bilan.textes.push(NF.t('🎓 Diplôme obtenu : ') + f.nom + ' !');
      NF.api.journal(s, NF.t('🎓 Diplôme obtenu : ') + f.nom + ' !', 'bon');
      if (f.id === 'permis_poids_lourd') s.joueur.permis = true;
    }
  };

  /* ----- Étude d'une compétence (action) ----- */
  C.etudier = function (s, id) {
    var c = U.byId(NF.data.competences, id);
    if (!c) return NF.t('Compétence inconnue.');
    if (C.niveauCompetence(s, id) >= NF.data.config.niveauMax) return NF.t('Impossible : vous maîtrisez déjà parfaitement cette compétence.');
    var cout = c.cout || 0;
    if (cout > 0 && s.joueur.argent < cout) return NF.t('Il faut ') + U.euros(cout) + NF.t(' pour cette séance.');
    if (cout > 0) NF.api.retirerArgent(s, cout, false);
    var xp = NF.data.config.xpEtude * C.efficacite(s) * C.modifTrait(s, 'apprentissage') * NF.api.passif(s, 'apprentissage');
    if (c.lieu && C.aLieu(s, c.lieu)) xp *= 0.8 + 0.5 * C.qualiteLieu(s, c.lieu);
    else xp *= 0.7;
    xp *= 1 + 0.04 * C.niveauCompetence(s, 'culture');   // culture générale : on apprend tout plus vite
    xp *= NF.rng.entre(0.8, 1.2);
    var gain = NF.api.ajouterXp(s, id, Math.round(xp));
    NF.api.modifierJauge(s, 'energie', -5);
    NF.api.modifierJauge(s, 'moral', 2);
    var lieu = c.lieu && C.aLieu(s, c.lieu) ? U.byId(NF.data.ville.lieux, c.lieu).nom : NF.t('un coin tranquille');
    return NF.t('Vous passez des heures à apprendre (') + lieu + '). +' + Math.round(gain) + NF.t(' xp en ') + NF.util.minuscule(c.nom) + '.';
  };
})();
