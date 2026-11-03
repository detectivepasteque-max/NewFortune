/* =====================================================================
 * UI – ÉCRAN DE JEU : en-tête, scène, jauges, colonne de droite
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var C = NF.core;
  var esc = U.esc;

  UI.ONGLETS = [
    { id: 'actions', nom: NF.t('Actions'), icone: '🎯' },
    { id: 'emploi', nom: NF.t('Emploi'), icone: '💼' },
    { id: 'logement', nom: NF.t('Logement'), icone: '🏠' },
    { id: 'savoir', nom: NF.t('Savoir'), icone: '📖' },
    { id: 'objets', nom: NF.t('Objets'), icone: '🎒' },
    { id: 'famille', nom: NF.t('Famille'), icone: '👨‍👩‍👧' },
    { id: 'entreprise', nom: NF.t('Entreprise'), icone: '🏪' },
    { id: 'journal', nom: NF.t('Journal'), icone: '📓' },
  ];

  UI.rendreJeu = function (s, vue) {
    var h = '<div class="jeu">';
    h += UI.enteteHtml(s);
    h += '<div class="scene">' + UI.scene(s) + '</div>';
    h += UI.jaugesHtml(s);
    h += '<div class="corps"><div class="colonne-gauche">';
    h += '<div class="onglets">' + UI.ONGLETS.map(function (o) {
      var badge = '';
      if (o.id === 'famille' && (s.joueur.famille.partenaire || s.joueur.famille.enfants.length)) badge = '<span class="badge">' + ((s.joueur.famille.partenaire ? 1 : 0) + s.joueur.famille.enfants.length) + '</span>';
      if (o.id === 'logement' && s.joueur.drapeaux.hebergement_propose) badge = '<span class="badge">!</span>';
      return '<button class="onglet' + (vue.onglet === o.id ? ' actif' : '') + '" data-act="onglet" data-arg="' + o.id + '">' + o.icone + ' ' + o.nom + badge + '</button>';
    }).join('') + '</div>';
    h += '<div class="contenu-onglet panneau">' + UI.rendreOnglet(s, vue) + '</div>';
    h += '</div>';
    h += '<div class="colonne-droite">' + UI.colonneDroiteHtml(s, vue) + '</div>';
    h += '</div></div>';
    return h;
  };

  UI.enteteHtml = function (s) {
    var j = s.joueur;
    var conj = C.texteConjoncture(s);
    var h = '<div class="entete">';
    h += '<div class="identite"><strong>' + esc(j.prenom + ' ' + j.nom) + '</strong><span class="muted petit">' + C.ageAnnees(s) + NF.t(' ans · ') + UI.classeHtml(s) + NF.t(' · génération ') + s.lignee.generation + '</span></div>';
    h += '<div class="date">' + UI.dateTexte(s) + ' <span class="muted petit">· ' + U.SAISONS[C.saison(s)] + '</span></div>';
    h += '<div class="espace"></div>';
    h += NF.t('<div class="stat"><span>Argent</span><span class="') + (j.argent < 20 ? 'mauvais' : '') + '">' + U.euros(j.argent) + '</span></div>';
    if (j.dette > 0) h += NF.t('<div class="stat"><span>Dette</span><span class="mauvais">') + U.euros(j.dette) + '</span></div>';
    h += NF.t('<div class="stat"><span>Réputation</span><span>⭐ ') + Math.round(j.reputation) + '</span></div>';
    h += '<div class="stat" title="' + esc(NF.t('Conjoncture économique')) + '"><span>' + NF.t('Économie') + '</span><span>' + conj.icone + ' ' + conj.nom + '</span></div>';
    h += '<div class="boutons">' + UI.btn('menu', null, NF.t('☰ Menu'), 'btn-petit', false, NF.t('Retour au menu (la partie est sauvegardée)')) + '</div>';
    h += '</div>';
    return h;
  };

  UI.jaugesHtml = function (s) {
    var cles = ['sante', 'nourriture', 'energie', 'hygiene', 'moral'];
    return '<div class="jauges">' + cles.map(function (k) {
      var v = s.joueur.jauges[k], L = NF.api.LIBELLES[k];
      return '<div class="jauge" title="' + esc(L.nom) + ' : ' + Math.round(v) + '/100"><div class="jauge-tete"><span>' + L.icone + ' ' + L.nom + '</span><span class="val" style="color:' + UI.couleurJauge(v) + '">' + Math.round(v) + '</span></div>' +
        '<div class="jauge-barre"><div style="width:' + v + '%;background:' + UI.couleurJauge(v) + '"></div></div><div class="jauge-etat">' + UI.etatJauge(k, v) + '</div></div>';
    }).join('') + '</div>';
  };

  UI.colonneDroiteHtml = function (s, vue) {
    var j = s.joueur, l = C.logementActuel(s), m = C.metierActuel(s);
    var h = '<div class="panneau">';
    h += NF.t('<h3>Points d\'action</h3><div class="pa-affichage"><div class="pa-points">');
    for (var i = 0; i < Math.max(s.paMax, 1); i++) h += '<div class="pa-point' + (i < s.pa ? '' : ' vide') + '"></div>';
    h += '</div><span class="muted petit">' + s.pa + ' / ' + s.paMax + '</span></div>';
    if (s.paMax < NF.data.config.paParMois) {
      var raisons = [];
      if (m && m.pa) raisons.push(NF.t('emploi'));
      if (j.formation) raisons.push(NF.t('formation'));
      if (j.entreprise) raisons.push(NF.t('entreprise'));
      if (j.jauges.energie < NF.data.config.paMalusEnergie) raisons.push(NF.t('épuisement'));
      if (j.jauges.sante < NF.data.config.paMalusSante) raisons.push(NF.t('santé'));
      if (j.drapeaux.demarches_succession > 0) raisons.push(NF.t('succession'));
      if (raisons.length) h += NF.t('<p class="tres-petit muted">Moins de PA : ') + raisons.join(', ') + '.</p>';
    }
    /* prévenir avant de terminer le mois exténué (−1 PA le mois suivant) */
    var u = C.usurePrevue(s), seuilEnergie = NF.data.config.paMalusEnergie;
    if (j.jauges.energie < seuilEnergie) h += '<p class="tres-petit avert">' + NF.t('⚠️ Exténué : 1 PA de moins le mois prochain. Reposez-vous avant de terminer le mois.') + '</p>';
    else if (j.jauges.energie + u.energie + u.travail < seuilEnergie) h += '<p class="tres-petit avert">' + NF.t('⚠️ Avec l\'usure du mois, vous finirez exténué : 1 PA de moins le mois prochain. Reposez-vous avant de terminer le mois.') + '</p>';
    h += UI.btn('fin-mois', null, s.pa > 0 ? NF.t('⏭ Terminer le mois (') + s.pa + NF.t(' PA restants)') : NF.t('⏭ Terminer le mois'), 'btn-principal btn-bloc');
    h += '</div>';

    h += NF.t('<div class="panneau"><h3>Situation</h3><ul class="statut-liste">');
    h += NF.t('<li><span>Logement</span><span>') + l.icone + ' ' + esc(l.nom) + (l.dureeMax ? ' <span class="tres-petit muted">(' + (l.dureeMax - j.logementMois) + NF.t(' mois)</span>') : '') + '</span></li>';
    h += NF.t('<li><span>Emploi</span><span>') + (m ? m.icone + ' ' + esc(m.nom) + ' <span class="tres-petit muted">' + U.euros(j.emploi.salaire) + '</span>' : NF.t('<span class="muted">aucun</span>')) + '</span></li>';
    if (j.formation) { var f = U.byId(NF.data.formations, j.formation.id); h += NF.t('<li><span>Formation</span><span>') + f.icone + ' ' + esc(f.nom) + ' <span class="tres-petit muted">' + j.formation.moisRestants + NF.t(' mois</span></span></li>'); }
    if (j.entreprise) h += NF.t('<li><span>Entreprise</span><span>🏪 ') + esc(j.entreprise.nom) + '</span></li>';
    h += NF.t('<li><span>Domiciliation</span><span>') + (j.domiciliation ? NF.t('<span class="bon">oui</span>') : NF.t('<span class="mauvais">non</span>')) + '</span></li>';
    if (j.permis) h += NF.t('<li><span>Permis</span><span class="bon">oui</span></li>');
    if (j.casier) h += NF.t('<li><span>Casier</span><span class="mauvais">judiciaire</span></li>');
    if (j.maladie) h += NF.t('<li><span>Maladie</span><span class="mauvais">🤒 ') + esc(j.maladie.nom) + ' (' + j.maladie.moisRestants + NF.t(' mois)</span></li>');
    var aides = []; for (var a in j.aides) if (j.aides[a]) aides.push(a.toUpperCase());
    if (aides.length) h += NF.t('<li><span>Aides</span><span>') + aides.join(', ') + '</span></li>';
    if (j.famille.partenaire) h += NF.t('<li><span>Couple</span><span>💞 ') + esc(j.famille.partenaire.prenom) + '</span></li>';
    if (j.famille.enfants.length) h += NF.t('<li><span>Enfants</span><span>') + j.famille.enfants.length + '</span></li>';
    h += NF.t('<li><span>Traits</span><span>') + j.traits.map(function (t) { var tt = U.byId(NF.data.traits, t); return '<span class="etiquette" title="' + esc(tt.desc) + '">' + esc(tt.nom) + '</span>'; }).join(' ') + '</span></li>';
    h += '<li><span>' + NF.t('Graine') + '</span><span class="tres-petit muted" title="' + esc(NF.t('Rejouez cette graine pour retrouver la même ville')) + '">' + esc(s.graine) + '</span></li>';
    h += '</ul></div>';

    h += NF.t('<div class="panneau"><h3>Derniers faits</h3><div class="journal-mini">');
    var der = s.journal.slice(-8).reverse();
    der.forEach(function (e) { h += '<div class="' + esc(e.type) + '">' + esc(e.texte) + '</div>'; });
    h += '</div></div>';
    return h;
  };
})();
