/**
 * Portée sous le curseur : un parcours de graphe (Dijkstra) fait dans le
 * navigateur, peint dans une grille de cellules.
 *
 * POURQUOI ICI ET PAS EN PRÉCALCUL — la tache suit le curseur point par point.
 * La précalculer demanderait une tache par position possible : des milliers,
 * pour un résultat qui se recalcule en quelques dizaines de millisecondes. Le
 * site sert donc le graphe (`scripts/analysis/velo-quebec-levis-08-…`), et le
 * calcul se fait à la visite. C'est l'exception à la règle « si un calcul peut
 * se faire avant, il ne se fait pas en visite » : ici, il ne peut pas.
 *
 * Aucune dépendance, aucun import de MapLibre : ce module calcule et remplit un
 * tableau de pixels, `LabMap` se charge de l'afficher.
 */

export type ReachGraph = {
  grille: {
    ouest: number;
    dlon: number;
    y_nord: number;
    dy: number;
    colonnes: number;
    lignes: number;
    coins: [number, number][];
  };
  /** Cellule de chaque nœud. */
  px: number[];
  /** Arêtes à plat : u, v, dixièmes de minute u→v, v→u, drapeaux. */
  e: number[];
  scenarios: Record<string, { masque: number; remplace?: [number, number, number][] }>;
  /** Cellules de terre ferme, en plages [début, longueur, …]. */
  terre?: number[];
};

/** Noms des voies : dictionnaire, et indice du nom de chaque arête. */
export type ReachNames = { noms: string[]; arete: number[] };

/** Noms génériques, donnés aux voies sans nom : un nom propre leur est préféré. */
const GENERIQUES = new Set(["Rue sans nom", "Piste cyclable", "Sentier", "Trottoir ou passage piéton"]);

/** Un palier de couleur : jusqu'à `max` minutes. */
export type ReachBand = { max: number; rgba: [number, number, number, number] };

type Csr = { debut: Int32Array; vers: Int32Array; poids: Int32Array; arete: Int32Array };

/** Rayon de recherche du nœud de départ autour du curseur, en cellules. */
const ACCROCHE = 3;

/**
 * Rayon de la zone peinte autour de chaque nœud atteint, en cellules (≈ 200 m).
 *
 * Un nœud n'est qu'un point du réseau : la cellule voisine, entre deux rues,
 * est à une minute de marche de lui. Sans ce disque, la tache serait un semis
 * de points le long des rues.
 */
const RAYON = 2;

/** Rayon et nombre de passes du flou du bord, en cellules. */
const FLOU = 2;
const PASSES = 2;

/**
 * Marge (cellules) autour de la tache pour la ZONE de travail. Le bouchage,
 * le flou, les surfaces et la peinture ne parcourent que ce rectangle, pas
 * toute la grille (214 000 cellules, quelques milliers pour une tache) : 20 à
 * 30 fois moins de calcul à chaque mouvement du curseur.
 *
 * Résultat IDENTIQUE à la grille entière, parce que la marge est vide et le
 * reste vide pendant tout le calcul : le flou ne s'étend que de
 * FLOU × PASSES = 4 cellules, le bord de la zone reste à 0 ; et toute cellule
 * vide reliée au bord de la grille l'est par le bord de la zone (hors de la
 * zone, tout est vide). Vérifié pixel à pixel contre l'ancienne version.
 */
const MARGE = 2 * FLOU * PASSES + 2;

/** Décalages (dl, dc) du disque de rayon `RAYON`. */
const DISQUE: Array<[number, number]> = [];
for (let dl = -RAYON; dl <= RAYON; dl++) {
  for (let dc = -RAYON; dc <= RAYON; dc++) {
    if (dl * dl + dc * dc <= RAYON * RAYON + RAYON) DISQUE.push([dl, dc]);
  }
}

export class ReachEngine {
  readonly g: ReachGraph;
  readonly n: number;
  private csr = new Map<string, Csr>();
  /** Nœuds de chaque cellule, pour trouver le départ sous le curseur. */
  private parCellule = new Map<number, number[]>();
  private dist: Int32Array;
  /** Pour l'itinéraire : l'entrée CSR par laquelle on arrive à chaque nœud. */
  private predK: Int32Array;
  private tas: Int32Array;
  private tasCle: Int32Array;
  private pixelMin: Int32Array;
  private masque: Float32Array;
  private tampon: Float32Array;
  private file: Int32Array;
  private dehors: Uint8Array;
  /** 1 = terre ferme. Sans masque dans le graphe, tout compte comme terre. */
  private terre: Uint8Array;
  /** Le dernier parcours : scénario, facteur et budget, pour `parcourues()`. */
  private dernier: { scenario: string; facteur: number; budget: number } | null = null;
  /** Part de chaque arête parcourue depuis son nœud u, puis depuis v. */
  private partU: Float32Array;
  private partV: Float32Array;
  /**
   * Zone de travail du dernier parcours : le rectangle de la tache, élargi de
   * MARGE et borné à la grille (colonnes c0..c1, lignes l0..l1, inclus) ;
   * null si rien n'est atteint. Hors de la zone, `masque` et `tampon`
   * peuvent garder des restes d'un parcours précédent : ils ne sont jamais lus.
   */
  private zone: { c0: number; c1: number; l0: number; l1: number } | null = null;

  constructor(g: ReachGraph) {
    this.g = g;
    this.n = g.px.length;
    g.px.forEach((c, i) => {
      const liste = this.parCellule.get(c);
      if (liste) liste.push(i);
      else this.parCellule.set(c, [i]);
    });
    this.dist = new Int32Array(this.n);
    this.predK = new Int32Array(this.n);
    // Un nœud peut entrer plusieurs fois dans le tas (pas de « diminuer la
    // clé ») : on dimensionne sur le nombre d'arêtes, pas de nœuds.
    const m = g.e.length / 5;
    this.tas = new Int32Array(2 * m + 16);
    this.tasCle = new Int32Array(2 * m + 16);
    const n = g.grille.colonnes * g.grille.lignes;
    this.pixelMin = new Int32Array(n);
    this.masque = new Float32Array(n);
    this.tampon = new Float32Array(n);
    this.file = new Int32Array(n);
    this.dehors = new Uint8Array(n);
    this.terre = new Uint8Array(n);
    this.partU = new Float32Array(m);
    this.partV = new Float32Array(m);
    if (g.terre) {
      for (let i = 0; i < g.terre.length; i += 2) {
        this.terre.fill(1, g.terre[i], g.terre[i] + g.terre[i + 1]);
      }
    } else {
      this.terre.fill(1);
    }
  }

  /**
   * Le nom de la voie au point de départ : parmi les arêtes du nœud, un nom
   * propre plutôt qu'un générique (« Rue sans nom »).
   */
  nomDepart(source: number, scenario: string, noms: ReachNames | null): string | null {
    if (source < 0 || !noms) return null;
    const { debut, arete } = this.graphe(scenario);
    let generique: string | null = null;
    for (let k = debut[source]; k < debut[source + 1]; k++) {
      const nom = noms.noms[noms.arete[arete[k]]];
      if (!nom) continue;
      if (!GENERIQUES.has(nom)) return nom;
      generique ??= nom;
    }
    return generique;
  }

  /**
   * Bouche les trous : toute cellule vide qu'on ne peut pas rejoindre depuis
   * le bord de la grille sans traverser la tache est enclavée — un parc, un
   * îlot sans rue au milieu d'un quartier atteint. Elle est remplie.
   *
   * Le fleuve, lui, touche le bord de la grille : il reste vide.
   */
  private boucher(m: Float32Array): void {
    // Dans la ZONE seulement : son bord est vide et relié au dehors (voir
    // MARGE), il tient lieu de bord de la grille.
    const z = this.zone;
    if (!z) return;
    const { colonnes: w } = this.g.grille;
    const dehors = this.dehors;
    const file = this.file;
    for (let l = z.l0; l <= z.l1; l++) dehors.fill(0, l * w + z.c0, l * w + z.c1 + 1);
    let debut = 0;
    let fin = 0;
    const entrer = (p: number) => {
      if (m[p] === 0 && !dehors[p]) {
        dehors[p] = 1;
        file[fin++] = p;
      }
    };
    for (let c = z.c0; c <= z.c1; c++) {
      entrer(z.l0 * w + c);
      entrer(z.l1 * w + c);
    }
    for (let l = z.l0; l <= z.l1; l++) {
      entrer(l * w + z.c0);
      entrer(l * w + z.c1);
    }
    while (debut < fin) {
      const p = file[debut++];
      const c = p % w;
      const l = (p - c) / w;
      if (c > z.c0) entrer(p - 1);
      if (c < z.c1) entrer(p + 1);
      if (l > z.l0) entrer(p - w);
      if (l < z.l1) entrer(p + w);
    }
    for (let l = z.l0; l <= z.l1; l++) {
      for (let p = l * w + z.c0, fin2 = l * w + z.c1; p <= fin2; p++) if (!dehors[p]) m[p] = 1;
    }
  }

  /**
   * Flou en boîte séparable, répété : une approximation de gaussienne. Dans
   * la ZONE seulement, bornes de la zone tenant lieu de bords de la grille.
   */
  private flouter(m: Float32Array): void {
    const z = this.zone;
    if (!z) return;
    const { colonnes: w } = this.g.grille;
    const t = this.tampon;
    const largeur = 2 * FLOU + 1;
    for (let passe = 0; passe < PASSES; passe++) {
      for (let l = z.l0; l <= z.l1; l++) {
        const base = l * w;
        let somme = 0;
        for (let c = z.c0 - FLOU; c <= z.c0 + FLOU; c++) somme += m[base + Math.min(z.c1, Math.max(z.c0, c))];
        for (let c = z.c0; c <= z.c1; c++) {
          t[base + c] = somme / largeur;
          somme += m[base + Math.min(z.c1, c + FLOU + 1)] - m[base + Math.max(z.c0, c - FLOU)];
        }
      }
      for (let c = z.c0; c <= z.c1; c++) {
        let somme = 0;
        for (let l = z.l0 - FLOU; l <= z.l0 + FLOU; l++) somme += t[Math.min(z.l1, Math.max(z.l0, l)) * w + c];
        for (let l = z.l0; l <= z.l1; l++) {
          m[l * w + c] = somme / largeur;
          somme +=
            t[Math.min(z.l1, l + FLOU + 1) * w + c] - t[Math.max(z.l0, l - FLOU) * w + c];
        }
      }
    }
  }

  /** Zone de la dernière tache (rectangle de cellules, marge comprise), ou null. */
  zonePeinte(): { c0: number; c1: number; l0: number; l1: number } | null {
    return this.zone;
  }

  /** Graphe orienté du scénario, en lignes compressées (CSR), mis en cache. */
  private graphe(scenario: string): Csr {
    const deja = this.csr.get(scenario);
    if (deja) return deja;
    const s = this.g.scenarios[scenario] ?? { masque: 1 };
    const e = this.g.e;
    const m = e.length / 5;
    const remplace = new Map<number, [number, number]>();
    for (const [i, av, ar] of s.remplace ?? []) remplace.set(i, [av, ar]);

    const degre = new Int32Array(this.n + 1);
    for (let i = 0; i < m; i++) {
      if (!(e[5 * i + 4] & s.masque)) continue;
      degre[e[5 * i]]++;
      degre[e[5 * i + 1]]++;
    }
    const debut = new Int32Array(this.n + 1);
    for (let i = 0; i < this.n; i++) debut[i + 1] = debut[i] + degre[i];
    const vers = new Int32Array(debut[this.n]);
    const poids = new Int32Array(debut[this.n]);
    const arete = new Int32Array(debut[this.n]);
    const curseur = debut.slice(0, this.n);
    for (let i = 0; i < m; i++) {
      if (!(e[5 * i + 4] & s.masque)) continue;
      const u = e[5 * i];
      const v = e[5 * i + 1];
      const [av, ar] = remplace.get(i) ?? [e[5 * i + 2], e[5 * i + 3]];
      vers[curseur[u]] = v;
      arete[curseur[u]] = i;
      poids[curseur[u]++] = av;
      vers[curseur[v]] = u;
      arete[curseur[v]] = i;
      poids[curseur[v]++] = ar;
    }
    const csr = { debut, vers, poids, arete };
    this.csr.set(scenario, csr);
    return csr;
  }

  /** Cellule d'un point lon/lat, ou -1 hors grille. */
  cellule(lon: number, lat: number): number {
    const { ouest, dlon, y_nord, dy, colonnes, lignes } = this.g.grille;
    const col = Math.floor((lon - ouest) / dlon);
    const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const lig = Math.floor((y_nord - y) / dy);
    if (col < 0 || lig < 0 || col >= colonnes || lig >= lignes) return -1;
    return lig * colonnes + col;
  }

  /**
   * Le nœud de départ : le plus proche du curseur qui appartient au réseau du
   * scénario, dans un rayon de trois cellules (≈ 300 m). Au-delà, on ne
   * prétend pas que le lecteur est « sur » le réseau.
   */
  depart(lon: number, lat: number, scenario: string): number {
    const c = this.cellule(lon, lat);
    if (c < 0) return -1;
    const { colonnes } = this.g.grille;
    const { debut } = this.graphe(scenario);
    const c0 = c % colonnes;
    const l0 = Math.floor(c / colonnes);
    for (let r = 0; r <= ACCROCHE; r++) {
      for (let dl = -r; dl <= r; dl++) {
        for (let dc = -r; dc <= r; dc++) {
          if (Math.max(Math.abs(dl), Math.abs(dc)) !== r) continue;
          const liste = this.parCellule.get((l0 + dl) * colonnes + (c0 + dc));
          if (!liste) continue;
          for (const n of liste) if (debut[n + 1] > debut[n]) return n;
        }
      }
    }
    return -1;
  }

  /**
   * Surfaces de terre atteintes, SANS peindre : sert à comparer deux
   * conditions (l'été derrière l'hiver) sans redessiner la tache.
   */
  mesurer(source: number, scenario: string, surfaces: number[], facteur = 1): number[] {
    if (source < 0) return surfaces.map(() => 0);
    this.parcourir(source, scenario, Math.max(...surfaces), facteur);
    return this.aires(surfaces);
  }

  /**
   * Le parcours (Dijkstra) depuis `source`, puis le tracé des arêtes et le
   * disque autour de chaque cellule tracée. Laisse dans `pixelMin` le temps
   * minimal de chaque cellule, en dixièmes de minute.
   *
   * `facteur` multiplie tous les temps : 1 en conditions sèches, 1 / 0,79 en
   * hiver (Shoman et al., 2023 : 15,73 → 12,45 km/h sur chaussée enneigée).
   */
  private parcourir(source: number, scenario: string, minutes: number, facteur: number): void {
    const { debut, vers, poids } = this.graphe(scenario);
    const budget = Math.round(minutes * 10);
    this.dernier = { scenario, facteur, budget };
    const dist = this.dist;
    dist.fill(0x7fffffff);
    const tas = this.tas;
    const cle = this.tasCle;
    let taille = 0;

    const pousser = (n: number, d: number) => {
      let i = taille++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (cle[p] <= d) break;
        tas[i] = tas[p];
        cle[i] = cle[p];
        i = p;
      }
      tas[i] = n;
      cle[i] = d;
    };
    const extraire = (): number => {
      const haut = tas[0];
      const n = tas[--taille];
      const d = cle[taille];
      let i = 0;
      for (;;) {
        let f = 2 * i + 1;
        if (f >= taille) break;
        if (f + 1 < taille && cle[f + 1] < cle[f]) f++;
        if (cle[f] >= d) break;
        tas[i] = tas[f];
        cle[i] = cle[f];
        i = f;
      }
      tas[i] = n;
      cle[i] = d;
      return haut;
    };

    dist[source] = 0;
    pousser(source, 0);
    const atteints: number[] = [];
    while (taille > 0) {
      const d = cle[0];
      const u = extraire();
      if (d > dist[u]) continue;
      atteints.push(u);
      for (let k = debut[u]; k < debut[u + 1]; k++) {
        const v = vers[k];
        const nd = d + Math.max(1, Math.round(poids[k] * facteur));
        if (nd <= budget && nd < dist[v]) {
          dist[v] = nd;
          pousser(v, nd);
        }
      }
    }

    const { colonnes, lignes } = this.g.grille;
    const px = this.g.px;

    // 1. Le réseau parcouru, tracé le long des arêtes — pas seulement à leurs
    //    nœuds. Un tiers du réseau est fait d'arêtes de plus de 300 m sans
    //    carrefour : peintes par leurs seuls bouts, elles laissaient des trous
    //    le long des routes. Une arête dont le budget s'épuise en chemin n'est
    //    tracée que sur la part réellement parcourue. Le tracé est la droite
    //    entre les deux nœuds, à la cellule près.
    const trace = this.tampon;
    trace.fill(Infinity);
    const peints: number[] = [];
    const poser = (p: number, t: number) => {
      if (trace[p] === Infinity) peints.push(p);
      if (t < trace[p]) trace[p] = t;
    };
    for (const u of atteints) {
      const du = dist[u];
      const cu = px[u];
      const cu0 = cu % colonnes;
      const lu0 = (cu - cu0) / colonnes;
      poser(cu, du);
      for (let k = debut[u]; k < debut[u + 1]; k++) {
        const w = Math.max(1, Math.round(poids[k] * facteur));
        const part = Math.min(1, (budget - du) / w);
        if (part <= 0) continue;
        const cv = px[vers[k]];
        const cv0 = cv % colonnes;
        const lv0 = (cv - cv0) / colonnes;
        const pas = Math.max(Math.abs(cv0 - cu0), Math.abs(lv0 - lu0));
        if (pas === 0) continue;
        const fin = Math.floor(pas * part);
        for (let i = 1; i <= fin; i++) {
          const c = Math.round(cu0 + ((cv0 - cu0) * i) / pas);
          const l = Math.round(lu0 + ((lv0 - lu0) * i) / pas);
          poser(l * colonnes + c, du + (w * i) / pas);
        }
      }
    }

    // 2. Un disque de ≈ 200 m autour de chaque cellule tracée.
    const minimum = this.pixelMin;
    minimum.fill(0x7fffffff);
    // Rectangle des cellules touchées, pour la ZONE de travail (voir MARGE).
    let zc0 = Infinity, zc1 = -Infinity, zl0 = Infinity, zl1 = -Infinity;
    for (const p of peints) {
      const t = Math.round(trace[p]);
      const c0 = p % colonnes;
      const l0 = (p - c0) / colonnes;
      if (c0 < zc0) zc0 = c0;
      if (c0 > zc1) zc1 = c0;
      if (l0 < zl0) zl0 = l0;
      if (l0 > zl1) zl1 = l0;
      for (const [dl, dc] of DISQUE) {
        const l = l0 + dl;
        const cc = c0 + dc;
        if (l < 0 || l >= lignes || cc < 0 || cc >= colonnes) continue;
        const q = l * colonnes + cc;
        if (t < minimum[q]) minimum[q] = t;
      }
    }
    this.zone = peints.length
      ? {
          c0: Math.max(0, zc0 - RAYON - MARGE),
          c1: Math.min(colonnes - 1, zc1 + RAYON + MARGE),
          l0: Math.max(0, zl0 - RAYON - MARGE),
          l1: Math.min(lignes - 1, zl1 + RAYON + MARGE),
        }
      : null;
  }

  /**
   * L'itinéraire le plus RAPIDE de `source` à `cible` : Dijkstra arrêté dès que
   * la cible sort du tas. Renvoie les arêtes dans l'ordre du trajet, le sens
   * de parcours de chacune (depuis son nœud u ou non) et son temps en minutes,
   * ou `null` si la cible est hors d'atteinte.
   *
   * `facteur` comme pour la tache : 1 l'été, 1 / 0,79 l'hiver.
   */
  itineraire(
    source: number,
    cible: number,
    scenario: string,
    facteur = 1,
  ): Array<{ arete: number; depuisU: boolean; minutes: number }> | null {
    if (source < 0 || cible < 0) return null;
    if (source === cible) return [];
    const { debut, vers, poids, arete } = this.graphe(scenario);
    const dist = this.dist;
    dist.fill(0x7fffffff);
    const pred = this.predK;
    pred.fill(-1);
    const tas = this.tas;
    const cle = this.tasCle;
    let taille = 0;
    const pousser = (n: number, d: number) => {
      let i = taille++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (cle[p] <= d) break;
        tas[i] = tas[p];
        cle[i] = cle[p];
        i = p;
      }
      tas[i] = n;
      cle[i] = d;
    };
    const extraire = (): number => {
      const haut = tas[0];
      const n = tas[--taille];
      const d = cle[taille];
      let i = 0;
      for (;;) {
        let f = 2 * i + 1;
        if (f >= taille) break;
        if (f + 1 < taille && cle[f + 1] < cle[f]) f++;
        if (cle[f] >= d) break;
        tas[i] = tas[f];
        cle[i] = cle[f];
        i = f;
      }
      tas[i] = n;
      cle[i] = d;
      return haut;
    };
    dist[source] = 0;
    pousser(source, 0);
    let trouve = false;
    while (taille > 0) {
      const d = cle[0];
      const u = extraire();
      if (d > dist[u]) continue;
      if (u === cible) {
        trouve = true;
        break;
      }
      for (let k = debut[u]; k < debut[u + 1]; k++) {
        const v = vers[k];
        const nd = d + Math.max(1, Math.round(poids[k] * facteur));
        if (nd < dist[v]) {
          dist[v] = nd;
          pred[v] = k;
          pousser(v, nd);
        }
      }
    }
    // Le parcours a écrasé les distances de la tache : `parcourues()` ne doit
    // plus s'en servir avant le prochain `peindre`.
    this.dernier = null;
    if (!trouve) return null;

    // Remontée depuis la cible : `pred[v]` est l'entrée CSR qui y mène ; son
    // nœud de départ est celui dont la plage CSR la contient.
    const e = this.g.e;
    const trajet: Array<{ arete: number; depuisU: boolean; minutes: number }> = [];
    let v = cible;
    while (v !== source) {
      const k = pred[v];
      const a = arete[k];
      const u = e[5 * a] === v ? e[5 * a + 1] : e[5 * a];
      trajet.push({
        arete: a,
        depuisU: e[5 * a] === u,
        minutes: Math.max(1, Math.round(poids[k] * facteur)) / 10,
      });
      v = u;
    }
    return trajet.reverse();
  }

  /**
   * Emprise [ouest, sud, est, nord] de la tache atteinte en `minutes` lors du
   * dernier `peindre` (cellules et leur disque, comme à l'écran), ou `null`
   * si rien n'est atteint. À appeler juste après `peindre` : `mesurer`
   * réécrit les mêmes cellules.
   */
  emprise(minutes: number): [number, number, number, number] | null {
    const { ouest, dlon, y_nord, dy, colonnes } = this.g.grille;
    const seuil = Math.round(minutes * 10);
    const minimum = this.pixelMin;
    let c0 = Infinity, c1 = -Infinity, l0 = Infinity, l1 = -Infinity;
    // Dans la zone seulement : au-dehors, rien n'est atteint.
    const z = this.zone;
    if (!z) return null;
    for (let l = z.l0; l <= z.l1; l++) {
      for (let c = z.c0; c <= z.c1; c++) {
        if (minimum[l * colonnes + c] > seuil) continue;
        if (c < c0) c0 = c;
        if (c > c1) c1 = c;
        if (l < l0) l0 = l;
        if (l > l1) l1 = l;
      }
    }
    if (c1 < 0) return null;
    const lat = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
    return [ouest + c0 * dlon, lat(y_nord - (l1 + 1) * dy), ouest + (c1 + 1) * dlon, lat(y_nord - l0 * dy)];
  }

  /**
   * Temps d'accès (minutes) à chacun des `noeuds` lors du dernier parcours, ou
   * `NaN` s'il est hors budget. À appeler juste après `peindre` : sert aux
   * lieux de la ville des 15 minutes, rattachés chacun à un nœud.
   */
  tempsVers(noeuds: ArrayLike<number>): Float32Array {
    const sortie = new Float32Array(noeuds.length).fill(NaN);
    const d = this.dernier;
    if (!d) return sortie;
    for (let i = 0; i < noeuds.length; i++) {
      const t = this.dist[noeuds[i]];
      if (t <= d.budget) sortie[i] = t / 10;
    }
    return sortie;
  }

  /**
   * Les arêtes parcourues dans `minutes` (≤ budget du dernier parcours), avec
   * la part de chacune réellement atteinte : depuis son nœud u, depuis son
   * nœud v (une arête peut être entamée par les deux bouts). À appeler juste
   * après `peindre` ou `mesurer` : on relit leurs distances.
   */
  parcourues(minutes: number): Array<{ arete: number; partU: number; partV: number }> {
    const d = this.dernier;
    if (!d) return [];
    const { debut, poids, arete } = this.graphe(d.scenario);
    const limite = Math.min(d.budget, Math.round(minutes * 10));
    const dist = this.dist;
    const e = this.g.e;
    const touchees: number[] = [];
    for (let u = 0; u < this.n; u++) {
      const du = dist[u];
      if (du > limite) continue;
      for (let k = debut[u]; k < debut[u + 1]; k++) {
        const w = Math.max(1, Math.round(poids[k] * d.facteur));
        const part = Math.min(1, (limite - du) / w);
        if (part <= 0) continue;
        const a = arete[k];
        if (this.partU[a] === 0 && this.partV[a] === 0) touchees.push(a);
        if (e[5 * a] === u) this.partU[a] = Math.max(this.partU[a], part);
        else this.partV[a] = Math.max(this.partV[a], part);
      }
    }
    const sortie = touchees.map((a) => ({ arete: a, partU: this.partU[a], partV: this.partV[a] }));
    for (const a of touchees) {
      this.partU[a] = 0;
      this.partV[a] = 0;
    }
    return sortie;
  }

  /**
   * Surfaces de terre (km²) pour chaque budget : la tache (disque, trous
   * bouchés), sans le flou, moins les cellules d'eau. Une cellule vaut 1 ha
   * (100 m de côté à la latitude de référence ; ±0,5 % aux bords de la zone).
   */
  private aires(surfaces: number[]): number[] {
    const m = this.masque;
    const minimum = this.pixelMin;
    const z = this.zone;
    if (!z) return surfaces.map(() => 0);
    const w = this.g.grille.colonnes;
    return surfaces.map((minutes) => {
      const seuil = Math.round(minutes * 10);
      for (let l = z.l0; l <= z.l1; l++) {
        for (let p = l * w + z.c0, fin = l * w + z.c1; p <= fin; p++) m[p] = minimum[p] <= seuil ? 1 : 0;
      }
      this.boucher(m);
      let n = 0;
      for (let l = z.l0; l <= z.l1; l++) {
        for (let p = l * w + z.c0, fin = l * w + z.c1; p <= fin; p++) if (m[p] && this.terre[p]) n++;
      }
      return n / 100;
    });
  }

  /**
   * Remplit `pixels` (RGBA, une cellule par pixel) avec la portée depuis
   * `source`.
   *
   * Trois étapes pour passer d'un semis de nœuds à une tache lisible :
   * un disque de ≈ 200 m autour de chaque nœud atteint, le bouchage des trous
   * enclavés, puis un flou du bord. Chaque palier est traité ainsi, du plus
   * lointain au plus proche, et posé par-dessus le précédent.
   *
   * `surfaces` : budgets (en minutes) pour lesquels on MESURE la surface de
   * terre atteinte, sans la peindre — le parcours va jusqu'au plus long des
   * deux, paliers peints ou surfaces. Renvoie les surfaces en km², dans
   * l'ordre demandé : même tache (disque, trous bouchés), sans le flou, et
   * cellules d'eau retirées.
   */
  peindre(
    source: number,
    scenario: string,
    bands: ReachBand[],
    pixels: Uint8ClampedArray,
    surfaces: number[] = [],
    facteur = 1,
  ): number[] {
    pixels.fill(0);
    if (source < 0) return surfaces.map(() => 0);
    this.parcourir(source, scenario, Math.max(bands[bands.length - 1].max, ...surfaces), facteur);
    const km2 = this.aires(surfaces);
    const m = this.masque;
    const minimum = this.pixelMin;
    const z = this.zone;
    if (!z) return km2;
    const w = this.g.grille.colonnes;

    for (let b = bands.length - 1; b >= 0; b--) {
      const seuil = Math.round(bands[b].max * 10);
      for (let l = z.l0; l <= z.l1; l++) {
        for (let p = l * w + z.c0, fin = l * w + z.c1; p <= fin; p++) m[p] = minimum[p] <= seuil ? 1 : 0;
      }
      this.boucher(m);
      this.flouter(m);
      const [r, g, bl, opacite] = bands[b].rgba;
      for (let l = z.l0; l <= z.l1; l++) {
        for (let p = l * w + z.c0, fin = l * w + z.c1; p <= fin; p++) {
          if (m[p] <= 0.02) continue;
          // Bord adouci mais net : le flou donne une rampe, la courbe en S la
          // resserre autour de la moitié pour que la tache garde une forme.
          const x = Math.min(1, Math.max(0, (m[p] - 0.2) / 0.6));
          const a = ((x * x * (3 - 2 * x)) * opacite) / 255;
          if (a <= 0) continue;
          // Posé « par-dessus » le palier précédent (alpha non prémultiplié).
          const i = 4 * p;
          const ad = pixels[i + 3] / 255;
          const ao = a + ad * (1 - a);
          pixels[i] = (r * a + pixels[i] * ad * (1 - a)) / ao;
          pixels[i + 1] = (g * a + pixels[i + 1] * ad * (1 - a)) / ao;
          pixels[i + 2] = (bl * a + pixels[i + 2] * ad * (1 - a)) / ao;
          pixels[i + 3] = ao * 255;
        }
      }
    }
    return km2;
  }
}
