/* =====================================================================
 * INVENTAIRE ET FABRICATION
 * ===================================================================== */
(function () {
  var C = NF.core;
  var U = NF.util;

  /** Vérifie une recette. Retourne { ok, raisons } */
  C.verifierRecette = function (s, r) {
    var raisons = [];
    var res = U.byId(NF.data.objets, r.resultat);
    if (!res) raisons.push(NF.t('objet résultat inconnu'));
    for (var id in r.ingredients) {
      var o = U.byId(NF.data.objets, id);
      var manque = r.ingredients[id] - (s.joueur.inventaire[id] || 0);
      if (manque > 0) raisons.push(NF.t('il manque ') + manque + ' × ' + (o ? NF.util.minuscule(o.nom) : id));
    }
    if (r.competences) for (var c in r.competences) {
      if (C.niveauCompetence(s, c) < r.competences[c]) { var cc = U.byId(NF.data.competences, c); raisons.push((cc ? cc.nom : c) + NF.t(' niveau ') + r.competences[c]); }
    }
    if (r.objetsRequis) r.objetsRequis.forEach(function (id) {
      if (!NF.api.aObjet(s, id)) { var o = U.byId(NF.data.objets, id); raisons.push(NF.t('il faut : ') + (o ? NF.util.minuscule(o.nom) : id)); }
    });
    /* place : on libère les ingrédients puis on ajoute le résultat */
    if (res) {
      var libere = 0;
      for (var i2 in r.ingredients) { var oi = U.byId(NF.data.objets, i2); libere += (oi && oi.taille != null ? oi.taille : 1) * r.ingredients[i2]; }
      var besoin = (res.taille == null ? 1 : res.taille) * (r.quantite || 1);
      if (NF.api.placeLibre(s) + libere < besoin) raisons.push(NF.t('pas assez de place dans l\'inventaire'));
    }
    return { ok: raisons.length === 0, raisons: raisons };
  };

  C.fabriquer = function (s, id) {
    var r = U.byId(NF.data.recettes, id);
    if (!r) return NF.t('Recette inconnue.');
    var v = C.verifierRecette(s, r);
    if (!v.ok) return NF.t('Impossible : ') + v.raisons.join(', ') + '.';
    for (var ing in r.ingredients) NF.api.retirerObjet(s, ing, r.ingredients[ing]);
    var res = U.byId(NF.data.objets, r.resultat);
    var n = NF.api.ajouterObjet(s, r.resultat, r.quantite || 1);
    if (r.xp) for (var c in r.xp) NF.api.ajouterXp(s, c, r.xp[c] * NF.api.passif(s, 'bricolage') * C.modifTrait(s, 'bricolage'));
    NF.api.modifierJauge(s, 'energie', -4);
    NF.api.modifierJauge(s, 'moral', 3);
    s.stats.fabrications = (s.stats.fabrications || 0) + 1;
    NF.api.journal(s, NF.t('🔧 Fabriqué : ') + res.icone + ' ' + res.nom + (n > 1 ? ' × ' + n : '') + '.');
    return NF.t('Vous fabriquez ') + res.icone + ' ' + res.nom + (n > 1 ? ' × ' + n : '') + '. ' + (r.desc || '');
  };

  /** Utilise un consommable */
  C.utiliserObjet = function (s, id) {
    var o = U.byId(NF.data.objets, id);
    if (!o || !NF.api.aObjet(s, id)) return NF.t('Vous n\'avez pas cet objet.');
    if (!o.usage) return NF.t('Cet objet agit tout seul tant qu\'il est dans votre sac.');
    NF.api.retirerObjet(s, id, 1);
    NF.api.appliquerEffets(s, o.usage);
    return NF.t('Vous utilisez ') + NF.util.minuscule(o.nom) + '.';
  };

  C.vendreObjet = function (s, id) {
    var o = U.byId(NF.data.objets, id);
    if (!o || !NF.api.aObjet(s, id)) return NF.t('Vous n\'avez pas cet objet.');
    if (!o.vente) return NF.t('Personne n\'en veut.');
    var prix = Math.round(o.vente * (0.8 + 0.4 * NF.rng.random()) * (1 + 0.1 * C.niveauCompetence(s, 'commerce')));
    NF.api.retirerObjet(s, id, 1);
    NF.api.ajouterArgent(s, prix);
    return NF.t('Vendu : ') + o.nom + NF.t(' pour ') + U.euros(prix) + '.';
  };

  C.jeterObjet = function (s, id) {
    var o = U.byId(NF.data.objets, id);
    if (!o || !NF.api.aObjet(s, id)) return NF.t('Vous n\'avez pas cet objet.');
    NF.api.retirerObjet(s, id, 1);
    return NF.t('Vous abandonnez ') + NF.util.minuscule(o.nom) + '.';
  };

  C.acheterObjet = function (s, id) {
    var o = U.byId(NF.data.objets, id);
    if (!o || !o.prix) return NF.t('Introuvable en magasin.');
    var prix = C.prixAchat(s, o);
    if (s.joueur.argent < prix) return NF.t('Il vous manque ') + U.euros(prix - s.joueur.argent) + '.';
    if (o.id === 'voiture' && !s.joueur.permis) return NF.t('Il faut le permis de conduire.');
    if (NF.api.ajouterObjet(s, id, 1) < 1) return NF.t('Plus de place dans votre inventaire.');
    NF.api.retirerArgent(s, prix, false);
    return NF.t('Acheté : ') + o.icone + ' ' + o.nom + NF.t(' pour ') + U.euros(prix) + '.';
  };

  C.prixAchat = function (s, o) {
    var p = o.prix;
    if (C.aLieu(s, 'ressourcerie') && o.prix < 200) p *= 0.75;
    p *= 1 - 0.03 * C.niveauCompetence(s, 'commerce');
    return Math.max(1, Math.round(p));
  };

  /** Objets achetables (ont un prix) */
  C.boutique = function (s) {
    return NF.data.objets.filter(function (o) { return o.prix > 0; });
  };

  /** Perte d'objets fragiles quand on vit dehors */
  C.usureObjets = function (s, bilan) {
    var l = C.logementActuel(s);
    if (!l.expose) return;
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (o && o.fragile && NF.rng.chance(o.fragile * (C.saison(s) === 'hiver' ? 1.5 : 1))) {
        NF.api.retirerObjet(s, id, 1);
        bilan.textes.push(o.icone + ' ' + o.nom + NF.t(' : perdu, volé ou cassé.'));
      }
    }
  };
})();
