/* =====================================================================
 * UI – ÉCRAN TITRE : nouvelle partie, continuer, bonus, scores, sauvegarde
 * ===================================================================== */
(function () {
  var UI = NF.ui;
  var U = NF.util;
  var esc = U.esc;

  UI.rendreTitre = function (vue) {
    var meta = NF.core.chargerMeta();
    var scores = NF.core.chargerScores();
    var aSauvegarde = NF.core.aSauvegarde();
    var h = '<div class="titre">';
    h += NF.t('<div class="titre-entete"><h1>Nouvelle Fortune</h1><p class="sous-titre">Dix-huit ans, une ville, rien dans les poches. Survivre, s\'élever, transmettre.</p>') + UI.languesHtml() + '</div>';
    h += '<div class="titre-scene">' + UI.sceneTitre() + '</div>';
    h += '<div class="titre-grille">';

    /* --- Jouer --- */
    h += NF.t('<div class="panneau"><h2>Jouer</h2>');
    if (aSauvegarde) {
      var sv = NF.core.chargerPartie();
      h += NF.t('<div class="carte"><div class="carte-titre"><span class="carte-icone">💾</span><strong>Partie en cours</strong></div>');
      if (sv) h += '<div class="carte-desc">' + esc(sv.joueur.prenom + ' ' + sv.joueur.nom) + ', ' + NF.core.ageAnnees(sv) + NF.t(' ans · ') + esc(sv.ville.nom) + ' · ' + UI.dateTexte(sv) + NF.t(' · génération ') + sv.lignee.generation + '</div>';
      h += '<div class="carte-pied">' + UI.btn('continuer', null, NF.t('▶ Continuer'), 'btn-principal') + '</div></div>';
    }
    h += NF.t('<div class="carte"><div class="carte-titre"><span class="carte-icone">🌃</span><strong>Nouvelle partie</strong></div>');
    h += NF.t('<div class="carte-desc">Chaque graine génère une ville, un personnage et un marché de l\'emploi différents. Laissez vide pour une graine aléatoire.</div>');
    h += '<div class="ligne"><input id="graine" class="champ" placeholder="' + esc(NF.t('Graine (facultatif)')) + '" value="' + esc(vue.graine || '') + '" style="flex:1">' + UI.btn('graine-aleatoire', null, '🎲', 'btn-petit', false, NF.t('Graine aléatoire')) + '</div>';
    if (aSauvegarde) h += NF.t('<p class="petit mauvais" style="margin-top:.5em">Attention : une nouvelle partie remplace la partie en cours.</p>');
    h += '<div class="carte-pied">' + UI.btn('nouvelle', null, NF.t('🚀 Commencer'), 'btn-principal') + '</div></div>';
    h += '<div class="ligne" style="margin-top:.6rem">' + UI.btn('aide', null, NF.t('❓ Comment jouer')) + UI.btn('exporter', null, NF.t('⬇ Exporter la sauvegarde')) + UI.btn('importer', null, NF.t('⬆ Importer')) + '<input type="file" id="fichier-import" accept=".json,application/json" class="cachee"></div>';
    h += '</div>';

    /* --- Bonus --- */
    h += NF.t('<div class="panneau"><h2>Bonus permanents</h2>');
    h += NF.t('<p class="muted petit">Chaque lignée terminée rapporte des points. Les bonus s\'appliquent à toutes les parties suivantes.</p>');
    h += '<p><span class="gros-chiffre">' + meta.points + NF.t('</span> <span class="muted">points · ') + meta.parties + (meta.parties > 1 ? NF.t(' lignées jouées') : NF.t(' lignée jouée')) + '</span></p>';
    h += '<div class="bonus-liste">';
    NF.data.bonus.forEach(function (b) {
      var n = meta.bonus[b.id] || 0, max = b.niveaux || 1;
      var complet = n >= max;
      h += '<div class="carte' + (complet ? ' selectionnee' : '') + '"><span class="carte-icone">' + b.icone + '</span><div class="espace"><strong>' + esc(b.nom) + '</strong>' + (max > 1 ? ' <span class="etiquette">' + n + '/' + max + '</span>' : (complet ? NF.t(' <span class="etiquette bon">acquis</span>') : '')) + '<div class="carte-desc">' + esc(b.desc) + '</div></div>';
      h += UI.btn('acheter-bonus', b.id, complet ? '✓' : b.cout + NF.t(' pts'), 'btn-petit' + (complet ? '' : ' btn-principal'), complet || meta.points < b.cout) + '</div>';
    });
    h += '</div></div>';

    /* --- Scores --- */
    h += NF.t('<div class="panneau"><h2>Meilleures lignées</h2>');
    if (!scores.length) h += NF.t('<p class="muted">Aucune lignée terminée pour l\'instant.</p>');
    else {
      h += NF.t('<table class="liste-scores"><tr><th>#</th><th>Famille</th><th class="droite">Gén.</th><th class="droite">Années</th><th class="droite">Classe</th><th class="droite">Score</th></tr>');
      scores.forEach(function (sc, i) {
        h += '<tr><td>' + (i + 1) + '</td><td>' + esc(sc.nom) + ' <span class="tres-petit muted">' + esc(sc.graine) + '</span></td><td class="droite">' + sc.generations + '</td><td class="droite">' + sc.annees + '</td><td class="droite">' + sc.classeMax + '</td><td class="droite accent">' + sc.score + '</td></tr>';
      });
      h += '</table>';
    }
    h += '<div class="ligne" style="margin-top:.8rem">' + UI.btn('effacer-progression', null, NF.t('🗑 Effacer toute la progression'), 'btn-petit btn-danger') + '</div>';
    h += '</div>';

    /* --- À propos --- */
    h += NF.t('<div class="panneau"><h2>À propos</h2>');
    h += NF.t('<p class="petit muted">Nouvelle Fortune est un roguelike de survie urbaine au tour par tour : chaque tour est un mois, chaque partie une lignée. La mort n\'est pas la fin si un héritier peut reprendre le flambeau… après les droits de succession.</p>');
    h += NF.t('<p class="petit muted">Le jeu est entièrement modifiable : ouvrez le dossier <code>data/</code> et la documentation dans <code>docs/</code>.</p>');
    h += NF.t('<p class="petit muted">Version ') + esc(NF.version) + ' · ' + NF.data.evenements.length + NF.t(' événements · ') + NF.data.metiers.length + NF.t(' métiers · ') + NF.data.recettes.length + NF.t(' recettes.</p>');
    h += '</div>';

    h += '</div></div>';
    return h;
  };

  UI.aideHtml = function () {
    return '<div class="aide-texte">' +
      NF.t('<h2>Comment jouer</h2>') +
      NF.t('<p>Vous avez 18 ans et vous vivez dans la rue. Chaque tour représente <strong>un mois</strong>. Vous disposez de quelques <strong>points d\'action (PA)</strong> à dépenser, puis vous terminez le mois : le bilan tombe (revenus, dépenses, usure des jauges) et un ou deux <strong>événements</strong> surviennent, souvent avec un choix.</p>') +
      NF.t('<h3>Les jauges</h3><ul>') +
      NF.t('<li><strong>❤️ Santé</strong> : à zéro, c\'est la mort. Elle baisse quand les autres jauges sont basses, l\'hiver dehors, en cas de maladie.</li>') +
      NF.t('<li><strong>☠️ Risques</strong> : certaines situations peuvent tuer d\'un coup (opération militaire, route de nuit, grand froid, rixe, maladie non soignée). Un choix prudent existe toujours ; les traits et les compétences réduisent le risque.</li>') +
      NF.t('<li><strong>🍞 Faim</strong> (jauge pleine = rassasié), <strong>⚡ Énergie</strong>, <strong>🧼 Hygiène</strong> : s\'usent chaque mois. Basses, elles attaquent la santé et réduisent l\'efficacité (et l\'hygiène ferme des emplois).</li>') +
      NF.t('<li><strong>🙂 Moral</strong> : bas, vos actions sont moins efficaces.</li>') +
      NF.t('<li><strong>💶 Argent</strong> et <strong>⭐ Réputation</strong> : la réputation ouvre les foyers, les associations, les emplois.</li></ul>') +
      NF.t('<h3>Progresser</h3><ul>') +
      NF.t('<li><strong>Démarches</strong> : obtenez une domiciliation (adresse administrative), indispensable pour les emplois déclarés et les aides.</li>') +
      NF.t('<li><strong>Savoir</strong> : étudiez à la bibliothèque. Les compétences débloquent métiers, recettes et choix d\'événements. Au niveau 2 de conduite, vous avez le permis.</li>') +
      NF.t('<li><strong>Objets</strong> : fouillez les bennes, fabriquez un abri, une couverture, un panneau. L\'inventaire est limité.</li>') +
      NF.t('<li><strong>Emploi</strong> : des métiers de survie (niveau 1) aux cadres (niveau 5). Formations et diplômes font changer de niveau.</li>') +
      NF.t('<li><strong>Logement</strong> : foyer, squat, puis chambre, studio, appartement, maison. Le logement détermine en grande partie votre catégorie sociale.</li>') +
      NF.t('<li><strong>Entreprise</strong> : après de l\'expérience dans un secteur, créez une micro-entreprise ou une société. Risqué, mais rapide.</li></ul>') +
      NF.t('<h3>Famille et héritage</h3>') +
      NF.t('<p>Les rencontres peuvent mener à un couple, puis à des enfants. À votre mort, un enfant reprend la partie : il garde la position sociale, mais les <strong>droits de succession</strong> sont lourds. Sans héritier, la lignée s\'éteint et la partie est notée.</p>') +
      NF.t('<h3>Saisons et graine</h3>') +
      NF.t('<p>L\'hiver est dangereux dehors. La <strong>graine</strong> affichée en jeu permet de rejouer ou de partager une partie précise. La partie est sauvegardée automatiquement dans le navigateur.</p>') +
      '</div>';
  };
})();
