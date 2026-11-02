/* =====================================================================
 * MÉTA-PROGRESSION : BONUS PERMANENTS
 * ---------------------------------------------------------------------
 * À la fin d'une lignée, le score donne des points. Ces points
 * s'échangent contre des bonus actifs dans toutes les parties suivantes.
 *
 * Champs :
 *   id, nom, icone, desc
 *   cout     : points nécessaires
 *   niveaux  : nombre de fois achetable (défaut 1)
 *   appliquer: fonction (state, niveau) appelée à la création du personnage
 * ===================================================================== */
NF.data.bonus = [
  { id: 'sac', nom: NF.t('Sac à dos de départ'), icone: '🎒', cout: 40,
    desc: NF.t('Vous commencez avec un sac à dos.'),
    appliquer: function (s) { NF.api.ajouterObjet(s, 'sac_a_dos', 1); } },

  { id: 'couverture', nom: NF.t('Couverture de départ'), icone: '🛌', cout: 30,
    desc: NF.t('Une couverture pour affronter le premier hiver.'),
    appliquer: function (s) { NF.api.ajouterObjet(s, 'couverture', 1); } },

  { id: 'contact_asso', nom: NF.t('Contact dans une association'), icone: '🤝', cout: 60,
    desc: NF.t('Vous êtes déjà connu d\'une association : +15 réputation au départ.'),
    appliquer: function (s) { s.joueur.reputation += 15; s.joueur.drapeaux.contact_association = true; } },

  { id: 'pecule', nom: NF.t('Petit pécule'), icone: '💶', cout: 50, niveaux: 3,
    desc: NF.t('+80 € au départ par niveau.'),
    appliquer: function (s, n) { s.joueur.argent += 80 * n; } },

  { id: 'competence', nom: NF.t('Compétence de départ'), icone: '📖', cout: 80, niveaux: 3,
    desc: NF.t('Une compétence au hasard commence au niveau 1 (par niveau).'),
    appliquer: function (s, n) {
      var ids = NF.data.competences.map(function (c) { return c.id; });
      for (var i = 0; i < n; i++) {
        var id = NF.rng.pick(ids);
        NF.api.ajouterXp(s, id, NF.data.config.xpParNiveau);
      }
    } },

  { id: 'sante', nom: NF.t('Bonne constitution'), icone: '❤️', cout: 70, niveaux: 2,
    desc: NF.t('+10 santé maximale de départ par niveau.'),
    appliquer: function (s, n) { s.joueur.jauges.sante = Math.min(100, s.joueur.jauges.sante + 10 * n); } },

  { id: 'telephone', nom: NF.t('Téléphone de départ'), icone: '📱', cout: 90,
    desc: NF.t('Vous commencez avec un téléphone.'),
    appliquer: function (s) { NF.api.ajouterObjet(s, 'telephone', 1); } },

  { id: 'papiers', nom: NF.t('Papiers en règle'), icone: '📄', cout: 100,
    desc: NF.t('Vous commencez avec une domiciliation administrative.'),
    appliquer: function (s) { s.joueur.domiciliation = true; } },

  { id: 'pa', nom: NF.t('Endurance'), icone: '⚡', cout: 250,
    desc: NF.t('+1 point d\'action par mois, pour toujours.'),
    appliquer: function (s) { s.joueur.paBonus = (s.joueur.paBonus || 0) + 1; } },

  { id: 'heritage', nom: NF.t('Héritage facilité'), icone: '🏛️', cout: 200,
    desc: NF.t('Les droits de succession sont réduits de 10 points.'),
    appliquer: function (s) { s.joueur.drapeaux.reduction_succession = 0.10; } },
];
