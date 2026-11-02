# -*- coding: utf-8 -*-
"""
Outil de traduction de Nouvelle Fortune (Python 3, aucune dépendance).

Le jeu est écrit en français. Chaque texte affiché est enveloppé dans
NF.t('texte français') ; au chargement, NF.t cherche la traduction dans
lang/<langue>.js et retombe sur le français si elle manque. Ce script
sert à retrouver tous les textes et à vérifier les dictionnaires.

Commandes (à lancer depuis la racine du projet) :

  python outils/i18n.py lister
      Compte les textes affichables par fichier (déjà enveloppés ou non)
      et signale les textes courts à vérifier.

  python outils/i18n.py envelopper
      Enveloppe dans NF.t(...) tous les textes affichables de data/ et src/
      qui ne le sont pas encore. À relancer après avoir ajouté du contenu.

  python outils/i18n.py extraire cles.json
      Écrit la liste des textes français (clés) dans un fichier JSON :
      [ { "cle": "…", "fichier": "data/actions.js" }, … ]

  python outils/i18n.py manquants en
      Liste les textes sans traduction dans lang/en.js.

  python outils/i18n.py construire en traductions.json
      Régénère lang/en.js : traductions déjà présentes dans lang/en.js,
      complétées ou remplacées par celles des fichiers JSON donnés
      ({ "texte français": "translation" }, plusieurs fichiers possibles).
      Les textes qui n'existent plus dans le jeu sont retirés ; les balises
      HTML et les symboles modifiés sont signalés.

  python outils/i18n.py nettoyer
      Retire NF.t(...) autour des littéraux qui ne sont pas du texte affiché
      (après un changement des règles ci-dessous).
"""
import io
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIERS = ['data', 'src']
EXCLUS = {'src/i18n.js', 'src/core/rng.js'}          # jamais de texte affiché
LANGUES = ['en', 'es', 'de', 'it']

MOTS_CLES_REGEX = ('return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw')
AVANT_EXCLUS = ('case', '===', '!==', '==', '!=', 'getItem(', 'setItem(', 'removeItem(', 'getElementById(',
                'querySelector(', 'querySelectorAll(', 'createElement(', 'setAttribute(', 'getAttribute(',
                'addEventListener(', 'removeEventListener(', 'indexOf(', 'split(', 'RegExp(', 'toLocaleDateString(',
                'toLocaleString(', 'classList.add(', 'classList.remove(', 'classList.toggle(', 'NF.t(', 'matchMedia(',
                'localStorage[', 'charAt(', 'startsWith(', 'endsWith(', 'test(', 'match(')
LETTRE = re.compile(r'[A-Za-zÀ-ÖØ-öø-ÿ]')
ACCENT = re.compile(r'[À-ÖØ-öø-ÿ]')
MAJUSCULE = re.compile(r'[A-ZÀ-Ö]')
BALISE = re.compile(r'<[^>]*>|&[#\w]+;')
CODE_LANGUE = re.compile(r'^[A-Za-z]{2}-[A-Za-z]{2}$')
CAMEL = re.compile(r'^[a-z]+(?:[A-Z][a-z0-9]*)+$')                 # usureMoral, depensesFixes
COULEUR = re.compile(r'^#[0-9A-Fa-f]{3,8}$')
TRACE_SVG = re.compile(r'^\s*(?:[MLHVCSQTAZmlhvcsqtaz][\s\-0-9.,]*)+$')   # données de chemin SVG ('M10 20 l-4 8')
PROPRIETE_CSS = re.compile(r'[a-z]:[^ ]*$')                        # 'background:' / 's;animation-delay:-'
TECHNIQUE = re.compile(r'^\s*(?:rgba?\(|hsla?\(|url\(|::[a-z]|[.#][A-Za-z][\w-]*$|\[[a-z][\w-]*[=\]])')  # couleurs CSS, sélecteurs ('.chip', '#app', '[data-act]')
ID_SIMPLE = re.compile(r'^[a-z0-9_]+$')
# Petits mots qui trahissent une phrase française écrite en minuscules
MOTS_FR = set('''de du des la le les l un une et ou à en dans pour par sur au aux ce cet cette ces pas plus sans
avec vous votre vos il elle on ne que qui est a mois ans an niveau faim total net place places xp points pts
jour jours heures euros enfants dettes charges prime oui non aucun aucune judiciaire possible requise requis
insuffisante insuffisant indisponible inconnu inconnue manque rapporte liquide max'''.split())
# Mots qui ne sont que des classes CSS ou des attributs (jamais traduits)
CSS = set('''actif inactive vide ok manque selectionnee disabled selected checked muted petit bon mauvais accent
droite cachee bleu gros large total chip btn onglet carte stat jauge espace ligne etiquette badge delta val
choix panneau champ flex none block tres-petit grille-cartes btn-petit btn-principal btn-danger echec'''.split())
# Textes à traduire que les règles ne détectent pas / faux positifs à ignorer (valeur exacte)
INCLURE = {'janvier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'septembre', 'octobre', 'novembre'}
EXCLURE = {'application/json', 'nouvelle-fortune-sauvegarde.json'}


def contenu_texte(valeur):
    """Texte lisible d'un littéral : sans balises HTML (même incomplètes) ni attributs."""
    t = re.sub(r'<[^<>]*>', ' ', valeur)        # balises complètes
    t = re.sub(r'<[^<>]*$', ' ', t)             # balise ouverte en fin de chaîne
    t = re.sub(r'^[^<>]*>', ' ', t)             # fin de balise en début de chaîne
    t = re.sub(r'&[#\w]+;', ' ', t)             # entités
    t = re.sub(r'[\w-]+="[^"]*"?', ' ', t)      # attributs restants (class="x" ou class=" en fin)
    return t.replace('"', ' ')


def fichiers_js():
    res = []
    for d in DOSSIERS:
        for dossier, _, noms in os.walk(os.path.join(RACINE, d)):
            for n in sorted(noms):
                if n.endswith('.js'):
                    rel = os.path.relpath(os.path.join(dossier, n), RACINE).replace(os.sep, '/')
                    if rel not in EXCLUS:
                        res.append(rel)
    return sorted(res)


def lire(rel):
    with io.open(os.path.join(RACINE, rel), encoding='utf-8', newline='') as f:
        return f.read()


def ecrire(rel, contenu):
    with io.open(os.path.join(RACINE, rel), 'w', encoding='utf-8', newline='') as f:
        f.write(contenu)


def desechapper(brut):
    """Valeur JavaScript d'un littéral entre apostrophes (sans les apostrophes)."""
    out, i = [], 0
    while i < len(brut):
        c = brut[i]
        if c == '\\' and i + 1 < len(brut):
            n = brut[i + 1]
            if n == 'n': out.append('\n'); i += 2
            elif n == 't': out.append('\t'); i += 2
            elif n == 'r': out.append('\r'); i += 2
            elif n == 'u' and i + 5 < len(brut): out.append(chr(int(brut[i + 2:i + 6], 16))); i += 6
            elif n == 'x' and i + 3 < len(brut): out.append(chr(int(brut[i + 2:i + 4], 16))); i += 4
            else: out.append(n); i += 2
        else:
            out.append(c); i += 1
    return ''.join(out)


def tokens_chaines(src):
    """Retourne les littéraux entre apostrophes hors commentaires et regex :
    liste de (debut, fin, brut) ; `brut` est le texte entre les apostrophes."""
    res = []
    i, n = 0, len(src)
    dernier = ''          # dernier caractère significatif (pour distinguer regex et division)
    dernier_mot = ''
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c == "'":
            j = i + 1
            while j < n and src[j] != "'":
                if src[j] == '\\': j += 1
                j += 1
            res.append((i, j + 1, src[i + 1:j]))
            i = j + 1
            dernier = "'"; dernier_mot = ''
            continue
        if c == '"' or c == '`':
            q = c
            j = i + 1
            while j < n and src[j] != q:
                if src[j] == '\\': j += 1
                j += 1
            i = j + 1
            dernier = q; dernier_mot = ''
            continue
        if c == '/':
            regex = dernier in ('', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^') or dernier_mot in MOTS_CLES_REGEX
            if regex:
                j = i + 1
                classe = False
                while j < n:
                    ch = src[j]
                    if ch == '\\': j += 2; continue
                    if ch == '\n': break
                    if classe:
                        if ch == ']': classe = False
                    elif ch == '[': classe = True
                    elif ch == '/': break
                    j += 1
                j += 1
                while j < n and src[j].isalpha(): j += 1
                i = j
                dernier = '/'; dernier_mot = ''
                continue
        if c.isalnum() or c == '_' or c == '$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'): j += 1
            dernier_mot = src[i:j]
            dernier = src[j - 1]
            i = j
            continue
        if not c.isspace():
            dernier = c; dernier_mot = ''
        i += 1
    return res


def est_affichable(valeur, avant, apres, rel):
    """Décide si un littéral est un texte montré au joueur (à traduire).
    `avant` / `apres` : le code source autour du littéral."""
    if valeur in EXCLURE:
        return False
    if valeur in INCLURE:
        return True
    contenu = contenu_texte(valeur)
    if not LETTRE.search(contenu):
        return False
    av = avant.rstrip()
    if av.endswith('NF.t('):
        return False
    for ex in AVANT_EXCLUS:
        if av.endswith(ex):
            return False
    if CODE_LANGUE.match(valeur) or CAMEL.match(valeur) or COULEUR.match(valeur) or TECHNIQUE.match(valeur):
        return False
    if TRACE_SVG.match(contenu) and re.search(r'\d', contenu):
        return False
    if PROPRIETE_CSS.search(contenu) and ' :' not in contenu:
        return False                                 # propriété CSS (le français met une espace avant « : »)
    if rel == 'data/noms.js':
        return len(valeur) > 30                      # seuls les textes d'origine, pas les prénoms
    if av.endswith('push('):
        return True                                  # raisons affichées (verifierConditions)
    if ID_SIMPLE.match(valeur):
        return False                                 # identifiant : 'abri_carton'
    if MAJUSCULE.search(contenu) or ACCENT.search(valeur):
        return True
    # Texte tout en minuscules sans accent : phrase française ou fragment technique ?
    mots = re.findall(r"[a-z][a-z'-]*", contenu)
    if any(m in MOTS_FR for m in mots):
        return True
    if all(m in CSS or '-' in m for m in mots) or re.match(r'^[a-z]+/[a-z]+$', valeur):
        return False                                 # classes CSS, types MIME
    if len(mots) >= 2:
        return True                                  # 'plan social', "agent d'entretien"
    concat = av.endswith(('+', '?', ':')) or apres.lstrip().startswith('+')
    if concat and not ID_SIMPLE.match(valeur):
        return True                                  # morceau de phrase : ' pour ', '/mois', ' · cuisine'
    return False


def textes(rel, src=None):
    """Liste de (debut, fin, brut, valeur, deja_enveloppe) pour les textes affichables."""
    src = lire(rel) if src is None else src
    res = []
    for debut, fin, brut in tokens_chaines(src):
        avant = src[max(0, debut - 60):debut]
        apres = src[fin:fin + 40]
        deja = avant.rstrip().endswith('NF.t(')
        if deja or est_affichable(desechapper(brut), avant, apres, rel):
            res.append((debut, fin, brut, desechapper(brut), deja))
    return res


def cmd_lister():
    total, chars = 0, 0
    courts = []
    for rel in fichiers_js():
        t = textes(rel)
        nb = len(t); ch = sum(len(x[3]) for x in t)
        env = sum(1 for x in t if x[4])
        total += nb; chars += ch
        print('%-36s %4d textes (%4d enveloppés) %7d caractères' % (rel, nb, env, ch))
        for x in t:
            if ' ' not in x[3] and len(x[3]) < 25:
                courts.append((rel, x[3]))
    print('TOTAL %d textes, %d caractères' % (total, chars))
    print('\nTextes courts sans espace (vérifier qu\'ils sont bien à traduire) :')
    for rel, v in courts:
        print('  %-30s %r' % (rel, v))


def cmd_envelopper():
    for rel in fichiers_js():
        src = lire(rel)
        t = [x for x in textes(rel, src) if not x[4]]
        if not t:
            continue
        morceaux, pos = [], 0
        for debut, fin, brut, valeur, deja in t:
            morceaux.append(src[pos:debut])
            morceaux.append("NF.t('" + brut + "')")
            pos = fin
        morceaux.append(src[pos:])
        ecrire(rel, ''.join(morceaux))
        print('%-36s %4d textes enveloppés' % (rel, len(t)))


def cmd_nettoyer():
    """Retire NF.t(...) autour des littéraux que les règles ne considèrent plus comme du texte."""
    for rel in fichiers_js():
        src = lire(rel)
        morceaux, pos, nb = [], 0, 0
        for debut, fin, brut in tokens_chaines(src):
            avant = src[max(0, debut - 60):debut]
            if not avant.rstrip().endswith('NF.t(') or not src[fin:fin + 1] == ')':
                continue
            sans = avant.rstrip()[:-5]
            if est_affichable(desechapper(brut), sans, src[fin + 1:fin + 41], rel):
                continue
            d0 = debut - (len(avant) - len(avant.rstrip())) - 5
            morceaux.append(src[pos:d0]); morceaux.append("'" + brut + "'"); pos = fin + 1; nb += 1
        if nb:
            morceaux.append(src[pos:]); ecrire(rel, ''.join(morceaux))
            print('%-36s %4d enveloppes retirées' % (rel, nb))


def cles():
    """Liste ordonnée de (cle, fichier) sans doublon."""
    vus, res = set(), []
    for rel in fichiers_js():
        for x in textes(rel):
            if x[3] not in vus:
                vus.add(x[3]); res.append((x[3], rel))
    return res


def cmd_extraire(sortie):
    liste = [{'cle': k, 'fichier': f} for k, f in cles()]
    with io.open(sortie, 'w', encoding='utf-8') as f:
        json.dump(liste, f, ensure_ascii=False, indent=0)
    print('%d clés écrites dans %s' % (len(liste), sortie))


def charger_dictionnaire(langue):
    rel = 'lang/%s.js' % langue
    chemin = os.path.join(RACINE, rel)
    if not os.path.exists(chemin):
        return {}
    d = {}
    ligne_re = re.compile(r'^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*,?\s*$')
    for ligne in lire(rel).split('\n'):
        m = ligne_re.match(ligne)
        if m:
            d[json.loads(m.group(1))] = json.loads(m.group(2))
    return d


def cmd_manquants(langue):
    d = charger_dictionnaire(langue)
    manque = [(k, f) for k, f in cles() if k not in d]
    for k, f in manque:
        print('%-30s %s' % (f, json.dumps(k, ensure_ascii=False)))
    print('%d texte(s) sans traduction en %s (sur %d)' % (len(manque), langue, len(cles())))


def verifier_traduction(cle, trad):
    """Retourne une liste d'avertissements si des éléments techniques ont disparu."""
    avert = []
    for motif, nom in ((r'<[^>]*>', 'balise HTML'), (r'&[#\w]+;', 'entité HTML'), (r'\{\d+\}', 'paramètre')):
        a, b = re.findall(motif, cle), re.findall(motif, trad)
        if sorted(a) != sorted(b):
            avert.append(nom + ' modifié(e)')
    for sym in ('€', '%', '→', '\n'):
        if cle.count(sym) != trad.count(sym):
            avert.append('symbole %r' % sym)
    if cle.startswith('​'):
        avert.append('marqueur')
    return avert


def cmd_construire(langue, fichiers_json):
    trads = charger_dictionnaire(langue)             # on garde les traductions déjà présentes
    for fj in fichiers_json:
        with io.open(fj, encoding='utf-8') as f:
            trads.update(json.load(f))
    liste = cles()
    manque, avert = 0, 0
    lignes = ['/* =====================================================================',
              ' * TRADUCTIONS : %s' % langue.upper(),
              ' * ---------------------------------------------------------------------',
              ' * Généré par outils/i18n.py. Clé = texte français exact (tel qu\'il',
              ' * apparaît dans NF.t(...)), valeur = traduction. Un texte absent ici',
              ' * s\'affiche en français. Gardez les balises HTML et les symboles.',
              ' * ===================================================================== */',
              'NF.i18n.dictionnaires.%s = {' % langue]
    fichier_courant = None
    for k, f in liste:
        if k not in trads:
            manque += 1
            continue
        if f != fichier_courant:
            lignes.append('')
            lignes.append('  /* ----- %s ----- */' % f)
            fichier_courant = f
        for a in verifier_traduction(k, trads[k]):
            avert += 1
            print('AVERTISSEMENT %s : %s' % (json.dumps(k, ensure_ascii=False)[:60], a))
        lignes.append('  %s: %s,' % (json.dumps(k, ensure_ascii=False), json.dumps(trads[k], ensure_ascii=False)))
    lignes.append('};')
    lignes.append('')
    os.makedirs(os.path.join(RACINE, 'lang'), exist_ok=True)
    ecrire('lang/%s.js' % langue, '\n'.join(lignes))
    print('lang/%s.js : %d traductions, %d manquante(s), %d avertissement(s)' % (langue, len(liste) - manque, manque, avert))


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(0)
    cmd = args[0]
    if cmd == 'lister': cmd_lister()
    elif cmd == 'envelopper': cmd_envelopper()
    elif cmd == 'nettoyer': cmd_nettoyer()
    elif cmd == 'extraire': cmd_extraire(args[1])
    elif cmd == 'manquants': cmd_manquants(args[1])
    elif cmd == 'construire': cmd_construire(args[1], args[2:])
    else: print(__doc__)
