# Yummy

Application web familiale : livre de recettes, menu de la semaine (midi et soir) et liste de courses partagée, avec les calories et macros calculées à partir de la table de composition nutritionnelle Ciqual de l’ANSES.

Elle s’utilise dans un navigateur et s’installe sur iPhone comme une app (Safari, Partager, « Sur l’écran d’accueil »).

## Fonctionnement

- Ce dépôt (public) ne contient que le code de l’application, servi par GitHub Pages. Il ne contient aucune donnée de la famille.
- Les données (recettes, menus, listes) vivent dans un dépôt **privé** séparé, au format JSON :
  - `data/recettes.json`
  - `data/planning.json`
  - `data/courses.json`
- L’app lit et écrit ces fichiers avec l’API GitHub, grâce à une clé d’accès (« fine-grained personal access token ») limitée à ce seul dépôt privé, droit « Contents : Read and write ». La clé est saisie une fois par appareil et reste dans le navigateur.
- Chaque modification est affichée tout de suite, gardée en attente si le réseau manque, puis envoyée. Si deux personnes modifient la même chose en même temps, l’app relit la dernière version et rejoue la modification.
- Un service worker garde l’app disponible hors ligne (pratique au magasin).

## Arborescence

```
index.html, manifest.webmanifest, sw.js
css/app.css
js/app.js            routes et écran principal
js/store.js          état, cache local, synchronisation
js/github.js         accès à l’API GitHub
js/nutrition.js      macros et liste de courses (rayons)
js/md.js             rendu Markdown des étapes
js/views/            écrans : semaine, recettes, courses, édition, réglages
js/vendor/           Preact + htm (sans étape de compilation)
data/aliments.json   valeurs nutritionnelles pour 100 g
fonts/, icons/
```

Pas de compilation : les fichiers sont servis tels quels.

## Crédits

- Valeurs nutritionnelles : ANSES, table de composition nutritionnelle des aliments Ciqual (Licence Ouverte).
- Police : Sofia Sans, par Lettersoup (SIL Open Font License, voir `fonts/LICENSE-OFL.txt`).
- [Preact](https://preactjs.com) (MIT) et [htm](https://github.com/developit/htm) (Apache-2.0).
