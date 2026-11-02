/* =====================================================================
 * ACCOMPLISSEMENTS (SUCCÈS)
 * ---------------------------------------------------------------------
 * Vérifiés chaque mois. Chaque succès rapporte des points de score.
 *
 * Champs :
 *   id, nom, icone, desc
 *   condition : fonction (state) -> booléen
 * ===================================================================== */
NF.data.succes = [
  { id: 'premier_hiver', nom: NF.t('Premier hiver'), icone: '❄️', desc: NF.t('Survivre à un hiver complet.'),
    condition: function (s) { return s.temps.moisAbsolu >= 14 && s.lignee.generation === 1 || s.joueur.drapeaux.hiver_survecu; } },
  { id: 'un_an', nom: NF.t('Un an dehors'), icone: '📅', desc: NF.t('Survivre 12 mois.'),
    condition: function (s) { return s.temps.moisAbsolu >= 12; } },
  { id: 'cinq_ans', nom: NF.t('Cinq ans'), icone: '🗓️', desc: NF.t('Survivre 5 ans.'),
    condition: function (s) { return s.temps.moisAbsolu >= 60; } },
  { id: 'vingt_ans', nom: NF.t('Vingt ans'), icone: '⏳', desc: NF.t('Survivre 20 ans.'),
    condition: function (s) { return s.temps.moisAbsolu >= 240; } },
  { id: 'un_toit', nom: NF.t('Un toit'), icone: '🏠', desc: NF.t('Obtenir un vrai logement.'),
    condition: function (s) { return NF.core.logementActuel(s).ordre >= 3; } },
  { id: 'premier_emploi', nom: NF.t('Premier emploi déclaré'), icone: '💼', desc: NF.t('Décrocher un emploi déclaré.'),
    condition: function (s) { return s.joueur.drapeaux.emploi_declare; } },
  { id: 'qualifie', nom: NF.t('Qualifié'), icone: '🎓', desc: NF.t('Exercer un métier de niveau 3 ou plus.'),
    condition: function (s) { return s.joueur.emploi && NF.util.byId(NF.data.metiers, s.joueur.emploi.id).niveau >= 3; } },
  { id: 'cadre', nom: NF.t('Cadre'), icone: '👔', desc: NF.t('Exercer un métier de niveau 5.'),
    condition: function (s) { return s.joueur.emploi && NF.util.byId(NF.data.metiers, s.joueur.emploi.id).niveau >= 5; } },
  { id: 'classe_moyenne', nom: NF.t('Classe moyenne'), icone: '🏢', desc: NF.t('Atteindre la classe moyenne.'),
    condition: function (s) { return s.joueur.classe >= 5; } },
  { id: 'fortune', nom: NF.t('Fortuné'), icone: '🏰', desc: NF.t('Atteindre le sommet de l\'échelle sociale.'),
    condition: function (s) { return s.joueur.classe >= 7; } },
  { id: 'artisan', nom: NF.t('Artisan'), icone: '🔧', desc: NF.t('Fabriquer 10 objets.'),
    condition: function (s) { return (s.stats.fabrications || 0) >= 10; } },
  { id: 'erudit', nom: NF.t('Érudit'), icone: '📚', desc: NF.t('Atteindre le niveau 5 dans une compétence.'),
    condition: function (s) { for (var k in s.joueur.competences) if (NF.core.niveauCompetence(s, k) >= 5) return true; return false; } },
  { id: 'polyvalent', nom: NF.t('Polyvalent'), icone: '🧠', desc: NF.t('Niveau 3 dans cinq compétences.'),
    condition: function (s) { var n = 0; for (var k in s.joueur.competences) if (NF.core.niveauCompetence(s, k) >= 3) n++; return n >= 5; } },
  { id: 'diplome', nom: NF.t('Diplômé'), icone: '📜', desc: NF.t('Obtenir un diplôme.'),
    condition: function (s) { return s.joueur.diplomes.length > 0; } },
  { id: 'entrepreneur', nom: NF.t('Entrepreneur'), icone: '🏪', desc: NF.t('Créer une entreprise.'),
    condition: function (s) { return !!s.joueur.entreprise || s.joueur.drapeaux.a_cree_entreprise; } },
  { id: 'patron', nom: NF.t('Patron'), icone: '🏢', desc: NF.t('Employer 5 personnes.'),
    condition: function (s) { return s.joueur.entreprise && s.joueur.entreprise.employes >= 5; } },
  { id: 'famille', nom: NF.t('Fonder une famille'), icone: '👨‍👩‍👧', desc: NF.t('Avoir un enfant.'),
    condition: function (s) { return s.joueur.famille.enfants.length > 0; } },
  { id: 'heritier', nom: NF.t('La relève'), icone: '🧬', desc: NF.t('Jouer un héritier.'),
    condition: function (s) { return s.lignee.generation >= 2; } },
  { id: 'dynastie', nom: NF.t('Dynastie'), icone: '👑', desc: NF.t('Atteindre la 4e génération.'),
    condition: function (s) { return s.lignee.generation >= 4; } },
  { id: 'proprietaire', nom: NF.t('Propriétaire'), icone: '🏡', desc: NF.t('Acheter un logement.'),
    condition: function (s) { return NF.core.logementActuel(s).proprietaire; } },
  { id: 'rebond', nom: NF.t('Rebond'), icone: '🔄', desc: NF.t('Remonter à la classe 4 après être redescendu à la rue.'),
    condition: function (s) { return s.joueur.drapeaux.retombe_rue && s.joueur.classe >= 4; } },
  { id: 'vieux', nom: NF.t('Vieillesse'), icone: '👴', desc: NF.t('Atteindre 70 ans.'),
    condition: function (s) { return NF.core.ageAnnees(s) >= 70; } },
  { id: 'touche_a_tout', nom: NF.t('Touche-à-tout'), icone: '🎨', desc: NF.t('Niveau 2 dans cinq compétences annexes (loisirs et talents).'),
    condition: function (s) { var n = 0; NF.data.competences.forEach(function (c) { if (c.annexe && NF.core.niveauCompetence(s, c.id) >= 2) n++; }); return n >= 5; } },
  { id: 'artiste_de_rue', nom: NF.t('Artiste de rue'), icone: '🎪', desc: NF.t('Donner 25 spectacles de rue.'),
    condition: function (s) { return (s.stats.spectacles || 0) >= 25; } },
];
