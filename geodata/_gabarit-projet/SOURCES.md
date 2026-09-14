# Sources — <nom du projet>

Une fiche par jeu de données, **remplie au moment du téléchargement**. L'URL
exacte et la licence sont introuvables six mois plus tard, et c'est précisément
au moment de publier qu'on en a besoin : le champ `attribution` du lab doit dire
la vérité.

---

## <Nom du jeu de données>

| | |
| --- | --- |
| **Fournisseur** | Données Québec / MERN / Ville de … / StatCan |
| **URL** | https://… (la page, et le lien direct si différent) |
| **Téléchargé le** | AAAA-MM-JJ |
| **Millésime** | année ou date de la donnée elle-même — pas celle du téléchargement |
| **Licence** | CC-BY 4.0 / Licence ouverte Québec / … |
| **Attribution exigée** | la formule imposée par la licence, mot pour mot |
| **Redistribution** | autorisée / interdite / dérivés seulement |
| **Fichier** | `00-brut/fournisseur/nom-original.zip` |
| **SCR d'origine** | EPSG:32187, EPSG:4326, … |

**Champs utilisés** — ceux qui comptent, avec leur signification réelle (celle
du dictionnaire de données, pas celle qu'on devine) :

- `NOM_CHAMP` — …
- `NOM_CHAMP` — …

**Limites connues** — ce que cette donnée ne dit pas, ce qu'elle approxime, ce
qui manque. C'est ce paragraphe qui nourrit le `note` du lab et la section
honnête de l'article.

---

## Vérification avant publication

- [ ] la redistribution du dérivé est permise par chaque licence ci-dessus ;
- [ ] `attribution` du lab reprend les formules exigées ;
- [ ] le millésime apparaît dans l'entrée — une carte sans date ment par omission ;
- [ ] aucune donnée personnelle ni adresse précise dans l'export.
