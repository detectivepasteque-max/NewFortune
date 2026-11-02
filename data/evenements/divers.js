/* =====================================================================
 * ÉVÉNEMENTS – VIE QUOTIDIENNE (famille 'divers')
 * ---------------------------------------------------------------------
 * Météo, voisinage, petites rencontres, moments de vie : ce qui ne
 * relève ni de la santé, ni de la sécurité, ni du travail. Même schéma
 * que sante.js (voir src/core/evenements.js).
 *
 * Chaînes :
 *   div_chien_adopte  → drapeau chien + programmé → div_chien_suite (force ;
 *       `donnees.cas` = 'protege' | 'malade', tiré au moment de l'adoption)
 *   div_copropriete   → programmé en boucle       → div_copropriete_echeance (force ;
 *       `donnees` = { part, restantes })
 *   div_parrainage    → drapeau parrainage + programmé → div_parrainage_suite
 *       (force, se reprogramme tant qu'on continue ; `donnees.issue`)
 *   div_elections     → drapeau engage_quartier + programmé → div_conseil_quartier (force)
 *   div_fete_voisins  → drapeau voisin_proche, réutilisé par div_greve_transports,
 *       div_coupure_electricite
 *
 * Drapeaux introduits : chien, voisin_proche, parrainage, engage_quartier,
 *   conseil_quartier, mecene
 *   chien_issue → temporaire (effacé dans `resultat`)
 * Drapeaux d'autres fichiers réutilisés : reseau_entraide, camarade_contact
 *   (social.js), chien_nourri (securite.js), foyer_interdit (moteur)
 * ===================================================================== */
(function () {
  var U = NF.util;

  function arrondi10(v) { return Math.round(v / 10) * 10; }

  function salaire(s) { return s.joueur.emploi ? s.joueur.emploi.salaire : 0; }

  /** Retire jusqu'à `max` objets emportés par les intempéries ou égarés :
   *  les objets fragiles d'abord, jamais les matériaux ni la voiture.
   *  Retourne la liste des noms retirés, en minuscules. */
  function perdreObjets(s, max, proba) {
    var pris = [];
    for (var id in s.joueur.inventaire) {
      var o = U.byId(NF.data.objets, id);
      if (!o || o.type === 'materiau' || o.id === 'voiture') continue;
      var p = proba * (o.fragile ? 1 : 0.4);
      if (NF.rng.chance(p)) {
        NF.api.retirerObjet(s, id, 1);
        pris.push(NF.util.minuscule(o.nom));
        if (pris.length >= max) break;
      }
    }
    return pris;
  }

  function journalPertes(pris, prefixe) { return pris.length ? (prefixe || NF.t('Perdu')) + ' : ' + pris.join(', ') + '.' : ''; }

  /** Valeur selon la classe sociale : bas (1-2), moyen (3-4), haut (5 et plus) */
  function selonClasse(s, bas, moyen, haut) {
    var c = s.joueur.classe;
    return c <= 2 ? bas : c <= 4 ? moyen : haut;
  }

  function relationPartenaire(s, delta) {
    var p = s.joueur.famille.partenaire;
    if (p) p.relation = U.clamp(p.relation + delta, 0, 100);
  }

  /** Quote-part de travaux : 10 % de l'argent disponible, entre 1 000 et 3 000 € */
  function quotePartTravaux(s) {
    return U.clamp(Math.round(s.joueur.argent * 0.1 / 100) * 100, 1000, 3000);
  }

  function echeanceSuivante(d) {
    return { evenement: 'div_copropriete_echeance', dans: 1, donnees: { part: d.part, restantes: d.restantes - 1 } };
  }

  /** Issue d'un semestre de parrainage, tirée à l'avance et passée en `donnees` */
  function tirerIssueParrainage() {
    return NF.rng.pick(['emploi', 'formation', 'formation', 'silence', 'rechute']);
  }

  function suiteParrainage() {
    return { evenement: 'div_parrainage_suite', dans: 6, donnees: { issue: tirerIssueParrainage() } };
  }

  function suiteChien() {
    return { evenement: 'div_chien_suite', dans: NF.rng.int(2, 4), donnees: { cas: NF.rng.chance(0.55) ? 'protege' : 'malade' } };
  }

  function chienMalade(s, d) { return !!(d && d.cas === 'malade'); }
  function chienProtege(s, d) { return !chienMalade(s, d); }

  NF.ajouterEvenements([

    /* ------------------------------------------------------------------
     * À LA RUE, AU SQUAT, SOUS LA TENTE
     * ---------------------------------------------------------------- */

    { id: 'div_tempete', famille: 'divers', icone: '🌧️', titre: NF.t('Nuit de tempête'),
      texte: NF.t('Le vent se lève en fin d\'après-midi, puis la pluie tombe à l\'horizontale. Le caniveau déborde et l\'eau monte jusqu\'à votre couchage.'),
      poids: 2, delai: 8,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Rassembler mes affaires et courir à l\'abri'),
          effets: function (s) { var pris = perdreObjets(s, 1, 0.35); return { energie: -8, hygiene: -6, moral: -3, journal: journalPertes(pris) }; },
          resultat: NF.t('Un hall d\'immeuble, un parking. Vous passez la nuit trempé, mais vous avez sauvé l\'essentiel.') },
        { texte: NF.t('Bâcher le campement et tenir'), conditions: { objet: 'bache' },
          aleatoire: [
            { poids: 6, effets: { energie: -5, moral: 2 }, resultat: NF.t('La bâche tient. Au matin, tout est humide, mais rien ne manque.') },
            { poids: 4, effets: function (s) { NF.api.retirerObjet(s, 'bache', 1); var pris = perdreObjets(s, 1, 0.3); return { energie: -8, hygiene: -5, moral: -4, journal: NF.t('Perdu : bâche') + (pris.length ? ', ' + pris.join(', ') : '') + '.' }; },
              resultat: NF.t('Une rafale emporte la bâche vers deux heures du matin. Le reste suit.') },
          ] },
        { texte: NF.t('Demander une place au foyer d\'urgence pour la nuit'), conditions: { sansDrapeau: 'foyer_interdit' },
          aleatoire: [
            { poids: 6, effets: function (s) { var pris = perdreObjets(s, 2, 0.4); return { energie: 6, hygiene: 8, moral: 1, journal: journalPertes(pris) }; },
              resultat: NF.t('Une place pour la nuit, au sec. Ce que vous avez laissé dehors n\'a pas résisté.') },
            { poids: 4, effets: function (s) { var pris = perdreObjets(s, 2, 0.4); return { energie: -10, hygiene: -6, moral: -6, journal: journalPertes(pris) }; },
              resultat: NF.t('Complet. Vous revenez sous la pluie, et le campement a été emporté.') },
          ] },
        { texte: NF.t('Attendre que ça passe'),
          effets: function (s) { var pris = perdreObjets(s, 3, 0.5); return { sante: -8, energie: -12, hygiene: -10, moral: -6, journal: journalPertes(pris) }; },
          resultat: NF.t('Une nuit sans sommeil, à retenir ce qui peut l\'être. Au matin, le trottoir est propre : l\'eau a tout emporté.') },
      ] },

    { id: 'div_portefeuille', famille: 'divers', icone: '👛', titre: NF.t('Un portefeuille sur le trottoir'),
      texte: NF.t('Sous un banc, un portefeuille en cuir. Une carte d\'identité, des photos, des cartes bancaires et des billets. Personne autour.'),
      poids: 1.5, delai: 14,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Le rapporter au commissariat'),
          aleatoire: [
            { poids: 5, effets: { reputation: 4, moral: 5, energie: -3 }, resultat: NF.t('L\'agent note votre nom. Deux jours plus tard, le propriétaire vous retrouve et vous remercie, les yeux humides.') },
            { poids: 3, effets: { reputation: 3, moral: 4, argent: 30, energie: -3 }, resultat: NF.t('Le propriétaire tient à vous dédommager. Vous refusez une fois, pas deux.') },
            { poids: 2, effets: { reputation: 1, moral: -2, energie: -4 }, resultat: NF.t('On vous fait attendre deux heures et on vous regarde de travers, comme si le voleur, c\'était vous.') },
          ] },
        { texte: NF.t('Retrouver le propriétaire grâce à l\'adresse'), conditions: { competences: { lecture: 1 } },
          effets: { reputation: 5, moral: 6, argent: 40, energie: -4 },
          resultat: NF.t('L\'adresse est à vingt minutes à pied. La porte s\'ouvre sur un homme qui n\'y croyait plus. Il vous glisse deux billets et son numéro.') },
        { texte: NF.t('Garder l\'argent et déposer le reste dans une boîte aux lettres'),
          effets: function (s) { return { argent: NF.rng.int(40, 90), moral: -2 }; },
          resultat: NF.t('Les papiers retrouveront leur propriétaire. Pas les billets. Vous y repenserez.') },
        { texte: NF.t('Tout garder'),
          aleatoire: [
            { poids: 5, effets: function (s) { return { argent: NF.rng.int(60, 120), moral: -3 }; }, resultat: NF.t('Les cartes ne servent à rien sans code. Les billets, si.') },
            { poids: 3, effets: function (s) { return { argent: NF.rng.int(60, 120), moral: -5, reputation: -5 }; }, resultat: NF.t('Quelqu\'un vous a vu ramasser le portefeuille. Dans le quartier, on sait maintenant que vous gardez ce qui ne vous appartient pas.') },
            { poids: 2, effets: { moral: -8, energie: -6, reputation: -4 }, resultat: NF.t('Une caméra vous a filmé. Quelques heures au poste, une remontrance, et le portefeuille rendu sans vous.') },
          ] },
      ] },

    { id: 'div_chien_adopte', famille: 'divers', icone: '🐶', titre: NF.t('Un chien sans personne'),
      texte: function (s) {
        if (s.joueur.drapeaux.chien_nourri) return NF.t('Le chien que vous aviez nourri est revenu, et cette fois il ne repart plus. Il dort contre vos jambes, vous suit partout, attend devant la boulangerie quand vous entrez.');
        return NF.t('Un chien, collier élimé, laisse coupée, s\'est couché près de vous un soir. Au matin, il est toujours là. Il vous suit toute la journée sans rien demander d\'autre que de rester.');
      },
      poids: function (s) { return s.joueur.drapeaux.chien_nourri ? 2.5 : 1.5; }, delai: 18,
      conditions: { expose: true, sansDrapeau: 'chien' },
      choix: [
        { texte: NF.t('Le garder'),
          effets: function (s) { return { moral: 7, nourriture: -6, drapeaux: { chien: true }, programmer: suiteChien() }; },
          resultat: NF.t('Vous partagez ce que vous avez. Il mange moins que vous, et vous dormez mieux qu\'avant.') },
        { texte: NF.t('Le garder et ouvrir une conserve pour deux'), conditions: { objet: 'conserve' },
          effets: function (s) { return { objets: { conserve: -1 }, moral: 9, nourriture: 4, drapeaux: { chien: true }, programmer: suiteChien() }; },
          resultat: NF.t('Un repas pour deux, et une bête qui vous regarde comme personne ne vous a regardé depuis longtemps.') },
        { texte: NF.t('L\'emmener à l\'association pour qu\'on lui trouve une famille'), conditions: { lieu: 'association' },
          effets: { moral: 2, reputation: 2, energie: -3 },
          resultat: NF.t('Une bénévole connaît un refuge. Vous le regardez partir dans une voiture, la truffe contre la vitre.') },
        { texte: NF.t('Le chasser'), effets: { moral: -4 }, resultat: NF.t('Il s\'éloigne de quelques mètres et vous regarde. Il met trois jours à comprendre.') },
      ] },

    { id: 'div_chien_suite', famille: 'divers', force: true, icone: '🐕', titre: NF.t('Votre chien'),
      texte: function (s, d) {
        if (chienMalade(s, d)) return NF.t('Depuis deux jours, votre chien ne mange plus. Il tremble, se traîne, vous regarde sans comprendre. Il a besoin de soins, et vous n\'avez rien.');
        return NF.t('Au milieu de la nuit, le chien se dresse d\'un coup et aboie, les crocs dehors. Des pas qui s\'approchaient de l\'endroit où vous dormez s\'éloignent en vitesse. Il a veillé sur vous.');
      },
      poids: 1, delai: 1,
      conditions: { drapeau: 'chien' },
      choix: [
        /* cas : il vous a protégé */
        { texte: NF.t('Lui donner un vrai repas'), cache: true, condition: chienProtege,
          effets: { nourriture: -6, moral: 8, reputation: 1 },
          resultat: NF.t('La moitié de ce que vous aviez. Il l\'a mérité, et il le sait.') },
        { texte: NF.t('Lui faire une place sous la couverture'), cache: true, conditions: { objet: 'couverture' }, condition: chienProtege,
          effets: { moral: 6, energie: 4 },
          resultat: NF.t('Deux corps sous une couverture, c\'est plus chaud. Les nuits suivantes seront moins longues.') },
        /* cas : il est malade */
        { texte: NF.t('Payer un vétérinaire (60 €)'), cache: true, conditions: { argentMin: 60 }, condition: chienMalade,
          effets: { argent: -60, moral: 5, energie: -3 },
          resultat: NF.t('Une piqûre, des comprimés, et un vétérinaire qui ne vous fait pas payer la consultation. Il se remet en une semaine.') },
        { texte: NF.t('Chercher un dispensaire vétérinaire solidaire'), cache: true, conditions: { lieu: 'association' }, condition: chienMalade,
          aleatoire: [
            { poids: 6, effets: { moral: 6, reputation: 1, energie: -5 }, resultat: NF.t('Une consultation gratuite le jeudi, à l\'autre bout de la ville. Vous y allez à pied. Il guérit.') },
            { poids: 4, effets: { moral: -10, energie: -5, drapeaux: { chien: false } }, resultat: NF.t('Le rendez-vous est dans dix jours. Il n\'a pas tenu jusque-là.') },
          ] },
        { texte: NF.t('Le soigner avec ma trousse et ce que je sais'), cache: true, conditions: { objet: 'trousse_soins', competences: { soins: 1 } }, condition: chienMalade,
          effets: { moral: 5, xp: { soins: 6 } },
          resultat: NF.t('Une plaie infectée sous le poil, que vous nettoyez chaque jour. Il se remet, lentement.') },
        /* toujours disponible */
        { texte: NF.t('Rester près de lui'),
          effets: function (s, d) {
            if (!chienMalade(s, d)) { s.joueur.drapeaux.chien_issue = 'veille'; return { moral: 5 }; }
            if (NF.rng.chance(0.4)) { s.joueur.drapeaux.chien_issue = 'guerit'; return { moral: 3, energie: -4 }; }
            s.joueur.drapeaux.chien_issue = 'meurt';
            return { moral: -12, energie: -5, drapeaux: { chien: false } };
          },
          resultat: function (s) {
            var r = s.joueur.drapeaux.chien_issue;
            delete s.joueur.drapeaux.chien_issue;
            if (r === 'guerit') return NF.t('Trois jours sans le quitter. Le quatrième, il mange. Il s\'en sort.');
            if (r === 'meurt') return NF.t('Il meurt une nuit, la tête sur votre cuisse. Vous l\'enterrez dans un coin du parc, à la main.');
            return NF.t('Vous restez éveillé le reste de la nuit, la main sur son dos. Il s\'endort avant vous.');
          } },
      ] },

    { id: 'div_vetements_chauds', famille: 'divers', icone: '🧥', titre: NF.t('Distribution de vêtements chauds'),
      texte: NF.t('Devant l\'association, une file s\'allonge dès le matin : on distribue manteaux, bonnets et chaussettes avant les grands froids. Il y en aura pour les premiers.'),
      poids: 2.5, delai: 10,
      conditions: { saison: 'hiver', expose: true, objetAbsent: 'vetements_chauds' },
      choix: [
        { texte: NF.t('Faire la queue pour un manteau'), condition: function (s) { return NF.api.placeLibre(s) >= 1; },
          effets: { objets: { vetements_chauds: 1 }, moral: 5, energie: -3 },
          resultat: NF.t('Un manteau un peu grand, un bonnet, des chaussettes neuves. L\'hiver change de visage.') },
        { texte: NF.t('Arriver à l\'aube pour avoir le choix'), condition: function (s) { return NF.api.placeLibre(s) >= 1; },
          effets: { objets: { vetements_chauds: 1 }, hygiene: 4, moral: 6, energie: -7 },
          resultat: NF.t('Deux heures dans le froid, mais vous repartez avec un manteau à votre taille et des chaussures qui ne prennent pas l\'eau.') },
        { texte: NF.t('Prendre une couverture plutôt'), conditions: { objetAbsent: 'couverture' }, condition: function (s) { return NF.api.placeLibre(s) >= 1; },
          effets: { objets: { couverture: 1 }, moral: 3, energie: -3 },
          resultat: NF.t('Une couverture épaisse, pliée dans un sac plastique.') },
        { texte: NF.t('Laisser ma place : d\'autres en ont plus besoin'),
          effets: { reputation: 3, moral: 2 },
          resultat: NF.t('Une femme avec un enfant passe devant vous. Les bénévoles l\'ont remarqué, et vous aussi.') },
      ] },

    { id: 'div_grand_froid', famille: 'divers', icone: '🥶', titre: NF.t('Plan grand froid'),
      texte: NF.t('Moins huit annoncés pour la nuit. La ville ouvre un gymnase et fait tourner un bus de nuit chauffé. Des bénévoles passent prévenir tout le monde.'),
      poids: 2.5, delai: 6,
      conditions: { saison: 'hiver', expose: true },
      choix: [
        { texte: NF.t('Monter dans le bus de nuit'),
          effets: { energie: 8, sante: 2, moral: 3, nourriture: 4 },
          resultat: NF.t('Un siège chauffé, une soupe, et la ville qui défile derrière la vitre jusqu\'à l\'aube.') },
        { texte: NF.t('Dormir au gymnase'),
          aleatoire: [
            { poids: 7, effets: { energie: 10, hygiene: 8, sante: 3, moral: 2 }, resultat: NF.t('Un lit de camp parmi cent autres, une douche chaude. Ça ronfle, mais c\'est chaud.') },
            { poids: 3, effets: function (s) { var pris = perdreObjets(s, 1, 0.5); return { energie: 8, hygiene: 8, moral: -3, journal: journalPertes(pris, NF.t('Volé')) }; },
              resultat: NF.t('Au réveil, votre sac a été ouvert. Il manque quelque chose.') },
          ] },
        { texte: NF.t('Y aller avec le réseau d\'entraide, en gardant les affaires à tour de rôle'), conditions: { drapeau: 'reseau_entraide' },
          effets: { energie: 10, hygiene: 8, sante: 3, moral: 5, reputation: 1 },
          resultat: NF.t('On dort par roulement, quelqu\'un veille sur les sacs. Rien ne disparaît.') },
        { texte: NF.t('Rester dans mon coin'),
          effets: function (s) { var f = NF.api.passif(s, 'froid'); return { sante: -Math.round(12 * f), energie: -10, moral: -4 }; },
          resultat: function (s) { return NF.api.passif(s, 'froid') < 0.7 ? NF.t('Vos affaires chaudes font la différence. La nuit est longue, mais vous tenez.') : NF.t('Une nuit interminable. Au matin, vos doigts ne répondent plus pendant une heure.'); } },
      ] },

    { id: 'div_atelier_bibliotheque', famille: 'divers', icone: '📚', titre: NF.t('Atelier gratuit'),
      texte: NF.t('Une affiche à l\'entrée de la bibliothèque : atelier gratuit ce samedi, ouvert à tous, sans inscription. Informatique le matin, écriture l\'après-midi. Il y a du café.'),
      poids: 2, delai: 8,
      conditions: { lieu: 'bibliotheque', classeMax: 3 },
      choix: [
        { texte: NF.t('Suivre l\'atelier informatique'),
          effets: { xp: { informatique: 15 }, moral: 3, energie: -3 },
          resultat: NF.t('Créer une adresse mail, remplir un formulaire en ligne, chercher une offre. Vous repartez avec une feuille de notes.') },
        { texte: NF.t('Suivre l\'atelier d\'écriture'),
          effets: { xp: { lecture: 15 }, moral: 5, energie: -2 },
          resultat: NF.t('Écrire une page sur « un lieu qui compte ». La vôtre est lue à voix haute. Personne ne rit.') },
        { texte: NF.t('Aider l\'animateur avec les débutants'), conditions: { competences: { informatique: 2 } },
          effets: { xp: { informatique: 8 }, reputation: 3, moral: 5, argent: 30 },
          resultat: NF.t('Vous dépannez une dame avec sa boîte mail, un monsieur avec son CV. L\'animateur vous glisse un billet « pour le coup de main » et note votre nom pour la prochaine fois.') },
        { texte: NF.t('Rester au chaud dans un coin, sans participer'),
          effets: { energie: 5, moral: 1 },
          resultat: NF.t('Le radiateur, un fauteuil, le bruit des claviers. Ça compte aussi.') },
      ] },

    { id: 'div_concert', famille: 'divers', icone: '🎶', titre: NF.t('Concert sur la place'),
      texte: NF.t('Une scène montée sur la grande place, des enceintes, et un concert gratuit qui dure jusqu\'à minuit. La foule déborde sur les trottoirs.'),
      poids: 2, delai: 8,
      conditions: { expose: true, saison: ['printemps', 'ete'] },
      choix: [
        { texte: NF.t('Rester jusqu\'à la fin'),
          effets: { moral: 9, energie: -5 },
          resultat: NF.t('Pendant trois heures, vous êtes quelqu\'un dans une foule, comme tout le monde.') },
        { texte: NF.t('Faire la manche à la sortie'),
          effets: function (s) { var g = Math.round(NF.rng.int(15, 45) * NF.api.passif(s, 'mendicite') * NF.core.modifTrait(s, 'mendicite')); return { argent: g, moral: 2, energie: -6 }; },
          resultat: NF.t('Les gens sortent contents et généreux. Les pièces tombent plus vite que d\'habitude.') },
        { texte: NF.t('Aider à démonter la scène'), conditions: { competences: { technique: 1 } },
          effets: { argent: 50, energie: -10, reputation: 2, xp: { technique: 6 } },
          resultat: NF.t('Jusqu\'à trois heures du matin à porter des caisses et enrouler des câbles. Le régisseur vous paie en liquide et retient votre prénom.') },
        { texte: NF.t('Chercher un endroit calme pour dormir'),
          effets: { moral: -2, energie: 3 },
          resultat: NF.t('Le bruit vous suit jusqu\'au parking. Vous finissez par vous endormir.') },
      ] },

    { id: 'div_artiste_rue', famille: 'divers', icone: '🎨', titre: NF.t('L\'artiste du coin'),
      texte: NF.t('Un dessinateur installé sur la place vous observe depuis une heure. Il finit par s\'approcher : « Vous avez une tête qui raconte quelque chose. Je peux vous dessiner ? »'),
      poids: 1.5, delai: 10,
      conditions: { expose: true },
      choix: [
        { texte: NF.t('Poser pour lui'),
          aleatoire: [
            { poids: 5, effets: { moral: 6, reputation: 1, argent: 20 }, resultat: NF.t('Une heure immobile. Il vend le portrait à un passant dans la foulée et partage, moitié-moitié.') },
            { poids: 5, effets: { moral: 7 }, resultat: NF.t('Il vous offre le dessin. Vous ne ressemblez pas à ce que vous croyiez. Vous le gardez plié dans votre poche.') },
          ] },
        { texte: NF.t('Lui proposer de travailler côte à côte et de partager le chapeau'), conditions: { competences: { commerce: 1 } },
          effets: function (s) { return { argent: NF.rng.int(30, 70), reputation: 2, moral: 5, energie: -5, xp: { commerce: 6 } }; },
          resultat: NF.t('Lui dessine, vous abordez les passants. Ils s\'arrêtent plus longtemps. Le chapeau se remplit pour deux.') },
        { texte: NF.t('Garder ses affaires pendant qu\'il va manger'),
          effets: { argent: 15, reputation: 2, moral: 3 },
          resultat: NF.t('Vous surveillez les crayons et les cartons à dessin. Il revient avec un sandwich pour vous et un billet.') },
        { texte: NF.t('Refuser'), effets: { moral: -1 }, resultat: NF.t('Vous n\'avez pas envie d\'être regardé. Il comprend et retourne à son chevalet.') },
      ] },

    /* ------------------------------------------------------------------
     * LOGÉ MODESTEMENT (chambre, studio, petit appartement)
     * ---------------------------------------------------------------- */

    { id: 'div_voisin_bruyant', famille: 'divers', icone: '🔊', titre: NF.t('Le voisin du dessous'),
      texte: NF.t('Musique jusqu\'à deux heures, cris, portes qui claquent. Depuis trois semaines, votre nouveau voisin vit la nuit, et vous ne dormez plus.'),
      poids: 2, delai: 10,
      conditions: { logementOrdreMin: 3, classeMax: 4 },
      choix: [
        { texte: NF.t('Aller lui parler calmement'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 7, effets: { moral: 5, reputation: 2, energie: 4, xp: { commerce: 5 } }, resultat: NF.t('Il ne s\'était pas rendu compte. Il baisse le son dès le soir même, et vous salue dans l\'escalier.') },
            { poids: 3, effets: { moral: -4, reputation: -1 }, resultat: NF.t('« Je fais ce que je veux chez moi. » La porte se referme. La musique monte d\'un cran.') },
          ] },
        { texte: NF.t('Écrire au propriétaire'), conditions: { competences: { lecture: 1 } },
          aleatoire: [
            { poids: 6, effets: { moral: 3, energie: 2, xp: { administratif: 6 } }, resultat: NF.t('Un courrier poli mais ferme. Le propriétaire rappelle son locataire à l\'ordre. Le calme revient en dix jours.') },
            { poids: 4, effets: { moral: -3, energie: -3 }, resultat: NF.t('Pas de réponse. Vous achetez des bouchons d\'oreilles.') },
          ] },
        { texte: NF.t('Frapper au plancher et crier'),
          aleatoire: [
            { poids: 5, effets: { moral: -2, energie: -2 }, resultat: NF.t('Ça se calme une nuit. Ça reprend le lendemain.') },
            { poids: 5, effets: { moral: -6, reputation: -3, energie: -4 }, resultat: NF.t('Il monte. Le ton monte. Tout l\'immeuble entend, et personne ne vous donne raison.') },
          ] },
        { texte: NF.t('Serrer les dents'), effets: { moral: -6, energie: -8 }, resultat: NF.t('Un mois de nuits hachées. Vous somnolez dans le bus.') },
      ] },

    { id: 'div_panne_chauffage', famille: 'divers', icone: '🧊', titre: NF.t('Panne de chauffage'),
      texte: NF.t('La chaudière de l\'immeuble s\'est arrêtée. Dix degrés dans le logement, de la buée sur les vitres, et un propriétaire qui ne décroche pas.'),
      poids: 2, delai: 12,
      conditions: { logementOrdreMin: 3, classeMax: 4, saison: 'hiver' },
      choix: [
        { texte: NF.t('Faire venir un chauffagiste à mes frais (120 €)'), conditions: { argentMin: 120 },
          effets: { argent: -120, moral: 2, sante: -1 },
          resultat: NF.t('Réparé dans la journée. Vous enverrez la facture au propriétaire. Il ne la remboursera pas.') },
        { texte: NF.t('Réparer moi-même'), conditions: { competences: { technique: 1 } },
          aleatoire: [
            { poids: 6, effets: { moral: 6, reputation: 3, xp: { technique: 10 }, sante: -2 }, resultat: NF.t('Un pressostat encrassé. Deux heures à la cave et les radiateurs tiédissent. Les voisins vous offrent le café.') },
            { poids: 4, effets: { moral: -4, sante: -6, energie: -5, xp: { technique: 4 } }, resultat: NF.t('Vous ne trouvez pas la panne. Une semaine de plus à grelotter avant que quelqu\'un vienne.') },
          ] },
        { texte: NF.t('Relancer le propriétaire par écrit, chaque jour'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 6, effets: { sante: -3, moral: 1, xp: { administratif: 8 } }, resultat: NF.t('Une lettre recommandée qui parle de décence du logement fait l\'effet attendu : réparation en quatre jours.') },
            { poids: 4, effets: { sante: -7, energie: -5, moral: -3, xp: { administratif: 4 } }, resultat: NF.t('Trois semaines de relances avant la réparation. Vous dormez habillé.') },
          ] },
        { texte: NF.t('S\'emmitoufler et attendre'),
          effets: function (s) { var f = (NF.api.aObjet(s, 'vetements_chauds') || NF.api.aObjet(s, 'couverture')) ? 0.6 : 1; return { sante: -Math.round(10 * f), energie: -6, moral: -5 }; },
          resultat: NF.t('Deux semaines sans chauffage. Vous vivez dans la cuisine, four ouvert.') },
      ] },

    { id: 'div_fete_voisins', famille: 'divers', icone: '🎉', titre: NF.t('Fête des voisins'),
      texte: NF.t('Une affiche dans le hall : tables dans la cour vendredi soir, chacun apporte quelque chose. Vous ne connaissez personne, ou presque.'),
      poids: 2, delai: 12,
      conditions: { logementOrdreMin: 3, classeMax: 4, saison: ['printemps', 'ete'] },
      choix: [
        { texte: NF.t('Préparer un plat'), conditions: { competences: { cuisine: 1 }, argentMin: 10 },
          effets: { argent: -10, reputation: 4, moral: 7, xp: { cuisine: 5 }, drapeaux: { voisin_proche: true } },
          resultat: NF.t('Votre plat part en premier. On vous demande la recette, on vous donne des prénoms. Le voisin du troisième vous dit de l\'appeler en cas de besoin.') },
        { texte: NF.t('Apporter une bouteille (15 €)'), conditions: { argentMin: 15 },
          effets: { argent: -15, reputation: 3, moral: 5, drapeaux: { voisin_proche: true } },
          resultat: NF.t('Une bouteille, des verres en plastique, des conversations qui durent. Vous avez maintenant un voisin à qui demander du sel, ou plus.') },
        { texte: NF.t('Descendre les mains vides, juste pour voir'),
          aleatoire: [
            { poids: 6, effets: { reputation: 1, moral: 4, drapeaux: { voisin_proche: true } }, resultat: NF.t('Personne ne vous en tient rigueur. Vous remontez avec une part de tarte et le numéro d\'un voisin.') },
            { poids: 4, effets: { moral: 2 }, resultat: NF.t('Vous restez en bordure, un verre à la main. Vous remontez tôt.') },
          ] },
        { texte: NF.t('Rester chez moi'), effets: { moral: -2, reputation: -1 }, resultat: NF.t('Les rires montent par la fenêtre jusqu\'à minuit.') },
      ] },

    { id: 'div_greve_transports', famille: 'divers', icone: '🚌', titre: NF.t('Grève des transports'),
      texte: function (s) { return NF.t('Plus un bus, plus un tram : grève reconductible. ') + (s.joueur.emploi ? NF.t('Et il faut pourtant être au travail à l\'heure.') : NF.t('Vos démarches et vos rendez-vous sont à l\'autre bout de la ville.')); },
      poids: 2, delai: 10,
      conditions: { logementOrdreMin: 3, classeMax: 4 },
      choix: [
        { texte: NF.t('Y aller à vélo'), conditions: { objet: 'velo' },
          effets: { energie: -4, moral: 3, sante: 1 },
          resultat: NF.t('Quarante minutes de pédalage dans une ville sans bus. Vous arrivez en avance, et de bonne humeur.') },
        { texte: NF.t('Me faire déposer par un voisin'), conditions: { drapeau: 'voisin_proche' },
          effets: { moral: 3, reputation: 1, argent: -5 },
          resultat: NF.t('Votre voisin passe par là. Vous participez à l\'essence et à la conversation.') },
        { texte: NF.t('Marcher, et prévenir l\'employeur des retards'), conditions: { emploi: true },
          aleatoire: [
            { poids: 6, effets: { energie: -12, moral: -2, reputation: 1 }, resultat: NF.t('Une heure et demie de marche matin et soir. Vous arrivez fatigué mais à l\'heure, ou presque : l\'employeur apprécie l\'effort.') },
            { poids: 4, effets: { energie: -12, moral: -6, reputation: -2 }, resultat: NF.t('Trois retards en une semaine. Un avertissement écrit, grève ou pas.') },
          ] },
        { texte: NF.t('Marcher, et reporter ce qui peut l\'être'),
          effets: function (s) { return s.joueur.emploi ? { energie: -8, moral: -4, argent: -arrondi10(salaire(s) * 0.05) } : { energie: -8, moral: -3 }; },
          resultat: function (s) { return s.joueur.emploi ? NF.t('Vous manquez deux jours, non payés, et marchez les autres.') : NF.t('Vous marchez pour l\'essentiel et reportez le reste. Dix jours de perdus.'); } },
      ] },

    /* ------------------------------------------------------------------
     * CLASSE AISÉE
     * ---------------------------------------------------------------- */

    { id: 'div_copropriete', famille: 'divers', icone: '🏢', titre: NF.t('Assemblée de copropriété'),
      texte: function (s) { return NF.t('L\'assemblée générale vote le ravalement de la façade et la rénovation de la chaufferie. Votre quote-part : ') + U.euros(quotePartTravaux(s)) + NF.t(', appelée dans le mois.'); },
      poids: 1.5, delai: 24,
      conditions: { classeMin: 5, logement: ['appartement', 'grand_appartement'] },
      choix: [
        { texte: NF.t('Payer ma quote-part en une fois'), condition: function (s) { return s.joueur.argent >= quotePartTravaux(s); },
          effets: function (s) { var q = quotePartTravaux(s); return { argent: -q, moral: -3, journal: NF.t('Travaux de copropriété : ') + U.euros(q) + '.' }; },
          resultat: NF.t('Un virement, et la façade sera propre dans un an. Votre compte, lui, l\'est tout de suite.') },
        { texte: NF.t('Demander un étalement sur trois mois'),
          effets: function (s) { var q = quotePartTravaux(s), part = arrondi10(q / 3); NF.api.retirerArgent(s, part, true); return { moral: -2, programmer: echeanceSuivante({ part: part, restantes: 3 }), journal: NF.t('Travaux de copropriété : ') + U.euros(q) + NF.t(' en trois fois.') }; },
          resultat: NF.t('Le syndic accepte trois échéances. La première part tout de suite.') },
        { texte: NF.t('Contester le devis en séance'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 4, effets: { moral: 4, reputation: 2, xp: { commerce: 6 } }, resultat: NF.t('Vous obtenez un second devis, moins cher, et le report du vote. Les voisins vous remercient.') },
            { poids: 6, effets: function (s) { var q = quotePartTravaux(s), part = arrondi10(q / 3); NF.api.retirerArgent(s, part, true); return { moral: -4, reputation: -1, programmer: echeanceSuivante({ part: part, restantes: 3 }) }; },
              resultat: NF.t('Le vote passe malgré vous. Vous payez comme les autres, en trois fois, et le syndic vous a à l\'œil.') },
          ] },
        { texte: NF.t('Réaliser une partie des travaux avec les voisins'), conditions: { competences: { bricolage: 2 } },
          effets: function (s) { var q = arrondi10(quotePartTravaux(s) * 0.6); return { argent: -q, energie: -12, moral: 3, reputation: 3, xp: { bricolage: 10 }, journal: NF.t('Travaux de copropriété : ') + U.euros(q) + '.' }; },
          resultat: NF.t('Peinture des parties communes et petites réparations le week-end : la facture baisse, l\'estime des voisins monte.') },
      ] },

    { id: 'div_copropriete_echeance', famille: 'divers', force: true, icone: '🧾', titre: NF.t('Appel de fonds'),
      texte: function (s, d) { d = d || { part: 500, restantes: 1 }; return NF.t('Le syndic appelle l\'échéance suivante des travaux : ') + U.euros(d.part) + (d.restantes > 1 ? NF.t('. Il en restera encore une.') : NF.t('. C\'est la dernière.')); },
      poids: 1, delai: 1,
      choix: [
        { texte: NF.t('Payer'),
          effets: function (s, d) { d = d || { part: 500, restantes: 1 }; NF.api.retirerArgent(s, d.part, true); var e = { moral: -1 }; if (d.restantes > 1) e.programmer = echeanceSuivante(d); return e; },
          resultat: function (s, d) { return d && d.restantes > 1 ? NF.t('Réglé. Encore une.') : NF.t('Réglé. Les échafaudages peuvent monter.'); } },
        { texte: NF.t('Je ne peux pas ce mois-ci'),
          effets: function (s, d) { d = d || { part: 500, restantes: 1 }; var e = { dette: arrondi10(d.part * 1.1), moral: -4, reputation: -2 }; if (d.restantes > 1) e.programmer = echeanceSuivante(d); return e; },
          resultat: NF.t('Le syndic note l\'impayé et ajoute des pénalités. La somme vous suivra.') },
      ] },

    { id: 'div_gala', famille: 'divers', icone: '🥂', titre: NF.t('Gala de charité'),
      texte: NF.t('Un carton épais dans la boîte aux lettres : dîner de gala au profit d\'une fondation contre le mal-logement. Tenue de soirée, discours, enchères. Votre nom figure sur la liste des invités.'),
      poids: 1.5, delai: 14,
      conditions: { classeMin: 5 },
      choix: [
        { texte: NF.t('Y aller et faire un don (300 €)'), conditions: { argentMin: 300 },
          effets: { argent: -300, reputation: 5, moral: 4, energie: -3 },
          resultat: NF.t('Votre nom est lu parmi les donateurs. On vous présente des gens qui comptent. Vous savez mieux qu\'eux de quoi parlent les discours.') },
        { texte: NF.t('Y aller et donner généreusement (500 €)'), conditions: { argentMin: 500 },
          effets: { argent: -500, reputation: 8, moral: 5, energie: -3, drapeaux: { mecene: true } },
          resultat: NF.t('Une enchère remportée, une photo dans la gazette locale. On se souviendra de vous.') },
        { texte: NF.t('Proposer mes compétences plutôt qu\'un chèque'), conditions: { competences: { gestion: 2 } },
          effets: { reputation: 4, moral: 5, energie: -6, xp: { gestion: 6 } },
          resultat: NF.t('Vous proposez de vérifier bénévolement les comptes de la fondation. On accepte, et on vous remercie au micro.') },
        { texte: NF.t('Y aller, mais garder mon argent'),
          effets: { argent: -60, reputation: -1, moral: 2 },
          resultat: NF.t('Le repas est bon, la tenue vous a coûté un peu. Quand la corbeille passe, vous regardez ailleurs. On le remarque.') },
      ] },

    { id: 'div_parrainage', famille: 'divers', icone: '🤲', titre: NF.t('Parrainer un jeune'),
      texte: NF.t('Une association d\'insertion vous contacte : elle cherche des parrains pour des jeunes de dix-huit ans qui sortent de l\'aide à l\'enfance. Un rendez-vous par mois, un petit virement de temps en temps. « Quelqu\'un qui répond au téléphone, surtout. »'),
      poids: 1.5, delai: 24,
      conditions: { classeMin: 5, sansDrapeau: 'parrainage' },
      choix: [
        { texte: NF.t('Accepter'),
          effets: function (s) { return { reputation: 4, moral: 6, drapeaux: { parrainage: true }, programmer: suiteParrainage() }; },
          resultat: NF.t('Vous rencontrez un jeune homme qui ne vous regarde pas dans les yeux. Il vous rappelle quelqu\'un. On fera le point dans six mois.') },
        { texte: NF.t('Accepter, et commencer par ses papiers'), conditions: { competences: { administratif: 2 } },
          effets: function (s) { return { reputation: 5, moral: 6, xp: { administratif: 5 }, drapeaux: { parrainage: true }, programmer: { evenement: 'div_parrainage_suite', dans: 6, donnees: { issue: NF.rng.pick(['emploi', 'formation', 'formation', 'silence']) } } }; },
          resultat: NF.t('Dossier d\'aide, carte vitale, inscription à l\'agence : vous savez par où commencer. Lui pas encore. On fera le point dans six mois.') },
        { texte: NF.t('Faire un don à l\'association plutôt (150 €)'), conditions: { argentMin: 150 },
          effets: { argent: -150, reputation: 2, moral: 2 },
          resultat: NF.t('Un chèque, un reçu fiscal. C\'est propre, et ça n\'engage à rien.') },
        { texte: NF.t('Décliner'), effets: { moral: -1 }, resultat: NF.t('Vous n\'avez pas le temps. C\'est ce que vous dites.') },
      ] },

    { id: 'div_parrainage_suite', famille: 'divers', force: true, icone: '📱', titre: NF.t('Nouvelles de votre filleul'),
      texte: function (s, d) {
        var i = d ? d.issue : 'formation';
        if (i === 'emploi') return NF.t('Six mois de rendez-vous, de messages tard le soir, de petits virements. Votre filleul vient de signer son premier contrat. Il vous appelle avant d\'appeler sa mère.');
        if (i === 'silence') return NF.t('Six mois. Les premiers rendez-vous, puis des messages sans réponse. L\'association n\'a plus de nouvelles non plus.');
        if (i === 'rechute') return NF.t('Six mois d\'efforts, puis une garde à vue pour une bêtise de groupe. Il vous appelle du commissariat. Il n\'a personne d\'autre.');
        return NF.t('Six mois de rendez-vous et de petits virements. Votre filleul a repris une formation. Il rate des cours, mais il y retourne.');
      },
      poids: 1, delai: 1,
      conditions: { drapeau: 'parrainage' },
      choix: [
        { texte: NF.t('Continuer six mois de plus'),
          effets: function (s, d) {
            var i = d ? d.issue : 'formation';
            var e = { argent: -150, programmer: suiteParrainage() };
            if (i === 'emploi') { e.moral = 10; e.reputation = 4; }
            else if (i === 'silence') { e.moral = -3; e.reputation = 1; }
            else if (i === 'rechute') { e.moral = -4; e.reputation = 2; e.energie = -5; }
            else { e.moral = 6; e.reputation = 3; }
            return e;
          },
          resultat: function (s, d) {
            var i = d ? d.issue : 'formation';
            if (i === 'silence') return NF.t('Vous laissez un message par semaine, sans réponse. Les petits virements continuent, au cas où. Ces six mois : 150 €.');
            if (i === 'rechute') return NF.t('Vous allez le chercher. Vous ne dites rien dans la voiture. Le lendemain, il est au rendez-vous. Ces six mois : 150 €.');
            return NF.t('Vous continuez. Ces six mois ont coûté 150 € de coups de pouce, et un numéro qui répond quand il appelle.');
          } },
        { texte: NF.t('Arrêter là'),
          effets: function (s, d) { var i = d ? d.issue : 'formation'; return { argent: -150, drapeaux: { parrainage: false }, moral: i === 'emploi' ? 4 : -3, reputation: i === 'silence' ? 0 : 1 }; },
          resultat: function (s, d) { var i = d ? d.issue : 'formation'; return i === 'emploi' ? NF.t('Il n\'a plus besoin de vous. C\'est ce qu\'on pouvait espérer de mieux. Ces six mois : 150 €.') : NF.t('Vous prévenez l\'association. Ces six mois vous ont coûté 150 €, et un peu de sommeil.'); } },
      ] },

    { id: 'div_burnout_dore', famille: 'divers', icone: '🌫️', titre: NF.t('Tout, et rien'),
      texte: NF.t('Un bon salaire, un bel appartement, des week-ends pleins. Et ce matin, dans la voiture, vous n\'avez pas pu tourner la clé. Vous êtes resté vingt minutes sur le parking, les mains sur le volant.'),
      poids: function (s) { return s.joueur.jauges.moral < 40 ? 3 : 1.5; }, delai: 18,
      conditions: { classeMin: 5, emploi: true, jauges: { moral: { max: 55 } } },
      choix: [
        { texte: NF.t('Négocier un départ et prendre une année sabbatique'),
          effets: function (s) { var ind = arrondi10(salaire(s) * 2); return { argent: ind, emploi: 'perdre', raison: NF.t('année sabbatique'), moral: 15, energie: 20, sante: 4, journal: NF.t('Indemnité de départ : ') + U.euros(ind) + '.' }; },
          resultat: NF.t('Une rupture négociée, une indemnité, et un matin sans réveil. Vous mettrez des semaines à ne plus regarder l\'heure.') },
        { texte: NF.t('Demander un passage à temps partiel'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 0.8); return { moral: 8, energie: 12 }; },
              resultat: function (s) { return NF.t('Quatre jours par semaine. Nouveau salaire : ') + U.euros(salaire(s)) + NF.t(' par mois. Le vendredi est à vous.'); } },
            { poids: 4, effets: { moral: -4 }, resultat: NF.t('« Pas à ce poste. » Vous repartez avec une poignée de main et le même agenda.') },
          ] },
        { texte: NF.t('Consulter, et tenir (80 €)'), conditions: { argentMin: 80 },
          effets: { argent: -80, moral: 6, sante: 2, energie: 4 },
          resultat: NF.t('Un médecin, un psychologue, des mots sur ce qui n\'en avait pas. Ça aide, un peu.') },
        { texte: NF.t('Continuer comme si de rien n\'était'),
          aleatoire: [
            { poids: 6, effets: { moral: -8, sante: -6, energie: -8 }, resultat: NF.t('Vous tournez la clé. Encore un mois. Vous dormez de moins en moins.') },
            { poids: 4, effets: { moral: 2, energie: 3 }, resultat: NF.t('Un week-end loin de tout, sans téléphone. Ça tient, pour cette fois.') },
          ] },
      ] },

    /* ------------------------------------------------------------------
     * POUR TOUT LE MONDE
     * ---------------------------------------------------------------- */

    { id: 'div_anniversaire_marquant', famille: 'divers', icone: '🎂', titre: NF.t('Un anniversaire qui compte'),
      texte: function (s) {
        return NF.t('Vous avez ') + NF.core.ageAnnees(s) + NF.t(' ans aujourd\'hui. ') + selonClasse(s,
          NF.t('Personne ne le sait, à part vous. Vous faites le compte : ce que vous aviez à dix-huit ans, ce que vous avez maintenant.'),
          NF.t('Un toit, un travail, des factures à votre nom. Ce n\'est pas ce que vous aviez imaginé, mais vous y êtes arrivé.'),
          NF.t('Des gens à table, des cadeaux, et ce vertige : tout ce chemin. Vous repensez au trottoir, et à ceux qui y sont encore.'));
      },
      poids: 5, delai: 60, unique: false,
      condition: function (s) { var a = NF.core.ageAnnees(s); return a === 30 || a === 40 || a === 50 || a === 60; },
      choix: [
        { texte: NF.t('Faire le bilan, honnêtement'),
          effets: function (s) { return selonClasse(s, { moral: -6, xp: { lecture: 4 } }, { moral: 4 }, { moral: 8 }); },
          resultat: function (s) { return selonClasse(s, NF.t('Le compte n\'y est pas. Vous le savez, et le dire ne change rien, sinon l\'envie de continuer.'), NF.t('Le compte est juste. Vous tenez debout.'), NF.t('Le compte est bon. Vous vous promettez de ne pas oublier d\'où vous venez.')); } },
        { texte: NF.t('Fêter ça en famille'), conditions: { partenaire: true, argentMin: 40 },
          effets: function (s) { relationPartenaire(s, 6); return { argent: -40, moral: 9 }; },
          resultat: NF.t('Un gâteau, des bougies, des gens qui chantent faux. C\'est ce qui compte.') },
        { texte: NF.t('M\'offrir quelque chose (60 €)'), conditions: { argentMin: 60 },
          effets: { argent: -60, moral: 6 },
          resultat: NF.t('Un bon repas, un livre, une chemise. Quelque chose rien que pour vous.') },
        { texte: NF.t('Ne rien faire de particulier'),
          effets: function (s) { return selonClasse(s, { moral: -3 }, { moral: -1 }, { moral: 0 }); },
          resultat: NF.t('Un jour comme un autre. Vous préférez ça.') },
      ] },

    { id: 'div_vieille_connaissance', famille: 'divers', icone: '👋', titre: NF.t('Une vieille connaissance'),
      texte: function (s) {
        return selonClasse(s,
          NF.t('Devant la gare, quelqu\'un s\'arrête net : une ancienne camarade de classe. Elle met deux secondes à vous reconnaître, et une de plus à décider quoi faire de ses yeux.'),
          NF.t('Au supermarché, une voix derrière vous : quelqu\'un que vous avez connu à l\'époque de la rue. Il s\'en est sorti aussi, à peu près. Vous comparez vos vies sur le parking.'),
          NF.t('Devant chez vous, un homme assis sur un carton lève la tête. Vous le connaissez : vous avez dormi dans le même parking, il y a des années. Lui est encore là.'));
      },
      poids: 1.5, delai: 18,
      conditions: { ageMin: 22 },
      choix: [
        { texte: NF.t('Prendre le temps de parler'),
          effets: function (s) { return selonClasse(s, { moral: 3, reputation: 1 }, { moral: 5, reputation: 1 }, { moral: 2, reputation: 2 }); },
          resultat: function (s) { return selonClasse(s, NF.t('Elle écoute. Elle n\'a pas grand-chose à offrir, à part ça. Ça compte.'), NF.t('Une heure sur le parking. Vous vous promettez de vous revoir. Peut-être.'), NF.t('Vous vous asseyez à côté de lui, sur le carton. Les passants ne comprennent pas. Lui, oui.')); } },
        { texte: NF.t('Accepter son aide'), cache: true, conditions: { classeMax: 2 },
          aleatoire: [
            { poids: 6, effets: { argent: 30, nourriture: 10, moral: 5, drapeaux: { camarade_contact: true } }, resultat: NF.t('Un repas chaud, un billet, et son numéro : « Si tu as besoin d\'un canapé, tu appelles. »') },
            { poids: 4, effets: { nourriture: 8, moral: 2 }, resultat: NF.t('Un sandwich, un café, et des regards gênés. Elle repart vite.') },
          ] },
        { texte: NF.t('Échanger vos numéros'), cache: true, conditions: { classeMin: 3, classeMax: 4 },
          aleatoire: [
            { poids: 5, effets: { moral: 3, reputation: 2, xp: { commerce: 3 } }, resultat: NF.t('Il connaît quelqu\'un qui cherche du monde. Il promet d\'en parler, et il le fera.') },
            { poids: 5, effets: { moral: 2 }, resultat: NF.t('Vous vous écrirez deux fois, puis plus. C\'était bien quand même.') },
          ] },
        { texte: NF.t('L\'aider : 100 € et le numéro de l\'association'), cache: true, conditions: { classeMin: 5, argentMin: 100 },
          effets: { argent: -100, reputation: 4, moral: 7 },
          resultat: NF.t('Vous savez exactement ce que valent 100 € dehors. Il le sait aussi, et il ne dit rien.') },
        { texte: NF.t('L\'inviter à manger chez vous'), cache: true, conditions: { classeMin: 5 },
          aleatoire: [
            { poids: 6, effets: { argent: -30, reputation: 3, moral: 8 }, resultat: NF.t('Une douche, un repas, un lit propre pour une nuit. Le matin, il part tôt, sans réveiller personne. Il a laissé un mot.') },
            { poids: 4, effets: { argent: -30, moral: -4, reputation: 1 }, resultat: NF.t('Il boit trop, parle fort, casse un verre. Vous le raccompagnez à minuit. Vous ne regrettez pas d\'avoir essayé.') },
          ] },
        { texte: NF.t('Faire comme si vous ne l\'aviez pas vu'),
          effets: { moral: -5 },
          resultat: function (s) { return selonClasse(s, NF.t('Vous baissez la tête. Elle aussi. Chacun sa gêne.'), NF.t('Vous accélérez. Dans le bus, vous vous en voulez.'), NF.t('Vous passez votre porte sans ralentir. Vous ne dormez pas bien.')); } },
      ] },

    { id: 'div_coupure_electricite', famille: 'divers', icone: '🔌', titre: NF.t('Panne de courant'),
      texte: function (s) { return NF.t('Vingt heures. Tout le quartier s\'éteint d\'un coup : plus de lumière, plus de frigo, plus de réseau. ') + (NF.core.logementActuel(s).ordre >= 7 ? NF.t('Dans la rue, les voisins sortent sur le pas de leur porte.') : NF.t('Dans l\'immeuble, les portes s\'ouvrent une à une sur le palier.')); },
      poids: 1.5, delai: 12,
      conditions: { expose: false },
      choix: [
        { texte: NF.t('Sortir la lampe de poche et aider les voisins'), conditions: { objet: 'lampe' },
          effets: { moral: 4, reputation: 3 },
          resultat: NF.t('Vous éclairez l\'escalier pour une dame et sa canne. On vous remerciera encore la semaine suivante.') },
        { texte: NF.t('Vérifier le tableau électrique'), conditions: { competences: { technique: 1 } },
          aleatoire: [
            { poids: 5, effets: { moral: 5, reputation: 4, xp: { technique: 8 } }, resultat: NF.t('Un disjoncteur général qui a sauté. Vous le réarmez, et les voisins applaudissent depuis les fenêtres.') },
            { poids: 5, effets: { moral: 1, reputation: 1, xp: { technique: 4 } }, resultat: NF.t('Ça vient du réseau, pas d\'ici. Au moins, tout le monde sait maintenant que vous vous y connaissez.') },
          ] },
        { texte: NF.t('Passer la soirée chez le voisin, aux bougies'), conditions: { drapeau: 'voisin_proche' },
          effets: { moral: 6, nourriture: 6, reputation: 1 },
          resultat: NF.t('Du vin, des bougies, et ce qui décongelait dans son congélateur. Une des meilleures soirées du mois.') },
        { texte: NF.t('Attendre dans le noir'),
          effets: function (s) { return NF.core.logementActuel(s).ordre >= 3 ? { moral: -4, energie: -2, argent: -15 } : { moral: -4, energie: -2 }; },
          resultat: function (s) { return NF.core.logementActuel(s).ordre >= 3 ? NF.t('Le courant revient à trois heures du matin. Le contenu du frigo, lui, est à jeter.') : NF.t('Le courant revient à trois heures du matin. Vous n\'avez pas bougé.'); } },
      ] },

    { id: 'div_canicule_logee', famille: 'divers', icone: '🌡️', titre: NF.t('Canicule'),
      texte: NF.t('Trente-neuf degrés à l\'ombre, et pas d\'ombre. Le logement garde la chaleur toute la nuit, volets fermés ou non. La mairie recommande de prendre des nouvelles des personnes isolées.'),
      poids: 2, delai: 12,
      conditions: { saison: 'ete', expose: false },
      choix: [
        { texte: function (s) { return s.joueur.classe >= 5 ? NF.t('Partir quelques jours au frais (200 €)') : NF.t('Acheter un ventilateur (40 €)'); },
          condition: function (s) { return s.joueur.argent >= (s.joueur.classe >= 5 ? 200 : 40); },
          effets: function (s) { return s.joueur.classe >= 5 ? { argent: -200, moral: 8, energie: 8, sante: 2 } : { argent: -40, energie: 5, moral: 3 }; },
          resultat: function (s) { return s.joueur.classe >= 5 ? NF.t('Trois jours loin du bitume. Vous revenez quand la vague est passée.') : NF.t('Du bruit, de l\'air tiède. Vous dormez enfin quelques heures.'); } },
        { texte: NF.t('Passer les journées à la piscine'), conditions: { lieu: 'piscine' },
          effets: { argent: -12, hygiene: 8, moral: 6, energie: 2 },
          resultat: NF.t('Un bassin plein à craquer, l\'eau fraîche, et une ombre sous les platanes.') },
        { texte: NF.t('Prendre des nouvelles du voisin âgé'),
          aleatoire: [
            { poids: 6, effets: { reputation: 3, moral: 4, xp: { soins: 4 } }, resultat: NF.t('Il va bien, mais il n\'avait pas bu depuis la veille. Vous lui laissez de l\'eau et votre numéro.') },
            { poids: 4, effets: { reputation: 6, moral: 6, energie: -5, xp: { soins: 8 } }, resultat: NF.t('Il ne répondait plus. Vous appelez les pompiers, qui le trouvent à temps. Vous avez bien fait de frapper.') },
          ] },
        { texte: NF.t('Fermer les volets, boire, attendre'),
          effets: { energie: -8, sante: -3, moral: -3 },
          resultat: NF.t('Des nuits à tourner dans des draps mouillés. Ça finit par passer.') },
      ] },

    { id: 'div_elections', famille: 'divers', icone: '🗳️', titre: NF.t('Élections municipales'),
      texte: NF.t('Des affiches sur tous les panneaux, des tracts dans les boîtes, des réunions publiques dans les salles des fêtes. Le quartier parle logement, propreté, sécurité. On parle aussi de vous, sans vous.'),
      poids: 1.5, delai: 60,
      conditions: { sansDrapeau: 'engage_quartier' },
      choix: [
        { texte: NF.t('Aller voter'), conditions: { domiciliation: true },
          effets: { reputation: 2, moral: 3, xp: { administratif: 3 } },
          resultat: NF.t('Une carte d\'électeur, un isoloir, une enveloppe. Vous existez quelque part sur une liste.') },
        { texte: NF.t('Aller à une réunion publique et prendre la parole'),
          aleatoire: [
            { poids: function (s) { return NF.core.niveauCompetence(s, 'lecture') >= 1 ? 7 : 5; },
              effets: { reputation: 3, moral: 5, xp: { administratif: 5 }, drapeaux: { engage_quartier: true }, programmer: { evenement: 'div_conseil_quartier', dans: 3 } },
              resultat: NF.t('Vous parlez deux minutes de ce que vous savez de la rue. La salle se tait. Une élue vous prend à part à la sortie et note votre nom.') },
            { poids: 3, effets: { reputation: 1, moral: -2, xp: { administratif: 3 } }, resultat: NF.t('On vous coupe au bout d\'une minute. « Ce n\'est pas le sujet. » C\'était le sujet.') },
          ] },
        { texte: NF.t('Distribuer des tracts contre quelques billets'),
          effets: { argent: 40, energie: -6, moral: 1 },
          resultat: NF.t('Deux matinées sur le marché, un badge, des sourires forcés. Payé en liquide, sans question.') },
        { texte: NF.t('Ne pas s\'en mêler'), effets: {}, resultat: NF.t('Les affiches finissent par se décoller toutes seules.') },
      ] },

    { id: 'div_conseil_quartier', famille: 'divers', force: true, icone: '🏛️', titre: NF.t('Conseil de quartier'),
      texte: NF.t('La mairie vous écrit : à la suite de votre intervention, on vous propose un siège au conseil de quartier. Une réunion par mois, des dossiers à lire, des habitants à écouter. Bénévole, bien sûr.'),
      poids: 1, delai: 1,
      conditions: { drapeau: 'engage_quartier' },
      choix: [
        { texte: NF.t('Accepter'),
          effets: { reputation: 5, moral: 5, energie: -4, xp: { administratif: 12 }, drapeaux: { conseil_quartier: true } },
          resultat: NF.t('Votre nom sur une liste affichée à la mairie. Vous lisez les dossiers le soir, et vous comprenez enfin comment la ville décide.') },
        { texte: NF.t('Accepter et porter un projet pour les sans-abri du quartier'), conditions: { competences: { administratif: 1 } },
          effets: { reputation: 8, moral: 7, energie: -8, xp: { administratif: 15 }, drapeaux: { conseil_quartier: true } },
          resultat: NF.t('Une bagagerie, une douche de plus aux bains-douches, une permanence le dimanche. Vous savez ce qui manque, et vous l\'obtenez en partie.') },
        { texte: NF.t('Accepter, à condition d\'être défrayé'), conditions: { competences: { commerce: 2 } },
          effets: { reputation: 4, moral: 4, energie: -4, argent: 80, xp: { administratif: 10, commerce: 4 }, drapeaux: { conseil_quartier: true } },
          resultat: NF.t('Une indemnité de transport et de repas, obtenue de haute lutte. Et le siège.') },
        { texte: NF.t('Décliner'), effets: { moral: -1, drapeaux: { engage_quartier: false } }, resultat: NF.t('Vous n\'avez pas le temps, ou pas l\'envie. La lettre reste sur la table.') },
      ] },
  ]);
})();
