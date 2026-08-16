import { isCategory, type Category, type EntryMeta } from "./entries";

/**
 * Lecture et application des filtres du carnet.
 *
 * Séparé des composants parce que c'est la seule chose ici qui puisse être
 * fausse sans que ça se voie : une catégorie inconnue dans l'URL, un accent
 * mal comparé, un paramètre répété. Le rendu, lui, se juge à l'œil.
 *
 * Les paramètres inconnus sont ignorés plutôt que refusés. Une URL bricolée à
 * la main, un vieux lien, un robot qui invente : rien de tout cela ne doit
 * produire une erreur. Au pire, on retombe sur la liste complète.
 */

/** Ce que Next.js passe dans `searchParams` : une valeur, plusieurs, ou rien. */
export type SearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Familles retenues dans l'URL. Les valeurs inconnues tombent, et les doublons
 * aussi : `?category=gis&category=gis` vaut `?category=gis`.
 */
export function readCategories(
  params: SearchParams,
  key: string,
): Category[] {
  return [...new Set(toArray(params[key]).filter(isCategory))];
}

export function readSearch(params: SearchParams, key: string): string {
  const [first = ""] = toArray(params[key]);
  return first.trim();
}

/**
 * Normalise pour comparer : minuscules et accents retirés.
 *
 * Sans ça, chercher « geodatabase » ne trouverait pas « géodatabase », ce qui
 * est précisément le genre de mot qu'on tape sans accent.
 *
 * `NFD` sépare chaque lettre accentuée en deux points de code — la lettre nue,
 * puis son accent — et on jette les seconds. Le tri se fait par code plutôt
 * que par expression régulière : la classe de caractères correspondante
 * s'écrit avec des échappements que plus d'un outil de la chaîne (éditeur,
 * script de correction, encodage du fichier) a déjà mangés en route, laissant
 * un motif qui ne correspond à rien et une recherche muette.
 */
const DIACRITIC_START = 0x0300;
const DIACRITIC_END = 0x036f;

function fold(text: string): string {
  let out = "";
  for (const char of text.normalize("NFD")) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= DIACRITIC_START && code <= DIACRITIC_END) continue;
    out += char;
  }
  return out.toLowerCase();
}

/**
 * Applique familles et recherche.
 *
 * Les familles se combinent en OU — plusieurs cases cochées élargissent la
 * liste. La recherche, elle, se combine en ET : elle restreint ce que les
 * familles ont retenu, ce qui correspond à ce qu'on attend en tapant un mot
 * après avoir choisi une famille.
 *
 * La recherche porte sur le titre, le résumé et les outils. Pas sur le corps
 * de l'entrée : il n'est pas chargé ici, et l'y inclure demanderait de lire
 * tous les fichiers à chaque frappe.
 */
export function filterEntries(
  entries: EntryMeta[],
  categories: Category[],
  search: string,
): EntryMeta[] {
  const needle = fold(search);

  return entries.filter((entry) => {
    if (categories.length > 0 && !categories.includes(entry.category)) {
      return false;
    }
    if (!needle) return true;

    const haystack = fold(
      `${entry.title} ${entry.description} ${entry.tools.join(" ")}`,
    );
    return haystack.includes(needle);
  });
}
