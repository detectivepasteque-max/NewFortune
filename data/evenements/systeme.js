/* =====================================================================
 * ÉVÉNEMENTS "SYSTÈME" – déclenchés par le moteur, jamais au hasard
 * ---------------------------------------------------------------------
 * Ces identifiants sont appelés par le code (src/core/*.js) :
 *   accident_travail, licenciement, promotion, controle_travail_non_declare,
 *   tomber_malade, expulsion_loyer, foyer_reouvert, huissier, naissance,
 *   rupture, controle_entreprise, faillite, controle_police_manche, vol_foyer
 * Vous pouvez modifier leurs textes et leurs choix, mais gardez les ids.
 * `force: true` = ne sort jamais au tirage aléatoire.
 * ===================================================================== */
NF.ajouterEvenements([

  { id: 'accident_travail', famille: 'travail', force: true, conditions: { emploi: true }, icone: '🤕', titre: NF.t('Accident du travail'),
    texte: function (s, d) { return NF.t('Une chute, une coupure, un geste de trop. Vous vous blessez en travaillant comme ') + (d && d.metier ? NF.util.minuscule(d.metier) : NF.t('d\'habitude')) + '.'; },
    choix: [
      { texte: NF.t('Déclarer l\'accident et me faire soigner'), conditions: { nonDeclare: false },
        effets: { sante: -12, energie: -10, moral: -4, drapeaux: { accident_declare: true } },
        resultat: NF.t('Arrêt de travail, soins pris en charge. Vous gardez votre emploi.') },
      { texte: NF.t('Serrer les dents et continuer'),
        aleatoire: [
          { poids: 6, effets: { sante: -18, energie: -12, moral: -5 }, resultat: NF.t('La blessure s\'infecte. Vous mettez des semaines à vous en remettre.') },
          { poids: 4, effets: { sante: -8, energie: -6 }, resultat: NF.t('Ça passe. Vous boitez un peu.') },
        ] },
      { texte: NF.t('Me soigner à mes frais (80 €)'), conditions: { argentMin: 80 },
        effets: { argent: -80, sante: -5, energie: -5 },
        resultat: NF.t('Un médecin, des points de suture, et au travail le lendemain.') },
    ] },

  { id: 'licenciement', famille: 'travail', force: true, conditions: { emploi: true }, icone: '📉', titre: NF.t('Licenciement'),
    texte: function (s, d) { return NF.t('Votre employeur vous convoque : « On doit se séparer de vous. » Fin de votre poste de ') + (d && d.metier ? NF.util.minuscule(d.metier) : NF.t('salarié')) + '.'; },
    choix: [
      { texte: NF.t('Accepter et toucher une indemnité'),
        effets: function (s) { var ind = Math.round(s.joueur.emploi.salaire * Math.min(3, 0.5 + s.joueur.emploi.mois / 12)); return { argent: ind, moral: -8, emploi: 'perdre', raison: 'licenciement', journal: NF.t('Indemnité : ') + NF.util.euros(ind) + '.' }; },
        resultat: NF.t('Vous signez. Une indemnité tombe, et le vide avec.') },
      { texte: NF.t('Contester (compétence administrative)'), conditions: { competences: { administratif: 2 } },
        aleatoire: [
          { poids: 5, effets: function (s) { return { argent: Math.round(s.joueur.emploi.salaire * 2.5), moral: -4, emploi: 'perdre', raison: 'licenciement' }; }, resultat: NF.t('Après négociation, vous obtenez une meilleure indemnité.') },
          { poids: 3, effets: { moral: 2, reputation: 2 }, resultat: NF.t('Votre argumentaire tient. L\'employeur renonce : vous gardez votre poste.') },
          { poids: 2, effets: { moral: -12, emploi: 'perdre', raison: 'licenciement', reputation: -3 }, resultat: NF.t('Vous perdez, et vous partez sans rien.') },
        ] },
    ] },

  { id: 'promotion', famille: 'travail', force: true, conditions: { emploi: true }, icone: '📈', titre: NF.t('Promotion'),
    /* donnees.vers = id du métier proposé (filière NF.data.promotions), sinon simple augmentation */
    texte: function (s, d) {
      if (d && d.vers) return NF.t('Votre sérieux a été remarqué. On vous propose de passer ') + NF.util.minuscule(d.versNom) + NF.t(' : plus de responsabilités, un meilleur salaire.');
      return NF.t('Votre sérieux a été remarqué. On vous propose plus de responsabilités… et un meilleur salaire.');
    },
    choix: [
      { texte: function (s, d) { return d && d.vers ? NF.t('Accepter le poste de ') + NF.util.minuscule(d.versNom) : NF.t('Accepter l\'augmentation'); },
        effets: function (s, d) {
          if (d && d.vers && NF.core.promouvoir(s, d.vers)) return { moral: 10, reputation: 4 };
          s.joueur.emploi.salaire = Math.round(s.joueur.emploi.salaire * 1.15 / 10) * 10;
          return { moral: 8, reputation: 3 };
        },
        resultat: function (s) { var m = NF.core.metierActuel(s); return (m ? m.nom + ' : ' : '') + NF.t('nouveau salaire ') + NF.util.euros(s.joueur.emploi.salaire) + NF.t(' par mois.'); } },
      { texte: NF.t('Refuser, je préfère garder mon rythme'), effets: { moral: 2, energie: 5 }, resultat: NF.t('Vous restez à votre poste, sans pression supplémentaire.') },
    ] },

  { id: 'controle_travail_non_declare', famille: 'travail', force: true, conditions: { emploi: true }, icone: '🚔', titre: NF.t('Contrôle sur le lieu de travail'),
    texte: NF.t('L\'inspection du travail débarque. Personne n\'a de contrat, vous non plus.'),
    choix: [
      { texte: NF.t('Donner mon vrai nom'),
        effets: function (s) { return { argent: -NF.data.config.amendeNonDeclare, dette: Math.max(0, NF.data.config.amendeNonDeclare - s.joueur.argent), emploi: 'perdre', raison: NF.t('contrôle'), moral: -6, drapeaux: { connu_inspection: true } }; },
        resultat: NF.t('Amende, et le chantier ferme. Votre nom est dans un fichier maintenant.') },
      { texte: NF.t('Prendre la fuite'),
        aleatoire: [
          { poids: 6, effets: { emploi: 'perdre', raison: NF.t('contrôle'), energie: -8 }, resultat: NF.t('Vous sautez un muret et disparaissez. Le boulot, lui, est fini.') },
          { poids: 4, effets: { emploi: 'perdre', raison: NF.t('contrôle'), casier: true, argent: -300, moral: -10 }, resultat: NF.t('Rattrapé. Garde à vue, amende, et une ligne dans votre casier.') },
        ] },
    ] },

  { id: 'tomber_malade', famille: 'sante', force: true, icone: '🤒', titre: NF.t('Vous tombez malade'),
    texte: function (s) {
      var sais = NF.core.saison(s);
      var nom = sais === 'hiver' ? NF.t('Une grosse grippe') : sais === 'ete' ? NF.t('Une infection intestinale') : NF.t('Une bronchite');
      return nom + NF.t(' vous cloue au sol. Fièvre, toux, pas de force.');
    },
    choix: [
      { texte: NF.t('Aller à l\'hôpital'),
        effets: function (s) {
          var cl = s.joueur.classe;
          var nom = NF.core.saison(s) === 'hiver' ? NF.t('Grippe') : NF.core.saison(s) === 'ete' ? NF.t('Infection') : NF.t('Bronchite');
          return { maladie: { nom: nom, duree: 1, sante: 4 }, energie: -10, argent: cl >= 3 ? -30 : 0 };
        },
        resultat: NF.t('Des heures d\'attente, puis un traitement. Ça devrait passer vite.') },
      { texte: NF.t('Me soigner avec des médicaments'), conditions: { objet: 'medicaments' },
        effets: function (s) { return { objets: { medicaments: -1 }, maladie: { nom: NF.t('Fièvre'), duree: 1, sante: 3 }, energie: -8 }; },
        resultat: NF.t('Vos médicaments calment la fièvre. Une semaine de repos et ça ira.') },
      { texte: NF.t('Laisser passer'),
        effets: function (s) {
          var nom = NF.core.saison(s) === 'hiver' ? NF.t('Grippe') : NF.core.saison(s) === 'ete' ? NF.t('Infection') : NF.t('Bronchite');
          var dur = NF.core.logementActuel(s).expose ? 3 : 2;
          return { maladie: { nom: nom, duree: dur, sante: 8 }, energie: -15, moral: -5 };
        },
        resultat: NF.t('Vous attendez que ça passe. Ça prend du temps, et ça use.') },
    ] },

  { id: 'expulsion_loyer', famille: 'securite', force: true, conditions: { logementOrdreMin: 3 }, icone: '📜', titre: NF.t('Avis d\'expulsion'),
    texte: NF.t('Deux mois de loyer impayés. Le propriétaire a saisi la justice. L\'huissier est devant la porte.'),
    choix: [
      { texte: NF.t('Payer les arriérés maintenant'), condition: function (s) { var l = NF.core.logementActuel(s); return s.joueur.argent >= (l.loyer + l.charges) * 2; },
        effets: function (s) { var l = NF.core.logementActuel(s); s.joueur.loyersImpayes = 0; return { argent: -(l.loyer + l.charges) * 2, moral: -3 }; },
        resultat: NF.t('Vous réglez tout. Le propriétaire vous regarde de travers, mais vous restez.') },
      { texte: NF.t('Partir'), effets: { logement: 'rue', moral: -15, drapeaux: { retombe_rue: true } }, resultat: NF.t('Vos affaires sur le trottoir. Retour à la case départ.') },
      { texte: NF.t('Négocier un échéancier (compétence administrative)'), conditions: { competences: { administratif: 2 } },
        aleatoire: [
          { poids: 6, effets: function (s) { var l = NF.core.logementActuel(s); s.joueur.loyersImpayes = 0; return { dette: (l.loyer + l.charges) * 2, moral: -4 }; }, resultat: NF.t('Le juge accorde un délai. Les arriérés deviennent une dette à rembourser.') },
          { poids: 4, effets: { logement: 'rue', moral: -15, drapeaux: { retombe_rue: true } }, resultat: NF.t('Refusé. Expulsion.') },
        ] },
    ] },

  { id: 'foyer_reouvert', famille: 'social', force: true, icone: '🛏️', titre: NF.t('Retour possible au foyer'),
    texte: NF.t('L\'association vous fait savoir qu\'une place au foyer pourra de nouveau vous être attribuée.'),
    effets: function (s) { delete s.joueur.drapeaux.foyer_interdit; return { moral: 3 }; },
    resultat: NF.t('Vous pouvez de nouveau demander une place en foyer.') },

  { id: 'huissier', famille: 'economie', force: true, icone: '📬', titre: NF.t('Visite de l\'huissier'),
    texte: function (s) { return NF.t('Votre dette atteint ') + NF.util.euros(s.joueur.dette) + NF.t('. Un huissier vient saisir ce qu\'il peut.'); },
    choix: [
      { texte: NF.t('Payer une partie (30 % de votre argent)'),
        effets: function (s) { var m = Math.round(s.joueur.argent * 0.3); s.joueur.dette = Math.max(0, s.joueur.dette - m); return { argent: -m, moral: -5 }; },
        resultat: NF.t('Il repart avec un acompte et une date de retour.') },
      { texte: NF.t('Le laisser saisir des objets'),
        effets: function (s) { var pris = []; for (var id in s.joueur.inventaire) { var o = NF.util.byId(NF.data.objets, id); if (o && o.vente >= 10) { NF.api.retirerObjet(s, id, 1); s.joueur.dette = Math.max(0, s.joueur.dette - o.vente * 2); pris.push(o.nom); if (pris.length >= 2) break; } } return { moral: -8, journal: pris.length ? NF.t('Saisi : ') + pris.join(', ') : NF.t('Rien à saisir.') }; },
        resultat: NF.t('Il emporte ce qui a un peu de valeur.') },
    ] },

  { id: 'naissance', famille: 'famille', force: true, conditions: { partenaire: true }, icone: '👶', titre: NF.t('Naissance'),
    texte: function (s) { return (s.joueur.drapeaux.veut_enfant ? NF.t('Le moment est venu : ') : NF.t('Surprise : ')) + NF.t('votre enfant vient au monde.'); },
    effets: function (s) { var e = NF.core.naissance(s); delete s.joueur.drapeaux.veut_enfant; return { moral: 15, energie: -15, argent: -120, journal: e ? NF.t('Bienvenue au monde, ') + e.prenom + '.' : '' }; },
    resultat: function (s) { var f = s.joueur.famille.enfants; var e = f[f.length - 1]; return e ? NF.t('Un petit être nommé ') + e.prenom + NF.t('. Tout change.') : NF.t('La famille est au complet.'); } },

  { id: 'rupture', famille: 'famille', force: true, conditions: { partenaire: true }, icone: '💔', titre: NF.t('Rupture'),
    texte: function (s) { return s.joueur.famille.partenaire.prenom + NF.t(' en a assez. Les silences, les disputes, l\'argent. « C\'est fini. »'); },
    choix: [
      { texte: NF.t('Accepter la séparation'), effets: function (s) { NF.core.separer(s, NF.t('relation dégradée')); return { moral: -5 }; }, resultat: NF.t('Chacun reprend ses affaires.') },
      { texte: NF.t('Tenter de recoller les morceaux'),
        aleatoire: [
          { poids: 3, effets: function (s) { s.joueur.famille.partenaire.relation = 35; return { moral: 5 }; }, resultat: NF.t('Une longue discussion. Vous repartez sur de nouvelles bases, fragiles.') },
          { poids: 7, effets: function (s) { NF.core.separer(s, 'rupture'); return { moral: -8 }; }, resultat: NF.t('Trop tard. La porte claque.') },
        ] },
    ] },

  { id: 'controle_entreprise', famille: 'economie', force: true, conditions: { entreprise: true }, icone: '🧾', titre: NF.t('Contrôle fiscal'),
    texte: NF.t('L\'administration contrôle votre entreprise : comptes, cotisations, TVA.'),
    choix: [
      { texte: NF.t('Présenter des comptes en ordre'), conditions: { competences: { gestion: 2 } },
        aleatoire: [
          { poids: 7, effets: { moral: 3, reputation: 2 }, resultat: NF.t('Tout est carré. Le contrôleur repart sans rien trouver.') },
          { poids: 3, effets: function (s) { var r = Math.round(s.joueur.entreprise.dernierCA * 0.3); s.joueur.entreprise.capital -= r; return { moral: -4, journal: NF.t('Redressement : ') + NF.util.euros(r) }; }, resultat: NF.t('Une erreur de déclaration : petit redressement.') },
        ] },
      { texte: NF.t('Se débrouiller'),
        aleatoire: [
          { poids: 4, effets: { moral: -2 }, resultat: NF.t('Quelques remarques, pas de sanction.') },
          { poids: 6, effets: function (s) { var r = Math.round(s.joueur.entreprise.dernierCA * 0.8 + 500); s.joueur.entreprise.capital -= r; return { moral: -8, journal: NF.t('Redressement : ') + NF.util.euros(r) }; }, resultat: NF.t('Factures manquantes, TVA mal calculée : lourd redressement.') },
        ] },
    ] },

  { id: 'faillite', famille: 'economie', force: true, conditions: { entreprise: true }, icone: '💥', titre: NF.t('Cessation de paiements'),
    texte: NF.t('Votre entreprise ne peut plus payer. Le tribunal de commerce est saisi.'),
    choix: [
      { texte: NF.t('Liquider l\'entreprise'), effets: function (s) { var t = NF.core.entrepriseFermer(s); return { moral: -10, journal: t }; }, resultat: NF.t('Liquidation. Ce qui reste de dettes vous suit.') },
      { texte: NF.t('Injecter mes économies pour sauver l\'activité'), condition: function (s) { return s.joueur.argent >= 3000; },
        effets: function (s) { s.joueur.entreprise.capital += 3000; return { argent: -3000, moral: -5 }; },
        resultat: NF.t('Vous remettez 3 000 € au pot. Sursis.') },
    ] },

  { id: 'controle_police_manche', famille: 'securite', force: true, icone: '👮', titre: NF.t('Contrôle de police'),
    texte: NF.t('Deux agents s\'arrêtent devant vous. « Papiers. On ne mendie pas ici. »'),
    choix: [
      { texte: NF.t('Rester calme et obtempérer'), effets: { moral: -3, argent: -10 }, resultat: NF.t('Ils vous font circuler et prennent les pièces de votre gobelet.') },
      { texte: NF.t('Discuter'), conditions: { competences: { lecture: 2 } }, effets: { moral: 1 }, resultat: NF.t('Vous connaissez la règle : la mendicité passive n\'est pas interdite. Ils s\'en vont.') },
      { texte: NF.t('Répondre sèchement'),
        aleatoire: [
          { poids: 5, effets: { moral: -8, energie: -5, drapeaux: { papiers_perdus: true } }, resultat: NF.t('Garde à vue de quelques heures. Vos papiers sont « égarés » au passage.') },
          { poids: 5, effets: { moral: -2 }, resultat: NF.t('Ils haussent les épaules et partent.') },
        ] },
    ] },

  { id: 'vol_foyer', famille: 'securite', force: true, icone: '🕵️', titre: NF.t('Vol au dortoir'),
    texte: NF.t('Au réveil, votre sac a été fouillé pendant la nuit.'),
    effets: function (s) {
      var pris = [];
      for (var id in s.joueur.inventaire) { var o = NF.util.byId(NF.data.objets, id); if (o && o.type !== 'materiau' && NF.rng.chance(0.4 * NF.api.passif(s, 'vol') * NF.core.modifTrait(s, 'vol'))) { NF.api.retirerObjet(s, id, 1); pris.push(NF.util.minuscule(o.nom)); if (pris.length >= 2) break; } }
      var arg = Math.round(s.joueur.argent * 0.3);
      return { argent: -arg, moral: -5, journal: pris.length ? NF.t('Volé : ') + pris.join(', ') : '' };
    },
    resultat: NF.t('Il manque de l\'argent et peut-être plus. Personne n\'a rien vu.') },
]);
