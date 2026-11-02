# 12 – Langues (traduction)

Le jeu est jouable en **français, anglais, espagnol, allemand et italien**. Le
choix se fait avec les boutons de l'écran titre (en jeu : « ☰ Menu » ramène à
l'écran titre, la partie est sauvegardée). La langue est mémorisée dans le
navigateur (`localStorage`, clé `nf_langue`) ; à la première visite, c'est la
langue du navigateur si elle est disponible, sinon l'anglais.

## Comment ça marche

- Le code et les données restent **écrits en français**. Chaque texte montré au
  joueur est enveloppé dans `NF.t('texte français')`.
- `src/i18n.js`, chargé en premier, définit `NF.t`, détermine la langue
  courante (`NF.i18n.langue`) et le bouton de changement
  (`NF.i18n.changer('en')`, qui recharge la page).
- `lang/<langue>.js` contient le dictionnaire de la langue :
  `NF.i18n.dictionnaires.en = { "texte français": "translation", … }`. La clé
  est le texte français **exact** tel qu'il apparaît dans `NF.t(...)`.
- Un texte absent du dictionnaire s'affiche en français : rien ne casse quand
  on ajoute du contenu. Dans la console, `Object.keys(NF.i18n.manquants)` liste
  les textes non traduits rencontrés pendant la session.
- Les données (`data/`) sont traduites au chargement de la page
  (`nom: NF.t('Faire la manche')`), d'où le rechargement quand on change de
  langue. Le journal d'une partie garde les lignes dans la langue où elles ont
  été écrites ; tout le reste suit la langue choisie.

## Écrire du contenu traduisible

Écrivez vos textes en français comme avant, puis enveloppez-les :

```js
desc: NF.t('Une longue marche. Les idées s\'éclaircissent.'),
effet: function (s) {
  return NF.t('Vous remboursez ') + U.euros(m) + NF.t('. Reste : ') + U.euros(s.joueur.dette) + '.';
}
```

Les morceaux concaténés sont enveloppés **séparément** : le traducteur voit
`'Vous remboursez '` et `'. Reste : '` comme deux fragments. Gardez les
espaces de bord dans les fragments, et n'enveloppez pas les identifiants
(`'rue'`, `'bricolage'`), les classes CSS ni les clés de passifs.

Deux pièges à éviter :

- un pluriel construit en ajoutant `'s'` (`' héritier' + (n > 1 ? 's' : '')`)
  est faux dans les autres langues : prévoyez deux textes complets
  (`n > 1 ? NF.t(' héritiers possibles') : NF.t(' héritier possible')`) ;
- pour insérer un nom en minuscules dans une phrase, utilisez
  `NF.util.minuscule(nom)` plutôt que `.toLowerCase()` : en allemand, les noms
  gardent leur majuscule.

Plus simple : écrivez normalement et lancez

```bash
python outils/i18n.py envelopper
```

Le script enveloppe tous les textes affichables de `data/` et `src/` qui ne le
sont pas encore (il reconnaît majuscules, accents, mots français ; il ignore
identifiants, classes CSS, fragments SVG, prénoms). `python outils/i18n.py lister`
montre ce qu'il considère comme du texte ; les ensembles `INCLURE` / `EXCLURE`
en haut du script règlent les cas limites.

## Traduire du nouveau contenu

1. `python outils/i18n.py manquants en` liste les textes sans traduction
   anglaise (idem `es`, `de`, `it`).
2. Préparez un fichier JSON `{ "texte français": "translation", … }` (ou
   ajoutez directement les lignes dans `lang/en.js`, même format).
3. `python outils/i18n.py construire en nouveau.json` régénère `lang/en.js` :
   les traductions existantes sont conservées, les nouvelles ajoutées, les
   textes disparus du jeu retirés ; les balises HTML et symboles (`€`, `%`, `·`)
   manquants sont signalés.
4. Rechargez la page.

Si vous **modifiez** un texte français dans le code, sa clé change : la
traduction tombe (le texte s'affiche en français) jusqu'à ce que vous l'ajoutiez
sous la nouvelle clé.

## Ajouter une langue

1. Dans `src/i18n.js`, ajoutez la langue à `LANGUES` : `{ id: 'pt', nom: 'Português' }`.
2. `python outils/i18n.py extraire cles.json` écrit la liste complète des
   textes à traduire (`[{ "cle": "…", "fichier": "…" }, …]`, environ 3 500
   entrées).
3. Traduisez dans un JSON `{ "cle": "traduction" }`, puis
   `python outils/i18n.py construire pt traductions.json` crée `lang/pt.js`.
4. Ajoutez `<script src="lang/pt.js"></script>` dans `index.html` (section 0).

## Le marqueur d'échec

Dans `src/core/tour.js`, une action qui retourne un texte commençant par
« Impossible », « Il faut », « Il vous manque »… est un **échec** : les points
d'action ne sont pas dépensés. Pour que cela fonctionne dans toutes les langues
sans contraindre les traducteurs, `NF.t` préfixe la traduction de ces textes
(liste `NF.i18n.ECHEC` dans `src/i18n.js`) d'un caractère invisible
(`NF.i18n.MARQUEUR`, U+200B). Le moteur le détecte (`NF.i18n.estEchec`) et le
retire (`NF.i18n.sansMarqueur`) ; `NF.util.esc` le retire aussi, par sécurité.
Conséquence : un nouveau préfixe d'échec s'ajoute dans `NF.i18n.ECHEC`, et un
texte d'échec doit commencer par `NF.t('Impossible…')`, pas par une variable.

## Conseils de traduction

- Conservez les balises HTML, les emojis, `€`, `%`, les retours à la ligne et
  les espaces en début et fin de fragment.
- « PA » (points d'action) devient « AP » en anglais et en allemand, reste « PA »
  en espagnol et en italien.
- La jauge « Faim » est une jauge de satiété (100 = rassasié) : en anglais
  « Food », pas « Hunger ».
- Les prénoms (Camille, Sacha…) et les sigles français (RSA, APL, CAF) ne se
  traduisent pas.
- Les morceaux de noms de ville (`data/ville.js`) se traduisent librement pour
  donner des noms plausibles (« Port-Brume-sur-Mer » → « Port-Mist-on-Sea »).
