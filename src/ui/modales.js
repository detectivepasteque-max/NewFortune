/* =====================================================================
 * UI – MODALES : bilan, événement, mort, héritier, fin, aide, confirmation
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var C = NF.core;
  var esc = U.esc;

  UI.modaleBilan = function (s) {
    var b = s.bilan;
    var h = NF.t('<div class="modale-boite large"><div class="modale-famille">Bilan du mois</div><h2>') + U.cap(U.MOIS[b.mois]) + NF.t(', année ') + b.annee + NF.t(' <span class="muted petit">· économie ') + b.conjoncture.icone + ' ' + b.conjoncture.nom + '</span></h2>';
    h += NF.t('<div class="bilan-grille"><div><h3>Revenus</h3><ul class="bilan-liste">');
    if (!b.revenus.length) h += NF.t('<li><span class="muted">Aucun revenu</span><span></span></li>');
    b.revenus.forEach(function (r) { h += '<li><span>' + esc(r.nom) + '</span><span class="bon">+' + U.euros(r.montant) + '</span></li>'; });
    h += NF.t('<li class="total"><span>Total</span><span class="bon">+') + U.euros(b.totalRevenus) + '</span></li></ul></div>';
    h += NF.t('<div><h3>Dépenses</h3><ul class="bilan-liste">');
    if (!b.depenses.length) h += NF.t('<li><span class="muted">Aucune dépense</span><span></span></li>');
    b.depenses.forEach(function (d) { h += '<li><span>' + esc(d.nom) + '</span><span class="mauvais">-' + U.euros(d.montant) + '</span></li>'; });
    h += NF.t('<li class="total"><span>Total</span><span class="mauvais">-') + U.euros(b.totalDepenses) + '</span></li></ul></div></div>';
    h += NF.t('<p style="margin-top:.8em"><strong>Solde du mois : <span class="') + (b.solde >= 0 ? 'bon' : 'mauvais') + '">' + (b.solde >= 0 ? '+' : '') + U.euros(b.solde) + NF.t('</span></strong> · argent : ') + U.euros(s.joueur.argent) + (s.joueur.dette ? NF.t(' · dette : <span class="mauvais">') + U.euros(s.joueur.dette) + '</span>' : '') + '</p>';
    if (b.entreprise) {
      h += NF.t('<h3>Entreprise</h3><ul class="bilan-liste">');
      b.entreprise.lignes.forEach(function (l) { h += '<li><span>' + esc(l.nom) + '</span><span class="' + (l.montant >= 0 ? 'bon' : 'mauvais') + '">' + (l.montant >= 0 ? '+' : '-') + U.euros(Math.abs(l.montant)) + '</span></li>'; });
      h += NF.t('<li class="total"><span>Résultat · trésorerie</span><span>') + U.euros(b.entreprise.resultat) + ' · ' + U.euros(b.entreprise.capital) + '</span></li></ul>';
    }
    if (b.textes.length) h += '<div class="bilan-textes">' + b.textes.map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>';
    h += UI.deltasHtml(b.deltas);
    /* deux premiers bilans : dire au débutant comment tenir un mois */
    if (s.temps.moisAbsolu <= 1) h += '<div class="conseil">' + NF.t('💡 Le mois prochain : mangez, reposez-vous, lavez-vous, puis travaillez. Les jauges s\'usent à la fin de chaque mois, et finir un mois exténué coûte un point d\'action.') + '</div>';
    h += '<div class="modale-pied">' + UI.btn('bilan-ok', null, NF.t('Continuer ▸'), 'btn-principal') + '</div></div>';
    return h;
  };

  var NOMS_FAMILLES = { sante: NF.t('Santé'), securite: NF.t('Sécurité'), social: NF.t('Social'), administratif: NF.t('Administratif'), travail: NF.t('Travail'), economie: NF.t('Économie'), famille: NF.t('Famille'), divers: NF.t('Vie quotidienne') };

  UI.modaleEvenement = function (s) {
    var ev = s.evenementCourant;
    var h = '<div class="modale-boite"><span class="modale-icone">' + ev.icone + NF.t('</span><div class="modale-famille">Événement · ') + esc(NOMS_FAMILLES[ev.famille] || ev.famille) + '</div><h2>' + esc(ev.titre) + '</h2>';
    h += '<div class="modale-texte">' + esc(ev.texte) + '</div>';
    if (ev.resultat == null) {
      if (ev.choix.length) {
        h += '<div class="choix-liste">' + ev.choix.map(function (c) {
          return '<button class="choix" data-act="choix" data-arg="' + c.index + '"' + (c.ok ? '' : ' disabled') + '>' + esc(c.texte) + (c.ok ? '' : '<span class="raisons">' + esc(c.raisons.join(', ')) + '</span>') + '</button>';
        }).join('') + '</div>';
      } else {
        h += '<div class="modale-pied">' + UI.btn('choix', 0, NF.t('Continuer ▸'), 'btn-principal') + '</div>';
      }
    } else {
      h += '<div class="resultat-evenement">' + (ev.resultat ? esc(ev.resultat) : '<span class="muted">…</span>') + UI.deltasHtml(ev.deltas) + '</div>';
      h += '<div class="modale-pied">' + UI.btn('evenement-suivant', null, s.mort ? NF.t('Continuer ▸') : (s.evenementsEnAttente.length ? NF.t('Événement suivant ▸') : NF.t('Continuer ▸')), 'btn-principal') + '</div>';
    }
    return h + '</div>';
  };

  UI.modaleMort = function (s) {
    var j = s.joueur, m = s.mort;
    var heritiers = C.heritiersPossibles(s);
    var h = NF.t('<div class="modale-boite"><span class="modale-icone">🕯️</span><div class="modale-famille">Fin de vie</div><h2>') + esc(j.prenom + ' ' + j.nom) + NF.t(' est mort') + (m.cause ? ' ' + esc(m.cause) : '') + '.</h2>';
    h += NF.t('<div class="modale-texte">À ') + m.age + NF.t(' ans, après ') + Math.floor(s.temps.moisAbsolu / 12) + NF.t(' années pour la lignée. Catégorie sociale maximale atteinte : ') + NF.data.classes[j.classeMax - 1].icone + ' ' + esc(NF.data.classes[j.classeMax - 1].nom) + '.</div>';
    if (heritiers.length) h += '<p>' + heritiers.length + (heritiers.length > 1 ? NF.t(' héritiers possibles') : NF.t(' héritier possible')) + NF.t('. La lignée continue… après la succession.</p>');
    else h += NF.t('<p class="mauvais">Personne pour reprendre le flambeau. La lignée s\'éteint.</p>');
    h += '<div class="modale-pied">' + UI.btn('mort-ok', null, heritiers.length ? NF.t('Choisir un héritier ▸') : NF.t('Voir le bilan de la lignée ▸'), 'btn-principal') + '</div></div>';
    return h;
  };

  UI.modaleHeritier = function (s) {
    var heritiers = C.heritiersPossibles(s);
    var calc = C.calculerSuccession(s, heritiers.length);
    var h = NF.t('<div class="modale-boite large"><div class="modale-famille">Succession</div><h2>Choisir un héritier</h2>');
    h += NF.t('<div class="bilan-grille"><div><h3>Patrimoine transmis</h3><ul class="bilan-liste">');
    h += NF.t('<li><span>Argent</span><span>') + U.euros(s.joueur.argent) + '</span></li>';
    if (calc.logement) h += NF.t('<li><span>Logement (') + esc(C.logementActuel(s).nom) + ')</span><span>' + U.euros(calc.logement) + '</span></li>';
    if (calc.entreprise) h += NF.t('<li><span>Entreprise</span><span>') + U.euros(calc.entreprise) + '</span></li>';
    h += NF.t('<li class="total"><span>Brut</span><span>') + U.euros(calc.brut) + '</span></li></ul></div>';
    h += NF.t('<div><h3>Prélèvements</h3><ul class="bilan-liste">');
    h += NF.t('<li><span>Abattement</span><span class="bon">-') + U.euros(calc.abattement) + NF.t(' de base taxable</span></li>');
    h += NF.t('<li><span>Droits de succession</span><span class="mauvais">-') + U.euros(calc.droits) + '</span></li>';
    h += NF.t('<li><span>Frais de notaire</span><span class="mauvais">-') + U.euros(calc.notaire) + '</span></li>';
    h += NF.t('<li><span>Impôts en retard réclamés</span><span class="mauvais">-') + U.euros(calc.retard) + '</span></li>';
    if (calc.dettes) h += NF.t('<li><span>Dettes transmises</span><span class="mauvais">-') + U.euros(calc.dettes) + '</span></li>';
    h += NF.t('<li class="total"><span>Net</span><span class="') + (calc.net >= 0 ? 'bon' : 'mauvais') + '">' + U.euros(calc.net) + '</span></li></ul></div></div>';
    h += NF.t('<p class="petit muted">L\'argent paie les prélèvements ; s\'il ne suffit pas, l\'héritier démarre avec une dette. Le logement possédé et l\'entreprise sont conservés en nature. L\'héritier garde la position sociale, la moitié de la réputation, et perd ') + NF.data.impots.succession.moisDemarches + NF.t(' mois en démarches (1 PA en moins). Un mineur passe sous tutelle jusqu\'à 18 ans.</p>');
    h += NF.t('<h3>Héritiers</h3><div class="heritier-liste grille-cartes">');
    s.joueur.famille.enfants.forEach(function (e, i) {
      if (e.sante <= 0) return;
      var annees = Math.floor(e.age / 12);
      h += '<div class="carte" data-act="heritier" data-arg="' + i + '"><div class="carte-titre"><span class="carte-icone">' + (annees < 12 ? '🧒' : annees < 18 ? '🧑' : '🧑‍🎓') + '</span><strong>' + esc(e.prenom) + '</strong><span class="etiquette">' + UI.ageTexte(e.age) + (annees < 18 ? NF.t(' · tutelle ') + (18 - annees) + NF.t(' ans') : '') + '</span></div>';
      h += NF.t('<div class="petit">Éducation ') + Math.round(e.education) + '</div>' + UI.miniBarre(e.education, '#b088f9') + NF.t('<div class="petit">Santé ') + Math.round(e.sante) + '</div>' + UI.miniBarre(e.sante, '#5b9cf6') + NF.t('<div class="petit">Relation ') + Math.round(e.relation) + '</div>' + UI.miniBarre(e.relation);
      h += '<div class="carte-pied">' + UI.btn('heritier', i, NF.t('Choisir ') + esc(e.prenom), 'btn-petit btn-principal') + '</div></div>';
    });
    h += '</div></div>';
    return h;
  };

  UI.modaleSuccession = function (s, resume) {
    var n = s.joueur;
    var h = NF.t('<div class="modale-boite"><span class="modale-icone">🧬</span><div class="modale-famille">Génération ') + s.lignee.generation + '</div><h2>' + esc(n.prenom + ' ' + n.nom) + NF.t(' reprend le flambeau</h2>');
    h += '<div class="modale-texte">' + (resume.tutelle ? NF.t('Après ') + Math.round(resume.tutelle / 12) + NF.t(' années sous tutelle, ') : '') + n.prenom + NF.t(' a 18 ans. ') + (n.argent > 0 ? NF.t('Il reste ') + U.euros(n.argent) + NF.t(' après la succession.') : NF.t('La succession a tout absorbé') + (n.dette > 0 ? NF.t(', et laisse ') + U.euros(n.dette) + NF.t(' de dettes.') : '.')) + NF.t(' Logement : ') + esc(C.logementActuel(s).nom) + NF.t('. Traits : ') + n.traits.map(function (t) { return esc(U.byId(NF.data.traits, t).nom); }).join(', ') + '.</div>';
    h += '<div class="modale-pied">' + UI.btn('succession-ok', null, NF.t('Commencer ▸'), 'btn-principal') + '</div></div>';
    return h;
  };

  UI.modaleFin = function (s) {
    var r = s.resultatFinal;
    var h = NF.t('<div class="modale-boite large"><span class="modale-icone">🏁</span><div class="modale-famille">Fin de la lignée</div><h2>La lignée ') + esc(s.joueur.nom) + NF.t(' s\'éteint</h2>');
    h += '<div class="modale-texte">' + s.lignee.generation + (s.lignee.generation > 1 ? NF.t(' générations') : NF.t(' génération')) + ', ' + Math.floor(s.temps.moisAbsolu / 12) + NF.t(' années, ') + s.lignee.succes.length + NF.t(' accomplissement') + (s.lignee.succes.length > 1 ? 's' : '') + '.</div>';
    h += '<table class="score-table">' + r.score.details.map(function (d) { return '<tr><td>' + esc(d.nom) + ' <span class="muted">(' + esc(String(d.valeur)) + ')</span></td><td>' + d.points + '</td></tr>'; }).join('') + NF.t('<tr><td><strong>Score</strong></td><td><span class="gros-chiffre">') + r.score.total + '</span></td></tr></table>';
    h += '<p>' + (r.rang ? NF.t('🏆 Rang ') + r.rang + NF.t(' des meilleures lignées. ') : '') + NF.t('Vous gagnez <strong class="accent">') + r.points + NF.t(' points</strong> de bonus (total : ') + r.meta.points + ').</p>';
    if (s.lignee.succes.length) h += '<div class="ligne">' + s.lignee.succes.map(function (id) { var su = U.byId(NF.data.succes, id); return su ? '<span class="etiquette bon">' + su.icone + ' ' + esc(su.nom) + '</span>' : ''; }).join('') + '</div>';
    h += NF.t('<p class="tres-petit muted" style="margin-top:.6em">Graine : ') + esc(s.graine) + '</p>';
    h += '<div class="modale-pied">' + UI.btn('retour-titre', null, NF.t('Retour au menu ▸'), 'btn-principal') + '</div></div>';
    return h;
  };

  UI.modaleAide = function () {
    return '<div class="modale-boite large">' + UI.aideHtml() + '<div class="modale-pied">' + UI.btn('fermer-modale', null, NF.t('Fermer'), 'btn-principal') + '</div></div>';
  };

  UI.modaleConfirmation = function (m) {
    return '<div class="modale-boite"><h2>' + esc(m.titre || NF.t('Confirmer')) + '</h2><div class="modale-texte">' + esc(m.texte) + '</div><div class="modale-pied">' + UI.btn('fermer-modale', null, NF.t('Annuler')) + UI.btn('confirmer', null, m.bouton || NF.t('Confirmer'), 'btn-principal btn-danger') + '</div></div>';
  };

  UI.modaleMessage = function (m) {
    return '<div class="modale-boite"><h2>' + esc(m.titre || '') + '</h2><div class="modale-texte">' + esc(m.texte) + '</div><div class="modale-pied">' + UI.btn('fermer-modale', null, NF.t('OK'), 'btn-principal') + '</div></div>';
  };
})();
