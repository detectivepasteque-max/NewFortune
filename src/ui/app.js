/* =====================================================================
 * UI – CONTRÔLEUR : relie les clics au moteur et redessine l'écran
 * ---------------------------------------------------------------------
 * Tous les boutons portent data-act="nom" (et data-arg="valeur").
 * Un seul écouteur de clics (délégation) appelle App.executer(act, arg).
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var C = NF.core;

  var App = {
    s: null,
    vue: { ecran: 'titre', onglet: 'actions', categorie: 'survie', dernierResultat: null, filtreEmploi: 'accessibles', modale: null, graine: '' },
    confirmation: null,
  };
  UI.app = App;

  /* ----- Rendu ----- */
  App.rendre = function () {
    var app = UI.$('#app'), modale = UI.$('#modale');
    if (App.vue.ecran === 'titre' || !App.s) {
      app.innerHTML = UI.rendreTitre(App.vue);
    } else {
      var scroll = window.scrollY;
      app.innerHTML = UI.rendreJeu(App.s, App.vue);
      window.scrollTo(0, scroll);
    }
    var m = App.modaleHtml();
    if (m) { modale.innerHTML = m; modale.classList.remove('cachee'); }
    else { modale.innerHTML = ''; modale.classList.add('cachee'); }
  };

  App.modaleHtml = function () {
    var v = App.vue.modale, s = App.s;
    if (v) {
      switch (v.type) {
        case 'aide': return UI.modaleAide();
        case 'confirmation': return UI.modaleConfirmation(v);
        case 'message': return UI.modaleMessage(v);
        case 'heritier': return UI.modaleHeritier(s);
        case 'succession': return UI.modaleSuccession(s, v.resume);
      }
    }
    if (!s || App.vue.ecran === 'titre') return '';
    switch (s.phase) {
      case 'bilan': return UI.modaleBilan(s);
      case 'evenement': return s.evenementCourant ? UI.modaleEvenement(s) : '';
      case 'mort': return UI.modaleMort(s);
      case 'fin': return UI.modaleFin(s);
    }
    return '';
  };

  App.sauver = function () { if (App.s && App.s.phase !== 'fin') C.sauvegarder(App.s); };

  App.resultat = function (nom, r) {
    App.vue.dernierResultat = { nom: nom, ok: r.ok, texte: r.texte || '', deltas: r.deltas };
    if (!r.ok) UI.toast(r.texte);
  };

  /** Action générique "spéciale" (postuler, étudier…) */
  App.special = function (nom, pa, fn) {
    var r = C.actionGenerique(App.s, { pa: pa, nom: nom }, fn);
    App.resultat(nom, r);
    App.sauver();
    App.rendre();
  };

  /* ----- Démarrage ----- */
  App.demarrer = function () {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el || el.disabled) return;
      App.executer(el.getAttribute('data-act'), el.getAttribute('data-arg'));
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && App.vue.modale && (App.vue.modale.type === 'aide' || App.vue.modale.type === 'confirmation' || App.vue.modale.type === 'message')) { App.vue.modale = null; App.rendre(); }
    });
    document.addEventListener('change', function (ev) {
      if (ev.target && ev.target.id === 'fichier-import') App.lireFichier(ev.target.files[0]);
      if (ev.target && ev.target.id === 'graine') App.vue.graine = ev.target.value;
      if (ev.target && ev.target.id === 'ent-secteur') App.vue.entSecteur = ev.target.value;
    });
    App.rendre();
  };

  App.nouvellePartie = function (graine) {
    var meta = C.chargerMeta();
    App.s = C.nouvellePartie(graine, meta);
    App.vue.ecran = 'jeu'; App.vue.onglet = 'actions'; App.vue.categorie = 'survie'; App.vue.dernierResultat = null; App.vue.modale = null;
    App.sauver();
    App.rendre();
    UI.toast(NF.t('Bienvenue à ') + App.s.ville.nom + NF.t('. Bonne chance, ') + App.s.joueur.prenom + '.', 4000);
  };

  App.confirmer = function (titre, texte, bouton, fn) {
    App.confirmation = fn;
    App.vue.modale = { type: 'confirmation', titre: titre, texte: texte, bouton: bouton };
    App.rendre();
  };

  App.lireFichier = function (f) {
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var r = C.importer(reader.result);
      App.vue.modale = { type: 'message', titre: r.ok ? NF.t('Import réussi') : NF.t('Import impossible'), texte: r.texte };
      App.rendre();
    };
    reader.readAsText(f);
  };

  App.telecharger = function (nom, contenu) {
    var blob = new Blob([contenu], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ----- Dispatch ----- */
  App.executer = function (act, arg) {
    var s = App.s, v = App.vue;
    switch (act) {
      /* --- titre --- */
      case 'nouvelle': {
        var g = (UI.$('#graine') || {}).value || '';
        if (C.aSauvegarde()) App.confirmer(NF.t('Nouvelle partie'), NF.t('Une partie est en cours. La remplacer ?'), NF.t('Remplacer'), function () { App.nouvellePartie(g); });
        else App.nouvellePartie(g);
        return;
      }
      case 'graine-aleatoire': v.graine = C.RNG.graineAleatoire(); App.rendre(); return;
      case 'langue': NF.i18n.changer(arg); return;
      case 'continuer': {
        var sv = C.chargerPartie();
        if (!sv) { UI.toast(NF.t('Aucune partie sauvegardée.')); return; }
        App.s = sv; v.ecran = 'jeu'; v.modale = null; v.dernierResultat = null;
        App.rendre(); return;
      }
      case 'acheter-bonus': { var meta = C.chargerMeta(); UI.toast(C.acheterBonus(meta, arg)); App.rendre(); return; }
      case 'exporter': App.telecharger('nouvelle-fortune-sauvegarde.json', C.exporter(App.s || C.chargerPartie())); return;
      case 'importer': { var fi = UI.$('#fichier-import'); if (fi) fi.click(); return; }
      case 'aide': v.modale = { type: 'aide' }; App.rendre(); return;
      case 'fermer-modale': v.modale = null; App.confirmation = null; App.rendre(); return;
      case 'confirmer': { var fn = App.confirmation; App.confirmation = null; v.modale = null; if (fn) fn(); else App.rendre(); return; }
      case 'effacer-progression':
        App.confirmer(NF.t('Tout effacer'), NF.t('Supprimer la partie en cours, les bonus débloqués et les meilleurs scores ? Cette action est définitive.'), NF.t('Tout effacer'), function () {
          C.effacerSauvegarde(); try { localStorage.removeItem('nf_meta'); localStorage.removeItem('nf_scores'); } catch (e) { /* ignore */ }
          App.s = null; App.rendre(); UI.toast(NF.t('Progression effacée.'));
        });
        return;
      case 'retour-titre': App.s = null; v.ecran = 'titre'; v.modale = null; App.rendre(); return;
      case 'menu': App.sauver(); v.ecran = 'titre'; v.modale = null; App.rendre(); return;
    }
    if (!s) return;
    switch (act) {
      /* --- navigation --- */
      case 'onglet': v.onglet = arg; App.rendre(); return;
      case 'categorie': v.categorie = arg; App.rendre(); return;
      case 'filtre-emploi': v.filtreEmploi = arg; App.rendre(); return;

      /* --- actions --- */
      case 'action': {
        var a = U.byId(NF.data.actions, arg);
        var r = C.executerAction(s, arg);
        App.resultat(a ? a.icone + ' ' + a.nom : arg, r);
        App.sauver(); App.rendre(); return;
      }
      case 'etudier': { var cp = U.byId(NF.data.competences, arg); App.special(NF.t('📖 Étudier : ') + cp.nom, 1, function () { return C.etudier(s, arg); }); return; }
      case 'postuler': {
        var mt = U.byId(NF.data.metiers, arg);
        App.special(NF.t('💼 Postuler : ') + mt.nom, 1, function () { var res = C.postuler(s, arg); return res.texte; });
        return;
      }
      case 'demissionner': App.confirmer(NF.t('Démissionner'), NF.t('Quitter votre emploi ? Vous ne toucherez aucune indemnité.'), NF.t('Démissionner'), function () { C.perdreEmploi(s, NF.t('démission')); App.sauver(); App.rendre(); }); return;
      case 'formation': { var fo = U.byId(NF.data.formations, arg); App.special(NF.t('🎓 Inscription : ') + fo.nom, 0, function () { return C.commencerFormation(s, arg); }); return; }
      case 'arreter-formation': App.confirmer(NF.t('Abandonner la formation'), NF.t('Les mois déjà suivis seront perdus.'), NF.t('Abandonner'), function () { C.arreterFormation(s); s.paMax = C.calculerPaMax(s); App.sauver(); App.rendre(); }); return;
      case 'demenager': { var lg = U.byId(NF.data.logements, arg); App.special(NF.t('🏠 Déménager : ') + lg.nom, 1, function () { return C.changerLogement(s, arg); }); return; }
      case 'fabriquer': { var rc = U.byId(NF.data.recettes, arg); var ob = U.byId(NF.data.objets, rc.resultat); App.special(NF.t('🔧 Fabriquer : ') + ob.nom, 1, function () { return C.fabriquer(s, arg); }); return; }
      case 'utiliser': App.special(NF.t('Utiliser'), 0, function () { return C.utiliserObjet(s, arg); }); return;
      case 'vendre': App.special(NF.t('Vendre'), 0, function () { return C.vendreObjet(s, arg); }); return;
      case 'jeter': App.special(NF.t('Jeter'), 0, function () { return C.jeterObjet(s, arg); }); return;
      case 'acheter': App.special(NF.t('Acheter'), 0, function () { return C.acheterObjet(s, arg); }); return;

      /* --- entreprise --- */
      case 'entreprise-creer': {
        var sec = (UI.$('#ent-secteur') || {}).value, st = (UI.$('#ent-statut') || {}).value;
        var fin = { epargne: +((UI.$('#ent-epargne') || {}).value || 0), microcredit: +((UI.$('#ent-micro') || {}).value || 0), pret: +((UI.$('#ent-pret') || {}).value || 0) };
        App.special(NF.t('🏪 Création d\'entreprise'), 0, function () { var res = C.creerEntreprise(s, sec, st, fin); return res.texte; });
        return;
      }
      case 'ent-embaucher': App.special(NF.t('👥 Embaucher'), 0, function () { return C.entrepriseEmbaucher(s); }); return;
      case 'ent-licencier': App.special(NF.t('👥 Licencier'), 0, function () { return C.entrepriseLicencier(s); }); return;
      case 'ent-investir': App.special(NF.t('📈 Investir'), 0, function () { return C.entrepriseInvestir(s); }); return;
      case 'ent-emprunter': { var mo = +((UI.$('#ent-montant') || {}).value || 0); App.special(NF.t('🏦 Emprunter'), 0, function () { return C.entrepriseEmprunter(s, mo); }); return; }
      case 'ent-remuneration': { var re = +((UI.$('#ent-remu') || {}).value || 0); App.special(NF.t('💶 Rémunération'), 0, function () { return C.entrepriseRemuneration(s, re); }); return; }
      case 'ent-statut': App.special(NF.t('🧾 Changer de statut'), 0, function () { return C.entrepriseChangerStatut(s); }); return;
      case 'ent-fermer': App.confirmer(NF.t('Fermer l\'entreprise'), NF.t('Fermer définitivement ? Les emprunts et indemnités seront soldés avec la trésorerie.'), NF.t('Fermer'), function () { var t = C.entrepriseFermer(s); App.resultat(NF.t('🏚️ Fermeture'), { ok: true, texte: t }); App.sauver(); App.rendre(); }); return;

      /* --- tour --- */
      case 'fin-mois': C.finDuMois(s); v.dernierResultat = null; App.sauver(); App.rendre(); return;
      case 'bilan-ok': C.apresBilan(s); App.sauver(); App.rendre(); return;
      case 'choix': C.choisir(s, +arg); App.sauver(); App.rendre(); return;
      case 'evenement-suivant': C.apresEvenement(s); App.sauver(); App.rendre(); return;

      /* --- mort et succession --- */
      case 'mort-ok':
        if (C.heritiersPossibles(s).length) { v.modale = { type: 'heritier' }; App.rendre(); }
        else { C.finDeLignee(s); v.modale = null; App.rendre(); }
        return;
      case 'heritier': {
        var resume = C.succession(s, +arg);
        v.modale = { type: 'succession', resume: resume };
        App.sauver(); App.rendre(); return;
      }
      case 'succession-ok': v.modale = null; v.onglet = 'actions'; v.dernierResultat = null; App.sauver(); App.rendre(); return;
    }
  };
})();
