# 01 – Prise en main

## Lancer le jeu en local

Double-cliquez sur `index.html`. Le jeu n'a besoin d'aucun serveur : tous les
scripts sont chargés par de simples balises `<script>`.

Si vous préférez un vrai serveur (par exemple pour tester sur votre téléphone
connecté au même réseau), un petit serveur PowerShell est fourni :

```
powershell -ExecutionPolicy Bypass -File outils\serveur-local.ps1 8765
```

puis ouvrez <http://localhost:8765/>. `Ctrl+C` pour l'arrêter. N'importe quel
autre serveur statique fonctionne aussi (`python -m http.server`, l'extension
« Live Server » de VS Code, `npx serve`…).

## Mettre le jeu sur internet

Le jeu est un site statique : il suffit de copier le dossier complet sur un
hébergement.

- **GitHub Pages** : créez un dépôt, déposez les fichiers à la racine, activez
  Pages dans les réglages du dépôt (branche `main`, dossier `/`). L'adresse est
  `https://<utilisateur>.github.io/<depot>/`.
- **Netlify / Vercel / Cloudflare Pages** : glissez-déposez le dossier. Aucune
  commande de build : laissez le champ vide, dossier de publication `/`.
- **Hébergement classique (OVH, o2switch, serveur Apache/nginx)** : copiez le
  dossier par FTP dans `www/` ou `public_html/`.

Fichiers nécessaires en ligne : `index.html`, `css/`, `src/`, `data/`. Les
dossiers `docs/` et `outils/` peuvent être laissés ou retirés.

Les sauvegardes restent dans le navigateur du joueur (localStorage). Il n'y a
pas de serveur de scores partagé ; le tableau des meilleures lignées est local.
Un classement en ligne demanderait un petit service côté serveur (hors du
périmètre de cette version).

## Mettre à jour le jeu en ligne

Remplacez les fichiers modifiés. Le navigateur peut garder une vieille version
en cache : demandez aux joueurs un rechargement forcé (`Ctrl+F5`). Les
sauvegardes restent compatibles tant que vous ne renommez pas les `id` déjà
utilisés (objets, métiers, logements, événements programmés).

## Dépanner

- **Page blanche ou message « Erreur au démarrage »** : ouvrez la console du
  navigateur (F12 → Console). La première ligne rouge donne le fichier et la
  ligne fautive. Neuf fois sur dix : une virgule ou une accolade manquante dans
  un fichier de `data/`.
- **« Événement en double : … »** dans la console : deux événements ont le même
  `id`. Le second est ignoré.
- **Un événement ne se déclenche jamais** : vérifiez ses `conditions`
  (voir `03-evenements.md`), son `poids`, et qu'il n'a pas `force: true`.
- **Un métier n'apparaît pas** : l'onglet Emploi filtre par défaut sur
  « Accessibles » ; cliquez « Tous les métiers » pour voir les prérequis manquants.
- **Repartir de zéro** : écran titre → « Effacer toute la progression », ou
  supprimez les clés `nf_partie`, `nf_meta`, `nf_scores` du localStorage.
