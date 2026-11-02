/* =====================================================================
 * ÉVÉNEMENTS – ÉCONOMIE
 * ---------------------------------------------------------------------
 * Loyer, conjoncture, dettes et crédits, placements, arnaques, héritage,
 * pannes, vie de l'entreprise, loterie…
 * Les événements déclenchés par le moteur (huissier, controle_entreprise,
 * faillite) sont dans systeme.js : ne pas les redéfinir ici.
 *
 * Chaînes (un choix pose un drapeau et/ou programme une suite) :
 *   eco_crise            → eco_crise_suite      (drapeaux crise_en_cours, crise_reserve)
 *   eco_prime_inattendue → eco_trop_percu       (données { montant })
 *   eco_proche_argent    → eco_proche_suite     (drapeau pret_a_un_proche, données { montant })
 *   eco_credit_facile    → eco_credit_suite     (drapeau credit_facile_pris)
 *   eco_placement        → eco_placement_suite  (drapeaux placement_en_cours, placement_montant ; tirage aléatoire)
 * ===================================================================== */
(function () {
  var U = NF.util;

  function arrondi10(v) { return Math.round(v / 10) * 10; }
  function logement(s) { return NF.core.logementActuel(s); }
  /** Montant d'une régularisation de loyer et de charges */
  function montantLoyer(s) { var l = logement(s); return arrondi10((l.loyer + l.charges) * 0.6); }
  /** Surcoût d'une hausse de charges (entreprise ou logement) */
  function montantCharges(s) {
    var e = s.joueur.entreprise;
    if (e) { var sec = NF.core.secteurEntreprise(e.secteur); return arrondi10(Math.max(200, (sec ? sec.chargesFixes : 800) * 0.4)); }
    return arrondi10(Math.max(60, logement(s).charges * 1.5));
  }
  function perteCambriolage(s) { var e = s.joueur.entreprise; return e ? arrondi10(Math.max(400, (e.dernierCA || 0) * 0.35)) : 0; }
  function gainClient(s) { var e = s.joueur.entreprise; return e ? arrondi10(Math.max(600, (e.dernierCA || 0) * 1.2)) : 0; }
  /** Modifie la trésorerie de l'entreprise (si elle existe) */
  function capital(s, delta) { if (s.joueur.entreprise) s.joueur.entreprise.capital = Math.round(s.joueur.entreprise.capital + delta); }
  function montantPlace(s) { return Math.round(s.joueur.drapeaux.placement_montant || 1000); }
  function montant(d, defaut) { return d && d.montant ? d.montant : defaut; }
  function finCrise() { return { crise_en_cours: false, crise_reserve: false }; }

  NF.ajouterEvenements([

    /* ---------------- Hausse de loyer ---------------- */
    { id: 'eco_hausse_loyer', famille: 'economie', icone: '🏠', titre: NF.t('Régularisation de loyer'),
      texte: function (s) { return NF.t('Un courrier du propriétaire : révision annuelle du loyer et régularisation des charges. À régler ce mois-ci : ') + U.euros(montantLoyer(s)) + '.'; },
      poids: 1.5, delai: 14,
      condition: function (s) { var l = logement(s); return l.loyer > 0 && !l.proprietaire; },
      choix: [
        { texte: NF.t('Payer'), condition: function (s) { return s.joueur.argent >= montantLoyer(s); },
          effets: function (s) { return { argent: -montantLoyer(s), moral: -3 }; }, resultat: NF.t('Vous payez. Le budget du mois se resserre.') },
        { texte: NF.t('Vérifier le calcul'), conditions: { competences: { lecture: 2 } },
          aleatoire: [
            { poids: 5, effets: function (s) { return { argent: -arrondi10(montantLoyer(s) * 0.3), moral: 2, xp: { administratif: 6 } }; }, resultat: NF.t('L\'indice de révision est mal appliqué et une partie des charges n\'est pas récupérable. Il revoit sa copie.') },
            { poids: 5, effets: function (s) { return { argent: -montantLoyer(s), moral: -2, xp: { administratif: 4 } }; }, resultat: NF.t('Tout est en règle. Vous payez, en sachant au moins pourquoi.') },
          ] },
        { texte: NF.t('Demander un échéancier'), effets: function (s) { return { dette: montantLoyer(s), moral: -2 }; }, resultat: NF.t('Il accepte un paiement en plusieurs fois. La somme devient une dette.') },
        { texte: NF.t('Ne pas payer'), effets: function (s) { s.joueur.loyersImpayes = (s.joueur.loyersImpayes || 0) + 1; return { moral: -2, reputation: -2 }; }, resultat: NF.t('Vous laissez le courrier sur la table. Le propriétaire compte les mois.') },
      ] },

    /* ---------------- Crise économique → la crise frappe ---------------- */
    { id: 'eco_crise', famille: 'economie', icone: '📉', titre: NF.t('Crise économique'),
      texte: NF.t('Les journaux ne parlent que de ça : récession, faillites, plans sociaux. Dans la ville, les embauches se figent et les petits boulots se raréfient.'),
      poids: 1, delai: 24,
      conditions: { sansDrapeau: 'crise_en_cours' },
      condition: function (s) { return s.conjoncture > 0.8; },
      choix: [
        { texte: NF.t('Serrer les dents'), effets: { conjoncture: -0.15, moral: -3, drapeaux: { crise_en_cours: true }, programmer: { evenement: 'eco_crise_suite', dans: 3 } }, resultat: NF.t('Vous ne pouvez rien y faire. Vous attendez de voir.') },
        { texte: NF.t('Constituer une réserve'), conditions: { argentMin: 300, competences: { gestion: 1 } },
          effets: { conjoncture: -0.15, moral: -1, drapeaux: { crise_en_cours: true, crise_reserve: true }, programmer: { evenement: 'eco_crise_suite', dans: 3 } },
          resultat: NF.t('Vous sanctuarisez 300 € sur un compte à part. Si ça tape, vous aurez de quoi voir venir.') },
        { texte: NF.t('Chercher les occasions'), conditions: { competences: { commerce: 3 } },
          effets: { conjoncture: -0.15, xp: { commerce: 10, gestion: 5 }, moral: 1, drapeaux: { crise_en_cours: true }, programmer: { evenement: 'eco_crise_suite', dans: 3 } },
          resultat: NF.t('Les crises font des perdants et quelques gagnants. Vous ouvrez l\'œil.') },
      ] },

    { id: 'eco_crise_suite', famille: 'economie', force: true, icone: '🏭', titre: NF.t('La crise frappe'),
      texte: function (s) {
        var m = NF.core.metierActuel(s);
        if (s.joueur.entreprise) return NF.t('Vos clients repoussent leurs commandes, deux d\'entre eux ont déposé le bilan. La trésorerie de ') + s.joueur.entreprise.nom + NF.t(' fond.');
        if (m && !m.nonDeclare && m.pa >= 1) return NF.t('Votre employeur annonce un plan de « réorganisation ». Des postes de ') + NF.util.minuscule(m.nom) + NF.t(' sont menacés.');
        if (m) return NF.t('Il y a moins de travail, et plus de monde pour le prendre. Les journées de ') + NF.util.minuscule(m.nom) + NF.t(' se font rares.');
        return NF.t('Les quelques pistes que vous aviez se referment : « on gèle les embauches ».');
      },
      conditions: { drapeau: 'crise_en_cours' },
      choix: [
        { texte: NF.t('Faire le dos rond'),
          aleatoire: [
            { poids: 6, effets: function (s) {
                var e = s.joueur.entreprise;
                if (e) { var p = arrondi10(Math.max(300, (e.dernierCA || 0) * 0.4)); capital(s, -p); return { moral: -4, drapeaux: finCrise(), journal: NF.t('Trésorerie : ') + U.euros(-p) + '.' }; }
                return { moral: -4, argent: -arrondi10(Math.min(200, s.joueur.argent * 0.15)), drapeaux: finCrise() };
              }, resultat: NF.t('Ça pique, mais ça passe. Vous êtes encore là.') },
            { poids: 3, effets: function (s) {
                var m = NF.core.metierActuel(s), e = s.joueur.entreprise;
                if (e) { var p = arrondi10(Math.max(800, (e.dernierCA || 0) * 0.9)); capital(s, -p); return { moral: -8, drapeaux: finCrise(), journal: NF.t('Trésorerie : ') + U.euros(-p) + '.' }; }
                if (m && !m.nonDeclare && m.pa >= 1) { var ind = arrondi10(s.joueur.emploi.salaire); return { argent: ind, moral: -10, emploi: 'perdre', raison: NF.t('plan social'), drapeaux: finCrise(), journal: NF.t('Indemnité : ') + U.euros(ind) + '.' }; }
                if (m) return { moral: -8, emploi: 'perdre', raison: NF.t('plus de travail'), drapeaux: finCrise() };
                return { moral: -6, drapeaux: finCrise() };
              }, resultat: NF.t('Vous faites partie de ceux qui tombent.') },
            { poids: 1, effets: { moral: 3, drapeaux: finCrise() }, resultat: NF.t('Votre secteur tient mieux que les autres. Vous passez entre les gouttes.') },
          ] },
        { texte: NF.t('Puiser dans ma réserve'), conditions: { drapeau: 'crise_reserve' },
          effets: { argent: -300, moral: 2, drapeaux: finCrise() },
          resultat: NF.t('Les 300 € mis de côté absorbent le choc. Vous traversez le creux sans casse.') },
        { texte: NF.t('Me former pendant le creux'), conditions: { lieu: 'bibliotheque' },
          effets: function (s) { return { xp: { informatique: 15, lecture: 10 }, energie: -6, argent: -arrondi10(Math.min(150, s.joueur.argent * 0.1)), drapeaux: finCrise() }; },
          resultat: NF.t('Pendant que tout ralentit, vous apprenez. Le mois est maigre, mais quand ça repartira, vous serez prêt.') },
      ] },

    /* ---------------- Reprise économique ---------------- */
    { id: 'eco_reprise', famille: 'economie', icone: '🌤️', titre: NF.t('Reprise économique'),
      texte: NF.t('Les commandes repartent, les enseignes recrutent, les terrasses sont pleines. La ville respire un peu mieux.'),
      poids: 1.2, delai: 18,
      condition: function (s) { return s.conjoncture < 0.95; },
      choix: [
        { texte: NF.t('Demander une augmentation dans la foulée'), conditions: { emploi: true, nonDeclare: false, competences: { commerce: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { if (s.joueur.emploi) s.joueur.emploi.salaire = arrondi10(s.joueur.emploi.salaire * 1.05); return { conjoncture: 0.1, moral: 5 }; }, resultat: function (s) { return NF.t('Le moment est bien choisi : ') + U.euros(s.joueur.emploi ? s.joueur.emploi.salaire : 0) + NF.t(' par mois désormais.'); } },
            { poids: 4, effets: { conjoncture: 0.1, moral: -2 }, resultat: NF.t('« On en reparle à l\'entretien annuel. » Le vent tourne quand même.') },
          ] },
        { texte: NF.t('Relancer mes anciens clients'), conditions: { entreprise: true },
          effets: function (s) { var e = s.joueur.entreprise; e.malusConcurrence = Math.max(0, (e.malusConcurrence || 0) - 0.1); return { conjoncture: 0.1, moral: 4, energie: -5 }; },
          resultat: NF.t('Quelques coups de fil et les carnets de commandes se remplissent. La concurrence pèse moins.') },
        { texte: NF.t('Me présenter partout'), conditions: { emploi: false },
          effets: { conjoncture: 0.1, moral: 4, reputation: 1, xp: { commerce: 5 }, energie: -5 },
          resultat: NF.t('Vous déposez des CV partout où ça embauche. Les regards sont moins fermés qu\'avant.') },
        { texte: NF.t('Rien de particulier'), effets: { conjoncture: 0.1, moral: 2 }, resultat: NF.t('Vous profitez simplement de l\'air plus léger.') },
      ] },

    /* ---------------- Prime inattendue → indu réclamé ---------------- */
    { id: 'eco_prime_inattendue', famille: 'economie', icone: '✉️', titre: NF.t('Rappel de droits'),
      texte: NF.t('Un courrier de la CAF : après recalcul, un rappel de droits de 260 € vous est versé. Vous ne l\'attendiez pas.'),
      poids: 1.5, delai: 12,
      conditions: { classeMax: 3, domiciliation: true },
      choix: [
        { texte: NF.t('Encaisser'),
          aleatoire: [
            { poids: 7, effets: { argent: 260, moral: 4 }, resultat: NF.t('L\'argent est là. Un mois moins serré.') },
            { poids: 3, effets: { argent: 260, moral: 4, programmer: { evenement: 'eco_trop_percu', dans: 3, donnees: { montant: 260 } } }, resultat: NF.t('L\'argent est là. Vous ne vous posez pas de question.') },
          ] },
        { texte: NF.t('Vérifier que c\'est bien dû'), conditions: { competences: { administratif: 1 } },
          aleatoire: [
            { poids: 7, effets: { argent: 260, moral: 3, xp: { administratif: 5 } }, resultat: NF.t('Vous appelez : c\'est bien un rappel légitime. Vous l\'encaissez l\'esprit tranquille.') },
            { poids: 3, effets: { moral: 1, reputation: 2, xp: { administratif: 5 } }, resultat: NF.t('C\'était une erreur de leur part. Vous la signalez, l\'agent vous remercie.') },
          ] },
        { texte: NF.t('Encaisser et me faire plaisir'),
          aleatoire: [
            { poids: 7, effets: { argent: 100, moral: 10, nourriture: 15, hygiene: 10 }, resultat: NF.t('Un vrai repas, des vêtements, une coupe de cheveux. Il reste 100 €.') },
            { poids: 3, effets: { argent: 100, moral: 10, nourriture: 15, hygiene: 10, programmer: { evenement: 'eco_trop_percu', dans: 3, donnees: { montant: 260 } } }, resultat: NF.t('Un vrai repas, des vêtements, une coupe de cheveux. Il reste 100 €.') },
          ] },
      ] },

    { id: 'eco_trop_percu', famille: 'economie', force: true, icone: '📮', titre: NF.t('Indu réclamé'),
      texte: function (s, d) { return NF.t('Nouveau courrier de la CAF : le rappel de droits était une erreur. Un indu de ') + U.euros(montant(d, 260)) + NF.t(' vous est réclamé sous un mois.'); },
      choix: [
        { texte: NF.t('Rembourser'), effets: function (s, d) { NF.api.retirerArgent(s, montant(d, 260), true); return { moral: -4 }; }, resultat: NF.t('Vous rendez l\'argent. S\'il en manque, le reste devient une dette.') },
        { texte: NF.t('Demander un échelonnement'), conditions: { competences: { administratif: 1 } },
          effets: function (s, d) { return { dette: montant(d, 260), moral: -1, xp: { administratif: 4 } }; }, resultat: NF.t('Retenue sur les prochains versements. Une dette, mais sans huissier.') },
        { texte: NF.t('Demander une remise de dette'), conditions: { lieu: 'centre_social', competences: { administratif: 2 } },
          aleatoire: [
            { poids: 5, effets: { moral: 3, xp: { administratif: 8 } }, resultat: NF.t('Avec l\'aide du centre social, vous obtenez une remise totale. L\'erreur était la leur.') },
            { poids: 5, effets: function (s, d) { return { dette: montant(d, 260), moral: -2, xp: { administratif: 6 } }; }, resultat: NF.t('Remise refusée. Vous rembourserez par retenues.') },
          ] },
      ] },

    /* ---------------- Un proche demande de l'argent → nouvelles ---------------- */
    { id: 'eco_proche_argent', famille: 'economie', icone: '🙏', titre: NF.t('Un proche dans le besoin'),
      texte: NF.t('Quelqu\'un que vous connaissez depuis longtemps vous appelle : loyer en retard, électricité coupée. « Il me manque 300 €. Remboursés dans trois mois, promis. »'),
      poids: 1.5, delai: 12,
      conditions: { argentMin: 100, classeMin: 2, sansDrapeau: 'pret_a_un_proche' },
      choix: [
        { texte: NF.t('Prêter 300 €'), conditions: { argentMin: 300 },
          effets: { argent: -300, moral: 2, drapeaux: { pret_a_un_proche: true }, programmer: { evenement: 'eco_proche_suite', dans: 3, donnees: { montant: 300 } } },
          resultat: NF.t('Vous faites le virement. Trois mois, on verra.') },
        { texte: NF.t('Donner 100 €, sans attendre de retour'), conditions: { argentMin: 100 }, effets: { argent: -100, moral: 4, reputation: 2 }, resultat: NF.t('Ce n\'est pas tout, mais c\'est donné de bon cœur.') },
        { texte: NF.t('L\'orienter vers une association'), conditions: { lieu: 'association' }, effets: { moral: 1, reputation: 1, xp: { administratif: 3 } }, resultat: NF.t('Vous connaissez les bonnes portes. Vous l\'accompagnez au rendez-vous.') },
        { texte: NF.t('Refuser'), effets: { moral: -3, reputation: -1 }, resultat: NF.t('Un silence au téléphone. Vous ne saurez pas comment ça s\'est fini.') },
      ] },

    { id: 'eco_proche_suite', famille: 'economie', force: true, icone: '📱', titre: NF.t('Nouvelles du proche'),
      texte: function (s, d) { return NF.t('Trois mois ont passé. Pas de virement, pas de message. Les ') + U.euros(montant(d, 300)) + NF.t(' prêtés ne sont pas revenus.'); },
      conditions: { drapeau: 'pret_a_un_proche' },
      choix: [
        { texte: NF.t('Réclamer mon argent'),
          aleatoire: [
            { poids: 5, effets: function (s, d) { return { argent: montant(d, 300), moral: 2, drapeaux: { pret_a_un_proche: false } }; }, resultat: NF.t('Gêné, il rembourse tout dans la semaine.') },
            { poids: 3, effets: function (s, d) { return { argent: Math.round(montant(d, 300) / 2), moral: -1, drapeaux: { pret_a_un_proche: false } }; }, resultat: NF.t('Il rend la moitié. « Le reste dès que je peux. » Vous n\'y croyez plus trop.') },
            { poids: 2, effets: { moral: -6, reputation: -1, drapeaux: { pret_a_un_proche: false } }, resultat: NF.t('Ça tourne à la dispute. Vous perdez l\'argent et un ami.') },
          ] },
        { texte: NF.t('Lui laisser du temps'),
          aleatoire: [
            { poids: 4, effets: function (s, d) { return { argent: montant(d, 300), moral: 5, reputation: 1, drapeaux: { pret_a_un_proche: false } }; }, resultat: NF.t('Deux mois plus tard, il rembourse, avec une bouteille en plus. La confiance paie.') },
            { poids: 6, effets: { moral: -2, drapeaux: { pret_a_un_proche: false } }, resultat: NF.t('Vous n\'en entendez plus jamais parler. Un prêt devenu don.') },
          ] },
        { texte: NF.t('Lui proposer de rembourser en services'), conditions: { competences: { commerce: 1 } },
          effets: function (s, d) { return { argent: Math.round(montant(d, 300) * 0.3), energie: 8, moral: 2, drapeaux: { pret_a_un_proche: false } }; },
          resultat: NF.t('Il rend un peu d\'argent et vous aide pour tout ce qui est lourd ou pénible. L\'honneur est sauf.') },
      ] },

    /* ---------------- Crédit facile → relevé ---------------- */
    { id: 'eco_credit_facile', famille: 'economie', icone: '💳', titre: NF.t('Crédit en trois clics'),
      texte: NF.t('Dans la boîte aux lettres, puis par texto, puis au guichet d\'une enseigne : « 1 000 € sur votre compte demain, sans justificatif, remboursez à votre rythme. » Le taux est écrit tout petit.'),
      poids: 1.5, delai: 12,
      conditions: { classeMin: 2, classeMax: 4, dette: false, domiciliation: true, sansDrapeau: 'credit_facile_pris' },
      choix: [
        { texte: NF.t('Prendre 1 000 €'), effets: { argent: 1000, dette: 1250, moral: 4, drapeaux: { credit_facile_pris: true }, programmer: { evenement: 'eco_credit_suite', dans: 4 } }, resultat: NF.t('L\'argent est là le lendemain. Avec les frais de dossier et le taux, c\'est déjà 1 250 € à rembourser.') },
        { texte: NF.t('Prendre 400 € seulement'), effets: { argent: 400, dette: 500, moral: 2, drapeaux: { credit_facile_pris: true }, programmer: { evenement: 'eco_credit_suite', dans: 4 } }, resultat: NF.t('Une petite somme, qui en devient une moyenne avec les frais : 500 € à rendre.') },
        { texte: NF.t('Lire les petites lignes'), conditions: { competences: { lecture: 2 } }, effets: { moral: 1, xp: { gestion: 5 } }, resultat: NF.t('TAEG 21,9 %, assurance facultative mais cochée d\'office, mensualité minimale qui ne rembourse que les intérêts. Vous jetez le dépliant.') },
        { texte: NF.t('Refuser'), effets: {}, resultat: NF.t('Vous laissez le dépliant dans la boîte.') },
      ] },

    { id: 'eco_credit_suite', famille: 'economie', force: true, icone: '📄', titre: NF.t('Relevé du crédit renouvelable'),
      texte: function (s) {
        if (s.joueur.dette <= 0) return NF.t('Le relevé du crédit arrive : les prélèvements ont fini par tout solder. Vous pouvez résilier.');
        return NF.t('Le relevé arrive : malgré les prélèvements, le capital restant dû a à peine bougé. Les intérêts mangent tout. Votre dette totale est de ') + U.euros(s.joueur.dette) + '.';
      },
      conditions: { drapeau: 'credit_facile_pris' },
      choix: [
        { texte: NF.t('Solder le crédit maintenant'), condition: function (s) { return s.joueur.dette > 0 && s.joueur.argent >= s.joueur.dette; },
          effets: function (s) { var d = s.joueur.dette; return { argent: -d, dette: -d, moral: 6 }; },
          resultat: NF.t('Vous remboursez tout d\'un coup. Le relevé suivant affichera zéro.') },
        { texte: NF.t('Continuer à payer petit à petit'), effets: function (s) { return { dette: arrondi10(s.joueur.dette * 0.08), moral: s.joueur.dette > 0 ? -3 : 1 }; },
          resultat: function (s) { return s.joueur.dette > 0 ? NF.t('Frais et intérêts s\'ajoutent. Ça traînera longtemps.') : NF.t('Plus rien à payer. Vous résiliez la carte.'); } },
        { texte: NF.t('Déposer un dossier de surendettement'), conditions: { dette: true, lieu: 'centre_social', competences: { administratif: 2 } },
          aleatoire: [
            { poids: 5, effets: function (s) { return { dette: -arrondi10(s.joueur.dette * 0.3), reputation: -2, moral: 2, xp: { administratif: 10 } }; }, resultat: NF.t('La commission efface une partie des intérêts et gèle les pénalités. Vous êtes fiché, mais vous respirez.') },
            { poids: 5, effets: { moral: -3, xp: { administratif: 6 } }, resultat: NF.t('Dossier jugé irrecevable : vos revenus suffisent, dit la commission. Vous paierez.') },
          ] },
      ] },

    /* ---------------- Arnaque à l'investissement ---------------- */
    { id: 'eco_arnaque_investissement', famille: 'economie', icone: '📱', titre: NF.t('Un placement « garanti »'),
      texte: NF.t('Un conseiller très aimable vous appelle, puis vous envoie une plaquette soignée : placement dans les énergies vertes, 12 % par an garantis, retrait possible à tout moment. Des témoignages enthousiastes, un site impeccable.'),
      poids: 1.2, delai: 18,
      conditions: { classeMin: 5, argentMin: 2000 },
      choix: [
        { texte: NF.t('Investir 2 000 €'),
          aleatoire: [
            { poids: 7, effets: { argent: -2000, moral: -10 }, resultat: NF.t('Trois mois de relevés flatteurs, puis le site disparaît et le numéro ne répond plus. L\'argent aussi.') },
            { poids: 3, effets: { argent: -1700, moral: -6 }, resultat: NF.t('Vous retirez 300 € de « gains » avant que la plateforme ne ferme. Le reste est perdu.') },
          ] },
        { texte: NF.t('Investir 5 000 €'), conditions: { argentMin: 5000 },
          aleatoire: [
            { poids: 8, effets: { argent: -5000, moral: -14 }, resultat: NF.t('Le conseiller vous félicite, puis cesse de répondre. La société n\'a jamais existé.') },
            { poids: 2, effets: { argent: -4400, moral: -8 }, resultat: NF.t('Vous récupérez 600 € en vous retirant tôt. Le reste a fondu avec le site.') },
          ] },
        { texte: NF.t('Vérifier sur le site de l\'Autorité des marchés financiers'), conditions: { competences: { lecture: 3 } },
          effets: { moral: 2, reputation: 1, xp: { gestion: 8 } }, resultat: NF.t('La société figure sur la liste noire de l\'AMF. Vous raccrochez.') },
        { texte: NF.t('Décliner'), effets: {}, resultat: NF.t('Trop beau pour être vrai. Vous passez.') },
      ] },

    /* ---------------- Héritage lointain ---------------- */
    { id: 'eco_heritage_lointain', famille: 'economie', icone: '📜', titre: NF.t('Lettre d\'un notaire'),
      texte: NF.t('Un notaire de province vous écrit : une grand-tante dont vous ignoriez presque l\'existence est décédée. Vous figurez parmi les héritiers. Il faut accepter ou renoncer, sans savoir exactement ce que contient la succession.'),
      poids: 0.6, delai: 1, unique: true,
      conditions: { ageMin: 22 },
      choix: [
        { texte: NF.t('Accepter purement et simplement'), conditions: { domiciliation: true },
          aleatoire: [
            { poids: 5, effets: { argent: 1800, moral: 6 }, resultat: NF.t('Une part de livret et quelques meubles vendus : 1 800 € après frais.') },
            { poids: 3, effets: { argent: 4500, moral: 8 }, resultat: NF.t('Un petit terrain vendu entre héritiers : 4 500 € pour vous.') },
            { poids: 2, effets: { dette: 900, moral: -6 }, resultat: NF.t('La succession est déficitaire : des dettes, des frais d\'obsèques impayés. Votre part : 900 € à régler.') },
          ] },
        { texte: NF.t('Accepter à concurrence de l\'actif net, avec inventaire'), conditions: { domiciliation: true, argentMin: 150, competences: { administratif: 2 } },
          aleatoire: [
            { poids: 7, effets: { argent: 2350, moral: 5, drapeaux: { demarches_succession: 2 }, xp: { administratif: 10 } }, resultat: NF.t('L\'inventaire coûte 150 € et deux mois de démarches, mais il rassure : 2 500 € vous reviennent.') },
            { poids: 3, effets: { argent: -150, moral: -1, drapeaux: { demarches_succession: 2 }, xp: { administratif: 10 } }, resultat: NF.t('L\'inventaire révèle plus de dettes que de biens. Vous ne devez rien, et ne touchez rien.') },
          ] },
        { texte: NF.t('Renoncer'), effets: { moral: -1 }, resultat: NF.t('Vous signez la renonciation. Vous ne saurez jamais.') },
      ] },

    /* ---------------- Objet trouvé ---------------- */
    { id: 'eco_objet_trouve', famille: 'economie', icone: '💻', titre: NF.t('Trouvaille'),
      texte: NF.t('À côté d\'une benne d\'encombrants, un ordinateur portable dans sa housse. Il s\'allume. Pas de nom dessus.'),
      poids: 1.5, delai: 10,
      conditions: { classeMax: 3 },
      choix: [
        { texte: NF.t('Le garder'), condition: function (s) { return NF.api.placeLibre(s) >= 2; }, effets: { objets: { ordinateur: 1 }, moral: 5 }, resultat: NF.t('Un ordinateur à vous. Pour apprendre, chercher du travail, ou simplement regarder des vidéos.') },
        { texte: NF.t('Le revendre'), conditions: { competences: { commerce: 1 } },
          aleatoire: [
            { poids: 6, effets: { argent: 130, moral: 3 }, resultat: NF.t('Un revendeur du quartier vous en donne 130 €, sans poser de questions.') },
            { poids: 4, effets: { argent: 70, moral: 1 }, resultat: NF.t('L\'écran a un défaut. 70 €, à prendre ou à laisser.') },
          ] },
        { texte: NF.t('Le déposer au commissariat'),
          aleatoire: [
            { poids: 3, effets: { argent: 40, reputation: 3, moral: 3 }, resultat: NF.t('Le propriétaire est retrouvé grâce à une facture dans la housse. Il vous glisse 40 € pour vous remercier.') },
            { poids: 7, effets: { reputation: 2, moral: 2 }, resultat: NF.t('Un récépissé, un merci. Vous repartez les mains vides, mais la tête haute.') },
          ] },
        { texte: NF.t('Le laisser là'), effets: {}, resultat: NF.t('Quelqu\'un d\'autre le prendra.') },
      ] },

    /* ---------------- Panne de voiture ---------------- */
    { id: 'eco_panne_voiture', famille: 'economie', icone: '🚗', titre: NF.t('Panne'),
      texte: NF.t('Un bruit sourd, un voyant, puis plus rien : la voiture refuse de redémarrer. Le dépanneur parle d\'embrayage et annonce 650 € de réparation.'),
      poids: 2, delai: 10,
      conditions: { objet: 'voiture' },
      choix: [
        { texte: NF.t('Payer le garage (650 €)'), conditions: { argentMin: 650 }, effets: { argent: -650, moral: -3 }, resultat: NF.t('Une semaine sans voiture, puis elle repart. Le compte, lui, a du mal.') },
        { texte: NF.t('Réparer moi-même'), conditions: { competences: { technique: 2 }, objet: 'outils' },
          aleatoire: [
            { poids: 6, effets: { argent: -140, energie: -12, xp: { technique: 12 } }, resultat: NF.t('Pièces d\'occasion, deux week-ends sous la voiture, et ça roule. 140 € en tout.') },
            { poids: 4, effets: { argent: -480, energie: -12, moral: -4, xp: { technique: 6 } }, resultat: NF.t('Vous cassez un capteur en démontant. Le garage finit le travail : 480 €.') },
          ] },
        { texte: NF.t('Payer en plusieurs fois chez le garagiste'), effets: { dette: 720, moral: -2 }, resultat: NF.t('Le garagiste accepte un échéancier, avec des frais. 720 € de dette.') },
        { texte: NF.t('Laisser la voiture à la casse'),
          effets: function (s) { var m = NF.core.metierActuel(s); var r = { objets: { voiture: -1 }, argent: 300, moral: -5 }; if (m && m.id === 'chauffeur_vtc') { r.emploi = 'perdre'; r.raison = NF.t('plus de véhicule'); } return r; },
          resultat: NF.t('La casse vous en donne 300 €. Vous reprenez le bus.') },
      ] },

    /* ---------------- Cambriolage de l'entreprise ---------------- */
    { id: 'eco_cambriolage_entreprise', famille: 'economie', icone: '🪟', titre: NF.t('Cambriolage'),
      texte: function (s) { return NF.t('Un matin, la porte des locaux de ') + s.joueur.entreprise.nom + NF.t(' est fracturée : matériel, stock, caisse. La police relève les empreintes. Préjudice estimé : ') + U.euros(perteCambriolage(s)) + '.'; },
      poids: function (s) { return s.joueur.drapeaux.entreprise_securisee ? 0.3 : 1.2; }, delai: 14,
      conditions: { entreprise: true },
      choix: [
        { texte: NF.t('Déclarer à l\'assurance'), conditions: { competences: { gestion: 2 } },
          aleatoire: [
            { poids: 6, effets: function (s) { var r = arrondi10(perteCambriolage(s) * 0.25); capital(s, -r); return { moral: -3, energie: -5, journal: NF.t('Reste à charge : ') + U.euros(r) + '.' }; }, resultat: NF.t('Le dossier est complet, l\'assureur paie. Il reste la franchise et quinze jours de paperasse.') },
            { poids: 4, effets: function (s) { var p = perteCambriolage(s); capital(s, -p); return { moral: -6, energie: -5, journal: NF.t('Perte : ') + U.euros(p) + '.' }; }, resultat: NF.t('« Absence de dispositif de protection conforme » : exclusion de garantie. Vous payez tout.') },
          ] },
        { texte: NF.t('Encaisser la perte'), effets: function (s) { var p = perteCambriolage(s); capital(s, -p); return { moral: -6, journal: NF.t('Perte : ') + U.euros(p) + '.' }; }, resultat: NF.t('Vous rachetez ce qu\'il faut pour rouvrir. La trésorerie accuse le coup.') },
        { texte: NF.t('Encaisser, et sécuriser les locaux'), conditions: { argentMin: 500 },
          effets: function (s) { var p = perteCambriolage(s); capital(s, -p); return { argent: -500, moral: -3, reputation: 1, drapeaux: { entreprise_securisee: true }, journal: NF.t('Perte : ') + U.euros(p) + '.' }; },
          resultat: NF.t('Alarme, rideau métallique, serrures neuves : 500 € de votre poche. Ça ne se reproduira pas de sitôt.') },
      ] },

    /* ---------------- Gros client pour l'entreprise ---------------- */
    { id: 'eco_gros_client', famille: 'economie', icone: '📦', titre: NF.t('Un gros client'),
      texte: function (s) { return NF.t('Un client bien plus gros que les autres contacte ') + s.joueur.entreprise.nom + NF.t(' : une commande importante, délai serré, paiement à soixante jours. De quoi rapporter environ ') + U.euros(gainClient(s)) + '.'; },
      poids: 1.5, delai: 10,
      conditions: { entreprise: true },
      condition: function (s) { return s.joueur.entreprise.mois >= 3; },
      choix: [
        { texte: NF.t('Accepter'),
          aleatoire: [
            { poids: 6, effets: function (s) { var g = gainClient(s); capital(s, g); return { reputation: 3, energie: -15, moral: 4, journal: NF.t('Trésorerie : +') + U.euros(g) + '.' }; }, resultat: NF.t('Des semaines de travail intense. La facture est payée à l\'échéance, et le client reviendra.') },
            { poids: 3, effets: function (s) { var g = arrondi10(gainClient(s) * 0.5); capital(s, g); return { energie: -15, moral: -2, journal: NF.t('Trésorerie : +') + U.euros(g) + '.' }; }, resultat: NF.t('Il paie avec trois mois de retard, et la moitié seulement : « non-conformités ». Vous n\'avez pas les moyens de contester.') },
            { poids: 1, effets: function (s) { var p = arrondi10(gainClient(s) * 0.3); capital(s, -p); return { energie: -15, moral: -8, journal: NF.t('Trésorerie : ') + U.euros(-p) + '.' }; }, resultat: NF.t('Il dépose le bilan avant de payer. Vous aviez avancé les matières et les heures.') },
          ] },
        { texte: NF.t('Exiger un acompte de 40 %'), conditions: { competences: { commerce: 2 } },
          aleatoire: [
            { poids: 7, effets: function (s) { var g = gainClient(s); capital(s, g); return { reputation: 2, energie: -15, moral: 4, xp: { commerce: 8 }, journal: NF.t('Trésorerie : +') + U.euros(g) + '.' }; }, resultat: NF.t('L\'acompte tombe avant le premier coup de main. Le solde suit à l\'échéance.') },
            { poids: 3, effets: { moral: -2, xp: { commerce: 4 } }, resultat: NF.t('« Nos conditions sont à soixante jours, c\'est à prendre ou à laisser. » Il va voir ailleurs.') },
          ] },
        { texte: NF.t('Embaucher pour tenir la charge'),
          condition: function (s) { var e = s.joueur.entreprise; var E = NF.data.entreprise; return !!(e && E.statuts[e.statut] && e.employes < E.statuts[e.statut].employesMax && e.capital >= E.employe.salaireBrut * 2); },
          effets: function (s) { var g = gainClient(s); NF.core.entrepriseEmbaucher(s); capital(s, g); return { reputation: 3, energie: -8, moral: 3, journal: NF.t('Trésorerie : +') + U.euros(g) + '.' }; },
          resultat: NF.t('Un salarié de plus, et la commande livrée dans les temps. L\'entreprise grandit.') },
        { texte: NF.t('Refuser, trop gros pour nous'), effets: { moral: 1, energie: 3 }, resultat: NF.t('Vous préférez vos clients habituels. Prudent, peut-être trop.') },
      ] },

    /* ---------------- Augmentation des charges ---------------- */
    { id: 'eco_hausse_charges', famille: 'economie', icone: '🔌', titre: NF.t('Les factures grimpent'),
      texte: function (s) {
        var intro = s.joueur.entreprise
          ? NF.t('Électricité, assurance, loyer du local : les fournisseurs de ') + s.joueur.entreprise.nom + NF.t(' revoient tous leurs tarifs à la hausse. ')
          : NF.t('Électricité, eau, assurance : toutes les factures du logement augmentent en même temps. ');
        return intro + NF.t('Surcoût immédiat : ') + U.euros(montantCharges(s)) + '.';
      },
      poids: 1.5, delai: 12,
      condition: function (s) { return !!s.joueur.entreprise || logement(s).charges > 0; },
      choix: [
        { texte: NF.t('Payer'),
          effets: function (s) { var x = montantCharges(s); if (s.joueur.entreprise) { capital(s, -x); return { moral: -2, journal: NF.t('Trésorerie : ') + U.euros(-x) + '.' }; } return { argent: -x, moral: -2 }; },
          resultat: NF.t('Vous payez. Il faudra s\'y faire.') },
        { texte: NF.t('Renégocier les contrats'), conditions: { competences: { gestion: 1 } },
          aleatoire: [
            { poids: 6, effets: function (s) { var x = arrondi10(montantCharges(s) * 0.4); if (s.joueur.entreprise) { capital(s, -x); return { moral: 1, xp: { gestion: 6 }, journal: NF.t('Trésorerie : ') + U.euros(-x) + '.' }; } return { argent: -x, moral: 1, xp: { gestion: 6 } }; }, resultat: NF.t('Deux heures au téléphone, un fournisseur changé : la hausse est divisée par deux.') },
            { poids: 4, effets: function (s) { var x = montantCharges(s); if (s.joueur.entreprise) { capital(s, -x); return { moral: -2, xp: { gestion: 3 }, journal: NF.t('Trésorerie : ') + U.euros(-x) + '.' }; } return { argent: -x, moral: -2, xp: { gestion: 3 } }; }, resultat: NF.t('Tout le monde augmente en même temps. Rien à gratter.') },
          ] },
        { texte: NF.t('Réduire la consommation'),
          effets: function (s) { var x = arrondi10(montantCharges(s) * 0.6); if (s.joueur.entreprise) { capital(s, -x); return { energie: -4, journal: NF.t('Trésorerie : ') + U.euros(-x) + '.' }; } return { argent: -x, hygiene: -5, energie: -3 }; },
          resultat: NF.t('Chauffage baissé, douches plus courtes, lumières éteintes. Ça rogne un peu la facture, et le confort.') },
        { texte: NF.t('Reporter le paiement'), conditions: { entreprise: false }, effets: function (s) { return { dette: montantCharges(s), moral: -1 }; }, resultat: NF.t('Le fournisseur accepte un délai. La somme s\'ajoute à vos dettes.') },
      ] },

    /* ---------------- Placement → les marchés ont bougé ---------------- */
    { id: 'eco_placement', famille: 'economie', icone: '📊', titre: NF.t('Placer ses économies'),
      texte: NF.t('Votre banquier vous propose un rendez-vous : « Votre argent dort. » Actions, fonds, assurance-vie en unités de compte. Ça peut monter. Ça peut descendre.'),
      poids: 1.2, delai: 12,
      conditions: { classeMin: 4, argentMin: 1000, sansDrapeau: 'placement_en_cours' },
      choix: [
        { texte: NF.t('Placer 1 000 € en actions'), effets: { argent: -1000, drapeaux: { placement_en_cours: true, placement_montant: 1000 }, moral: 1 }, resultat: NF.t('1 000 € placés. Vous regarderez les cours de temps en temps.') },
        { texte: NF.t('Placer 3 000 €, en diversifiant'), conditions: { argentMin: 3000, competences: { gestion: 2 } }, effets: { argent: -3000, drapeaux: { placement_en_cours: true, placement_montant: 3000 }, moral: 2, xp: { gestion: 6 } }, resultat: NF.t('3 000 € répartis sur plusieurs fonds. Moins de risque, dit le conseiller.') },
        { texte: NF.t('Garder l\'argent sur le compte'), effets: {}, resultat: NF.t('Il dort, mais il est là.') },
      ] },

    { id: 'eco_placement_suite', famille: 'economie', icone: '📈', titre: NF.t('Les marchés ont bougé'),
      texte: function (s) { return NF.t('Un relevé de votre placement arrive. Valeur au dernier relevé : ') + U.euros(montantPlace(s)) + NF.t('. Les marchés ont été agités ces derniers mois.'); },
      poids: 3, delai: 6,
      conditions: { drapeau: 'placement_en_cours' },
      choix: [
        { texte: NF.t('Vendre maintenant'),
          aleatoire: [
            { poids: 4, effets: function (s) { return { argent: Math.round(montantPlace(s) * 1.18), moral: 5, drapeaux: { placement_en_cours: false, placement_montant: 0 } }; }, resultat: NF.t('Plus-value de 18 %. Votre banquier sourit.') },
            { poids: 3, effets: function (s) { return { argent: Math.round(montantPlace(s) * 0.85), moral: -4, drapeaux: { placement_en_cours: false, placement_montant: 0 } }; }, resultat: NF.t('Moins 15 %. « Il fallait rester investi », dit le conseiller.') },
            { poids: 2, effets: function (s) { return { argent: Math.round(montantPlace(s) * 1.4), moral: 8, drapeaux: { placement_en_cours: false, placement_montant: 0 } }; }, resultat: NF.t('Une belle envolée : +40 %. Vous encaissez avant que ça redescende.') },
            { poids: 1, effets: function (s) { return { argent: Math.round(montantPlace(s) * 0.5), moral: -8, drapeaux: { placement_en_cours: false, placement_montant: 0 } }; }, resultat: NF.t('Krach sectoriel. Vous sauvez la moitié.') },
          ] },
        { texte: NF.t('Laisser courir'),
          effets: function (s) { var m = Math.round(montantPlace(s) * NF.rng.entre(0.8, 1.3)); s.joueur.drapeaux.placement_montant = m; return { moral: 1, journal: NF.t('Valeur du placement : ') + U.euros(m) + '.' }; },
          resultat: NF.t('Vous ne touchez à rien. On verra au prochain relevé.') },
        { texte: NF.t('Arbitrer vers des fonds plus sûrs'), conditions: { competences: { gestion: 3 } },
          effets: function (s) { var m = Math.round(montantPlace(s) * NF.rng.entre(1.0, 1.1)); s.joueur.drapeaux.placement_montant = m; return { moral: 2, xp: { gestion: 8 }, journal: NF.t('Valeur du placement : ') + U.euros(m) + '.' }; },
          resultat: NF.t('Vous sécurisez les gains sur des fonds obligataires. Moins spectaculaire, plus calme.') },
      ] },

    /* ---------------- Loterie ---------------- */
    { id: 'eco_loterie', famille: 'economie', icone: '🎟️', titre: NF.t('Le gros lot du vendredi'),
      texte: NF.t('Au tabac, la cagnotte affichée dépasse les 20 millions. Tout le monde en parle. Un ticket coûte 2 €.'),
      poids: 1.2, delai: 5,
      conditions: { argentMin: 2 },
      choix: [
        { texte: NF.t('Un ticket (2 €)'),
          aleatoire: [
            { poids: 150, effets: { argent: -2 }, resultat: NF.t('Pas le bon numéro. Comme presque tout le monde.') },
            { poids: 35, effets: { argent: 3, moral: 1 }, resultat: NF.t('Deux numéros : 5 € de gain. Vous repartez avec 3 € de plus.') },
            { poids: 14, effets: { argent: 38, moral: 4 }, resultat: NF.t('Quatre numéros : 40 €. Une bonne surprise.') },
            { poids: 1, effets: { argent: 19998, moral: 30, reputation: 2 }, resultat: NF.t('Cinq numéros et le bon complémentaire : 20 000 €. Vous relisez le ticket dix fois.') },
          ] },
        { texte: NF.t('Cinq tickets (10 €)'), conditions: { argentMin: 10 },
          aleatoire: [
            { poids: 120, effets: { argent: -10, moral: -1 }, resultat: NF.t('Cinq tickets, zéro gain. 10 € partis en fumée.') },
            { poids: 50, effets: { argent: -4, moral: 1 }, resultat: NF.t('Un ticket gagnant à 6 €. Perte limitée.') },
            { poids: 25, effets: { argent: 40, moral: 4 }, resultat: NF.t('Un ticket à 50 €. Ça rembourse, et plus.') },
            { poids: 4, effets: { argent: 240, moral: 8 }, resultat: NF.t('Un ticket à 250 €. La buraliste vous félicite.') },
            { poids: 1, effets: { argent: 19990, moral: 30, reputation: 2 }, resultat: NF.t('L\'un des cinq tickets vaut 20 000 €. Vous marchez bizarrement en rentrant.') },
          ] },
        { texte: NF.t('Ne pas jouer'), effets: {}, resultat: NF.t('Vous gardez vos 2 €. Statistiquement, c\'est le bon choix.') },
      ] },
  ]);
})();
