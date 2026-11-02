/* =====================================================================
 * ÉVÉNEMENTS – LOISIRS ET TALENTS (famille 'divers')
 * ---------------------------------------------------------------------
 * Événements ouverts par les compétences annexes (data/competences.js,
 * champ `annexe`) : concerts, concours, expositions, commandes, coups de
 * main. Ils ne sortent que si le niveau requis est atteint, et ils font
 * progresser la compétence concernée. Même schéma que les autres
 * fichiers (voir docs/03-evenements.md).
 *
 * Chaîne : loi_expo_dessins → drapeau contact_galerie → loi_commande_dessin
 * Drapeaux introduits : contact_galerie
 * Drapeau d'un autre fichier réutilisé : contact_association (actions.js)
 * ===================================================================== */
(function () {
  var C = NF.core;

  /** Meilleur niveau parmi les talents de rue (voir l'action « Spectacle de rue ») */
  function talentRue(s) {
    var best = 0;
    ['musique', 'cirque', 'danse', 'magie', 'theatre'].forEach(function (id) { best = Math.max(best, C.niveauCompetence(s, id)); });
    return best;
  }

  NF.ajouterEvenements([

    /* ----- Musique ----- */
    { id: 'loi_concert_bar', famille: 'divers', icone: '🎸', titre: NF.t('Un cachet pour un concert'),
      texte: NF.t('Le patron d\'un bar vous a entendu jouer. Il cherche quelqu\'un pour animer sa soirée de samedi. « Cinquante euros et les consos, ça te va ? »'),
      poids: 1.5, delai: 10,
      conditions: { competences: { musique: 2 } },
      choix: [
        { texte: NF.t('Accepter'),
          aleatoire: [
            { poids: 6, effets: function (s) { return { argent: 50 + 15 * C.niveauCompetence(s, 'musique'), moral: 8, reputation: 3, energie: -6, xp: { musique: 20 } }; },
              resultat: NF.t('La salle est pleine, les gens reprennent les refrains. Le patron vous demande de revenir.') },
            { poids: 3, effets: { argent: 50, moral: 2, energie: -8, xp: { musique: 12 } },
              resultat: NF.t('Une soirée en demi-teinte : le bruit des conversations couvre la guitare. Vous êtes payé quand même.') },
            { poids: 1, effets: { moral: -6, energie: -8, xp: { musique: 8 } },
              resultat: NF.t('Le patron « oublie » de vous payer et vous propose de revenir « pour vous faire connaître ». Vous ne reviendrez pas.') },
          ] },
        { texte: NF.t('Négocier un vrai cachet'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 5, effets: function (s) { return { argent: 90 + 20 * C.niveauCompetence(s, 'musique'), moral: 8, reputation: 3, energie: -6, xp: { musique: 20, commerce: 8 } }; },
              resultat: NF.t('Quatre-vingt-dix euros, un repas, et une date par mois. On parle de vous dans le quartier.') },
            { poids: 3, effets: { moral: -2 }, resultat: NF.t('Il hausse les épaules et prend quelqu\'un d\'autre.') },
          ] },
        { texte: NF.t('Décliner'), effets: { moral: -1 }, resultat: NF.t('Pas ce samedi. Il y en aura d\'autres.') },
      ] },

    /* ----- Talents de rue (musique, jonglage, danse, magie, théâtre) ----- */
    { id: 'loi_fete_quartier', famille: 'divers', icone: '🎪', titre: NF.t('La fête de quartier'),
      texte: NF.t('Le comité des fêtes cherche des artistes pour la scène de la fête de quartier. Quelqu\'un a parlé de votre numéro.'),
      poids: 1.5, delai: 12,
      condition: function (s) { return talentRue(s) >= 2; },
      choix: [
        { texte: NF.t('Monter sur scène'),
          aleatoire: [
            { poids: 6, effets: function (s) { return { argent: 40 + 15 * talentRue(s), moral: 10, reputation: 5, energie: -6 }; },
              resultat: NF.t('Le public du quartier applaudit à tout rompre. Un élu vous serre la main, un bénévole vous glisse une enveloppe.') },
            { poids: 2, effets: { moral: -4, reputation: 1, energie: -6 },
              resultat: NF.t('Il pleut, la sono grésille, le public est parti. On vous promet un cachet « la prochaine fois ».') },
          ] },
        { texte: NF.t('Animer plutôt les stands des enfants'), conditions: { competences: { theatre: 1 } },
          effets: { argent: 30, moral: 6, reputation: 4, energie: -5, xp: { theatre: 15 } },
          resultat: NF.t('Une après-midi de jeux et de grimaces. Les parents retiennent votre nom.') },
        { texte: NF.t('Rester spectateur'), effets: { moral: 3 }, resultat: NF.t('Une bière, un concert gratuit, et pas de trac.') },
      ] },

    { id: 'loi_spectacle_magie', famille: 'divers', icone: '🎩', titre: NF.t('Un anniversaire d\'enfant'),
      texte: NF.t('Une famille du quartier cherche un magicien pour l\'anniversaire de leur fils. Quarante euros pour une demi-heure de tours.'),
      poids: 1.2, delai: 12,
      conditions: { competences: { magie: 2 } },
      choix: [
        { texte: NF.t('Faire le spectacle'),
          effets: function (s) { return { argent: 40 + 10 * C.niveauCompetence(s, 'magie'), moral: 8, reputation: 3, energie: -4, xp: { magie: 20 } }; },
          resultat: NF.t('Douze enfants bouche bée devant une pièce qui disparaît. Les parents prennent votre numéro.') },
        { texte: NF.t('Décliner'), effets: {}, resultat: NF.t('Les enfants, très peu pour vous.') },
      ] },

    /* ----- Pêche ----- */
    { id: 'loi_concours_peche', famille: 'divers', icone: '🎣', titre: NF.t('Concours de pêche'),
      texte: NF.t('L\'association des pêcheurs organise son concours annuel à l\'étang du parc. Inscription : 5 €. Premier prix : 60 € et un trophée.'),
      poids: 1.2, delai: 12,
      conditions: { competences: { peche: 1 }, lieu: 'parc', saison: ['printemps', 'ete', 'automne'] },
      choix: [
        { texte: NF.t('S\'inscrire'), conditions: { argentMin: 5 },
          aleatoire: [
            { poids: function (s) { return 1 + C.niveauCompetence(s, 'peche') + (NF.api.aObjet(s, 'canne_a_peche') ? 2 : 0); },
              effets: { argent: 55, moral: 10, reputation: 3, nourriture: 8, xp: { peche: 20 } },
              resultat: NF.t('Une carpe de six kilos. Le trophée est moche, mais les 60 € sont bien réels.') },
            { poids: 4, effets: { argent: -5, moral: 4, nourriture: 6, xp: { peche: 12 } },
              resultat: NF.t('Quelques gardons, une place au milieu du classement, et un pique-nique au bord de l\'eau.') },
            { poids: 2, effets: { argent: -5, moral: -3, xp: { peche: 6 } },
              resultat: NF.t('Rien ne mord de la journée. Le voisin, lui, sort poisson sur poisson.') },
          ] },
        { texte: NF.t('Regarder depuis la berge'), effets: { moral: 2, xp: { peche: 4 } }, resultat: NF.t('Vous observez les techniques des anciens. Ça servira.') },
      ] },

    /* ----- Dessin ----- */
    { id: 'loi_expo_dessins', famille: 'divers', icone: '🖼️', titre: NF.t('Une exposition'),
      texte: NF.t('La bibliothèque monte une exposition d\'artistes du quartier. On vous propose un mur pour vos dessins, et une table pour les vendre le soir du vernissage.'),
      poids: 1.5, delai: 14,
      conditions: { competences: { dessin: 3 } },
      choix: [
        { texte: NF.t('Exposer et vendre'),
          aleatoire: [
            { poids: 5, effets: function (s) { return { argent: 60 + 30 * C.niveauCompetence(s, 'dessin'), moral: 10, reputation: 5, drapeaux: { contact_galerie: true }, xp: { dessin: 25 } }; },
              resultat: NF.t('Plusieurs dessins partent dans la soirée. Une galeriste laisse sa carte.') },
            { poids: 4, effets: { argent: 40, moral: 6, reputation: 3, xp: { dessin: 15 } },
              resultat: NF.t('Deux ventes, des compliments, du vin chaud. Une belle soirée.') },
          ] },
        { texte: NF.t('Exposer sans vendre, pour le plaisir'), effets: { moral: 8, reputation: 3, xp: { dessin: 15 } },
          resultat: NF.t('Voir ses dessins encadrés sur un vrai mur. Ça compte aussi.') },
        { texte: NF.t('Refuser, par pudeur'), effets: { moral: -2 }, resultat: NF.t('Pas prêt à montrer. Peut-être une autre fois.') },
      ] },

    { id: 'loi_commande_dessin', famille: 'divers', icone: '🖌️', titre: NF.t('Une commande'),
      texte: NF.t('La galeriste rencontrée au vernissage vous rappelle : un restaurant veut une grande fresque pour sa salle. Deux semaines de travail, 400 € et le matériel fourni.'),
      poids: 2, delai: 18,
      conditions: { drapeau: 'contact_galerie', competences: { dessin: 3 } },
      choix: [
        { texte: NF.t('Accepter la commande'), effets: { argent: 400, moral: 10, reputation: 6, energie: -14, xp: { dessin: 40 } },
          resultat: NF.t('Deux semaines sur un échafaudage, de la peinture jusque dans les cheveux. La fresque plaît, et votre nom est signé en bas à droite.') },
        { texte: NF.t('Décliner'), effets: { moral: -3, drapeaux: { contact_galerie: false } }, resultat: NF.t('Pas le temps, pas l\'énergie. La galeriste n\'insistera pas.') },
      ] },

    /* ----- Écriture ----- */
    { id: 'loi_concours_nouvelles', famille: 'divers', icone: '📝', titre: NF.t('Concours de nouvelles'),
      texte: NF.t('La bibliothèque lance un concours de nouvelles sur le thème « La ville la nuit ». Vous avez dans votre carnet un texte qui pourrait convenir.'),
      poids: 1.5, delai: 14,
      conditions: { competences: { ecriture: 2 } },
      choix: [
        { texte: NF.t('Envoyer un texte'),
          aleatoire: [
            { poids: function (s) { return C.niveauCompetence(s, 'ecriture'); }, effets: { argent: 150, moral: 12, reputation: 6, xp: { ecriture: 30 } },
              resultat: NF.t('Premier prix. Votre nouvelle est lue à voix haute devant une salle pleine. Le chèque fait 150 €.') },
            { poids: 3, effets: { moral: 6, reputation: 2, xp: { ecriture: 20 } }, resultat: NF.t('Une mention spéciale du jury, et un livre dédicacé. Pas d\'argent, mais de la fierté.') },
            { poids: 3, effets: { moral: -3, xp: { ecriture: 10 } }, resultat: NF.t('Pas retenu. Vous relisez le texte et vous voyez maintenant ce qui cloche.') },
          ] },
        { texte: NF.t('Garder ses textes pour soi'), effets: { moral: 1 }, resultat: NF.t('Ce que vous écrivez n\'est pas fait pour être jugé.') },
      ] },

    /* ----- Photographie ----- */
    { id: 'loi_photo_journal', famille: 'divers', icone: '📰', titre: NF.t('Le journal local cherche des photos'),
      texte: NF.t('Le quotidien régional manque d\'images du quartier pour un dossier. Quelqu\'un leur a montré vos photos.'),
      poids: 1.5, delai: 12,
      conditions: { competences: { photographie: 2 }, telephone: true },
      choix: [
        { texte: NF.t('Vendre une série de clichés'),
          effets: function (s) { return { argent: 40 + 25 * C.niveauCompetence(s, 'photographie'), moral: 8, reputation: 4, xp: { photographie: 25 } }; },
          resultat: NF.t('Trois photos en page locale, votre nom en crédit. Et un virement, pour une fois.') },
        { texte: NF.t('Proposer un reportage complet'), conditions: { competences: { photographie: 3, ecriture: 1 } },
          effets: function (s) { return { argent: 120 + 30 * C.niveauCompetence(s, 'photographie'), moral: 10, reputation: 6, energie: -8, xp: { photographie: 30, ecriture: 15 } }; },
          resultat: NF.t('Une double page, photos et textes. Le rédacteur en chef garde votre numéro.') },
        { texte: NF.t('Refuser'), effets: {}, resultat: NF.t('Vos photos restent dans votre téléphone.') },
      ] },

    /* ----- Échecs ----- */
    { id: 'loi_tournoi_echecs', famille: 'divers', icone: '♟️', titre: NF.t('Tournoi d\'échecs'),
      texte: NF.t('Le club du quartier organise un tournoi ouvert. Inscription 10 €, dotation 100 € pour le vainqueur.'),
      poids: 1.2, delai: 12,
      conditions: { competences: { jeux: 2 } },
      choix: [
        { texte: NF.t('S\'inscrire'), conditions: { argentMin: 10 },
          aleatoire: [
            { poids: function (s) { return C.niveauCompetence(s, 'jeux'); }, effets: { argent: 90, moral: 10, reputation: 4, xp: { jeux: 25 } },
              resultat: NF.t('Invaincu. Le président du club vous propose de rejoindre l\'équipe.') },
            { poids: 4, effets: { argent: -10, moral: 3, xp: { jeux: 15 } }, resultat: NF.t('Éliminé en demi-finale par un gamin de douze ans. Vous apprenez beaucoup.') },
            { poids: 2, effets: { argent: -10, moral: -3, xp: { jeux: 8 } }, resultat: NF.t('Trois défaites rapides. Les tables du parc, ce n\'était pas le haut niveau.') },
          ] },
        { texte: NF.t('Passer son tour'), effets: {}, resultat: NF.t('Vous regardez les parties depuis le fond de la salle.') },
      ] },

    /* ----- Jardinage ----- */
    { id: 'loi_grande_recolte', famille: 'divers', icone: '🥕', titre: NF.t('La grande récolte'),
      texte: NF.t('Fin de saison au jardin partagé : les courges, les haricots et les tomates arrivent tous en même temps. Il y en a bien plus que vous ne pouvez manger.'),
      poids: 2, delai: 12,
      conditions: { competences: { jardinage: 2 }, lieu: 'parc', saison: ['ete', 'automne'] },
      choix: [
        { texte: NF.t('Mettre en bocaux'), conditions: { competences: { cuisine: 1 } },
          effets: { nourriture: 15, moral: 6, objets: { conserve: 3 }, xp: { jardinage: 15, cuisine: 10 } },
          resultat: NF.t('Une journée à stériliser des bocaux. De quoi tenir une partie de l\'hiver.') },
        { texte: NF.t('Vendre le surplus au marché'), conditions: { lieu: 'marche' },
          effets: function (s) { return { argent: 30 + 15 * C.niveauCompetence(s, 'jardinage'), nourriture: 10, moral: 5, xp: { jardinage: 15, commerce: 6 } }; },
          resultat: NF.t('Un cageot sur un coin de table au marché. Tout part avant midi.') },
        { texte: NF.t('Partager avec les voisins de parcelle'), effets: { nourriture: 15, moral: 8, reputation: 4, xp: { jardinage: 10 } },
          resultat: NF.t('Un repas collectif au jardin. On vous rendra la pareille.') },
      ] },

    /* ----- Cueillette ----- */
    { id: 'loi_champignons_voisin', famille: 'divers', icone: '🍄', titre: NF.t('Le panier du voisin'),
      texte: NF.t('Un voisin revient de la forêt avec un panier de champignons et vous demande, à vous qui vous y connaissez, si tout est comestible.'),
      poids: 1.2, delai: 12,
      conditions: { competences: { cueillette: 2 }, saison: 'automne' },
      choix: [
        { texte: NF.t('Trier le panier avec soin'),
          aleatoire: [
            { poids: function (s) { return 2 + C.niveauCompetence(s, 'cueillette'); }, effets: { nourriture: 8, moral: 6, reputation: 4, xp: { cueillette: 20 } },
              resultat: NF.t('Deux amanites écartées, le reste est bon. Il vous laisse la moitié du panier.') },
            { poids: 1, effets: { moral: -5, reputation: -3, xp: { cueillette: 10 } },
              resultat: NF.t('Vous en laissez passer un. Il est malade trois jours et ne vous le pardonne pas.') },
          ] },
        { texte: NF.t('Lui conseiller la pharmacie'), effets: { moral: 1, reputation: 1 }, resultat: NF.t('Prudence. Le pharmacien confirme votre doute sur deux spécimens.') },
      ] },

    /* ----- Animaux ----- */
    { id: 'loi_chien_perdu', famille: 'divers', icone: '🐕', titre: NF.t('Un chien perdu'),
      texte: NF.t('Un chien affolé traverse la rue, collier au cou, sans maître. Vous reconnaissez le comportement d\'un animal qui s\'est échappé.'),
      poids: 1.5, delai: 12,
      conditions: { competences: { animaux: 1 } },
      choix: [
        { texte: NF.t('L\'approcher calmement et lire le collier'),
          aleatoire: [
            { poids: 6, effets: { argent: 40, moral: 7, reputation: 3, xp: { animaux: 15 } },
              resultat: NF.t('Le numéro sur la médaille. Une famille en larmes, et un billet glissé de force dans votre main.') },
            { poids: 3, effets: { moral: 5, reputation: 2, xp: { animaux: 12 } },
              resultat: NF.t('Le propriétaire vous remercie chaleureusement. Chaleureusement, mais c\'est tout.') },
            { poids: 1, effets: { sante: -4, moral: -2, xp: { animaux: 8 } },
              resultat: NF.t('La peur rend méchant : il vous mord avant de détaler.') },
          ] },
        { texte: NF.t('Prévenir l\'association, qui s\'en occupera'), conditions: { lieu: 'association' },
          effets: { moral: 3, reputation: 1 }, resultat: NF.t('Un bénévole vient avec une laisse. Vous ne saurez pas la suite.') },
        { texte: NF.t('Passer son chemin'), effets: { moral: -2 }, resultat: NF.t('Il disparaît au coin de la rue.') },
      ] },

    /* ----- Coiffure ----- */
    { id: 'loi_coiffure_foyer', famille: 'divers', icone: '✂️', titre: NF.t('Un salon improvisé'),
      texte: NF.t('L\'association organise une journée « bien-être » au foyer. On vous demande de couper les cheveux d\'une vingtaine de personnes.'),
      poids: 1.5, delai: 12,
      conditions: { competences: { coiffure: 2 }, lieu: 'association' },
      choix: [
        { texte: NF.t('Accepter, bénévolement'),
          effets: { moral: 8, reputation: 6, energie: -6, drapeaux: { contact_association: true }, xp: { coiffure: 25 } },
          resultat: NF.t('Vingt coupes, vingt sourires dans le miroir. L\'association se souviendra de vous.') },
        { texte: NF.t('Accepter, contre un petit dédommagement'), conditions: { competences: { commerce: 1 } },
          effets: { argent: 60, moral: 5, reputation: 3, energie: -6, xp: { coiffure: 25 } },
          resultat: NF.t('Soixante euros pour la journée, et quelques clients réguliers.') },
        { texte: NF.t('Refuser'), effets: { moral: -1 }, resultat: NF.t('Une autre fois.') },
      ] },

    /* ----- Couture ----- */
    { id: 'loi_retouches', famille: 'divers', icone: '🧵', titre: NF.t('Des retouches pour un mariage'),
      texte: NF.t('Une voisine marie sa fille samedi et la robe ne tombe pas. Elle a entendu dire que vous saviez coudre.'),
      poids: 1.5, delai: 12,
      conditions: { competences: { couture: 2 } },
      choix: [
        { texte: NF.t('Prendre la robe'),
          aleatoire: [
            { poids: 6, effets: { argent: 50, moral: 6, reputation: 4, energie: -4, xp: { couture: 20 } },
              resultat: NF.t('Une nuit de travail, la robe est parfaite. La famille vous invite au vin d\'honneur.') },
            { poids: 2, effets: { moral: -4, reputation: -2, energie: -4, xp: { couture: 10 } },
              resultat: NF.t('Un faux pli au mauvais endroit. On ne vous paie pas, et on en parlera dans l\'immeuble.') },
          ] },
        { texte: NF.t('Décliner, trop risqué'), effets: {}, resultat: NF.t('Vous donnez l\'adresse d\'une retoucheuse.') },
      ] },

    /* ----- Sport ----- */
    { id: 'loi_course_solidaire', famille: 'divers', icone: '🏃', titre: NF.t('La course solidaire'),
      texte: NF.t('Dix kilomètres dans les rues de la ville, au profit d\'une association. Vous vous êtes assez entraîné pour tenir la distance.'),
      poids: 1.2, delai: 12,
      conditions: { competences: { sport: 2 }, jauges: { sante: { min: 40 } } },
      choix: [
        { texte: NF.t('Courir'),
          aleatoire: [
            { poids: function (s) { return C.niveauCompetence(s, 'sport'); }, effets: { sante: 4, moral: 12, reputation: 4, energie: -10, xp: { sport: 25 } },
              resultat: NF.t('Dans les premiers de votre catégorie. Une médaille, un t-shirt, et une forme que vous n\'aviez pas connue depuis longtemps.') },
            { poids: 3, effets: { sante: 2, moral: 8, reputation: 2, energie: -12, xp: { sport: 18 } },
              resultat: NF.t('Vous finissez, les jambes en feu. C\'est déjà beaucoup.') },
            { poids: 1, effets: { sante: -5, moral: -3, energie: -12, xp: { sport: 8 } },
              resultat: NF.t('Une cheville qui tourne au sixième kilomètre. Abandon.') },
          ] },
        { texte: NF.t('Tenir un stand de ravitaillement'), effets: { moral: 4, reputation: 3, energie: -4 },
          resultat: NF.t('Des gobelets d\'eau et des encouragements. Les coureurs vous remercient.') },
      ] },

    /* ----- Méditation ----- */
    { id: 'loi_atelier_meditation', famille: 'divers', icone: '🧘', titre: NF.t('Animer un atelier'),
      texte: NF.t('L\'association cherche quelqu\'un pour animer un groupe de relaxation le mardi soir. On a remarqué votre calme.'),
      poids: 1.2, delai: 14,
      conditions: { competences: { meditation: 2 }, lieu: 'association' },
      choix: [
        { texte: NF.t('Animer le groupe'),
          effets: { moral: 8, reputation: 5, energie: 2, drapeaux: { contact_association: true }, xp: { meditation: 20, theatre: 8 } },
          resultat: NF.t('Une dizaine de personnes, des respirations, du silence. Vous repartez plus calme que vous n\'êtes arrivé.') },
        { texte: NF.t('Décliner'), effets: {}, resultat: NF.t('Vous préférez méditer seul.') },
      ] },

    /* ----- Culture générale ----- */
    { id: 'loi_quiz_tele', famille: 'divers', icone: '📺', titre: NF.t('Sélection pour un jeu télévisé'),
      texte: NF.t('Une production cherche des candidats pour un jeu de culture générale. Les sélections ont lieu en ville. Vos résultats aux quiz du quartier vous ont fait repérer.'),
      poids: 1, delai: 24,
      conditions: { competences: { culture: 3 } },
      choix: [
        { texte: NF.t('Passer les sélections'),
          aleatoire: [
            { poids: function (s) { return C.niveauCompetence(s, 'culture') - 2; }, effets: { argent: 300, moral: 15, reputation: 8, energie: -6, xp: { culture: 30 } },
              resultat: NF.t('Sélectionné, puis qualifié ! Vous repartez de l\'émission avec 300 € et quelques minutes de célébrité.') },
            { poids: 3, effets: { moral: 3, reputation: 2, energie: -6, xp: { culture: 15 } },
              resultat: NF.t('Un bon score aux sélections, mais pas assez de « télégénie », vous dit-on.') },
          ] },
        { texte: NF.t('Refuser la télé'), effets: {}, resultat: NF.t('Votre culture, vous la gardez pour les soirées quiz.') },
      ] },
  ]);
})();
