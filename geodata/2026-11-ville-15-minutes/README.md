# Gabarit de projet

Copier ce dossier pour démarrer. Sous Windows :

```powershell
Copy-Item geodata\_gabarit-projet geodata\2026-01-mon-sujet -Recurse
```

Puis, dans l'ordre :

1. renommer le dossier en `AAAA-MM-sujet` — le `sujet` est le même mot-clé que
   l'identifiant du lab et le nom de l'entrée ;
2. remplir l'en-tête de `SOURCES.md` et `JOURNAL.md` ;
3. déposer les téléchargements dans `00-brut/`, **sans les ouvrir ni les
   modifier**, et remplir leur fiche dans `SOURCES.md` dans la foulée ;
4. travailler dans `10-travail/`, projet dans `20-sig/` ;
5. exporter dans `30-export/` sous un nom déjà versionné : `sujet-v1.geojson`.

Le mode d'emploi complet — les cinq étages, les conventions de nommage, la
frontière avec le site — est dans `geodata/README.md`.

Les fichiers `LISEZ-MOI.md` de chaque sous-dossier rappellent la règle de
l'étage. Ils peuvent rester : ils ne pèsent rien et servent de garde-fou.
