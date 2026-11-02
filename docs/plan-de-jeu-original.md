# Plan de jeu – Survie urbaine (roguelike au tour par tour)

Nov 2, 2026 · @Tempo

## Le concept

Le joueur incarne un jeune de 18 ans à la rue, dans une grande ville, en 2D. Chaque tour représente un mois (1 an = 12 tours). Le but : survivre le plus longtemps possible et gravir l'échelle sociale.

La mort met fin à la partie, mais chaque partie rapporte des points qui débloquent des bonus pour les suivantes. Pas de limite de temps : uniquement des choix de vie, dans l'esprit d'une simulation de vie type BitLife, avec des notions de survie et de roguelike.

Le personnage peut fonder une famille. À sa mort, la partie continue avec un héritier : on joue une lignée, et la partie ne s'arrête vraiment que lorsqu'il n'y a plus personne pour reprendre le flambeau.

## Les jauges de survie et les saisons

| Jauge | Rôle |
| --- | --- |
| Santé | À zéro, c'est la fin de la partie. |
| Faim | Se dégrade chaque mois ; négligée, elle fait baisser la santé. |
| Fatigue | Idem ; réduit aussi l'efficacité des actions. |
| Hygiène | Idem ; joue sur la santé et sur l'accès à certains emplois. |
| Moral | Bas, il réduit l'efficacité des actions (apprentissage, recherche d'emploi). |
| Argent | Ressource principale pour manger, se loger, acheter des matériaux. |
| Réputation | Auprès des associations, des employeurs et des autres sans-abri. |

Comme 12 tours font un an, le jeu intègre les saisons. L'hiver devient une vraie menace (froid, maladies), l'été est plus clément. Cela donne un rythme naturel à chaque année.

## Le déroulement d'un tour

Chaque mois, le joueur dispose de quelques points d'action (par exemple 3) à répartir entre des actions :

- mendier, chercher de la nourriture, faire des petits boulots ;
- dormir dans un foyer, se laver ;
- aller à la bibliothèque pour apprendre ;
- fabriquer un objet ;
- faire des démarches administratives, nouer des contacts.

Ensuite, un ou plusieurs événements aléatoires surviennent (vol, rencontre, maladie, opportunité de travail, contrôle de police…), souvent avec un choix à faire. C'est l'aspect roguelike : aucune partie ne se ressemble.

## Les événements aléatoires

Les événements doivent rester plausibles : chacun ne peut survenir que si le contexte s'y prête (saison, lieu, catégorie sociale, âge, état des jauges, métier, famille).

| Famille d'événements | Exemples |
| --- | --- |
| Santé | Grippe en hiver, blessure au travail, dépression, visite à l'hôpital |
| Sécurité | Vol de sac, agression, contrôle de police, expulsion d'un squat |
| Social | Rencontre avec un bénévole, un ancien camarade, un futur conjoint |
| Administratif | Papiers perdus, domiciliation accordée, aide refusée, contrôle fiscal |
| Travail | Offre d'emploi, licenciement, promotion, accident, grève |
| Économie | Hausse des loyers, crise, prime inattendue, dette |
| Famille | Naissance, dispute, maladie d'un proche, enfant en difficulté à l'école |

Certains événements s'enchaînent : un choix fait aujourd'hui peut déclencher une conséquence plusieurs mois plus tard. Objectif : une quarantaine d'événements au départ, puis 150 ou plus à terme.

## Les connaissances

Les compétences progressent en étudiant ou en pratiquant : lecture et écriture, informatique, bricolage, cuisine, démarches administratives, langues, etc.

Elles débloquent de nouveaux emplois, de nouvelles recettes de fabrication et de nouvelles options lors des événements.

## La fabrication

Un inventaire limité et des recettes simples : un abri en carton, une couverture rapiécée, un réchaud de fortune, un panneau pour mendier plus efficacement, etc.

Les recettes avancées demandent certaines compétences.

## Les catégories sociales

Une échelle avec des conditions claires pour monter :

1. À la rue
2. Hébergé (foyer ou chez quelqu'un)
3. Précaire avec un petit logement
4. Salarié stable
5. Classe moyenne
6. Et ainsi de suite

On peut aussi redescendre si on perd son emploi ou son logement, ce qui maintient la tension.

## Les métiers

Objectif : une quarantaine de métiers, répartis par niveau. Chacun a ses prérequis (compétences, hygiène, adresse ou domiciliation, diplôme, permis), son salaire, sa pénibilité et ses risques.

| Niveau | Exemples de métiers | Prérequis typiques |
| --- | --- | --- |
| 1 – Survie | Ramasseur de ferraille, plongeur, manutentionnaire à la journée, livreur à vélo | Aucun ou presque |
| 2 – Emploi peu qualifié | Agent d'entretien, serveur, caissier, aide-cuisinier, ouvrier du bâtiment | Hygiène correcte, domiciliation |
| 3 – Métier qualifié | Électricien, cuisinier, aide-soignant, chauffeur routier, agent de sécurité | Formation, permis, carte professionnelle |
| 4 – Technicien | Technicien informatique, comptable, infirmier, chef de chantier | Diplôme ou expérience longue |
| 5 – Cadre | Ingénieur, cadre commercial, chef d'entreprise, médecin | Études longues, réseau, capital |

Le travail non déclaré existe aussi, mieux payé à court terme mais sans protection et avec des risques. Les formations (cours du soir, validation des acquis) permettent de changer de niveau ; les promotions et les licenciements font bouger la carrière.

## La famille et l'héritage

Les rencontres peuvent mener à une relation, un couple, puis des enfants. Fonder une famille demande un minimum de stabilité, mais une naissance imprévue reste possible.

Chaque membre de la famille a un âge, une santé et une relation avec le personnage. Les enfants grandissent : investir dans leur éducation améliore les compétences de départ de l'héritier.

À la mort du personnage, le joueur choisit un héritier parmi ses enfants. Celui-ci reçoit une partie de l'argent (après droits de succession progressifs), éventuellement le logement, et une part de la réputation. Si l'enfant est mineur, il passe sous tutelle jusqu'à 18 ans. Sans héritier, c'est la fin de la lignée et la fin de la partie.

## La fiscalité

L'héritier conserve la position sociale de sa famille ; l'équilibre vient d'une fiscalité progressive inspirée du système français, simplifiée pour le jeu : plus on gagne, plus on est taxé.

| Impôt | Principe dans le jeu |
| --- | --- |
| Impôt sur le revenu | Barème par tranches, de 0 % pour les petits revenus jusqu'à 45 % pour la tranche la plus haute, prélevé chaque mois |
| Droits de succession | Volontairement lourds : petit abattement par enfant, barème qui grimpe vite et monte au-delà du réel (jusqu'à 60 % ou plus), auxquels s'ajoutent frais de notaire, impôts en retard réclamés aux héritiers et démarches qui coûtent du temps. L'héritier garde sa position, mais doit reconstruire une bonne part du patrimoine |
| Taxes et charges courantes | Taxe foncière pour les propriétaires, cotisations, charges qui augmentent avec le niveau de vie |

En complément, le train de vie suit la catégorie sociale (loyer, dépenses attendues, pression sociale) : monter coûte plus cher à entretenir. Des options légales d'optimisation pourront exister plus tard (épargne, investissement), avec leurs propres risques.

## La création d'entreprise

Créer son entreprise est une voie d'ascension rapide mais risquée, avec des charges et des contraintes inspirées du réel. Le joueur prend les décisions ; les calculs sont automatiques et résumés chaque mois, pour garder la difficulté sans la paperasse.

**Pour se lancer** : avoir 18 ans, une compétence ou une expérience dans le domaine (l'activité découle des métiers exercés), et un capital de départ. Il vient de l'épargne, d'un microcrédit associatif (accessible même en situation précaire, mais limité), ou d'un prêt bancaire (refusé sans revenus stables ni adresse). Une aide à la création allège les charges la première année.

| Statut | Avantages | Contraintes (valeurs approximatives) |
| --- | --- | --- |
| Micro-entreprise | Création immédiate, gestion simple | Cotisations d'environ un quart du chiffre d'affaires, plafond de chiffre d'affaires, dépenses non déductibles, pas d'employé |
| Société | Peut embaucher, grandir, emprunter davantage | Comptable obligatoire chaque mois, impôt sur les sociétés (environ 15 % puis 25 %), charges sur le salaire du dirigeant ou imposition des dividendes |

**Chaque mois** : un chiffre d'affaires variable (selon compétences, réputation, saison et conjoncture), moins les charges fixes (local, matériel, assurance, comptable), les salaires et leurs charges patronales (environ 40 à 45 % en plus du brut), et la TVA à reverser.

**Les décisions du joueur** : embaucher ou licencier, investir, emprunter, fixer sa propre rémunération, changer de statut, fermer.

**Les risques** : impayés, concurrence, contrôle fiscal ou des cotisations, crise économique, épuisement du dirigeant (fatigue et moral). La faillite peut laisser des dettes personnelles et faire redescendre l'échelle sociale. L'entreprise peut être transmise à l'héritier, et entre alors dans le calcul des droits de succession.

## Unicité des parties, highscore et sauvegarde

À la fin de la lignée, la partie est notée (générations, années survécues, catégorie maximale, fortune transmise, accomplissements) et rapporte des points à dépenser dans des bonus permanents : commencer avec un sac à dos, un contact dans une association, une compétence de départ, etc.

Chaque partie est unique grâce à une graine aléatoire qui génère la ville (quartiers, lieux, associations), le personnage de départ (traits de caractère, santé, origine), le marché de l'emploi et l'ordre des événements. La graine peut être affichée pour rejouer ou partager une partie précise.

Un tableau des meilleurs scores conserve les dix meilleures lignées dans le navigateur. Un classement en ligne partagé entre joueurs est envisageable plus tard, mais demandera un serveur si le jeu est commercialisé hors de claude.ai.

La progression (bonus débloqués, scores) et la partie en cours sont sauvegardées automatiquement dans le navigateur, avec une option pour exporter et importer sa sauvegarde.

## Le visuel

Une interface simple mais explicite : les jauges bien visibles avec des icônes, une petite scène urbaine dessinée en haut qui change selon la saison et le lieu, et les événements présentés sous forme de cartes avec leurs choix.

## Le découpage en versions

- [ ] **Version 1** : les jauges, les mois et les saisons, les actions de base, la mort, l'écran de fin, la sauvegarde automatique et le tableau des scores. Déjà jouable.
- [ ] **Version 2** : les événements aléatoires et les compétences.
- [ ] **Version 3** : l'inventaire et la fabrication.
- [ ] **Version 4** : les métiers, le logement, les catégories sociales et la fiscalité.
- [ ] **Version 5** : la création d'entreprise, la famille et l'héritage.
- [ ] **Version 6** : la graine aléatoire, la méta-progression et les bonus.
- [ ] **Version 7** : finitions visuelles, sons et équilibrage.

## Points de vigilance et question ouverte

La technique ne posera pas de problème majeur. Les vrais enjeux :

- **L'équilibrage** : un jeu dur sans être injuste, ce qui demandera beaucoup de tests et de retours.
- **La quantité d'événements** : leur variété fait la richesse du genre. Des idées tirées de la réalité rendront le jeu plus juste et éviteront la caricature.

La famille et l'héritage ajoutent un troisième enjeu : si l'héritier démarre avec l'argent et le logement de ses parents, les générations suivantes risquent de devenir trop faciles. Il faudra des contrepoids (frais de succession, dettes transmises, conflits familiaux, crises économiques).

**Décision** : l'héritier conserve la position sociale de ses parents. Le contrepoids principal est la fiscalité progressive, particulièrement lourde sur la transmission (voir la section dédiée), complétée par le coût du train de vie et les crises. Les taux exacts seront ajustés pendant l'équilibrage.

|  |  |  |
| --- | --- | --- |
|  |  |  |
|  |  |  |
