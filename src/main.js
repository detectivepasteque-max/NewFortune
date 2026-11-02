/* =====================================================================
 * POINT D'ENTRÉE – démarre l'application une fois la page chargée
 * ===================================================================== */
(function () {
  function demarrer() {
    try {
      NF.ui.app.demarrer();
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = NF.t('<div class="panneau" style="margin:2rem"><h2>Erreur au démarrage</h2><p>') + NF.util.esc(e.message) + NF.t('</p><p class="muted petit">Ouvrez la console du navigateur (F12) pour le détail. Vérifiez le dernier fichier de données modifié.</p></div>');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
