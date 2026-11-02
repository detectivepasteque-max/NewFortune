/* =====================================================================
 * ÉVÉNEMENTS – SOCIAL
 * ---------------------------------------------------------------------
 * Rencontres, entraide, réseau. La famille 'social' est aussi tirée par
 * l'action « Nouer des contacts » : on garde des événements accessibles
 * à toutes les classes.
 *
 * Drapeaux introduits ici :
 *   relation_en_cours, relation_prenom, relation_affinite, relation_serieuse
 *       → chaîne de rencontre amoureuse (soc_rencontre → soc_rencontre_suite
 *         → soc_rencontre_couple, qui appelle NF.core.formerCouple)
 *   hebergement_propose   → débloque le logement « Hébergé chez quelqu'un »
 *   reseau_entraide, mentor, camarade_contact, contact_association
 *   article_en_cours, article_visage → chaîne du journaliste
 *   tuyau_resultat, article_issue → temporaires (effacés dans `resultat`)
 * ===================================================================== */
(function () {
  var PRENOMS_RENCONTRE = [NF.t('Camille'), NF.t('Sacha'), NF.t('Charlie'), NF.t('Alix'), NF.t('Lou'), NF.t('Dominique'), NF.t('Andrea'), NF.t('Noa'), NF.t('Eden'), NF.t('Morgan'), NF.t('Claude'), NF.t('Yaël')];

  function prenomRencontre(s) { return s.joueur.drapeaux.relation_prenom || NF.t('Votre rencontre'); }

  function finRelation(s) {
    var d = s.joueur.drapeaux;
    delete d.relation_en_cours; delete d.relation_prenom; delete d.relation_affinite; delete d.relation_serieuse;
  }

  function pageTournee(s) { return !s.joueur.drapeaux.relation_en_cours || !!s.joueur.famille.partenaire; }

  /** Un métier accessible (prérequis remplis) de niveau <= niveauMax, meilleur que l'actuel */
  function metierParRelation(s, niveauMax) {
    var actuel = NF.core.metierActuel(s);
    var cands = NF.data.metiers.filter(function (m) {
      if (m.niveau > niveauMax) return false;
      if (actuel && m.id === actuel.id) return false;
      if (!NF.core.prerequisMetier(s, m).ok) return false;
      if (actuel && m.salaire[1] <= s.joueur.emploi.salaire) return false;
      return true;
    });
    return cands.length ? NF.rng.pick(cands) : null;
  }

  /** Embauche par relation ; mémorise le résultat pour le texte de `resultat` */
  function embaucheParRelation(s, niveauMax, bonusSalaire) {
    var m = metierParRelation(s, niveauMax);
    if (!m) { s.joueur.drapeaux.tuyau_resultat = 'rien'; return null; }
    NF.core.embaucher(s, m);
    if (bonusSalaire && bonusSalaire !== 1) s.joueur.emploi.salaire = Math.round(s.joueur.emploi.salaire * bonusSalaire / 10) * 10;
    s.joueur.drapeaux.tuyau_resultat = 'embauche';
    return m;
  }

  function texteTuyau(s, siRien) {
    var r = s.joueur.drapeaux.tuyau_resultat;
    delete s.joueur.drapeaux.tuyau_resultat;
    var m = NF.core.metierActuel(s);
    if (r === 'embauche' && m) return NF.t('Vous commencez comme ') + NF.util.minuscule(m.nom) + ' : ' + NF.util.euros(s.joueur.emploi.salaire) + NF.t(' par mois.');
    return siRien;
  }

  NF.ajouterEvenements([

    /* ------------------------------------------------------------------
     * Rencontres du quotidien
     * ---------------------------------------------------------------- */
    { id: 'soc_benevole', famille: 'social', icone: '🧣', titre: NF.t('La maraude'),
      texte: NF.t('Un soir, une camionnette s\'arrête à votre hauteur. Deux bénévoles en descendent avec des thermos et des couvertures. « Vous voulez un café ? »'),
      poids: 3, delai: 5,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Accepter le café et discuter'),
          effets: { nourriture: 8, moral: 5, reputation: 1, drapeaux: { contact_association: true } },
          resultat: NF.t('Un café brûlant, des prénoms échangés. Ils retiennent le vôtre : vous avez maintenant un contact à l\'association.') },
        { texte: NF.t('Demander une couverture'), conditions: { objetAbsent: 'couverture' },
          effets: { objets: { couverture: 1 }, moral: 3 },
          resultat: NF.t('Ils vous laissent une couverture et un numéro à appeler en cas de grand froid.') },
        { texte: NF.t('Demander de l\'aide pour les papiers'),
          effets: { xp: { administratif: 12 }, moral: 2 },
          resultat: NF.t('Ils vous expliquent où aller, quoi demander, quels mots employer. Vous notez tout.') },
        { texte: NF.t('Décliner'), effets: { moral: -1 }, resultat: NF.t('Vous n\'avez pas envie de parler ce soir. La camionnette repart.') },
      ] },

    { id: 'soc_camarade', famille: 'social', icone: '🎓', titre: NF.t('Un visage connu'),
      texte: NF.t('Quelqu\'un s\'arrête devant vous : un ancien camarade de classe. Manteau propre, sac de courses, et l\'air de ne pas savoir quoi dire.'),
      poids: 2, delai: 12,
      conditions: { ageMax: 32, classeMax: 3 },
      choix: [
        { texte: NF.t('Raconter la vérité'),
          aleatoire: [
            { poids: 6, effets: { moral: 5, argent: 30, reputation: 1, drapeaux: { camarade_contact: true } },
              resultat: NF.t('Il écoute sans vous couper. Avant de partir, il glisse un billet dans votre main et vous laisse son numéro.') },
            { poids: 4, effets: { moral: -4 }, resultat: NF.t('Un silence gêné, puis : « Bon courage, hein. » Il s\'éloigne vite.') },
          ] },
        { texte: NF.t('Faire bonne figure'), conditions: { objet: 'vetements_propres' },
          effets: { moral: 3, reputation: 2 },
          resultat: NF.t('Vous parlez de « projets », de « période de transition ». Il vous croit. Vous aussi, presque.') },
        { texte: NF.t('Lui demander s\'il connaît du travail'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 5, effets: { moral: 3, reputation: 2, xp: { commerce: 6 }, drapeaux: { camarade_contact: true } },
              resultat: NF.t('Il connaît quelqu\'un qui cherche. Il promet d\'en parler, et il le fera.') },
            { poids: 5, effets: { moral: -2 }, resultat: NF.t('« Je vais demander autour de moi. » Vous n\'aurez pas de nouvelles.') },
          ] },
        { texte: NF.t('Baisser les yeux et continuer'), effets: { moral: -5 }, resultat: NF.t('Vous faites semblant de ne pas l\'avoir vu. Lui aussi, peut-être.') },
      ] },

    { id: 'soc_voisin', famille: 'social', icone: '🏘️', titre: NF.t('Le voisin du dessus'),
      texte: NF.t('Votre voisin frappe à la porte, une serpillière à la main. Une fuite d\'eau, et personne ne répond chez le propriétaire.'),
      poids: 2, delai: 8,
      conditions: { logementOrdreMin: 3 },
      choix: [
        { texte: NF.t('Réparer vous-même'), conditions: { competences: { bricolage: 1 } },
          effets: { reputation: 3, moral: 4, xp: { bricolage: 10 } },
          resultat: NF.t('Un joint, deux tours de clé. Il vous remercie avec une bouteille et vous présente au reste de l\'immeuble.') },
        { texte: NF.t('L\'aider à écrire au propriétaire'), conditions: { competences: { administratif: 1 } },
          effets: { reputation: 2, moral: 2, xp: { administratif: 8 } },
          resultat: NF.t('Un courrier bien tourné, et le propriétaire envoie enfin un plombier.') },
        { texte: NF.t('Lui offrir un café en attendant'),
          effets: { reputation: 1, moral: 3, argent: -3 },
          resultat: NF.t('Vous discutez une heure. Vous savez maintenant qui habite au-dessus, et lui aussi.') },
        { texte: NF.t('Ne pas ouvrir'), effets: { moral: -1, reputation: -1 }, resultat: NF.t('Vous restez derrière la porte. Il n\'insiste pas.') },
      ] },

    { id: 'soc_sdf_partage', famille: 'social', icone: '🍲', titre: NF.t('Un repas partagé'),
      texte: NF.t('Un homme qui dort deux rues plus loin s\'approche avec un sac en papier. « J\'en ai trop. Prenez. » Il connaît le quartier mieux que vous.'),
      poids: 3, delai: 5,
      conditions: { logementOrdreMax: 2 },
      choix: [
        { texte: NF.t('Accepter et manger ensemble'),
          effets: { nourriture: 15, moral: 6, reputation: 1 },
          resultat: NF.t('Du pain, du fromage, des histoires. Il vous indique une boulangerie qui donne ses invendus.') },
        { texte: NF.t('Partager en retour ce que vous avez'), conditions: { objet: 'conserve' },
          effets: { objets: { conserve: -1 }, nourriture: 12, moral: 8, reputation: 3 },
          resultat: NF.t('Vous ouvrez une conserve, il sort du pain. Un vrai repas. Vous avez un allié dans le quartier.') },
        { texte: NF.t('Lui parler du réseau d\'entraide'), conditions: { drapeau: 'reseau_entraide' },
          effets: { nourriture: 10, moral: 5, reputation: 3 },
          resultat: NF.t('Vous lui expliquez comment ça marche. Il viendra. Le réseau grandit.') },
        { texte: NF.t('Refuser, par méfiance'), effets: { moral: -3 }, resultat: NF.t('Il hausse les épaules et repart. Vous le regrettez un peu.') },
      ] },

    { id: 'soc_commercant', famille: 'social', icone: '🥖', titre: NF.t('La boulangère du coin'),
      texte: NF.t('La gérante de la boulangerie devant laquelle vous passez chaque jour vous fait signe. « Je mets de côté les invendus du soir. Si ça vous intéresse… »'),
      poids: 3, delai: 6,
      conditions: { logementOrdreMax: 3, jauges: { hygiene: { min: 20 } } },
      choix: [
        { texte: NF.t('Accepter avec reconnaissance'),
          effets: { nourriture: 14, moral: 5, reputation: 2 },
          resultat: NF.t('Chaque soir, un sac de pain et de viennoiseries. Vous ne passez plus devant la vitrine la tête basse.') },
        { texte: NF.t('Proposer d\'aider en échange'), conditions: { jauges: { hygiene: { min: 40 } } },
          aleatoire: [
            { poids: 6, effets: { argent: 60, nourriture: 10, moral: 6, reputation: 3, xp: { commerce: 6 } },
              resultat: NF.t('Nettoyer la réserve, décharger la farine : elle vous paie quelques heures en liquide et vous garde du pain.') },
            { poids: 4, effets: { nourriture: 10, moral: 3, reputation: 1 },
              resultat: NF.t('« Je n\'ai besoin de personne, mais le pain, prenez-le. »') },
          ] },
        { texte: NF.t('Décliner poliment'), effets: { moral: 1 }, resultat: NF.t('Vous ne voulez rien devoir à personne. Elle n\'insiste pas, mais la porte reste ouverte.') },
      ] },

    { id: 'soc_collegue_tuyau', famille: 'social', icone: '📞', titre: NF.t('Un ancien collègue'),
      texte: NF.t('Un ancien collègue vous reconnaît et vous retient. « Là où je travaille, ils cherchent du monde. Si vous voulez, je glisse votre nom. »'),
      poids: 2, delai: 10,
      condition: function (s) { return (s.stats.emplois || 0) > 0; },
      choix: [
        { texte: NF.t('Accepter et vous présenter dès le lendemain'),
          aleatoire: [
            { poids: 7,
              effets: function (s) { var a = NF.core.metierActuel(s); embaucheParRelation(s, a ? Math.min(5, a.niveau + 1) : 2, 1); return { moral: 5, reputation: 2, energie: -4 }; },
              resultat: function (s) { return texteTuyau(s, NF.t('Finalement, rien pour vous : le profil ne convient pas. Mais ils gardent votre nom.')); } },
            { poids: 3, effets: { moral: -3, energie: -4 }, resultat: NF.t('Le poste a été pourvu entre-temps. Vous repartez avec une poignée de main.') },
          ] },
        { texte: NF.t('Demander d\'abord conseil à votre mentor'), conditions: { drapeau: 'mentor' },
          effets: function (s) { var a = NF.core.metierActuel(s); embaucheParRelation(s, a ? Math.min(5, a.niveau + 1) : 3, 1.05); return { moral: 6, reputation: 3, energie: -4, xp: { commerce: 5 } }; },
          resultat: function (s) { return texteTuyau(s, NF.t('Votre mentor vous aide à préparer l\'entretien, mais le poste ne vous correspond pas. Ce sera pour une autre fois.')); } },
        { texte: NF.t('Prendre le numéro, pour plus tard'), effets: { moral: 2, reputation: 1 }, resultat: NF.t('Vous notez. On ne sait jamais.') },
        { texte: NF.t('Refuser : vous ne lui faites pas confiance'), effets: { moral: -2 }, resultat: NF.t('Il n\'insiste pas. Vous repenserez à cette offre pendant des semaines.') },
      ] },

    { id: 'soc_hebergement_proposition', famille: 'social', icone: '🛋️', titre: NF.t('Un canapé'),
      texte: function (s) {
        if (s.joueur.drapeaux.camarade_contact) return NF.t('Votre ancien camarade de classe vous écrit : il a un canapé-lit, et sa colocataire est d\'accord. « Le temps de vous retourner. »');
        return NF.t('Une connaissance de l\'association vous propose son canapé « le temps de vous retourner ». Un vrai lit, une douche, une porte qui ferme.');
      },
      poids: function (s) { return s.joueur.drapeaux.camarade_contact ? 3 : 2; }, delai: 10,
      conditions: { logementOrdreMax: 2, sansDrapeau: 'hebergement_propose', reputationMin: 15, partenaire: false, enfants: false },
      choix: [
        { texte: NF.t('Accepter'),
          effets: { moral: 8, drapeaux: { hebergement_propose: true } },
          resultat: NF.t('Vous pouvez emménager quand vous voulez (onglet Logement). Ce n\'est pas pour toujours, mais c\'est un toit.') },
        { texte: NF.t('Accepter et arriver avec des courses (40 €)'), conditions: { argentMin: 40 },
          effets: { argent: -40, moral: 10, reputation: 3, drapeaux: { hebergement_propose: true } },
          resultat: NF.t('Vous arrivez avec un sac plein. On vous accueille comme quelqu\'un, pas comme un problème. Vous pouvez emménager (onglet Logement).') },
        { texte: NF.t('Refuser, pour ne pas déranger'), effets: { moral: -3 }, resultat: NF.t('Vous ne voulez pas peser. La proposition reste dans un coin de votre tête.') },
      ] },

    /* ------------------------------------------------------------------
     * Chaîne de rencontre amoureuse (3 étapes)
     * ---------------------------------------------------------------- */
    { id: 'soc_rencontre', famille: 'social', icone: '💬', titre: NF.t('Une conversation qui dure'),
      texte: NF.t('Dans une file d\'attente, sur un banc, entre deux rayons de la bibliothèque : quelqu\'un engage la conversation, et elle ne s\'arrête pas. Pas de pitié dans le regard, pas de jugement. De la curiosité, et quelque chose de doux.'),
      poids: 2, delai: 12,
      conditions: { partenaire: false, sansDrapeau: 'relation_en_cours', ageMax: 70, jauges: { hygiene: { min: 30 }, moral: { min: 20 } } },
      choix: [
        { texte: NF.t('Échanger vos numéros'), conditions: { telephone: true },
          effets: function (s) { var p = NF.rng.pick(PRENOMS_RENCONTRE); return { moral: 6, drapeaux: { relation_en_cours: true, relation_prenom: p }, programmer: { evenement: 'soc_rencontre_suite', dans: 1 } }; },
          resultat: function (s) { return NF.t('Vous échangez vos numéros. ') + prenomRencontre(s) + NF.t(' écrit le soir même.'); } },
        { texte: NF.t('Proposer un café (5 €)'), conditions: { argentMin: 5 },
          effets: function (s) { var p = NF.rng.pick(PRENOMS_RENCONTRE); return { argent: -5, moral: 8, drapeaux: { relation_en_cours: true, relation_prenom: p, relation_affinite: true }, programmer: { evenement: 'soc_rencontre_suite', dans: 2 } }; },
          resultat: function (s) { return NF.t('Une heure au comptoir. ') + prenomRencontre(s) + NF.t(' rit à vos histoires et propose de se revoir.'); } },
        { texte: NF.t('Donner rendez-vous ici, même heure, la semaine prochaine'),
          effets: function (s) { var p = NF.rng.pick(PRENOMS_RENCONTRE); return { moral: 5, drapeaux: { relation_en_cours: true, relation_prenom: p }, programmer: { evenement: 'soc_rencontre_suite', dans: 2 } }; },
          resultat: function (s) { return NF.t('Pas de téléphone, juste une promesse. ') + prenomRencontre(s) + NF.t(' est là, la semaine suivante.'); } },
        { texte: NF.t('Rester sur votre réserve'), effets: { moral: -2 }, resultat: NF.t('Vous répondez par monosyllabes. La personne finit par s\'éloigner. Vous y repensez le soir.') },
      ] },

    { id: 'soc_rencontre_suite', famille: 'social', force: true, icone: '🌆', titre: NF.t('Se revoir'),
      texte: function (s) { var p = prenomRencontre(s); return p + NF.t(' vous retrouve comme convenu. Vous marchez longtemps, vous parlez de tout. À un moment, ') + p + NF.t(' demande, sans détour : « Et vous, vous vivez où ? »'); },
      poids: 1, delai: 1,
      conditions: { drapeau: 'relation_en_cours', partenaire: false },
      choix: [
        { texte: NF.t('Dire la vérité sur votre situation'), conditions: { drapeau: 'relation_en_cours', partenaire: false },
          aleatoire: [
            { poids: function (s) { return NF.core.logementActuel(s).ordre >= 3 ? 8 : 5; },
              effets: { moral: 8, drapeaux: { relation_serieuse: true }, programmer: { evenement: 'soc_rencontre_couple', dans: 2 } },
              resultat: function (s) { return prenomRencontre(s) + NF.t(' se tait un moment, puis prend votre bras. « Merci de me l\'avoir dit. »'); } },
            { poids: 4,
              effets: function (s) { var p = prenomRencontre(s); finRelation(s); return { moral: -8, journal: p + NF.t(' ne rappellera pas.') }; },
              resultat: NF.t('Le silence s\'installe. Le rendez-vous suivant n\'aura jamais lieu.') },
          ] },
        { texte: NF.t('Inviter chez vous'), conditions: { drapeau: 'relation_en_cours', partenaire: false, logementOrdreMin: 3 },
          effets: { moral: 8, energie: -3, drapeaux: { relation_serieuse: true }, programmer: { evenement: 'soc_rencontre_couple', dans: 2 } },
          resultat: function (s) { return NF.t('Un repas simple, chez vous. ') + prenomRencontre(s) + NF.t(' reste tard, et revient le lendemain.'); } },
        { texte: NF.t('Proposer une sortie (25 €)'), conditions: { drapeau: 'relation_en_cours', partenaire: false, argentMin: 25 },
          effets: { argent: -25, moral: 7, drapeaux: { relation_serieuse: true }, programmer: { evenement: 'soc_rencontre_couple', dans: 2 } },
          resultat: NF.t('Un cinéma de quartier, puis un verre. Vous riez beaucoup. On se reverra, c\'est sûr.') },
        { texte: NF.t('Ne pas donner suite'), conditions: { drapeau: 'relation_en_cours' },
          effets: function (s) { finRelation(s); return { moral: -3 }; },
          resultat: NF.t('Vous ne répondez plus. Ça vaut mieux, vous vous dites. Vous n\'en êtes pas sûr.') },
        { texte: NF.t('La page est tournée'), cache: true, condition: pageTournee,
          effets: function (s) { finRelation(s); return {}; },
          resultat: NF.t('Entre-temps, votre vie a pris un autre chemin.') },
      ] },

    { id: 'soc_rencontre_couple', famille: 'social', force: true, icone: '💞', titre: NF.t('Quelque chose de sérieux'),
      texte: function (s) { var p = prenomRencontre(s); return NF.t('Cela fait quelques semaines que vous vous voyez. Un soir, ') + p + NF.t(' pose la question : faire les choses sérieusement, à deux, avec ce que ça implique.'); },
      poids: 1, delai: 1,
      conditions: { drapeau: 'relation_en_cours', partenaire: false },
      choix: [
        { texte: NF.t('Accepter'), conditions: { drapeau: 'relation_en_cours', partenaire: false },
          effets: function (s) {
            var serieuse = !!s.joueur.drapeaux.relation_serieuse;
            NF.core.formerCouple(s, { prenom: prenomRencontre(s), revenu: 900, relation: serieuse ? 60 : 55 });
            finRelation(s);
            return { moral: 12 };
          },
          resultat: function (s) {
            var p = s.joueur.famille.partenaire;
            if (!p) return NF.t('Vous formez un couple.');
            var t = NF.t('Vous formez un couple avec ') + p.prenom + '. ';
            if (p.revenu > 0) t += p.prenom + NF.t(' travaille (') + NF.util.euros(p.revenu) + NF.t(' par mois) et tient à participer.');
            else t += p.prenom + NF.t(' n\'a pas de revenus pour le moment. On verra, à deux.');
            return t;
          } },
        { texte: NF.t('Demander encore un peu de temps'), conditions: { drapeau: 'relation_en_cours', partenaire: false },
          aleatoire: [
            { poids: 5, effets: { moral: 2, programmer: { evenement: 'soc_rencontre_couple', dans: 3 } },
              resultat: function (s) { return prenomRencontre(s) + NF.t(' comprend. On en reparlera dans quelque temps.'); } },
            { poids: 5, effets: function (s) { finRelation(s); return { moral: -6 }; },
              resultat: NF.t('Une réponse était attendue. Faute de réponse, ce sera non.') },
          ] },
        { texte: NF.t('Refuser : ce n\'est pas le moment'), conditions: { drapeau: 'relation_en_cours' },
          effets: function (s) { finRelation(s); return { moral: -5 }; },
          resultat: NF.t('Vous restez seul, par choix. Ça ne console pas vraiment.') },
        { texte: NF.t('La page est tournée'), cache: true, condition: pageTournee,
          effets: function (s) { finRelation(s); return {}; },
          resultat: NF.t('Entre-temps, votre vie a pris un autre chemin.') },
      ] },

    /* ------------------------------------------------------------------
     * Pression sociale, presse, conflits
     * ---------------------------------------------------------------- */
    { id: 'soc_invitation_couteuse', famille: 'social', icone: '🥂', titre: NF.t('Invitation'),
      texte: NF.t('Des connaissances de votre nouveau milieu vous invitent : un week-end entre amis dans une maison louée au bord de la mer. Tout le monde participe aux frais, « ça va de soi ».'),
      poids: 2, delai: 8,
      conditions: { classeMin: 5 },
      choix: [
        { texte: NF.t('Y aller et participer (400 €)'), conditions: { argentMin: 400 },
          effets: { argent: -400, moral: 10, reputation: 4, energie: 6 },
          resultat: NF.t('Deux jours loin de tout. Vous revenez avec des numéros utiles et le sentiment d\'être à votre place.') },
        { texte: NF.t('Y aller et cuisiner pour tout le monde (150 €)'), conditions: { competences: { cuisine: 2 }, argentMin: 150 },
          effets: { argent: -150, moral: 8, reputation: 5, xp: { cuisine: 8 } },
          resultat: NF.t('Vos plats font parler. On vous pardonne volontiers de ne pas avoir payé la villa.') },
        { texte: NF.t('Dire franchement que c\'est trop cher'), conditions: { competences: { commerce: 2 } },
          effets: { moral: 2, reputation: 1 },
          resultat: NF.t('Un instant de gêne, puis quelqu\'un propose un plan moins cher pour la prochaine fois. Votre franchise plaît.') },
        { texte: NF.t('Inventer un empêchement'), effets: { moral: -3, reputation: -3 }, resultat: NF.t('On comprend. On vous invitera moins, aussi.') },
      ] },

    { id: 'soc_journaliste', famille: 'social', icone: '🎤', titre: NF.t('Un micro tendu'),
      texte: NF.t('Un journaliste prépare un reportage sur la précarité dans la ville. Il voudrait vous interviewer, à visage découvert ou non. « Les gens ne savent pas. Il faut qu\'ils sachent. »'),
      poids: 1.5, delai: 18,
      conditions: { classeMax: 3, sansDrapeau: 'article_en_cours' },
      choix: [
        { texte: NF.t('Témoigner à visage découvert'),
          effets: { moral: 4, drapeaux: { article_en_cours: true, article_visage: true }, programmer: { evenement: 'soc_journaliste_article', dans: 2 } },
          resultat: NF.t('Vous parlez une heure. Il promet de vous montrer l\'article avant publication.') },
        { texte: NF.t('Témoigner anonymement'),
          effets: { moral: 2, drapeaux: { article_en_cours: true }, programmer: { evenement: 'soc_journaliste_article', dans: 2 } },
          resultat: NF.t('Un prénom d\'emprunt, pas de photo. Vous racontez l\'essentiel.') },
        { texte: NF.t('Négocier un dédommagement'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 6, effets: { argent: 40, moral: 3, drapeaux: { article_en_cours: true, article_visage: true }, programmer: { evenement: 'soc_journaliste_article', dans: 2 } },
              resultat: NF.t('Il accepte de vous dédommager pour votre temps. L\'interview se fait au chaud, dans un café.') },
            { poids: 4, effets: { moral: -1 }, resultat: NF.t('« On ne paie pas les témoignages. » Il trouve quelqu\'un d\'autre.') },
          ] },
        { texte: NF.t('Refuser'), effets: {}, resultat: NF.t('Vous n\'avez pas envie d\'être une histoire dans un journal.') },
      ] },

    { id: 'soc_journaliste_article', famille: 'social', force: true, icone: '📰', titre: NF.t('L\'article est sorti'),
      texte: function (s) { return NF.t('Le reportage est publié. Vous y êtes') + (s.joueur.drapeaux.article_visage ? NF.t(', avec votre photo et votre prénom') : NF.t(', sous un prénom d\'emprunt')) + NF.t('. À l\'association, on vous en parle.'); },
      poids: 1, delai: 1,
      conditions: { drapeau: 'article_en_cours' },
      choix: [
        { texte: NF.t('Lire l\'article'),
          effets: function (s) {
            var d = s.joueur.drapeaux, visage = !!d.article_visage;
            delete d.article_en_cours; delete d.article_visage;
            if (!visage) { d.article_issue = 'anonyme'; return { reputation: 2, moral: 3 }; }
            if (NF.rng.chance(0.6)) { d.article_issue = 'dons'; return { reputation: 6, moral: 5, argent: 60 }; }
            d.article_issue = 'commentaires';
            return { reputation: -3, moral: -6 };
          },
          resultat: function (s) {
            var r = s.joueur.drapeaux.article_issue;
            delete s.joueur.drapeaux.article_issue;
            if (r === 'dons') return NF.t('Le portrait est juste, digne. Des lecteurs ont déposé une enveloppe pour vous à l\'association.');
            if (r === 'commentaires') return NF.t('L\'article est correct. Les commentaires en ligne, non. Vous les lisez tous, et vous le regrettez.');
            return NF.t('Un témoignage parmi d\'autres, sans votre nom. Ça fait du bien de l\'avoir dit.');
          } },
        { texte: NF.t('Ne pas le lire'),
          effets: function (s) { var d = s.joueur.drapeaux, visage = !!d.article_visage; delete d.article_en_cours; delete d.article_visage; return visage ? { reputation: 3, moral: 1 } : { reputation: 1 }; },
          resultat: NF.t('Vous préférez ne pas vous voir en page douze. Les autres l\'ont lu pour vous, et vous regardent un peu autrement.') },
      ] },

    { id: 'soc_dispute_sdf', famille: 'social', icone: '😠', titre: NF.t('Territoire'),
      texte: NF.t('« C\'est ma place, ça. » Un homme que vous ne connaissez pas vous domine de toute sa hauteur. Il a bu, et il n\'est pas seul.'),
      poids: 2.5, delai: 6,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Partir sans discuter'), effets: { moral: -5, energie: -4 }, resultat: NF.t('Vous ramassez vos affaires. Une place en moins, et la rage au ventre.') },
        { texte: NF.t('Faire appel au réseau d\'entraide'), conditions: { drapeau: 'reseau_entraide' },
          effets: { moral: 3, reputation: 2 },
          resultat: NF.t('Deux personnes du réseau arrivent dans le quart d\'heure. Le ton baisse. On se partage l\'endroit.') },
        { texte: NF.t('Discuter calmement'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 6, effets: { moral: 3, reputation: 1 }, resultat: NF.t('Vous trouvez les mots. Il grogne, puis s\'assoit. Vous partagez une cigarette.') },
            { poids: 4, effets: { moral: -4, energie: -5 }, resultat: NF.t('Il n\'écoute rien. Vous finissez par céder la place.') },
          ] },
        { texte: NF.t('Tenir tête'),
          aleatoire: [
            { poids: 4, effets: { moral: 4, reputation: 2 }, resultat: NF.t('Il recule. Ça se saura dans le quartier.') },
            { poids: 4, effets: { sante: -10, moral: -6, energie: -8 }, resultat: NF.t('Un coup de poing, une chute. Vous gardez la place, mais vous saignez du nez.') },
            { poids: 2, effets: { sante: -8, moral: -8, argent: -20 }, resultat: NF.t('Ils sont trois. Vous repartez avec un œil fermé et les poches vides.') },
          ] },
      ] },

    /* ------------------------------------------------------------------
     * Réseau, anciens employeurs, mentor
     * ---------------------------------------------------------------- */
    { id: 'soc_reseau_entraide', famille: 'social', icone: '🤝', titre: NF.t('Un réseau d\'entraide'),
      texte: NF.t('À l\'association, un petit groupe se monte : échanger des tuyaux, garder les affaires des uns pendant que les autres font des démarches, se prévenir des contrôles.'),
      poids: 2, delai: 12,
      conditions: { lieu: 'association', logementOrdreMax: 3, sansDrapeau: 'reseau_entraide' },
      choix: [
        { texte: NF.t('Rejoindre le groupe'),
          effets: { moral: 6, reputation: 3, drapeaux: { reseau_entraide: true } },
          resultat: NF.t('Vous avez maintenant des gens à appeler. Et des gens qui comptent sur vous.') },
        { texte: NF.t('Proposer de coordonner les échanges'), conditions: { competences: { administratif: 1 } },
          effets: { moral: 5, reputation: 6, energie: -5, xp: { administratif: 8 }, drapeaux: { reseau_entraide: true } },
          resultat: NF.t('Un cahier, des numéros, un planning. Vous devenez la personne qu\'on vient voir.') },
        { texte: NF.t('Rester à l\'écart'), effets: { moral: -1 }, resultat: NF.t('Vous n\'avez pas envie de dépendre d\'un groupe. Vous écoutez de loin.') },
      ] },

    { id: 'soc_ancien_employeur', famille: 'social', icone: '🏭', titre: NF.t('Un ancien patron'),
      texte: function (s) { return NF.t('Vous tombez sur un ancien employeur. Il se souvient de vous') + (s.joueur.casier ? NF.t(', et de vos ennuis') : NF.t(', plutôt en bien')) + NF.t('. « J\'aurais peut-être quelque chose pour vous. »'); },
      poids: 2, delai: 10,
      conditions: { emploi: false },
      condition: function (s) { return (s.stats.emplois || 0) > 0; },
      choix: [
        { texte: NF.t('Accepter sa proposition'),
          aleatoire: [
            { poids: 7,
              effets: function (s) { var m = embaucheParRelation(s, 2, 1); return m ? { moral: 5, reputation: 1, energie: -3 } : { argent: 80, energie: -6, moral: 1 }; },
              resultat: function (s) { return texteTuyau(s, NF.t('Il vous fait travailler une journée à l\'essai, payée en liquide, puis ne donne pas suite.')); } },
            { poids: 3, effets: { moral: -3 }, resultat: NF.t('« Finalement, ça ne va pas être possible. » Il ne rappelle pas.') },
          ] },
        { texte: NF.t('Négocier le salaire'), conditions: { competences: { commerce: 2 } },
          effets: function (s) { var m = embaucheParRelation(s, 2, 1.1); return m ? { moral: 6, reputation: 2, energie: -3, xp: { commerce: 6 } } : { argent: 100, energie: -6, moral: 1 }; },
          resultat: function (s) { return texteTuyau(s, NF.t('Pas de poste finalement, mais il vous paie correctement deux journées de travail.')); } },
        { texte: NF.t('Demander plutôt une recommandation écrite'),
          effets: { reputation: 4, moral: 3, xp: { administratif: 4 } },
          resultat: NF.t('Une lettre signée, tamponnée. Elle pèsera dans vos prochaines candidatures.') },
        { texte: NF.t('Décliner'), effets: { moral: -1 }, resultat: NF.t('Vous avez vos raisons. Il n\'insiste pas.') },
      ] },

    { id: 'soc_mentor', famille: 'social', icone: '🧭', titre: NF.t('Quelqu\'un qui croit en vous'),
      texte: NF.t('Une habituée de la bibliothèque, enseignante à la retraite, vous observe depuis des semaines. Elle propose de vous aider à apprendre, régulièrement. « Vous avez une tête bien faite. Il faut juste la remplir. »'),
      poids: 1.5, delai: 14,
      conditions: { lieu: 'bibliotheque', sansDrapeau: 'mentor', jauges: { moral: { min: 15 } } },
      choix: [
        { texte: NF.t('Accepter avec enthousiasme'),
          effets: { moral: 6, xp: { lecture: 25 }, drapeaux: { mentor: true } },
          resultat: NF.t('Deux après-midis par semaine. Vous lisez, vous écrivez, vous posez des questions. Vous avez un mentor.') },
        { texte: NF.t('Lui demander de l\'aide en informatique'), conditions: { competences: { lecture: 1 } },
          effets: { moral: 5, xp: { informatique: 25 }, drapeaux: { mentor: true } },
          resultat: NF.t('Elle s\'y connaît moins, mais elle apprend avec vous. C\'est ce qui compte.') },
        { texte: NF.t('Accepter, à condition de l\'aider en retour'),
          effets: { moral: 7, reputation: 2, xp: { lecture: 15, bricolage: 10 }, drapeaux: { mentor: true } },
          resultat: NF.t('Vous portez ses courses, elle corrige vos lettres. Un échange, pas une charité.') },
        { texte: NF.t('Refuser : vous n\'avez pas le temps'), effets: { moral: -2 }, resultat: NF.t('Elle n\'insiste pas. Vous la recroisez parfois, et elle vous sourit quand même.') },
      ] },
  ]);
})();
