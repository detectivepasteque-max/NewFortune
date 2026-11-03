/* =====================================================================
 * UI – CONTENU DES ONGLETS
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var C = NF.core;
  var A = NF.api;
  var esc = U.esc;

  UI.rendreOnglet = function (s, vue) {
    switch (vue.onglet) {
      case 'emploi': return UI.ongletEmploi(s, vue);
      case 'logement': return UI.ongletLogement(s, vue);
      case 'savoir': return UI.ongletSavoir(s, vue);
      case 'objets': return UI.ongletObjets(s, vue);
      case 'famille': return UI.ongletFamille(s, vue);
      case 'entreprise': return UI.ongletEntreprise(s, vue);
      case 'journal': return UI.ongletJournal(s, vue);
      default: return UI.ongletActions(s, vue);
    }
  };

  /** Emplacement de hauteur fixe en haut de l'onglet : le résultat de la dernière action, sinon
   *  un conseil (deux premiers mois) ou l'usure prévue en fin de mois. La grille ne bouge jamais. */
  UI.resultatHtml = function (s, vue) {
    var r = vue.dernierResultat, h;
    if (r) h = '<div class="resultat-action' + (r.ok ? '' : ' echec') + '"><strong>' + esc(r.nom || '') + '</strong>' + (r.nom ? ' — ' : '') + esc(r.texte) + UI.deltasHtml(r.deltas) + '</div>';
    else if (s.temps.moisAbsolu <= 1) h = '<div class="resultat-vide">' + NF.t('💡 Chaque mois : manger, se reposer, se laver, puis travailler. Les jauges s\'usent à la fin du mois.') + '</div>';
    else h = '<div class="resultat-vide">' + NF.t('Usure prévue en fin de mois : ') + UI.usureHtml(C.usurePrevue(s)) + '</div>';
    return '<div class="resultat-slot">' + h + '</div>';
  };

  /* ================= ACTIONS ================= */
  var CATEGORIES = [
    { id: 'survie', nom: NF.t('Survie'), icone: '🥣' }, { id: 'soin', nom: NF.t('Repos et soin'), icone: '🛏️' },
    { id: 'social', nom: NF.t('Social et démarches'), icone: '🤝' }, { id: 'travail', nom: NF.t('Travail'), icone: '💼' }, { id: 'loisirs', nom: NF.t('Loisirs et talents'), icone: '🎨' }, { id: 'famille', nom: NF.t('Famille'), icone: '👨‍👩‍👧' },
  ];

  UI.ongletActions = function (s, vue) {
    var h = UI.resultatHtml(s, vue);
    var cat = vue.categorie || 'survie';
    h += '<div class="chips">' + CATEGORIES.map(function (c) {
      var visibles = NF.data.actions.filter(function (a) { return a.categorie === c.id && (!a.visible || a.visible(s)); }).length;
      if (!visibles) return '';
      return '<button class="chip' + (cat === c.id ? ' actif' : '') + '" data-act="categorie" data-arg="' + c.id + '">' + c.icone + ' ' + c.nom + '</button>';
    }).join('') + '</div>';
    var actions = NF.data.actions.filter(function (a) { return a.categorie === cat && (!a.visible || a.visible(s)); });
    if (!actions.length) { actions = NF.data.actions.filter(function (a) { return a.categorie === 'survie'; }); }
    h += '<div class="grille-cartes">';
    actions.forEach(function (a) {
      var pa = a.pa == null ? 1 : a.pa;
      var v = a.conditions ? C.verifierConditions(s, a.conditions) : { ok: true, raisons: [] };
      if (v.ok && typeof a.condition === 'function' && !a.condition(s)) { v.ok = false; v.raisons.push(NF.t('indisponible')); }
      var possible = v.ok && s.pa >= pa;
      var info = a.info ? a.info(s) : '';
      h += '<div class="carte' + (possible ? '' : ' inactive') + '"><div class="carte-titre"><span class="carte-icone">' + a.icone + '</span><strong>' + esc(a.nom) + '</strong>' + UI.etiquettePa(pa) + UI.coutHtml(a.cout) + '</div>';
      h += '<div class="carte-desc">' + esc(a.desc) + (info ? '<br><span class="tres-petit accent">' + esc(info) + '</span>' : '') + '</div>';
      if (!v.ok) h += '<div class="raisons">' + esc(v.raisons.join(', ')) + '</div>';
      h += '<div class="carte-pied">' + UI.btn('action', a.id, NF.t('Faire'), 'btn-petit btn-principal', !possible) + '</div></div>';
    });
    h += '</div>';
    return h;
  };

  /* ================= EMPLOI ================= */
  UI.ongletEmploi = function (s, vue) {
    var j = s.joueur, m = C.metierActuel(s);
    var h = UI.resultatHtml(s, vue);
    h += NF.t('<h2>Emploi</h2>');
    if (m) {
      h += '<div class="carte selectionnee"><div class="carte-titre"><span class="carte-icone">' + m.icone + '</span><strong>' + esc(m.nom) + NF.t('</strong><span class="etiquette bleu">niveau ') + m.niveau + '</span>' + (m.nonDeclare ? NF.t('<span class="etiquette mauvais">non déclaré</span>') : '') + '</div>';
      var suite = (NF.data.promotions || {})[m.id] ? U.byId(NF.data.metiers, NF.data.promotions[m.id]) : null;
      h += '<div class="carte-desc">' + U.euros(j.emploi.salaire) + NF.t(' net par mois · ancienneté ') + j.emploi.mois + NF.t(' mois · pénibilité ') + m.penibilite + ' · ' + (m.pa ? NF.t('temps plein (1 PA)') : NF.t('à la tâche (0 PA)')) +
        (suite ? NF.t('<br><span class="tres-petit accent">Évolution possible après ') + NF.data.config.moisAvantPromotion + NF.t(' mois : ') + suite.icone + ' ' + esc(suite.nom) + (C.prerequisMetier(s, suite, true).ok ? NF.t(' (prérequis remplis)') : NF.t(' — il manque : ') + esc(C.prerequisMetier(s, suite, true).raisons.join(', '))) + '</span>' : '') + '</div>';
      h += '<div class="carte-pied">' + UI.btn('demissionner', null, NF.t('Démissionner'), 'btn-petit btn-danger') + '</div></div>';
    } else h += NF.t('<p class="muted">Vous n\'avez pas d\'emploi. Postuler coûte 1 PA ; la chance dépend de l\'hygiène, de la réputation, des compétences et de la conjoncture.</p>');

    /* formation en cours */
    if (j.formation) {
      var f = U.byId(NF.data.formations, j.formation.id);
      h += '<div class="carte"><div class="carte-titre"><span class="carte-icone">' + f.icone + '</span><strong>' + esc(f.nom) + '</strong><span class="etiquette">' + j.formation.moisRestants + NF.t(' mois restants</span></div><div class="carte-desc">') + (f.coutMensuel ? U.euros(f.coutMensuel) + NF.t('/mois · ') : NF.t('gratuit · ')) + NF.t('1 PA par mois</div><div class="carte-pied">') + UI.btn('arreter-formation', null, NF.t('Abandonner'), 'btn-petit btn-danger') + '</div></div>';
    }

    /* filtres */
    var filtre = vue.filtreEmploi || 'accessibles';
    h += NF.t('<hr><div class="ligne"><h3 style="margin:0">Offres</h3><div class="espace"></div><div class="chips" style="margin:0">') +
      ['accessibles', 'tous'].map(function (f) { return '<button class="chip' + (filtre === f ? ' actif' : '') + '" data-act="filtre-emploi" data-arg="' + f + '">' + (f === 'accessibles' ? NF.t('Accessibles') : NF.t('Tous les métiers')) + '</button>'; }).join('') + '</div></div>';
    var niveaux = ['', NF.t('Survie'), NF.t('Emploi peu qualifié'), NF.t('Métier qualifié'), NF.t('Technicien'), NF.t('Cadre')];
    for (var n = 1; n <= 5; n++) {
      var liste = NF.data.metiers.filter(function (mt) { return mt.niveau === n; }).map(function (mt) { return { m: mt, v: C.prerequisMetier(s, mt) }; });
      if (filtre === 'accessibles') liste = liste.filter(function (x) { return x.v.ok; });
      if (!liste.length) continue;
      h += NF.t('<h3>Niveau ') + n + ' – ' + niveaux[n] + '</h3><div class="grille-cartes">';
      liste.forEach(function (x) {
        var mt = x.m, ok = x.v.ok;
        var chance = ok ? Math.round(C.chanceEmbauche(s, mt) * 100) : 0;
        h += '<div class="carte' + (ok ? '' : ' inactive') + '"><div class="carte-titre"><span class="carte-icone">' + mt.icone + '</span><strong>' + esc(mt.nom) + '</strong>' + (mt.nonDeclare ? NF.t('<span class="etiquette mauvais">non déclaré</span>') : '') + (mt.pa ? '' : NF.t('<span class="etiquette">0 PA/mois</span>')) + '</div>';
        var sv = (NF.data.promotions || {})[mt.id] ? U.byId(NF.data.metiers, NF.data.promotions[mt.id]) : null;
        h += '<div class="carte-desc">' + esc(mt.desc) + '<br><span class="tres-petit">' + U.euros(mt.salaire[0]) + ' – ' + U.euros(mt.salaire[1]) + NF.t('/mois · pénibilité ') + mt.penibilite + (mt.risque >= 0.02 ? NF.t(' · risqué') : '') + (sv ? NF.t(' · évolue vers ') + esc(NF.util.minuscule(sv.nom)) : '') + '</span></div>';
        if (!ok) h += '<div class="raisons">' + esc(x.v.raisons.join(', ')) + '</div>';
        else h += NF.t('<div class="tres-petit muted">Chance d\'embauche : <strong class="') + (chance >= 50 ? 'bon' : chance >= 25 ? 'moyen' : 'mauvais') + '">' + chance + ' %</strong></div>';
        h += '<div class="carte-pied">' + UI.btn('postuler', mt.id, NF.t('Postuler'), 'btn-petit btn-principal', !ok || s.pa < 1) + UI.etiquettePa(1) + '</div></div>';
      });
      h += '</div>';
    }

    /* formations */
    h += NF.t('<hr><h3>Formations et diplômes</h3>');
    if (j.diplomes.length) h += NF.t('<p class="petit">Obtenus : ') + j.diplomes.map(function (d) { var f = U.byId(NF.data.formations, d); return '<span class="etiquette bon">' + (f ? f.icone + ' ' + esc(f.nom) : esc(d)) + '</span>'; }).join(' ') + '</p>';
    h += '<div class="grille-cartes">';
    NF.data.formations.forEach(function (f) {
      if (j.diplomes.indexOf(f.id) >= 0) return;
      var v = C.prerequisFormation(s, f);
      h += '<div class="carte' + (v.ok ? '' : ' inactive') + '"><div class="carte-titre"><span class="carte-icone">' + f.icone + '</span><strong>' + esc(f.nom) + '</strong></div>';
      h += '<div class="carte-desc">' + esc(f.desc) + '<br><span class="tres-petit">' + f.duree + NF.t(' mois · ') + (f.coutMensuel ? U.euros(f.coutMensuel) + NF.t('/mois') : 'gratuit') + NF.t(' · 1 PA/mois</span></div>');
      if (!v.ok) h += '<div class="raisons">' + esc(v.raisons.join(', ')) + '</div>';
      h += '<div class="carte-pied">' + UI.btn('formation', f.id, NF.t('S\'inscrire'), 'btn-petit', !v.ok) + '</div></div>';
    });
    h += '</div>';

    /* aides */
    h += NF.t('<hr><h3>Aides sociales</h3><p class="petit muted">Les aides se demandent via l\'action « Démarches administratives » (onglet Actions).</p><div class="ligne">');
    for (var id in NF.data.impots.aides) {
      var el = C.aideEligible(s, id);
      h += '<span class="etiquette ' + (j.aides[id] ? 'bon' : el.ok ? 'bleu' : '') + '" title="' + esc(el.raisons.join(', ')) + '">' + id.toUpperCase() + ' ' + U.euros(NF.data.impots.aides[id].montant) + (j.aides[id] ? ' ✓' : el.ok ? NF.t(' (à demander)') : '') + '</span>';
    }
    h += '</div>';
    return h;
  };

  /* ================= LOGEMENT ================= */
  UI.ongletLogement = function (s, vue) {
    var h = UI.resultatHtml(s, vue);
    var actuel = C.logementActuel(s);
    h += NF.t('<h2>Logement</h2><p class="muted petit">Déménager coûte 1 PA. Le logement détermine le loyer, l\'usure des jauges, l\'adresse et la catégorie sociale. Revenus estimés : <strong>') + U.euros(C.revenuMensuel(s)) + NF.t('/mois</strong>.</p>');
    /* guider le débutant : le logement à viser et ce qui manque */
    var prochain = C.prochainLogement(s);
    if (prochain) h += '<div class="conseil">' + (prochain.v.ok ? NF.t('🎯 Vous pouvez emménager dès maintenant : ') : NF.t('🎯 Prochaine étape : ')) + prochain.l.icone + ' ' + esc(prochain.l.nom) + (prochain.v.ok ? '' : ' — ' + esc(prochain.v.raisons.join(', '))) + '.</div>';
    h += '<div class="grille-cartes">';
    NF.data.logements.forEach(function (l) {
      var cond = C.conditionsLogement(s, l.id);
      var cur = l.id === actuel.id;
      h += '<div class="carte' + (cur ? ' selectionnee' : cond.ok ? '' : ' inactive') + '"><div class="carte-titre"><span class="carte-icone">' + l.icone + '</span><strong>' + esc(l.nom) + '</strong>' + (cur ? NF.t('<span class="etiquette bon">actuel</span>') : '') + (prochain && prochain.l.id === l.id ? NF.t('<span class="etiquette violet">prochaine étape</span>') : '') + (l.adresse ? NF.t('<span class="etiquette bleu">adresse</span>') : '') + '</div>';
      h += '<div class="carte-desc">' + esc(l.desc) + '<br><span class="tres-petit">' + (l.proprietaire ? NF.t('Achat ') + U.euros(l.prix) + NF.t(' · charges ') + U.euros(l.charges) + NF.t('/mois') : l.loyer ? NF.t('Loyer ') + U.euros(l.loyer) + NF.t(' + charges ') + U.euros(l.charges) + NF.t('/mois') : NF.t('Gratuit') + (l.charges ? NF.t(' (participation ') + U.euros(l.charges) + ')' : '')) + (l.dureeMax ? ' · ' + l.dureeMax + NF.t(' mois max') : '') + (l.cuisine ? NF.t(' · cuisine') : '') + (l.expose ? NF.t(' · exposé aux intempéries') : '') + ' · ' + l.capacite + NF.t(' pers.</span></div>');
      if (!cur && !cond.ok) h += '<div class="raisons">' + esc(cond.raisons.join(', ')) + '</div>';
      if (!cur) h += '<div class="carte-pied">' + UI.btn('demenager', l.id, l.proprietaire ? NF.t('Acheter') : NF.t('Emménager'), 'btn-petit btn-principal', !cond.ok || s.pa < 1) + UI.etiquettePa(1) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  };

  /* ================= SAVOIR ================= */
  UI.ongletSavoir = function (s, vue) {
    var h = UI.resultatHtml(s, vue);
    h += NF.t('<h2>Compétences</h2><p class="muted petit">Étudier coûte 1 PA (et parfois un peu d\'argent). Les métiers exercés font aussi progresser. Efficacité actuelle : ') + Math.round(C.efficacite(s) * C.modifTrait(s, 'apprentissage') * A.passif(s, 'apprentissage') * 100) + ' %.</p>';
    var ligneComp = function (c) {
      var xp = s.joueur.competences[c.id] || 0, niv = C.niveauCompetence(s, c.id), parNiv = NF.data.config.xpParNiveau;
      var pct = niv >= NF.data.config.niveauMax ? 100 : ((xp % parNiv) / parNiv) * 100;
      var lieu = c.lieu ? U.byId(NF.data.ville.lieux, c.lieu) : null;
      var aLieu = c.lieu && C.aLieu(s, c.lieu);
      h += '<div class="comp-ligne"><span>' + c.icone + '</span><div><strong>' + esc(c.nom) + '</strong> ' + UI.barreNiveau(niv) + '<div class="tres-petit muted">' + esc(c.desc) + (lieu ? ' · ' + (aLieu ? esc(lieu.nom) : NF.t('<span class="mauvais">pas de ') + esc(NF.util.minuscule(lieu.nom)) + NF.t(' ici</span>')) : '') + '</div></div>';
      h += '<div><div class="comp-barre"><div style="width:' + pct + NF.t('%"></div></div><div class="tres-petit muted">niveau ') + niv + ' · ' + Math.round(xp) + NF.t(' xp</div></div>');
      h += '<div>' + UI.btn('etudier', c.id, NF.t('Étudier') + (c.cout ? ' (' + U.euros(c.cout) + ')' : ''), 'btn-petit', s.pa < 1 || niv >= NF.data.config.niveauMax || s.joueur.argent < (c.cout || 0)) + '</div></div>';
    };
    NF.data.competences.forEach(function (c) { if (!c.annexe) ligneComp(c); });
    h += NF.t('<hr><h3>Compétences annexes</h3><p class="muted petit">Loisirs et talents. Ils se pratiquent dans l\'onglet Actions (catégorie Loisirs et talents), rapportent d\'autant plus que le niveau monte, et ouvrent des recettes, des métiers et des événements.</p>');
    NF.data.competences.forEach(function (c) { if (c.annexe) ligneComp(c); });
    h += NF.t('<hr><h3>Lieux de la ville</h3><div class="ligne">');
    NF.data.ville.lieux.forEach(function (l) {
      if (!C.aLieu(s, l.id)) return;
      h += '<span class="etiquette" title="' + esc(l.desc) + NF.t(' (qualité ') + C.qualiteLieu(s, l.id) + ')">' + l.icone + ' ' + esc(l.nom) + '</span>';
    });
    h += '</div>';
    return h;
  };

  /* ================= OBJETS ================= */
  UI.ongletObjets = function (s, vue) {
    var j = s.joueur;
    var h = UI.resultatHtml(s, vue);
    h += NF.t('<div class="ligne"><h2 style="margin:0">Inventaire</h2><div class="espace"></div><span class="etiquette">') + A.placeUtilisee(s) + ' / ' + A.capaciteInventaire(s) + NF.t(' places</span></div>');
    var ids = Object.keys(j.inventaire);
    if (!ids.length) h += NF.t('<p class="muted">Votre sac est vide. Fouillez les bennes (onglet Actions) pour trouver des matériaux.</p>');
    h += '<div class="inventaire-grille">';
    ids.forEach(function (id) {
      var o = U.byId(NF.data.objets, id); if (!o) return;
      h += '<div class="objet"><div class="ligne"><span class="icone">' + o.icone + '</span><span class="nom">' + esc(o.nom) + (j.inventaire[id] > 1 ? ' × ' + j.inventaire[id] : '') + '</span></div><div class="passif">' + esc(UI.passifTexte(o)) + '</div><div class="boutons">';
      if (o.usage) h += UI.btn('utiliser', id, NF.t('Utiliser'), 'btn-petit');
      if (o.vente) h += UI.btn('vendre', id, NF.t('Vendre ~') + U.euros(o.vente), 'btn-petit');
      h += UI.btn('jeter', id, NF.t('Jeter'), 'btn-petit') + '</div></div>';
    });
    h += '</div>';

    /* recettes */
    h += NF.t('<hr><h2>Fabrication</h2><p class="muted petit">Fabriquer coûte 1 PA. Les ingrédients sont consommés.</p><div class="grille-cartes">');
    NF.data.recettes.forEach(function (r) {
      var res = U.byId(NF.data.objets, r.resultat); if (!res) return;
      var v = C.verifierRecette(s, r);
      h += '<div class="carte' + (v.ok ? '' : ' inactive') + '"><div class="carte-titre"><span class="carte-icone">' + res.icone + '</span><strong>' + esc(res.nom) + (r.quantite > 1 ? ' × ' + r.quantite : '') + '</strong></div>';
      h += '<div class="carte-desc">' + esc(r.desc || '') + '</div><div class="ingredients">' + Object.keys(r.ingredients).map(function (id) {
        var o = U.byId(NF.data.objets, id), a = j.inventaire[id] || 0, n = r.ingredients[id];
        return '<span class="' + (a >= n ? 'ok' : 'manque') + '">' + (o ? o.icone + ' ' + esc(o.nom) : id) + ' ' + a + '/' + n + '</span>';
      }).join(' · ');
      var comps = [];
      if (r.competences) for (var c in r.competences) { var cc = U.byId(NF.data.competences, c); comps.push('<span class="' + (C.niveauCompetence(s, c) >= r.competences[c] ? 'ok' : 'manque') + '">' + (cc ? cc.icone + ' ' + esc(cc.nom) : c) + ' ' + r.competences[c] + '</span>'); }
      if (r.objetsRequis) r.objetsRequis.forEach(function (id) { var o = U.byId(NF.data.objets, id); comps.push('<span class="' + (A.aObjet(s, id) ? 'ok' : 'manque') + NF.t('">outil : ') + (o ? esc(o.nom) : id) + '</span>'); });
      if (comps.length) h += '<br>' + comps.join(' · ');
      h += '</div><div class="carte-pied">' + UI.btn('fabriquer', r.id, NF.t('Fabriquer'), 'btn-petit btn-principal', !v.ok || s.pa < 1) + UI.etiquettePa(1) + '</div></div>';
    });
    h += '</div>';

    /* boutique */
    h += NF.t('<hr><h2>Boutique</h2><p class="muted petit">Acheter ne coûte pas de PA.') + (C.aLieu(s, 'ressourcerie') ? NF.t(' La ressourcerie fait -25 % sur les petits objets.') : '') + '</p><div class="inventaire-grille">';
    C.boutique(s).forEach(function (o) {
      var prix = C.prixAchat(s, o);
      h += '<div class="objet"><div class="ligne"><span class="icone">' + o.icone + '</span><span class="nom">' + esc(o.nom) + '</span></div><div class="passif">' + esc(o.desc) + '</div><div class="boutons">' + UI.btn('acheter', o.id, U.euros(prix), 'btn-petit' + (j.argent >= prix ? ' btn-principal' : ''), j.argent < prix) + '</div></div>';
    });
    h += '</div>';
    return h;
  };

  /* ================= FAMILLE ================= */
  UI.ongletFamille = function (s, vue) {
    var f = s.joueur.famille;
    var h = UI.resultatHtml(s, vue);
    h += NF.t('<h2>Famille</h2>');
    if (!f.partenaire && !f.enfants.length) {
      h += NF.t('<p class="muted">Vous êtes seul. Les rencontres (événements, action « Nouer des contacts ») peuvent mener à une relation, puis à une famille. Fonder une famille demande un minimum de stabilité.</p>');
      if (s.joueur.drapeaux.relation_en_cours) h += NF.t('<p class="accent">💞 Une relation est en train de naître…</p>');
    }
    if (f.partenaire) {
      var p = f.partenaire;
      h += '<div class="carte"><div class="membre"><span class="avatar">💞</span><div class="espace"><strong>' + esc(p.prenom) + '</strong> <span class="muted petit">' + UI.ageTexte(p.age) + ' · ' + (p.revenu ? esc(p.metier) + ', ' + U.euros(p.revenu) + NF.t('/mois (la moitié va au ménage)') : NF.t('sans emploi')) + '</span>';
      h += NF.t('<div class="petit">Relation ') + Math.round(p.relation) + '/100</div>' + UI.miniBarre(p.relation) + NF.t('<div class="petit">Santé ') + Math.round(p.sante) + '/100</div>' + UI.miniBarre(p.sante, '#5b9cf6');
      h += NF.t('<div class="tres-petit muted">Ensemble depuis ') + (s.temps.moisAbsolu - p.depuis) + NF.t(' mois') + (s.joueur.drapeaux.veut_enfant ? NF.t(' · projet d\'enfant en cours') : '') + '</div></div></div></div>';
    }
    f.enfants.forEach(function (e, i) {
      var annees = Math.floor(e.age / 12);
      h += '<div class="carte"><div class="membre"><span class="avatar">' + (annees < 3 ? '👶' : annees < 12 ? '🧒' : annees < 18 ? '🧑' : '🧑‍🎓') + '</span><div class="espace"><strong>' + esc(e.prenom) + '</strong> <span class="muted petit">' + UI.ageTexte(e.age) + (annees >= 18 ? NF.t(' · héritier possible') : '') + '</span>';
      h += NF.t('<div class="petit">Éducation ') + Math.round(e.education) + '/100</div>' + UI.miniBarre(e.education, '#b088f9') + NF.t('<div class="petit">Relation ') + Math.round(e.relation) + '/100</div>' + UI.miniBarre(e.relation) + NF.t('<div class="petit">Santé ') + Math.round(e.sante) + '/100</div>' + UI.miniBarre(e.sante, '#5b9cf6');
      h += '</div></div></div>';
    });
    if (f.partenaire || f.enfants.length) h += NF.t('<p class="muted petit">Les actions « Du temps en famille » et « Éduquer les enfants » (onglet Actions, catégorie Famille) entretiennent les relations et préparent l\'héritier. L\'éducation détermine les compétences de départ de l\'héritier.</p>');
    /* lignée */
    h += NF.t('<hr><h3>Lignée ') + esc(s.joueur.nom) + '</h3><ul class="statut-liste">';
    s.lignee.membres.forEach(function (m) {
      h += NF.t('<li><span>Génération ') + m.generation + '</span><span>' + esc(m.prenom) + (m.mort != null ? ' <span class="muted">† ' + (m.age != null ? m.age + NF.t(' ans, ') : '') + esc(m.cause || '') + '</span>' : NF.t(' <span class="bon">(en vie)</span>')) + '</span></li>';
    });
    h += '</ul>';
    if (s.lignee.succes.length) h += NF.t('<h3 style="margin-top:.8em">Accomplissements</h3><div class="ligne">') + s.lignee.succes.map(function (id) { var su = U.byId(NF.data.succes, id); return su ? '<span class="etiquette bon" title="' + esc(su.desc) + '">' + su.icone + ' ' + esc(su.nom) + '</span>' : ''; }).join('') + '</div>';
    return h;
  };

  /* ================= ENTREPRISE ================= */
  UI.ongletEntreprise = function (s, vue) {
    var e = s.joueur.entreprise, E = NF.data.entreprise;
    var h = UI.resultatHtml(s, vue);
    h += NF.t('<h2>Entreprise</h2>');
    if (!e) {
      var possibles = C.secteursPossibles(s);
      h += NF.t('<p class="muted petit">Créer une entreprise demande une domiciliation, de l\'expérience (6 mois dans un secteur) ou une compétence de niveau 3, et un capital de départ. La gestion prend 1 PA par mois.</p>');
      if (!possibles.length) { h += NF.t('<p class="mauvais">Aucun secteur accessible pour l\'instant : exercez un métier ou montez une compétence au niveau 3.</p>'); return h; }
      h += NF.t('<div class="carte"><label>Secteur</label><select id="ent-secteur" class="champ">') + possibles.map(function (sec) { return '<option value="' + sec.id + '"' + (vue.entSecteur === sec.id ? ' selected' : '') + '>' + sec.icone + ' ' + esc(sec.nom) + NF.t(' — capital min. ') + U.euros(sec.capitalMin) + NF.t(', charges fixes ') + U.euros(sec.chargesFixes) + NF.t('/mois</option>'); }).join('') + '</select>';
      h += NF.t('<label style="margin-top:.6em">Statut</label><select id="ent-statut" class="champ"><option value="micro">') + E.statuts.micro.icone + ' ' + E.statuts.micro.nom + ' — ' + esc(E.statuts.micro.desc) + '</option><option value="societe">' + E.statuts.societe.icone + ' ' + E.statuts.societe.nom + NF.t(' (frais ') + U.euros(E.statuts.societe.fraisCreation) + ') — ' + esc(E.statuts.societe.desc) + '</option></select>';
      h += NF.t('<div class="ligne" style="margin-top:.6em"><div style="flex:1"><label>Épargne investie (vous avez ') + U.euros(s.joueur.argent) + ')</label><input id="ent-epargne" class="champ" type="number" min="0" value="' + Math.min(s.joueur.argent, 5000) + '"></div>';
      h += NF.t('<div style="flex:1"><label>Microcrédit (max ') + U.euros(E.microcredit.max) + NF.t(', réputation ') + E.microcredit.conditions.reputation + ')</label><input id="ent-micro" class="champ" type="number" min="0" value="0"></div>';
      h += NF.t('<div style="flex:1"><label>Prêt bancaire (max ') + U.euros(E.pretBancaire.max) + NF.t(', adresse et revenus)</label><input id="ent-pret" class="champ" type="number" min="0" value="0"></div></div>');
      h += NF.t('<p class="tres-petit muted" style="margin-top:.5em">Une aide à la création réduit charges et cotisations de moitié pendant 12 mois.</p>');
      h += '<div class="carte-pied">' + UI.btn('entreprise-creer', null, NF.t('🏪 Créer l\'entreprise'), 'btn-principal') + '</div></div>';
      return h;
    }
    var sec = C.secteurEntreprise(e.secteur), st = E.statuts[e.statut];
    h += '<div class="carte selectionnee"><div class="carte-titre"><span class="carte-icone">' + sec.icone + '</span><strong>' + esc(e.nom) + '</strong><span class="etiquette bleu">' + st.nom + '</span><span class="etiquette">' + e.mois + NF.t(' mois</span>') + (e.aideRestante > 0 ? NF.t('<span class="etiquette bon">aide : ') + e.aideRestante + NF.t(' mois</span>') : '') + '</div>';
    h += NF.t('<ul class="statut-liste"><li><span>Trésorerie</span><span class="') + (e.capital < 0 ? 'mauvais' : '') + '">' + U.euros(e.capital) + '</span></li>';
    h += NF.t('<li><span>Dernier chiffre d\'affaires</span><span>') + U.euros(e.dernierCA) + '</span></li>';
    h += NF.t('<li><span>Dernier résultat</span><span class="') + (e.dernierBenefice >= 0 ? 'bon' : 'mauvais') + '">' + U.euros(e.dernierBenefice) + '</span></li>';
    h += NF.t('<li><span>Employés</span><span>') + e.employes + (st.employesMax ? ' / ' + st.employesMax : '') + '</span></li>';
    h += NF.t('<li><span>Investissements</span><span>') + e.investissements + ' / ' + E.investissement.max + '</span></li>';
    if (e.statut === 'societe') h += NF.t('<li><span>Votre rémunération</span><span>') + U.euros(e.remuneration) + NF.t('/mois</span></li>');
    if (e.prets.length) h += NF.t('<li><span>Emprunts</span><span>') + e.prets.map(function (p) { return U.euros(p.reste) + ' (' + U.euros(p.mensualite) + NF.t('/mois)'); }).join(', ') + '</span></li>';
    if (e.malusConcurrence) h += NF.t('<li><span>Concurrence</span><span class="mauvais">-') + Math.round(e.malusConcurrence * 100) + NF.t(' % de CA</span></li>');
    h += NF.t('<li><span>Valeur estimée</span><span>') + U.euros(C.valeurEntreprise(s)) + '</span></li></ul></div>';
    if (s.bilan && s.bilan.entreprise) { /* rien : le bilan est affiché en modale */ }
    h += NF.t('<h3>Décisions</h3><p class="muted petit">Les décisions ne coûtent pas de PA. Les calculs sont automatiques chaque mois.</p>');
    h += '<div class="grille-cartes">';
    h += NF.t('<div class="carte"><strong>👥 Personnel</strong><div class="carte-desc">Un employé coûte ') + U.euros(E.employe.salaireBrut * (1 + E.employe.chargesPatronales)) + NF.t('/mois chargé et ajoute ') + Math.round(E.employe.caParEmploye * 100) + NF.t(' % de chiffre d\'affaires.</div><div class="carte-pied">') + UI.btn('ent-embaucher', null, NF.t('Embaucher'), 'btn-petit', e.statut !== 'societe') + UI.btn('ent-licencier', null, NF.t('Licencier'), 'btn-petit btn-danger', e.employes <= 0) + '</div></div>';
    h += NF.t('<div class="carte"><strong>📈 Investir</strong><div class="carte-desc">') + U.euros(E.investissement.tranche) + NF.t(' pour +') + Math.round(E.investissement.bonusCA * 100) + NF.t(' % de chiffre d\'affaires durable.</div><div class="carte-pied">') + UI.btn('ent-investir', null, NF.t('Investir'), 'btn-petit', e.capital < E.investissement.tranche || e.investissements >= E.investissement.max) + '</div></div>';
    h += NF.t('<div class="carte"><strong>🏦 Emprunter</strong><div class="carte-desc">Taux ') + (E.pretBancaire.taux * 100).toFixed(1) + NF.t(' %/mois sur ') + E.pretBancaire.duree + NF.t(' mois.</div><div class="ligne"><input id="ent-montant" class="champ" type="number" min="500" step="500" value="5000" style="flex:1">') + UI.btn('ent-emprunter', null, NF.t('Emprunter'), 'btn-petit') + '</div></div>';
    if (e.statut === 'societe') h += NF.t('<div class="carte"><strong>💶 Ma rémunération</strong><div class="carte-desc">Charges de ') + Math.round(st.chargesDirigeant * 100) + NF.t(' % en plus ; imposée comme un revenu.</div><div class="ligne"><input id="ent-remu" class="champ" type="number" min="0" step="100" value="') + e.remuneration + '" style="flex:1">' + UI.btn('ent-remuneration', null, NF.t('Fixer'), 'btn-petit') + '</div></div>';
    h += NF.t('<div class="carte"><strong>🧾 Statut</strong><div class="carte-desc">') + (e.statut === 'micro' ? NF.t('Passer en société permet d\'embaucher et de dépasser le plafond de ') + U.euros(E.statuts.micro.plafondCA) + NF.t('/mois (frais ') + U.euros(E.statuts.societe.fraisCreation) + ').' : NF.t('Revenir en micro-entreprise simplifie, mais interdit les employés.')) + '</div><div class="carte-pied">' + UI.btn('ent-statut', null, e.statut === 'micro' ? NF.t('Passer en société') : NF.t('Repasser en micro'), 'btn-petit') + '</div></div>';
    h += NF.t('<div class="carte"><strong>🏚️ Fermer</strong><div class="carte-desc">Solde la trésorerie, les emprunts et les indemnités. Les dettes restantes deviennent personnelles.</div><div class="carte-pied">') + UI.btn('ent-fermer', null, NF.t('Fermer l\'entreprise'), 'btn-petit btn-danger') + '</div></div>';
    h += '</div>';
    if (e.historique && e.historique.length) h += NF.t('<p class="tres-petit muted">Résultats récents : ') + e.historique.map(function (v) { return U.euros(v); }).join(' · ') + '</p>';
    return h;
  };

  /* ================= JOURNAL ================= */
  UI.ongletJournal = function (s) {
    var h = NF.t('<h2>Journal</h2><div class="journal">');
    var dernierMois = null;
    s.journal.slice().reverse().forEach(function (e) {
      var cle = e.annee + '-' + e.mois;
      if (cle !== dernierMois) { h += '<div class="mois-titre">' + U.cap(U.MOIS[e.mois]) + NF.t(', année ') + e.annee + '</div>'; dernierMois = cle; }
      h += '<div class="' + esc(e.type) + '">' + esc(e.texte) + '</div>';
    });
    return h + '</div>';
  };
})();
