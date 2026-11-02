/* =====================================================================
 * LOGEMENTS
 * ---------------------------------------------------------------------
 * Le logement détermine le coût mensuel, l'usure des jauges et une
 * partie de la catégorie sociale.
 *
 * Champs :
 *   id, nom, icone, desc
 *   loyer        : coût mensuel (0 pour la rue)
 *   charges      : charges mensuelles en plus du loyer (eau, électricité…)
 *   proprietaire : true si le logement est possédé (taxe foncière, héritage)
 *   prix         : prix d'achat si proprietaire
 *   usure        : multiplicateurs de l'usure mensuelle des jauges
 *                  (1 = normal, 0.5 = deux fois moins)
 *   bonus        : jauges regagnées chaque mois (ex. { energie: 15 })
 *   expose       : true si on subit la météo (rue, squat, tente)
 *   cuisine      : true si on peut cuisiner (la nourriture coûte moins)
 *   adresse      : true si le logement donne une adresse (CDI, prêts…)
 *   capacite     : nombre de personnes maximum (famille)
 *   acces        : conditions pour y entrer
 *       { argent, revenuMensuel, domiciliation, reputation, emploiMois (mois
 *         d'emploi déclaré = fiches de paie), lieu, objet, drapeau,
 *         secteurEmploi (logement de fonction : on le perd avec l'emploi) }
 *   dureeMax     : nombre de mois maximum (hébergements temporaires)
 *   ordre        : rang de confort (pour les classes sociales)
 * ===================================================================== */
NF.data.logements = [
  { id: 'rue', nom: NF.t('À la rue'), icone: '🌃', desc: NF.t('Un bout de trottoir, un hall d\'immeuble, un parking.'),
    loyer: 0, charges: 0, expose: true, usure: { nourriture: 1, energie: 1.15, hygiene: 1.15, moral: 1.15 },
    capacite: 1, ordre: 0 },

  { id: 'squat', nom: NF.t('Squat'), icone: '🏚', desc: NF.t('Un immeuble vide occupé avec d\'autres. Un toit, pas de sécurité.'),
    loyer: 0, charges: 0, expose: true, usure: { nourriture: 1, energie: 0.9, hygiene: 1, moral: 1 },
    capacite: 2, ordre: 1, acces: { lieu: 'squat' } },

  { id: 'tente', nom: NF.t('Tente'), icone: '⛺', desc: NF.t('Un campement discret. Mieux que rien, mais fragile.'),
    loyer: 0, charges: 0, expose: true, usure: { nourriture: 1, energie: 0.85, hygiene: 1.1, moral: 1 },
    capacite: 1, ordre: 1, acces: { objet: 'tente' } },

  { id: 'foyer', nom: NF.t('Foyer'), icone: '🛏️', desc: NF.t('Place en centre d\'hébergement. Repas, douche, mais règlement strict.'),
    loyer: 0, charges: 0, usure: { nourriture: 0.6, energie: 0.6, hygiene: 0.5, moral: 1 },
    bonus: { hygiene: 10 }, capacite: 1, ordre: 2, dureeMax: 6,
    acces: { reputation: 15 } },

  { id: 'heberge', nom: NF.t('Hébergé chez quelqu\'un'), icone: '🛋️', desc: NF.t('Le canapé d\'un proche ou d\'une connaissance. Pas pour toujours.'),
    loyer: 0, charges: 50, cuisine: true, usure: { nourriture: 0.8, energie: 0.6, hygiene: 0.4, moral: 0.9 },
    capacite: 1, ordre: 2, dureeMax: 8, acces: { drapeau: 'hebergement_propose' } },

  { id: 'caserne', nom: NF.t('Caserne'), icone: '🪖', desc: NF.t('Logé par l\'armée : un lit, une douche, le réfectoire. Tant que vous servez.'),
    loyer: 0, charges: 60, cuisine: true, adresse: true, usure: { nourriture: 0.5, energie: 0.6, hygiene: 0.3, moral: 1.05 },
    capacite: 1, ordre: 3, acces: { secteurEmploi: 'armee' } },

  { id: 'chambre', nom: NF.t('Chambre en colocation'), icone: '🚪', desc: NF.t('Une chambre meublée, cuisine partagée.'),
    loyer: 320, charges: 40, cuisine: true, adresse: true, usure: { nourriture: 0.8, energie: 0.5, hygiene: 0.3, moral: 0.8 },
    capacite: 1, ordre: 3, acces: { argent: 700, revenuMensuel: 700 } },

  { id: 'studio', nom: NF.t('Studio'), icone: '🏠', desc: NF.t('Un petit studio bien à vous.'),
    loyer: 480, charges: 70, cuisine: true, adresse: true, usure: { nourriture: 0.8, energie: 0.45, hygiene: 0.25, moral: 0.7 },
    capacite: 2, ordre: 4, acces: { argent: 1200, revenuMensuel: 1100, domiciliation: true, emploiMois: 3 } },

  { id: 'appartement', nom: NF.t('Appartement'), icone: '🏢', desc: NF.t('Deux ou trois pièces, de quoi loger une famille.'),
    loyer: 780, charges: 110, cuisine: true, adresse: true, usure: { nourriture: 0.8, energie: 0.4, hygiene: 0.2, moral: 0.6 },
    capacite: 4, ordre: 5, acces: { argent: 2000, revenuMensuel: 1800, domiciliation: true, emploiMois: 3 } },

  { id: 'grand_appartement', nom: NF.t('Grand appartement'), icone: '🏙️', desc: NF.t('Lumineux, bien placé, cher.'),
    loyer: 1300, charges: 160, cuisine: true, adresse: true, usure: { nourriture: 0.8, energie: 0.35, hygiene: 0.2, moral: 0.5 },
    capacite: 6, ordre: 6, acces: { argent: 3500, revenuMensuel: 3000, domiciliation: true, emploiMois: 6 } },

  { id: 'maison', nom: NF.t('Maison (propriétaire)'), icone: '🏡', desc: NF.t('Votre maison. Plus de loyer, mais la taxe foncière et l\'entretien.'),
    loyer: 0, charges: 250, proprietaire: true, prix: 180000, cuisine: true, adresse: true,
    usure: { nourriture: 0.8, energie: 0.35, hygiene: 0.2, moral: 0.45 },
    capacite: 6, ordre: 7, acces: { argent: 180000, revenuMensuel: 2500, domiciliation: true } },

  { id: 'villa', nom: NF.t('Villa (propriétaire)'), icone: '🏰', desc: NF.t('Grande propriété avec jardin. Le sommet.'),
    loyer: 0, charges: 600, proprietaire: true, prix: 650000, cuisine: true, adresse: true,
    usure: { nourriture: 0.8, energie: 0.3, hygiene: 0.2, moral: 0.4 },
    capacite: 8, ordre: 8, acces: { argent: 650000, revenuMensuel: 6000, domiciliation: true } },
];
