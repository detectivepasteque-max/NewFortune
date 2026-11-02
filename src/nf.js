/* =====================================================================
 * NOUVELLE FORTUNE – espace de noms global
 * ---------------------------------------------------------------------
 * Tous les fichiers du jeu s'accrochent à l'objet global `NF`.
 * Ce fichier doit être chargé juste après src/i18n.js et lang/ (voir index.html).
 *
 *   NF.data   : toutes les données de jeu (actions, métiers, événements…)
 *   NF.core   : le moteur (tours, économie, événements, sauvegarde…)
 *   NF.api    : fonctions utilitaires utilisables dans les données
 *               (ajouter de l'argent, un objet, programmer un événement…)
 *   NF.ui     : l'interface
 *   NF.util   : petites fonctions génériques
 * ===================================================================== */
window.NF = {
  version: '1.0.0',
  i18n: (window.NF || {}).i18n,   // langues : défini par src/i18n.js, chargé avant
  t: (window.NF || {}).t,         // NF.t('texte français') → texte dans la langue courante
  data: {
    config: {},
    traits: [],
    competences: [],
    actions: [],
    objets: [],
    recettes: [],
    metiers: [],
    formations: [],
    logements: [],
    classes: [],
    impots: {},
    entreprise: {},
    bonus: [],
    succes: [],
    evenements: [],
    ville: {},
    noms: {},
  },
  core: {},
  api: {},
  ui: {},
  util: {},
};

/* ---------------------------------------------------------------------
 * Utilitaires génériques
 * ------------------------------------------------------------------- */
NF.util.clamp = function (v, min, max) {
  return Math.max(min, Math.min(max, v));
};

NF.util.round = function (v, dec) {
  var f = Math.pow(10, dec || 0);
  return Math.round(v * f) / f;
};

/** Formate un montant en euros : 1234.5 -> "1 235 €" */
NF.util.euros = function (v) {
  var n = Math.round(v || 0);
  var neg = n < 0;
  var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + s + ' €';
};

/** Signe explicite : +5 / -3 */
NF.util.signe = function (v) {
  v = Math.round(v);
  return (v > 0 ? '+' : '') + v;
};

/** Évalue une valeur qui peut être une fonction (de l'état) ou une constante */
NF.util.val = function (v, state, extra) {
  return typeof v === 'function' ? v(state, extra) : v;
};

/** Copie profonde simple (données JSON uniquement) */
NF.util.clone = function (o) {
  return JSON.parse(JSON.stringify(o));
};

/** Première lettre en majuscule */
NF.util.cap = function (s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

/** Met un nom en minuscules pour l'insérer dans une phrase (« votre emploi de
 *  serveur »). Sans effet en allemand, où les noms gardent leur majuscule.
 *  À utiliser à la place de .toLowerCase() sur les noms affichés. */
NF.util.minuscule = function (s) {
  return s == null || NF.i18n.langue === 'de' ? s : String(s).toLowerCase();
};

/** Échappe du texte pour l'insérer dans du HTML (et retire le marqueur d'échec, voir src/i18n.js) */
NF.util.esc = function (s) {
  s = String(s == null ? '' : s);
  if (s.indexOf(NF.i18n.MARQUEUR) >= 0) s = s.split(NF.i18n.MARQUEUR).join('');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/** Trouve un élément par id dans une liste de données */
NF.util.byId = function (liste, id) {
  for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
  return null;
};

/** Mois et saisons */
NF.util.MOIS = [NF.t('janvier'), NF.t('février'), NF.t('mars'), NF.t('avril'), NF.t('mai'), NF.t('juin'), NF.t('juillet'), NF.t('août'), NF.t('septembre'), NF.t('octobre'), NF.t('novembre'), NF.t('décembre')];
NF.util.saison = function (mois) {
  // mois : 0 = janvier … 11 = décembre
  if (mois === 11 || mois <= 1) return 'hiver';
  if (mois <= 4) return 'printemps';
  if (mois <= 7) return 'ete';
  return 'automne';
};
NF.util.SAISONS = { hiver: NF.t('Hiver'), printemps: NF.t('Printemps'), ete: NF.t('Été'), automne: NF.t('Automne') };
