/* =====================================================================
 * ACTIONS DU JOUEUR (onglet "Actions")
 * ---------------------------------------------------------------------
 * Chaque mois, le joueur dispose de quelques points d'action (PA).
 *
 * Champs :
 *   id, nom, icone, desc
 *   categorie  : 'survie' | 'soin' | 'social' | 'famille' | 'travail' | 'loisirs'
 *   pa         : coût en points d'action (défaut 1)
 *   conditions : objet déclaratif (voir src/core/etat.js, verifierConditions)
 *   condition  : fonction (s) -> booléen (optionnel)
 *   visible    : fonction (s) -> booléen ; si faux, l'action est cachée
 *   info       : fonction (s) -> texte court affiché sous l'action (optionnel)
 *   effet      : fonction (s) -> texte de résultat. Applique les
 *                changements avec NF.api.* ; le moteur calcule et affiche
 *                automatiquement les variations de jauges.
 *                Un texte commençant par "Impossible" annule l'action
 *                (les PA ne sont pas dépensés).
 * ===================================================================== */
(function () {
  var C = NF.core, A = NF.api, U = NF.util;
  var r = function () { return NF.rng; };

  /** Meilleur talent de rue du joueur : { id, niveau } parmi musique, jonglage,
   *  danse, magie et théâtre (utilisé par « Spectacle de rue »). */
  function talentRue(s) {
    var best = { id: null, niveau: 0 };
    ['musique', 'cirque', 'danse', 'magie', 'theatre'].forEach(function (id) {
      var n = C.niveauCompetence(s, id);
      if (n > best.niveau) best = { id: id, niveau: n };
    });
    return best;
  }

  NF.data.actions = [

    /* ======================= SURVIE ======================= */
    { id: 'mendier', nom: NF.t('Faire la manche'), icone: '🥣', categorie: 'survie',
      desc: NF.t('Tendre la main dans la rue ou à la sortie du métro.'),
      conditions: { logementOrdreMax: 3 },
      info: function (s) { return A.aObjet(s, 'panneau') ? NF.t('Votre panneau attire l\'œil.') : NF.t('Un panneau rendrait cela plus efficace.'); },
      effet: function (s) {
        var base = r().entre(14, 45);
        var m = A.passif(s, 'mendicite') * C.modifTrait(s, 'mendicite') * C.efficacite(s);
        m *= 0.75 + 0.5 * (s.joueur.reputation / 100);
        m *= 0.6 + 0.4 * (s.joueur.jauges.hygiene / 100 + 0.5);
        if (C.aLieu(s, 'gare')) m *= 1 + 0.25 * C.qualiteLieu(s, 'gare');
        if (s.temps.mois === 11) m *= 1.35;           // décembre : générosité
        if (C.saison(s) === 'ete') m *= 0.85;
        var gain = Math.round(base * m);
        A.ajouterArgent(s, gain);
        A.modifierJauge(s, 'moral', -2);
        A.modifierJauge(s, 'energie', -2);
        s.stats.mendicite = (s.stats.mendicite || 0) + 1;
        if (r().chance(0.08)) C.forcerEvenement(s, 'controle_police_manche');
        if (gain < 8) return NF.t('Une journée à tendre la main pour presque rien : ') + U.euros(gain) + '.';
        if (gain > 40) return NF.t('Une bonne journée : des passants généreux, ') + U.euros(gain) + NF.t(' au total.');
        return NF.t('Quelques pièces : ') + U.euros(gain) + '.';
      } },

    { id: 'chercher_nourriture', nom: NF.t('Chercher de la nourriture'), icone: '🍞', categorie: 'survie',
      desc: NF.t('Invendus du marché, fin de service des restaurants, distributions.'),
      conditions: { logementOrdreMax: 3 },
      effet: function (s) {
        var base = r().entre(30, 52) * A.passif(s, 'fouille') * C.modifTrait(s, 'fouille');
        var lieux = [];
        if (C.aLieu(s, 'marche')) { base *= 1 + 0.3 * C.qualiteLieu(s, 'marche'); lieux.push(NF.t('du marché')); }
        if (C.aLieu(s, 'association')) { base *= 1 + 0.2 * C.qualiteLieu(s, 'association'); lieux.push(NF.t('de l\'association')); }
        if (C.aLieu(s, 'eglise')) { base *= 1.15; lieux.push(NF.t('de la soupe populaire')); }
        base *= 1 + 0.08 * C.niveauCompetence(s, 'cuisine');
        var gain = A.modifierJauge(s, 'nourriture', Math.round(base));
        A.modifierJauge(s, 'hygiene', -3);
        A.modifierJauge(s, 'moral', 2);
        if (r().chance(0.06)) { A.modifierJauge(s, 'sante', -6); return NF.t('Quelque chose n\'était plus bon. Vous êtes malade toute la nuit.'); }
        if (r().chance(0.25) && A.placeLibre(s) > 0) { A.ajouterObjet(s, 'conserve', 1); return NF.t('Vous mangez à votre faim et mettez une conserve de côté.'); }
        return NF.t('Vous trouvez de quoi manger du côté ') + (lieux.length ? lieux.join(NF.t(' et ')) : NF.t('des poubelles de restaurants')) + '. +' + Math.round(gain) + NF.t(' faim.');
      } },

    { id: 'fouiller', nom: NF.t('Fouiller les bennes'), icone: '🗑️', categorie: 'survie',
      desc: NF.t('Cartons, ficelle, ferraille, bouteilles : de quoi fabriquer.'),
      conditions: { logementOrdreMax: 4 },
      info: function (s) { return NF.t('Place libre : ') + A.placeLibre(s) + '/' + A.capaciteInventaire(s) + '.'; },
      effet: function (s) {
        var nb = r().int(1, 3);
        if (C.aTrait(s, 'debrouillard')) nb++;
        if (C.aLieu(s, 'zone')) nb += r().chance(0.5 * C.qualiteLieu(s, 'zone')) ? 1 : 0;
        if (C.aLieu(s, 'ressourcerie')) nb += r().chance(0.4) ? 1 : 0;
        nb = Math.round(nb * A.passif(s, 'fouille'));
        var trouves = [], candidats = NF.data.objets.filter(function (o) { return o.fouille > 0; });
        for (var i = 0; i < nb; i++) {
          var o = r().pondere(candidats, function (x) { return x.fouille; });
          if (o && A.ajouterObjet(s, o.id, 1) > 0) trouves.push(o.icone + ' ' + NF.util.minuscule(o.nom));
          else if (o) { trouves.push(NF.t('(plus de place pour ') + NF.util.minuscule(o.nom) + ')'); break; }
        }
        A.modifierJauge(s, 'hygiene', -5);
        A.modifierJauge(s, 'energie', -3);
        if (r().chance(0.04)) { A.modifierJauge(s, 'sante', -5); return NF.t('Vous vous coupez sur un morceau de verre. ') + (trouves.length ? NF.t('Trouvé : ') + trouves.join(', ') + '.' : ''); }
        return trouves.length ? NF.t('Trouvé : ') + trouves.join(', ') + '.' : NF.t('Rien d\'utile aujourd\'hui.');
      } },

    { id: 'fouiller_poubelles', nom: NF.t('Fouiller les poubelles'), icone: '🚮', categorie: 'survie',
      desc: NF.t('Les poubelles des immeubles et des commerces : restes encore bons, pièces oubliées, petits objets.'),
      conditions: { logementOrdreMax: 3 },
      effet: function (s) {
        var m = A.passif(s, 'fouille') * C.modifTrait(s, 'fouille');
        var gainFaim = Math.round(r().entre(6, 18) * m);
        A.modifierJauge(s, 'nourriture', gainFaim);
        A.modifierJauge(s, 'hygiene', -7);
        A.modifierJauge(s, 'moral', -2);
        var trouves = [];
        if (r().chance(0.45)) { var pieces = r().int(2, 12); A.ajouterArgent(s, pieces); trouves.push(U.euros(pieces) + NF.t(' en pièces')); }
        var petits = ['bouteille', 'boite_conserve', 'cafe', 'sandwich', 'ficelle', 'briquet', 'lampe', 'livre', 'conserve'];
        if (r().chance(Math.min(0.9, 0.55 * m))) {
          var id = r().pick(petits);
          if (A.ajouterObjet(s, id, 1) > 0) { var o = U.byId(NF.data.objets, id); trouves.push(o.icone + ' ' + NF.util.minuscule(o.nom)); }
        }
        if (r().chance(0.05)) { A.modifierJauge(s, 'sante', -4); return NF.t('Un rat, une coupure sur du verre, et pas grand-chose d\'autre.') + (trouves.length ? NF.t(' Tout de même : ') + trouves.join(', ') + '.' : ''); }
        return NF.t('Quelques restes encore bons (+') + gainFaim + NF.t(' faim)') + (trouves.length ? NF.t(', et : ') + trouves.join(', ') + '.' : '.');
      } },

    { id: 'petit_boulot', nom: NF.t('Petits boulots'), icone: '🧹', categorie: 'survie',
      desc: NF.t('Porter des cartons, laver des vitres, aider sur un marché. Payé de la main à la main.'),
      conditions: { jauges: { energie: { min: 10 } } },
      effet: function (s) {
        var gain = r().entre(45, 110) * C.efficacite(s) * (1 + 0.12 * C.niveauCompetence(s, 'bricolage')) * (0.7 + 0.3 * s.conjoncture);
        if (C.aLieu(s, 'marche')) gain *= 1.15;
        gain = Math.round(gain);
        A.modifierJauge(s, 'energie', -10);
        A.modifierJauge(s, 'hygiene', -4);
        A.ajouterXp(s, 'bricolage', 5);
        if (r().chance(0.08)) { A.modifierJauge(s, 'moral', -6); return NF.t('Après une journée de travail, le patron disparaît sans vous payer.'); }
        A.ajouterArgent(s, gain);
        if (r().chance(0.1)) A.ajouterReputation(s, 2);
        return NF.t('Une journée de travail : ') + U.euros(gain) + NF.t(' en liquide.');
      } },

    { id: 'snack', nom: NF.t('Manger au snack'), icone: '🌯', categorie: 'survie', pa: 0,
      desc: NF.t('Un repas chaud tout de suite, pour 15 €. Ne coûte pas de point d\'action.'),
      conditions: { argentMin: 15 },
      effet: function (s) {
        A.retirerArgent(s, 15, false);
        A.modifierJauge(s, 'nourriture', 14);
        A.modifierJauge(s, 'moral', 2);
        return NF.t('Un kebab et une boisson chaude. Ça fait du bien.');
      } },

    /* ======================= REPOS ET SOIN ======================= */
    { id: 'dormir_foyer', nom: NF.t('Dormir au foyer de nuit'), icone: '🛏️', categorie: 'soin',
      desc: NF.t('Un lit, une douche et un repas, si une place se libère.'),
      conditions: { expose: true, lieu: 'foyer' },
      info: function (s) { return s.joueur.drapeaux.foyer_interdit ? NF.t('Vous êtes interdit de foyer pour le moment.') : (C.saison(s) === 'hiver' ? NF.t('L\'hiver, c\'est souvent complet.') : ''); },
      effet: function (s) {
        if (s.joueur.drapeaux.foyer_interdit) return NF.t('Impossible : vous êtes interdit de foyer pour le moment.');
        var place = 0.85 * C.qualiteLieu(s, 'foyer');
        if (C.saison(s) === 'hiver') place *= 0.65;
        if (s.joueur.reputation >= 30) place += 0.1;
        if (!r().chance(place)) { A.modifierJauge(s, 'moral', -4); A.modifierJauge(s, 'energie', 8); A.modifierJauge(s, 'nourriture', 6); return NF.t('Complet. On vous renvoie dans la nuit avec une couverture de survie et un sandwich.'); }
        A.modifierJauge(s, 'energie', 45);
        A.modifierJauge(s, 'hygiene', 35);
        A.modifierJauge(s, 'nourriture', 15);
        A.modifierJauge(s, 'moral', 4);
        A.ajouterReputation(s, 1);
        if (r().chance(0.1)) C.forcerEvenement(s, 'vol_foyer');
        return NF.t('Quelques nuits au chaud, une douche, un repas. Vous repartez d\'aplomb.');
      } },

    { id: 'se_reposer', nom: NF.t('Se reposer'), icone: '😴', categorie: 'soin',
      desc: NF.t('Dormir, récupérer, ne rien faire.'),
      effet: function (s) {
        var l = C.logementActuel(s);
        var gain = l.expose ? 45 : 55;
        if (C.saison(s) === 'hiver' && l.expose) gain -= 6;
        A.modifierJauge(s, 'energie', gain);
        A.modifierJauge(s, 'moral', l.expose ? 3 : 6);
        if (!l.expose) A.modifierJauge(s, 'sante', 2);
        return l.expose ? NF.t('Vous dormez où vous pouvez, par à-coups.') : NF.t('De vraies nuits de sommeil.');
      } },

    { id: 'se_laver', nom: NF.t('Se laver'), icone: '🚿', categorie: 'soin',
      desc: NF.t('Bains-douches, piscine, fontaine… ou sa propre salle de bain.'),
      effet: function (s) {
        var l = C.logementActuel(s);
        if (!l.expose) { A.modifierJauge(s, 'hygiene', 45); return NF.t('Douche chaude, vêtements propres.'); }
        if (C.aLieu(s, 'bains')) { A.modifierJauge(s, 'hygiene', 38); return NF.t('Les bains-douches municipaux. Gratuit, et chaud.'); }
        if (C.aLieu(s, 'piscine') && s.joueur.argent >= 3) { A.retirerArgent(s, 3, false); A.modifierJauge(s, 'hygiene', 36); return NF.t('Entrée piscine à 3 €, pour la douche surtout.'); }
        if (C.aLieu(s, 'association')) { A.modifierJauge(s, 'hygiene', 32); return NF.t('La douche de l\'association, sur rendez-vous.'); }
        A.modifierJauge(s, 'hygiene', 24);
        if (C.saison(s) === 'hiver') A.modifierJauge(s, 'sante', -2);
        return NF.t('Toilette à la fontaine. ') + (C.saison(s) === 'hiver' ? NF.t('Glacé.') : '');
      } },

    { id: 'se_soigner', nom: NF.t('Se faire soigner'), icone: '🏥', categorie: 'soin',
      desc: NF.t('Hôpital, permanence d\'accès aux soins, pharmacie.'),
      info: function (s) { return s.joueur.classe <= 2 ? NF.t('Gratuit à la permanence d\'accès aux soins, mais long.') : NF.t('Consultation : 25 €.'); },
      effet: function (s) {
        var gratuit = s.joueur.classe <= 2 || !C.aLieu(s, 'hopital');
        if (!gratuit) { if (s.joueur.argent < 25) return NF.t('Il faut 25 € pour la consultation.'); A.retirerArgent(s, 25, false); }
        else A.modifierJauge(s, 'energie', -5);
        var gain = 14 + 3 * C.niveauCompetence(s, 'soins');
        A.modifierJauge(s, 'sante', gain);
        var t = gratuit ? NF.t('Une demi-journée d\'attente, puis un médecin qui prend le temps.') : NF.t('Consultation et ordonnance.');
        if (s.joueur.maladie && r().chance(0.7)) { var nomMaladie = s.joueur.maladie.nom; A.guerir(s); t += NF.t(' Vous êtes soigné : ') + NF.util.minuscule(nomMaladie) + NF.t(', c\'est fini.'); }
        return t;
      } },

    { id: 'repas_association', nom: NF.t('Repas à l\'association'), icone: '🍲', categorie: 'soin',
      desc: NF.t('Un repas chaud, des visages familiers, des conseils.'),
      conditions: { logementOrdreMax: 2, lieu: 'association' },
      effet: function (s) {
        A.modifierJauge(s, 'nourriture', 32);
        A.modifierJauge(s, 'moral', 6);
        A.ajouterReputation(s, 1);
        if (r().chance(0.15) && !s.joueur.drapeaux.contact_association) { A.drapeau(s, 'contact_association', true); return NF.t('Un bénévole retient votre nom. Vous avez maintenant un contact à l\'association.'); }
        return NF.t('Soupe, pain, café. Et quelqu\'un pour vous demander comment ça va.');
      } },

    { id: 'sport', nom: NF.t('Marcher, courir, respirer'), icone: '🏃', categorie: 'soin',
      desc: NF.t('Le parc, les quais, n\'importe où. Bon pour la tête et le corps.'),
      effet: function (s) {
        A.modifierJauge(s, 'sante', 3 + (C.aLieu(s, 'parc') ? 2 : 0) + C.niveauCompetence(s, 'sport'));
        A.modifierJauge(s, 'moral', 9);
        A.modifierJauge(s, 'energie', -4);
        A.modifierJauge(s, 'nourriture', -3);
        A.ajouterXp(s, 'sport', 8 * C.modifTrait(s, 'apprentissage'));
        return NF.t('Une longue marche. Les idées s\'éclaircissent.');
      } },

    /* ======================= SOCIAL ET ADMINISTRATIF ======================= */
    { id: 'demarches', nom: NF.t('Démarches administratives'), icone: '📄', categorie: 'social',
      desc: NF.t('Domiciliation, aides, papiers. Lent, mais indispensable.'),
      info: function (s) {
        if (s.joueur.drapeaux.papiers_perdus) return NF.t('Objectif : refaire vos papiers.');
        if (!s.joueur.domiciliation) return NF.t('Objectif : obtenir une domiciliation (adresse administrative).');
        var dispo = []; for (var id in NF.data.impots.aides) if (!s.joueur.aides[id] && C.aideEligible(s, id).ok) dispo.push(id.toUpperCase());
        return dispo.length ? NF.t('Aides possibles : ') + dispo.join(', ') + '.' : NF.t('Rien de nouveau à demander pour l\'instant.');
      },
      effet: function (s) {
        var adm = C.niveauCompetence(s, 'administratif');
        A.ajouterXp(s, 'administratif', 15 * C.modifTrait(s, 'apprentissage'));
        A.modifierJauge(s, 'moral', -2);
        if (s.joueur.drapeaux.papiers_perdus) {
          if (r().chance(0.5 + 0.12 * adm)) { A.effacerDrapeau(s, 'papiers_perdus'); return NF.t('Après des heures de guichet, vos papiers sont refaits.'); }
          return NF.t('Il manque une pièce. Revenez le mois prochain.');
        }
        if (!s.joueur.domiciliation) {
          var p = 0.45 + 0.12 * adm + (C.aLieu(s, 'association') ? 0.15 : 0) + (s.joueur.drapeaux.contact_association ? 0.15 : 0);
          if (r().chance(p)) { s.joueur.domiciliation = true; A.journal(s, NF.t('📄 Domiciliation obtenue.'), 'bon'); return NF.t('Domiciliation accordée ! Vous avez enfin une adresse administrative : courrier, aides, emplois déclarés.'); }
          return NF.t('Dossier incomplet, file d\'attente, bureau fermé. Pas de domiciliation ce mois-ci.');
        }
        for (var id in NF.data.impots.aides) {
          if (!s.joueur.aides[id] && C.aideEligible(s, id).ok) {
            if (r().chance(0.6 + 0.1 * adm)) { s.joueur.aides[id] = true; A.journal(s, NF.t('📄 Aide accordée : ') + id.toUpperCase() + '.', 'bon'); return NF.t('Aide accordée : ') + id.toUpperCase() + ' (' + U.euros(NF.data.impots.aides[id].montant) + NF.t('/mois).'); }
            return NF.t('Demande de ') + id.toUpperCase() + NF.t(' déposée… dossier en attente de traitement.');
          }
        }
        return NF.t('Vous mettez vos papiers en ordre. Rien de nouveau à demander.');
      } },

    { id: 'contacts', nom: NF.t('Nouer des contacts'), icone: '🤝', categorie: 'social',
      desc: NF.t('Parler aux gens : bénévoles, voisins, autres sans-abri, anciens collègues.'),
      effet: function (s) {
        var gain = Math.round(r().entre(2, 6) * C.modifTrait(s, 'social') * (1 + 0.1 * C.niveauCompetence(s, 'theatre')));
        A.ajouterReputation(s, gain);
        A.modifierJauge(s, 'moral', 4);
        if (r().chance(0.3)) {
          var sociaux = NF.data.evenements.filter(function (e) { return e.famille === 'social' && C.evenementEligible(s, e); });
          var ev = r().pondere(sociaux, function (e) { return U.val(e.poids, s); });
          if (ev) { C.forcerEvenement(s, ev.id); return NF.t('Une rencontre…'); }
        }
        if (!s.joueur.drapeaux.hebergement_propose && s.joueur.reputation >= 35 && C.logementActuel(s).ordre <= 2 && r().chance(0.12)) {
          A.drapeau(s, 'hebergement_propose', true);
          return NF.t('Une connaissance vous propose son canapé pour quelque temps (voir l\'onglet Logement).');
        }
        return NF.t('Des discussions, des noms, des numéros. Votre réputation grandit (+') + gain + ').';
      } },

    { id: 'heures_sup', nom: NF.t('Heures supplémentaires'), icone: '⏱️', categorie: 'travail',
      desc: NF.t('Travailler davantage pour gagner un quart de salaire en plus.'),
      conditions: { emploi: true },
      condition: function (s) { var m = C.metierActuel(s); return m && m.pa >= 1; },
      effet: function (s) {
        var gain = Math.round(s.joueur.emploi.salaire * 0.25);
        A.ajouterArgent(s, gain);
        A.modifierJauge(s, 'energie', -15);
        A.modifierJauge(s, 'moral', -4);
        return NF.t('Des soirées et un week-end de plus au travail : +') + U.euros(gain) + '.';
      } },

    { id: 'rembourser', nom: NF.t('Rembourser sa dette'), icone: '💸', categorie: 'travail', pa: 0,
      desc: NF.t('Verser tout ce que vous pouvez pour réduire la dette.'),
      conditions: { dette: true, argentMin: 10 },
      effet: function (s) {
        var m = Math.min(s.joueur.dette, s.joueur.argent);
        A.retirerArgent(s, m, false);
        s.joueur.dette -= m;
        return NF.t('Vous remboursez ') + U.euros(m) + NF.t('. Reste : ') + U.euros(s.joueur.dette) + '.';
      } },

    /* ======================= FAMILLE ======================= */
    { id: 'temps_famille', nom: NF.t('Du temps en famille'), icone: '👨‍👩‍👧', categorie: 'famille',
      desc: NF.t('Être présent. Les relations se renforcent.'),
      condition: function (s) { return s.joueur.famille.partenaire || s.joueur.famille.enfants.length > 0; },
      visible: function (s) { return s.joueur.famille.partenaire || s.joueur.famille.enfants.length > 0; },
      effet: function (s) {
        var f = s.joueur.famille;
        if (f.partenaire) f.partenaire.relation = U.clamp(f.partenaire.relation + 9, 0, 100);
        f.enfants.forEach(function (e) { e.relation = U.clamp(e.relation + 7, 0, 100); });
        A.drapeau(s, 'temps_famille', true);
        A.modifierJauge(s, 'moral', 7);
        return NF.t('Des repas ensemble, des sorties, des discussions. Tout le monde va mieux.');
      } },

    { id: 'education_enfants', nom: NF.t('Éduquer les enfants'), icone: '📚', categorie: 'famille',
      desc: NF.t('Devoirs, lectures, sorties culturelles. Prépare la relève.'),
      condition: function (s) { return s.joueur.famille.enfants.some(function (e) { return e.age >= 36 && e.age < 18 * 12; }); },
      visible: function (s) { return s.joueur.famille.enfants.length > 0; },
      effet: function (s) {
        A.drapeau(s, 'education_enfants', true);
        if (s.joueur.argent >= 20) A.retirerArgent(s, 20, false);
        s.joueur.famille.enfants.forEach(function (e) { if (e.age >= 36 && e.age < 216) { e.education = U.clamp(e.education + 3 + C.niveauCompetence(s, 'lecture'), 0, 100); e.relation = U.clamp(e.relation + 3, 0, 100); } });
        A.ajouterXp(s, 'lecture', 5);
        return NF.t('Vous passez des soirées sur les devoirs et à la bibliothèque. Les enfants progressent.');
      } },

    { id: 'vouloir_enfant', nom: NF.t('Essayer d\'avoir un enfant'), icone: '🍼', categorie: 'famille', pa: 0,
      desc: NF.t('Décision de couple. Active (ou désactive) le projet d\'enfant.'),
      conditions: { partenaire: true, ageMax: 45 },
      visible: function (s) { return !!s.joueur.famille.partenaire; },
      info: function (s) { return s.joueur.drapeaux.veut_enfant ? NF.t('Projet en cours : cliquer pour l\'arrêter.') : (s.joueur.famille.partenaire.relation < 50 ? NF.t('Votre partenaire n\'est pas prêt : relation trop faible.') : ''); },
      effet: function (s) {
        if (s.joueur.drapeaux.veut_enfant) { A.effacerDrapeau(s, 'veut_enfant'); return NF.t('Vous mettez le projet d\'enfant de côté.'); }
        if (s.joueur.famille.partenaire.relation < 50) return NF.t('Impossible : votre relation n\'est pas assez solide.');
        A.drapeau(s, 'veut_enfant', true);
        return NF.t('Vous décidez ensemble d\'essayer d\'avoir un enfant.');
      } },

    /* ======================= LOISIRS ET TALENTS ======================= */
    /* Ces actions font progresser les compétences annexes (data/competences.js,
     * champ `annexe`) et en tirent parti : plus le niveau est haut, plus
     * elles rapportent. Beaucoup gagnent à avoir le bon lieu dans la ville
     * (parc, marché, gare) ou le bon objet (canne à pêche, guitare, carnet…). */

    { id: 'spectacle_rue', nom: NF.t('Spectacle de rue'), icone: '🎪', categorie: 'loisirs',
      desc: NF.t('Musique, jonglage, danse, magie ou théâtre : un chapeau au sol, et le public décide. Votre meilleur talent est utilisé.'),
      condition: function (s) { return talentRue(s).niveau >= 1; },
      info: function (s) {
        var t = talentRue(s);
        if (!t.id) return NF.t('Il faut au moins le niveau 1 en musique, jonglage, danse, magie ou théâtre.');
        var c = U.byId(NF.data.competences, t.id);
        return NF.t('Votre numéro : ') + c.icone + ' ' + NF.util.minuscule(c.nom) + NF.t(' (niveau ') + t.niveau + ').' + (A.passif(s, 'spectacle') > 1 ? NF.t(' Votre matériel attire l\'œil.') : '');
      },
      effet: function (s) {
        var t = talentRue(s), c = U.byId(NF.data.competences, t.id);
        var base = r().entre(12, 30) * (1 + 0.35 * t.niveau);
        var m = A.passif(s, 'spectacle') * C.modifTrait(s, 'social') * C.efficacite(s);
        m *= 0.8 + 0.4 * (s.joueur.reputation / 100);
        m *= 0.7 + 0.3 * (s.joueur.jauges.hygiene / 100);
        if (C.aLieu(s, 'gare')) m *= 1 + 0.2 * C.qualiteLieu(s, 'gare');
        if (C.aLieu(s, 'marche')) m *= 1 + 0.15 * C.qualiteLieu(s, 'marche');
        if (s.temps.mois === 11) m *= 1.3;            // décembre : marchés de Noël
        if (C.saison(s) === 'hiver') m *= 0.7;
        var gain = Math.round(base * m);
        A.ajouterArgent(s, gain);
        A.modifierJauge(s, 'energie', -6);
        A.modifierJauge(s, 'moral', 4);
        A.ajouterXp(s, t.id, 10 * C.modifTrait(s, 'apprentissage'));
        s.stats.spectacles = (s.stats.spectacles || 0) + 1;
        if (r().chance(0.15)) A.ajouterReputation(s, 2);
        if (r().chance(0.05)) C.forcerEvenement(s, 'controle_police_manche');
        if (gain < 10) return NF.t('Les passants pressent le pas. ') + U.euros(gain) + NF.t(' dans le chapeau.');
        if (gain > 60) return NF.t('Un attroupement, des applaudissements : ') + U.euros(gain) + NF.t(' dans le chapeau !');
        return NF.t('Votre numéro de ') + NF.util.minuscule(c.nom) + NF.t(' rapporte ') + U.euros(gain) + '.';
      } },

    { id: 'pecher', nom: NF.t('Pêcher'), icone: '🎣', categorie: 'loisirs',
      desc: NF.t('L\'étang du parc, le canal, les quais. Du calme, et parfois du poisson.'),
      info: function (s) { return A.aObjet(s, 'canne_a_peche') ? NF.t('Avec votre canne, les prises sont bien meilleures.') : NF.t('Sans canne à pêche, une ligne de fortune : prises modestes.'); },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'peche');
        var m = A.passif(s, 'peche') * (1 + 0.25 * niv) * C.modifTrait(s, 'chance');
        if (C.aLieu(s, 'parc')) m *= 1 + 0.25 * C.qualiteLieu(s, 'parc');
        if (C.saison(s) === 'hiver') m *= 0.5;
        var faim = Math.round(r().entre(5, 14) * m);
        A.modifierJauge(s, 'nourriture', faim);
        A.modifierJauge(s, 'moral', 5);
        A.modifierJauge(s, 'energie', -3);
        A.ajouterXp(s, 'peche', 12 * C.modifTrait(s, 'apprentissage'));
        if (r().chance(0.03)) { A.modifierJauge(s, 'sante', -4); return NF.t('Vous glissez sur la berge et tombez à l\'eau. Trempé, et presque bredouille.'); }
        var t = '';
        if (niv >= 2 && r().chance(0.25 + 0.1 * niv)) { var vente = Math.round(r().entre(6, 14) * niv * (C.aLieu(s, 'marche') ? 1.3 : 1)); A.ajouterArgent(s, vente); t = NF.t(' Un beau poisson se vend ') + U.euros(vente) + '.'; }
        if (faim <= 3) return NF.t('Des heures à regarder le bouchon. Presque rien ne mord.') + t;
        return NF.t('Quelques prises grillées sur place (+') + faim + NF.t(' faim).') + t;
      } },

    { id: 'cueillir', nom: NF.t('Cueillette'), icone: '🍄', categorie: 'loisirs',
      desc: NF.t('Champignons, mûres, châtaignes, plantes sauvages dans le parc et les friches. Selon la saison.'),
      conditions: { lieu: 'parc' },
      info: function (s) { var sa = C.saison(s); return sa === 'hiver' ? NF.t('En hiver, il n\'y a presque rien.') : sa === 'automne' ? NF.t('L\'automne : la meilleure saison.') : ''; },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'cueillette');
        var saison = { printemps: 0.9, ete: 1.1, automne: 1.5, hiver: 0.3 }[C.saison(s)];
        var m = (1 + 0.25 * niv) * saison * (0.8 + 0.4 * C.qualiteLieu(s, 'parc')) * C.modifTrait(s, 'fouille');
        var faim = Math.round(r().entre(5, 13) * m);
        A.modifierJauge(s, 'nourriture', faim);
        A.modifierJauge(s, 'moral', 3);
        A.modifierJauge(s, 'energie', -4);
        A.modifierJauge(s, 'hygiene', -3);
        A.ajouterXp(s, 'cueillette', 12 * C.modifTrait(s, 'apprentissage'));
        if (r().chance(Math.max(0.02, 0.14 - 0.03 * niv))) { A.modifierJauge(s, 'sante', -8); A.modifierJauge(s, 'moral', -4); return NF.t('Un champignon qu\'il ne fallait pas. Deux jours de nausées et de sueurs froides.'); }
        var sa = C.saison(s);
        var t = NF.t('Un panier de ') + (sa === 'automne' ? NF.t('châtaignes et de champignons') : sa === 'ete' ? NF.t('mûres et de plantes sauvages') : sa === 'hiver' ? NF.t('quelques racines et de pissenlits') : NF.t('jeunes pousses et d\'ail des ours')) + ' (+' + faim + NF.t(' faim).');
        if (niv >= 2 && C.aLieu(s, 'marche') && r().chance(0.2 + 0.1 * niv)) { var vente = Math.round(r().entre(5, 12) * niv); A.ajouterArgent(s, vente); t += NF.t(' Le surplus se vend ') + U.euros(vente) + NF.t(' au marché.'); }
        return t;
      } },

    { id: 'jardiner', nom: NF.t('Jardiner'), icone: '🌱', categorie: 'loisirs',
      desc: NF.t('Une parcelle au jardin partagé du parc, ou quelques pots chez soi. Des légumes au fil des saisons.'),
      condition: function (s) { return C.aLieu(s, 'parc') || !C.logementActuel(s).expose; },
      info: function (s) { return C.aLieu(s, 'parc') ? NF.t('Jardin partagé du parc.') : (!C.logementActuel(s).expose ? NF.t('Quelques pots sur le rebord de la fenêtre.') : NF.t('Il faut un jardin partagé (parc) ou un vrai logement.')); },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'jardinage');
        var saison = { printemps: 0.7, ete: 1.3, automne: 1.2, hiver: 0.25 }[C.saison(s)];
        var m = (1 + 0.25 * niv) * saison * (C.aLieu(s, 'parc') ? 0.8 + 0.4 * C.qualiteLieu(s, 'parc') : 0.6);
        var faim = Math.round(r().entre(8, 20) * m);
        A.modifierJauge(s, 'nourriture', faim);
        A.modifierJauge(s, 'moral', 5);
        A.modifierJauge(s, 'energie', -6);
        A.modifierJauge(s, 'hygiene', -4);
        A.ajouterXp(s, 'jardinage', 12 * C.modifTrait(s, 'apprentissage'));
        var t = C.saison(s) === 'hiver' ? NF.t('Bêcher, pailler, préparer le printemps. Quelques poireaux (+') + faim + NF.t(' faim).') : NF.t('Désherber, arroser, récolter (+') + faim + NF.t(' faim).');
        if (niv >= 2 && r().chance(0.15 + 0.1 * niv) && A.placeLibre(s) > 0) { A.ajouterObjet(s, 'conserve', 1); t += NF.t(' Le surplus finit en bocal : +1 conserve.'); }
        if (C.aLieu(s, 'parc') && r().chance(0.1)) { A.ajouterReputation(s, 2); t += NF.t(' Les voisins de parcelle vous apprécient.'); }
        return t;
      } },

    { id: 'dessiner', nom: NF.t('Dessiner et vendre des portraits'), icone: '🎨', categorie: 'loisirs',
      desc: NF.t('Croquer les passants, vendre ses dessins sur un bout de trottoir.'),
      conditions: { competences: { dessin: 1 } },
      info: function (s) { return A.aObjet(s, 'carnet_dessin') ? NF.t('Votre carnet et vos crayons font la différence.') : NF.t('Un carnet et des crayons aideraient.'); },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'dessin');
        var m = A.passif(s, 'dessin') * C.efficacite(s) * (0.8 + 0.4 * (s.joueur.reputation / 100));
        if (C.aLieu(s, 'gare')) m *= 1.15;
        if (C.aLieu(s, 'marche')) m *= 1.15;
        if (C.saison(s) === 'ete') m *= 1.25;
        var gain = Math.round(r().entre(6, 16) * niv * m);
        A.ajouterArgent(s, gain);
        A.modifierJauge(s, 'moral', 4);
        A.modifierJauge(s, 'energie', -3);
        A.ajouterXp(s, 'dessin', 10 * C.modifTrait(s, 'apprentissage'));
        if (r().chance(0.1)) A.ajouterReputation(s, 2);
        if (gain < 8) return NF.t('Beaucoup de regards, peu d\'acheteurs : ') + U.euros(gain) + '.';
        return NF.t('Quelques portraits vendus : ') + U.euros(gain) + '.';
      } },

    { id: 'ecrire', nom: NF.t('Écrire'), icone: '✍️', categorie: 'loisirs',
      desc: NF.t('Un carnet, un stylo, un banc. Poèmes, souvenirs, nouvelles. Avec du niveau, des textes se vendent.'),
      conditions: { competences: { lecture: 1 } },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'ecriture');
        A.modifierJauge(s, 'moral', 6 + niv);
        A.modifierJauge(s, 'energie', -2);
        A.ajouterXp(s, 'ecriture', 12 * C.modifTrait(s, 'apprentissage'));
        A.ajouterXp(s, 'lecture', 4);
        if (niv >= 2 && r().chance(0.08 * niv)) { var gain = Math.round(r().entre(15, 40) * niv); A.ajouterArgent(s, gain); A.ajouterReputation(s, 1); return NF.t('Un journal de quartier, une revue, un site : un de vos textes est publié et payé ') + U.euros(gain) + '.'; }
        return NF.t('Des pages noircies. Mettre des mots dessus, ça allège.');
      } },

    { id: 'photographier', nom: NF.t('Photographier la ville'), icone: '📷', categorie: 'loisirs',
      desc: NF.t('Les quais à l\'aube, les visages du marché. Avec du niveau, des clichés se vendent.'),
      conditions: { telephone: true },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'photographie');
        A.modifierJauge(s, 'moral', 5);
        A.modifierJauge(s, 'energie', -4);
        A.ajouterXp(s, 'photographie', 12 * C.modifTrait(s, 'apprentissage'));
        if (niv >= 2 && r().chance(0.1 * niv)) { var gain = Math.round(r().entre(15, 35) * niv * (A.aObjet(s, 'ordinateur') ? 1.3 : 1)); A.ajouterArgent(s, gain); return NF.t('Une banque d\'images, un commerçant, un journal local : une série se vend ') + U.euros(gain) + '.'; }
        return NF.t('Une journée à marcher et à cadrer. La ville est moins laide à travers un objectif.');
      } },

    { id: 'coudre', nom: NF.t('Coudre et raccommoder'), icone: '🧵', categorie: 'loisirs',
      desc: NF.t('Recoudre ses vêtements, puis faire des retouches pour les autres.'),
      info: function (s) { return A.aObjet(s, 'necessaire_couture') ? NF.t('Avec votre nécessaire de couture, le travail est propre.') : NF.t('Un nécessaire de couture rendrait cela plus efficace.'); },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'couture');
        var m = A.passif(s, 'couture');
        A.modifierJauge(s, 'hygiene', Math.round(6 * m));
        A.modifierJauge(s, 'moral', 2);
        A.modifierJauge(s, 'energie', -2);
        A.ajouterXp(s, 'couture', 12 * C.modifTrait(s, 'apprentissage'));
        if (niv >= 1) { var gain = Math.round(r().entre(5, 14) * niv * m * (C.aLieu(s, 'ressourcerie') ? 1.2 : 1)); A.ajouterArgent(s, gain); return NF.t('Vos vêtements tiennent mieux, et des retouches pour le voisinage rapportent ') + U.euros(gain) + '.'; }
        return NF.t('Un ourlet, un bouton, une déchirure reprisée. Vous avez meilleure allure.');
      } },

    { id: 'garder_animaux', nom: NF.t('Promener et garder des animaux'), icone: '🐕', categorie: 'loisirs',
      desc: NF.t('Les chiens du quartier, le chat d\'une voisine en vacances. Payé de la main à la main.'),
      conditions: { reputationMin: 10 },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'animaux');
        var gain = Math.round(r().entre(10, 28) * (1 + 0.3 * niv) * (0.8 + 0.4 * (s.joueur.reputation / 100)) * C.efficacite(s));
        A.modifierJauge(s, 'moral', 5);
        A.modifierJauge(s, 'energie', -5);
        A.modifierJauge(s, 'hygiene', -3);
        A.ajouterXp(s, 'animaux', 12 * C.modifTrait(s, 'apprentissage'));
        if (r().chance(Math.max(0.02, 0.08 - 0.015 * niv))) { A.modifierJauge(s, 'sante', -4); return NF.t('Un chien nerveux vous mord la main. Pas payé, et une plaie à surveiller.'); }
        A.ajouterArgent(s, gain);
        if (r().chance(0.12)) A.ajouterReputation(s, 2);
        return NF.t('Des laisses, des gamelles, des caresses : ') + U.euros(gain) + '.';
      } },

    { id: 'coiffer', nom: NF.t('Coiffer'), icone: '💇', categorie: 'loisirs',
      desc: NF.t('Se couper les cheveux proprement. Avec du niveau, coiffer les autres contre quelques pièces.'),
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'coiffure');
        A.modifierJauge(s, 'hygiene', 8 + niv);
        A.modifierJauge(s, 'moral', 3);
        A.modifierJauge(s, 'energie', -2);
        A.ajouterXp(s, 'coiffure', 10 * C.modifTrait(s, 'apprentissage'));
        if (niv >= 1) { var gain = Math.round(r().entre(6, 15) * niv * (0.8 + 0.4 * (s.joueur.reputation / 100))); A.ajouterArgent(s, gain); if (r().chance(0.1)) A.ajouterReputation(s, 2); return NF.t('Une coupe nette pour vous, et des clients au foyer et dans le quartier : ') + U.euros(gain) + '.'; }
        return NF.t('Des ciseaux, un miroir de poche. Le résultat est inégal, mais vous avez meilleure mine.');
      } },

    { id: 'jouer_echecs', nom: NF.t('Jouer aux échecs au parc'), icone: '♟️', categorie: 'loisirs',
      desc: NF.t('Les tables du parc, les habitués, de petites mises. On apprend en perdant.'),
      conditions: { lieu: 'parc' },
      info: function (s) { return s.joueur.argent >= 5 ? NF.t('Les parties se jouent avec une petite mise.') : NF.t('Sans argent, vous jouez pour l\'honneur.'); },
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'jeux');
        A.modifierJauge(s, 'moral', 3);
        A.modifierJauge(s, 'energie', -2);
        A.ajouterXp(s, 'jeux', 12 * C.modifTrait(s, 'apprentissage'));
        if (r().chance(0.1)) A.ajouterReputation(s, 1);
        if (s.joueur.argent < 5) return NF.t('Des parties pour l\'honneur. Les vieux du parc vous apprennent deux ou trois ouvertures.');
        var mise = Math.min(s.joueur.argent, r().int(3, 8) + 2 * niv);
        if (r().chance(Math.min(0.8, 0.3 + 0.1 * niv) * C.modifTrait(s, 'chance'))) { var gain = Math.round(mise * 1.6); A.ajouterArgent(s, gain); return NF.t('Mat en trente coups. Vous empochez ') + U.euros(gain) + '.'; }
        A.retirerArgent(s, mise, false);
        return NF.t('Une partie serrée, perdue dans la finale. −') + U.euros(mise) + NF.t(', et une leçon.');
      } },

    { id: 'mediter', nom: NF.t('Méditer'), icone: '🧘', categorie: 'loisirs',
      desc: NF.t('S\'asseoir, respirer, laisser passer. Un moral plus stable, mois après mois.'),
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'meditation');
        A.modifierJauge(s, 'moral', 5 + 2 * niv);
        A.modifierJauge(s, 'energie', 4 + niv);
        A.modifierJauge(s, 'sante', 1);
        A.ajouterXp(s, 'meditation', 12 * C.modifTrait(s, 'apprentissage'));
        return niv >= 3 ? NF.t('Une heure de calme au milieu du bruit. Vous repartez plus léger.') : NF.t('Les pensées tournent, puis ralentissent. Un peu.');
      } },

    { id: 'quiz', nom: NF.t('Soirée quiz'), icone: '🏛️', categorie: 'loisirs',
      desc: NF.t('Les quiz des bars et de la bibliothèque. Des lots pour les meilleurs, des rencontres pour tous.'),
      effet: function (s) {
        var niv = C.niveauCompetence(s, 'culture');
        A.modifierJauge(s, 'moral', 4);
        A.modifierJauge(s, 'energie', -2);
        A.ajouterXp(s, 'culture', 10 * C.modifTrait(s, 'apprentissage'));
        A.ajouterXp(s, 'lecture', 2);
        if (r().chance(0.2 * C.modifTrait(s, 'social'))) A.ajouterReputation(s, 2);
        if (r().chance(Math.min(0.75, 0.1 + 0.13 * niv))) { var gain = r().int(10, 30) + 5 * niv; A.ajouterArgent(s, gain); return NF.t('Votre équipe gagne : un bon d\'achat de ') + U.euros(gain) + '.'; }
        return NF.t('Vous séchez sur les capitales, mais vous repartez avec deux ou trois anecdotes.');
      } },
  ];
})();
