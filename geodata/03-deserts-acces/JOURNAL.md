# Journal — <nom du projet>

Ce qui a été fait, et **pourquoi**. Les gestes se retrouvent dans les fichiers ;
les décisions, non. C'est ici qu'on écrit les secondes.

Ce journal est la matière première de l'article : la section « ce qu'on a
supposé » s'écrit toute seule quand les hypothèses ont été notées au moment où
on les prenait.

---

## Question de départ

Ce que la carte doit montrer, en une phrase. Si elle ne tient pas en une phrase,
le projet n'est pas encore cadré.

## Zone d'étude et SCR

- **Emprise** : …
- **SCR de travail** : EPSG:2949 (MTM fuseau 7) — projeté, pour que les mesures
  de distance et de surface aient un sens ;
- **SCR de sortie** : EPSG:4326 — imposé par MapLibre.

Travailler en géographique fausse toute mesure. Reprojeter en entrée, une fois,
et n'en sortir qu'à l'export.

---

## AAAA-MM-JJ

**Fait** — …

**Pourquoi** — …

**Hypothèse posée** — ce qu'on a décidé faute de mieux, et ce que ça coûte si
c'est faux.

**À vérifier** — …

---

## Décisions structurantes

À reprendre presque telles quelles dans l'article :

| Décision | Raison | Conséquence si elle est fausse |
| --- | --- | --- |
| Tampon de 500 m plutôt que réseau réel | pas de données de voirie complètes | surestime l'accessibilité en zone coupée par une rivière |
| | | |

## Contrôles qualité

- [ ] géométries valides (Vecteur ▸ Outils de géométrie ▸ Vérifier la validité) ;
- [ ] pas de doublons ni d'entités vides ;
- [ ] SCR déclaré = SCR réel (superposer à un fond connu) ;
- [ ] totaux recoupés avec une source indépendante ;
- [ ] ordres de grandeur plausibles — une surface en m² au lieu de km² se voit
      tout de suite.
