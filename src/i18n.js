/* =====================================================================
 * LANGUES (i18n)
 * ---------------------------------------------------------------------
 * Chargé EN PREMIER (avant src/nf.js, voir index.html). Le jeu est écrit
 * en français ; chaque texte affiché est enveloppé dans NF.t('texte').
 * NF.t cherche la traduction dans lang/<langue>.js (objet
 * NF.i18n.dictionnaires.<langue>, clé = texte français exact) et retombe
 * sur le français si elle manque. Un texte nouveau s'affiche donc en
 * français tant qu'il n'est pas traduit : rien ne casse.
 *
 * La langue vient de localStorage ('nf_langue'), sinon de la langue du
 * navigateur, sinon le français. Changer de langue recharge la page
 * (NF.i18n.changer), car les données sont traduites au chargement.
 *
 * Marqueur d'échec : un texte de résultat d'action qui commence par
 * « Impossible », « Il faut »… signale au moteur que l'action a échoué
 * (points d'action non dépensés, voir src/core/tour.js). Pour que cela
 * marche dans toutes les langues, NF.t préfixe la traduction de ces
 * textes d'un caractère invisible (NF.i18n.MARQUEUR) que le moteur et
 * NF.util.esc retirent avant affichage.
 *
 * Outil : python outils/i18n.py (lister, envelopper, manquants, construire).
 * ===================================================================== */
(function () {
  var LANGUES = [
    { id: 'fr', nom: 'Français' },
    { id: 'en', nom: 'English' },
    { id: 'es', nom: 'Español' },
    { id: 'de', nom: 'Deutsch' },
    { id: 'it', nom: 'Italiano' },
  ];
  var ids = LANGUES.map(function (l) { return l.id; });
  var langue = null;
  try { langue = localStorage.getItem('nf_langue'); } catch (e) { /* stockage indisponible */ }
  if (ids.indexOf(langue) < 0) {
    var nav = String(navigator.language || navigator.userLanguage || 'fr').slice(0, 2).toLowerCase();
    langue = ids.indexOf(nav) >= 0 ? nav : 'fr';
  }
  var MARQUEUR = '​';
  var ECHEC = /^(Impossible|Il faut|Il vous manque|Plus de place|Vous n'avez pas|Personne n'en|Introuvable|Prérequis|Métier inconnu|Recette inconnue|Formation inconnue|Compétence inconnue|Montant invalide|Ce statut|Trésorerie insuffisante|Aucun employé|Plus d'investissement|La banque refuse|Une micro-entreprise|Licenciez|Cet objet agit|Pas d'entreprise)/;

  window.NF = window.NF || {};
  NF.i18n = {
    langue: langue,
    LANGUES: LANGUES,
    dictionnaires: {},      // rempli par lang/<langue>.js
    MARQUEUR: MARQUEUR,
    ECHEC: ECHEC,
    manquants: {},          // textes vus sans traduction (console : Object.keys(NF.i18n.manquants))
  };

  /** Traduit un texte français dans la langue courante (français si absent). */
  NF.t = function (fr) {
    if (langue === 'fr' || typeof fr !== 'string') return fr;
    var d = NF.i18n.dictionnaires[langue];
    var t = d ? d[fr] : null;
    if (t == null) { NF.i18n.manquants[fr] = true; t = fr; }
    return ECHEC.test(fr) ? MARQUEUR + t : t;
  };

  /** Retire le marqueur d'échec d'un texte (pour l'afficher ou le journaliser). */
  NF.i18n.sansMarqueur = function (s) {
    return typeof s === 'string' && s.indexOf(MARQUEUR) >= 0 ? s.split(MARQUEUR).join('') : s;
  };

  /** Vrai si un texte de résultat d'action signale un échec. */
  NF.i18n.estEchec = function (s) {
    return typeof s === 'string' && (s.charAt(0) === MARQUEUR || ECHEC.test(s));
  };

  /** Change de langue et recharge la page (la partie en cours est sauvegardée). */
  NF.i18n.changer = function (id) {
    if (ids.indexOf(id) < 0) return;
    try { localStorage.setItem('nf_langue', id); } catch (e) { /* ignore */ }
    location.reload();
  };

  document.documentElement.lang = langue;
})();
