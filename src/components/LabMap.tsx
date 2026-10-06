"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  boundsPair,
  type LabColor,
  type LabDefinition,
  type LabHeight,
  type LabView,
} from "@/labs/types";
import LabPanel from "./LabPanel";

/**
 * Le moteur cartographique — le seul fichier du site qui importe MapLibre.
 *
 * Il n'est jamais importé directement : `LabEmbed` le charge par import
 * dynamique. C'est ce qui garde les 250 ko de MapLibre (plus son CSS) hors du
 * bundle des pages qui ne portent pas de carte.
 *
 * Aucune requête réseau n'est faite en dehors des fichiers du site, tant qu'un
 * lab ne déclare pas de fond de carte : pas de jeton, pas de fournisseur de
 * tuiles, pas de serveur de polices. Un lab sans fond ne peut donc pas cesser
 * de fonctionner parce qu'un compte tiers a expiré.
 *
 * `lac-saint-charles` fait exception et déclare un fond : son propos est
 * territorial, et il se lit mal sans routes ni villages. L'exception est
 * documentée dans le lab lui-même. Les données, elles, viennent toujours du
 * site : si le fournisseur du fond disparaît, la carte perd son décor, pas son
 * contenu.
 */

const BACKGROUND_LAYER = "lab-background";

/**
 * Les fichiers déjà chargés à la demande, gardés pour la session.
 *
 * Hors du composant : revenir sur une entité déjà consultée ne doit rien
 * retélécharger, même après que la carte a été démontée et remontée.
 */
const cacheDemande = new Map<string, unknown>();

/**
 * MapLibre 6 charge son worker comme un module séparé, dont il résout l'URL
 * depuis `import.meta.url`. Sous Turbopack, cette URL pointe vers
 * `/_next/static/chunks/`, où le bundler n'a pas copié le fichier : le serveur
 * répond par sa page 404 en HTML, le navigateur refuse le module (« non-
 * JavaScript MIME type »), et la carte ne s'initialise jamais — silencieusement,
 * puisque MapLibre n'a pas atteint le point où il sait signaler une erreur.
 *
 * On sert donc le worker nous-mêmes depuis `public/`, copié par
 * `scripts/copy-maplibre-worker.mjs` au `postinstall`. Un actif du site comme
 * un autre : rien à résoudre, rien qui dépende du bundler.
 */
setWorkerUrl("/maplibre-gl-worker.mjs");

/**
 * Traduit une couleur du vocabulaire en valeur de peinture MapLibre.
 *
 * Le `as unknown as string` est assumé et confiné ici : décrire le type d'une
 * expression MapLibre demanderait d'importer toute la spécification de style.
 * MapLibre valide l'expression à l'exécution et lève une erreur explicite si
 * elle est mal formée — on le saurait au premier affichage.
 */
function colorValue(color: LabColor, element?: HTMLElement | null): string {
  if (typeof color === "string") return color;
  if (Array.isArray(color)) return color as unknown as string;

  // Jeton CSS : on résout la valeur courante du thème. Elle est relue quand le
  // thème change — voir `syncCouleurs`, sans quoi une couche posée en clair
  // resterait claire sur un fond devenu sombre.
  if ("cssVar" in color) {
    if (!element) return color.fallback;
    return (
      getComputedStyle(element).getPropertyValue(color.cssVar).trim() ||
      color.fallback
    );
  }

  return [
    "match",
    ["get", color.byProperty],
    ...color.match.flatMap(([value, hex]) => [value, hex]),
    color.fallback,
  ] as unknown as string;
}

/** Traduit une hauteur du vocabulaire en valeur d'extrusion MapLibre. */
function heightValue(height: LabHeight): number {
  if (typeof height === "number") return height;

  const valeur = ["to-number", ["get", height.byProperty], 0];

  return [
    "+",
    height.base ?? 0,
    ["*", height.sqrt ? ["sqrt", valeur] : valeur, height.scale],
  ] as unknown as number;
}

/**
 * Courbe d'évolution, dessinée en SVG dans l'infobulle.
 *
 * Specs de tracé : trait de 2 px à jointure ronde, point final de rayon 4 avec
 * un anneau de 2 px en couleur de surface — c'est lui qui garde le point
 * lisible là où il croise la courbe. Aucune grille, aucun axe : à cette taille
 * ils ajouteraient de l'encre sans rien porter. Les deux valeurs extrêmes sont
 * écrites sous la courbe, et c'est tout ce qu'on étiquette.
 */
function Courbe({
  serie,
  color,
  hauteur = 34,
}: {
  serie: Record<string, number>;
  color: string;
  hauteur?: number;
}) {
  const annees = Object.keys(serie).sort();
  if (annees.length < 2) return null;

  const valeurs = annees.map((a) => serie[a]);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const largeur = 180;
  const marge = 5;

  const x = (i: number) => (i / (annees.length - 1)) * (largeur - marge * 2) + marge;
  const y = (v: number) =>
    hauteur - marge - ((v - min) / amplitude) * (hauteur - marge * 2);

  const trace = valeurs.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      className="mt-1 w-full"
      style={{ height: hauteur }}
      aria-hidden="true"
    >
      <path
        d={trace}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Anneau de surface puis point : le point reste lisible sur la courbe. */}
      <circle
        cx={x(valeurs.length - 1)}
        cy={y(valeurs[valeurs.length - 1])}
        r={6}
        fill="var(--tooltip-surface, #f0f9ff)"
      />
      <circle
        cx={x(valeurs.length - 1)}
        cy={y(valeurs[valeurs.length - 1])}
        r={4}
        fill={color}
      />
    </svg>
  );
}

/**
 * Part d'un tout, en barre.
 *
 * Bout arrondi de 4 px côté donnée, carré à la base : la barre pousse depuis
 * une origine, et l'arrondi marque où elle s'arrête.
 */
function Barre({
  valeur,
  max,
  color,
}: {
  valeur: number;
  max: number;
  color: string;
}) {
  const part = Math.max(0, Math.min(1, valeur / max));
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-sky-200/60 dark:bg-slate-700">
      <div
        className="h-full rounded-r-sm"
        style={{ width: `${part * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Sous 640 px, une vue très rasante écrase les polygones lointains au point
 * de les rendre illisibles. On plafonne l'inclinaison plutôt que de refuser
 * la 3D : la scène reste la même, seulement moins inclinée.
 */
function cameraFor(view: LabView, narrow: boolean) {
  const pitch = view.pitch ?? 0;
  return {
    pitch: narrow ? Math.min(pitch, 40) : pitch,
    bearing: narrow ? 0 : view.bearing ?? 0,
  };
}

/**
 * Options de `fitBounds`, avec le plancher de zoom d'une vue à emprise.
 *
 * `minZoom` dit à MapLibre de ne pas descendre en dessous d'un niveau, quitte à
 * ce que l'emprise déborde du cadre. C'est ce qui garde une scène en volume sur
 * un écran étroit, là où le cadrage automatique l'aplatirait.
 */
function fitOptions(view: LabView) {
  return {
    padding: 24,
    ...("bounds" in view && view.minZoom !== undefined
      ? { minZoom: view.minZoom }
      : {}),
  };
}

export default function LabMap({
  lab,
  label,
  errorLabel,
  locale,
  fill = false,
}: {
  lab: LabDefinition;
  /** Nom du lab pour les lecteurs d'écran — le titre de l'entrée. */
  label: string;
  errorLabel: string;
  /** Langue courante, pour les libellés de scènes. */
  locale?: string;
  /**
   * La carte occupe toute la hauteur de son conteneur, qui décide donc de sa
   * taille. C'est le cas dans une entrée comme en prévisualisation : la
   * hauteur est déclarée à un seul endroit, jamais deux.
   */
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Le conteneur qui passe en plein écran : la carte ET ses boutons, pour que
  // les scènes et la légende restent accessibles une fois agrandi.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const sceneRef = useRef<((i: number, animate: boolean) => void) | null>(null);
  const [failed, setFailed] = useState(false);
  // Entité survolée : position dans la carte, et ses propriétés.
  const [survol, setSurvol] = useState<{
    x: number;
    y: number;
    props: Record<string, unknown>;
  } | null>(null);
  const [scene, setScene] = useState(0);
  const [pleinEcran, setPleinEcran] = useState(false);
  /**
   * Entité choisie d'un clic, et palier du curseur.
   *
   * Distincte du survol : celui-ci s'efface dès que le curseur bouge, alors
   * qu'une sélection reste tant qu'on ne la ferme pas.
   */
  const [choisi, setChoisi] = useState<Record<string, unknown> | null>(null);
  const [palier, setPalier] = useState<number | null>(null);
  /**
   * Les chiffres de l'aire révélée au palier courant.
   *
   * Ils ne sont pas sur l'entité cliquée : une station ne porte que son nom,
   * alors que les mesures — superficie, population, part du disque — changent
   * à chaque cran du curseur et vivent donc sur l'aire.
   *
   * Lus dans la source plutôt que par `queryRenderedFeatures` : cette dernière
   * ne voit que les tuiles déjà traitées, et renvoyait un panneau vide quand on
   * l'interrogeait dans le même tour que le filtre.
   */
  const [mesures, setMesures] = useState<Record<string, unknown> | null>(null);
  /**
   * La valeur de `key` dont les données à la demande sont ARRIVÉES.
   *
   * Entre le clic et l'arrivée du fichier, la station est choisie mais son
   * voile n'existe pas encore. Les rues du fond, si elles s'allumaient à ce
   * moment, couvriraient la ville entière le temps du téléchargement.
   */
  const [chargee, setChargee] = useState<unknown>(null);
  /**
   * Pour le tableau de bord : la SÉRIE de l'entité choisie (ses mesures à
   * chaque palier, pour les courbes) et l'ENSEMBLE des entités comparables
   * (pour le rang et la moyenne).
   */
  const [serie, setSerie] = useState<Record<string, unknown>[]>([]);
  const [ensemble, setEnsemble] = useState<Record<string, unknown>[]>([]);
  const scenes = lab.scenes ?? [];
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";

  const curseur = lab.select?.slider;
  const palierCourant =
    palier ?? curseur?.start ?? curseur?.steps[curseur.steps.length - 1] ?? null;

  /**
   * Plein écran natif du navigateur.
   *
   * L'API n'est pas un état qu'on impose : l'utilisateur peut en sortir par
   * Échap sans passer par notre bouton. On écoute donc l'événement plutôt que
   * de tenir un booléen de notre côté — sinon le bouton ment.
   */
  useEffect(() => {
    const suivre = () => {
      const actif = document.fullscreenElement === wrapperRef.current;
      setPleinEcran(actif);
      // La carte doit recalculer sa taille : MapLibre ne le fait pas seul
      // quand son conteneur change de dimensions sans que la fenêtre bouge.
      requestAnimationFrame(() => mapRef.current?.resize());
    };
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  const basculerPleinEcran = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current?.requestFullscreen().catch(() => {
        // Certains navigateurs refusent hors interaction directe, ou en
        // iframe sans `allowfullscreen`. Ce n'est pas une panne : la carte
        // reste utilisable à sa taille normale.
      });
    }
  };

  // Le lecteur change de scène : on rejoue le cadrage. L'animation est coupée
  // si le système demande moins de mouvement.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sceneRef.current?.(scene, !reduced);
  }, [scene]);

  /**
   * Les couches révélées ne montrent que l'entité choisie, au palier courant.
   *
   * Sans ce filtre, les aires de toutes les stations se superposeraient : une
   * tache uniforme où plus rien ne se lit.
   *
   * `["==", ["literal", false], true]` est un faux constant — c'est ainsi qu'on
   * éteint une couche par filtre, sans toucher à sa visibilité.
   */
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    if (!map || !select?.revealLayers?.length) return;

    const parOpacite = new Set(select.revealByOpacity ?? []);

    const appliquer = () => {
      for (const index of select.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) continue;

        // Une couche révélée par opacité n'a pas de champ à filtrer : c'est
        // le fond de carte, dont les entités ignorent `station`/`minutes`.
        //
        // Elle ne s'allume QUE si une aire existe au palier courant — c'est-à-
        // dire une station choisie ET un palier au-dessus de zéro. Le palier
        // zéro n'a pas de voile : y allumer les rues les montrerait sur toute
        // la ville, sans rien pour les masquer hors de l'aire.
        if (parOpacite.has(index)) {
          const definition = lab.layers[index];
          const plafond =
            definition && "opacity" in definition
              ? definition.opacity ?? 1
              : 1;
          const actif =
            Boolean(choisi) &&
            (!select.slider || (palierCourant !== null && palierCourant > 0)) &&
            // Données à la demande : pas avant que le voile soit arrivé.
            (!select.onDemand || chargee === choisi?.[select.key]);
          const prop = couche.type === "fill" ? "fill-opacity" : "line-opacity";
          // `.bind(map)` est indispensable : rangée dans une variable, la
          // méthode perd son `this`, chaque appel lève, et le `try` qui suit
          // avalait l'erreur — les rues ne s'allumaient jamais.
          const poser = map.setPaintProperty.bind(map) as (
            id: string,
            nom: string,
            valeur: unknown,
          ) => void;
          try {
            // L'ordre d'apparition compte. En s'allumant, les rues ATTENDENT
            // la fin du fondu du voile : allumées en même temps, elles
            // traverseraient un voile encore transparent et toute la ville
            // clignoterait une fraction de seconde. En s'éteignant, elles
            // partent sans délai — le voile, lui, disparaît d'un coup.
            const fondu = select.slider?.fade ?? 0;
            poser(
              id,
              `${prop}-transition`,
              actif ? { duration: 220, delay: fondu } : { duration: 0, delay: 0 },
            );
            poser(id, prop, actif ? plafond : 0);
          } catch {
            // Couche sans opacité déclarée : rien à ajuster.
          }
          continue;
        }

        // Les données chargées à la demande se filtrent comme les autres : le
        // fichier d'une station porte ses quatorze paliers, et seul le palier
        // courant doit se voir.
        if (!choisi) {
          map.setFilter(id, ["==", ["literal", false], true]);
          continue;
        }

        // Le filtre DÉCLARÉ par la couche est conservé et complété, jamais
        // remplacé. Quand l'aire et son voile voyagent dans la même source,
        // c'est lui seul qui dit « je suis le voile » ou « je suis l'aire » :
        // le remplacer faisait dessiner l'aire dans la couleur du voile, par-
        // dessus le trou — l'intérieur de la carte disparaissait.
        const declare = lab.layers[index]?.filter;
        const conditions: unknown[] = [
          "all",
          ...(declare ? [declare] : []),
          ["==", ["get", select.key], choisi[select.key] as string],
        ];
        if (select.slider && palierCourant !== null) {
          conditions.push(["==", ["get", select.slider.field], palierCourant]);
        }
        map.setFilter(id, conditions as never);
      }
    };

    // Appliqué TOUT DE SUITE, jamais différé.
    //
    // `mapRef` n'est renseigné qu'à la fin du chargement, une fois toutes les
    // couches posées : filtres et peintures peuvent donc être modifiés dès
    // maintenant. `isStyleLoaded()` répondait « non » dès qu'une tuile était
    // en route, et l'application partait alors sur `once("idle")` — avec
    // l'état de CE rendu, jamais annulée. Le tram anime la carte en continu,
    // `idle` arrivait tard ou pas du tout, et un état périmé pouvait écraser
    // le bon : les rues restaient éteintes à six minutes.
    appliquer();
  }, [choisi, palierCourant, chargee, lab.select, lab.layers]);

  /**
   * Les chiffres à afficher, relevés sur l'aire du palier courant.
   *
   * `querySourceFeatures` lit la source chargée, pas l'image rendue : elle
   * répond même si l'aire est hors de l'écran, ce qui arrive dès qu'on a zoomé
   * sur un bout du quartier. `queryRenderedFeatures` renvoyait alors un panneau
   * vide alors que la donnée était là.
   *
   * Elle ne voit cependant que les tuiles déjà découpées : on réessaie sur
   * `sourcedata` tant que rien n'est trouvé, plutôt que de conclure trop tôt à
   * l'absence.
   */
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    if (!map || !select) return;

    if (!choisi) {
      setMesures(null);
      return;
    }

    // Les sources des couches révélées, hors fond de carte (ses entités n'ont
    // pas ces champs). Plusieurs entités y portent la station et le palier —
    // l'aire ET son voile — mais seule l'aire porte les chiffres : on retient
    // donc l'entité qui a au moins un des champs du panneau. Prendre la
    // première venue tombait sur le voile, et le panneau s'ouvrait en tirets.
    const parOpacite = new Set(select.revealByOpacity ?? []);
    const sources = [
      ...new Set(
        (select.revealLayers ?? [])
          .filter((i) => !parOpacite.has(i))
          .map((i) => map.getLayer(`lab-layer-${i}`)?.source)
          .filter((s): s is string => Boolean(s)),
      ),
    ];
    if (!sources.length) return;

    const valeur = choisi[select.key];
    const champ = select.slider?.field;
    // Les champs que le panneau affiche : lignes, chiffre principal, courbe.
    // L'entité qui en porte au moins un est l'aire ; le voile n'en porte aucun.
    const champsPanneau = [
      ...(select.rows ?? []).map((r) => r.field),
      ...(select.panel?.headline ? [select.panel.headline.field] : []),
      ...(select.panel?.curve ? [select.panel.curve.value.field] : []),
    ];

    const relever = () => {
      const trouve = sources
        .flatMap((s) => map.querySourceFeatures(s, { sourceLayer: undefined }))
        .find((f) => {
          const p = f.properties ?? {};
          if (p[select.key] !== valeur) return false;
          if (champ && palierCourant !== null && p[champ] !== palierCourant) return false;
          return !champsPanneau.length || champsPanneau.some((c) => c in p);
        });
      if (trouve) {
        setMesures(trouve.properties ?? {});
        return true;
      }
      return false;
    };

    if (relever()) return;

    // Au palier zéro, aucune aire n'existe : c'est voulu, et le panneau
    // affichera des tirets plutôt que d'attendre une donnée qui ne viendra pas.
    setMesures(null);
    const reessayer = () => {
      if (relever()) map.off("sourcedata", reessayer);
    };
    map.on("sourcedata", reessayer);
    return () => {
      map.off("sourcedata", reessayer);
    };
  }, [choisi, palierCourant, lab.select]);

  /**
   * Les données propres à l'entité choisie, chargées au clic.
   *
   * Les aires et les voiles des 29 stations pèsent 5 Mo : les servir à
   * l'ouverture ferait attendre, sur un téléphone surtout, un lecteur qui ne
   * regardera qu'une ou deux stations. Chacune arrive au clic (15–25 ko
   * compressés) et reste ensuite en mémoire.
   */
  useEffect(() => {
    const map = mapRef.current;
    const aLaDemande = lab.select?.onDemand;
    if (!map || !aLaDemande || !lab.select) return;

    const source = () =>
      map.getSource(aLaDemande.source) as
        | { setData: (d: unknown) => void }
        | undefined;

    const valeur = choisi?.[lab.select.key];
    if (valeur === undefined || valeur === null) {
      source()?.setData({ type: "FeatureCollection", features: [] });
      setChargee(null);
      setSerie([]);
      return;
    }

    // L'identifiant du fichier : minuscules, sans accents ni apostrophes — la
    // même règle que celle du script qui les écrit.
    const cle = String(valeur)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/\s+/g, "-");
    const url = aLaDemande.url.replace("{clé}", cle);

    // Les mesures de l'entité, une par palier, triées : ce sont les entités
    // qui portent le champ de la courbe (le voile, lui, n'en porte pas).
    const extraire = (data: unknown) => {
      const champ = lab.select?.slider?.field;
      const marque =
        lab.select?.panel?.curve?.value.field ?? lab.select?.panel?.headline?.field;
      const entites = (data as { features?: { properties?: Record<string, unknown> }[] })
        .features ?? [];
      return entites
        .map((f) => f.properties ?? {})
        .filter((p) => p[lab.select!.key] === valeur && (!marque || marque in p))
        .sort((a, b) => (champ ? Number(a[champ]) - Number(b[champ]) : 0));
    };

    const dejaLu = cacheDemande.get(url);
    if (dejaLu) {
      source()?.setData(dejaLu);
      setSerie(extraire(dejaLu));
      setChargee(valeur);
      return;
    }

    let annule = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (annule || !data) return;
        cacheDemande.set(url, data);
        source()?.setData(data);
        setSerie(extraire(data));
        setChargee(valeur);
      })
      .catch(() => {
        // Un fichier absent n'est pas une panne : l'entité n'a simplement pas
        // encore ses données. La carte garde tout le reste.
      });

    return () => {
      annule = true;
    };
  }, [choisi, lab.select]);

  /**
   * L'ensemble des entités comparables, lu une fois.
   *
   * Le fichier est celui que la carte a déjà chargé pour dessiner les
   * stations : servi en cache immuable, la requête ne retouche pas le réseau.
   * On le relit ici plutôt que de le demander à MapLibre, qui ne rend que les
   * entités des tuiles visibles — un rang calculé sur l'écran serait faux.
   */
  useEffect(() => {
    const cle = lab.select?.panel?.headline?.compareSource;
    const url = cle ? lab.sources[cle] : undefined;
    if (!url) return;
    let annule = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (annule || !data) return;
        setEnsemble(
          (data.features ?? []).map(
            (f: { properties?: Record<string, unknown> }) => f.properties ?? {},
          ),
        );
      })
      .catch(() => {
        // Sans l'ensemble, le panneau affiche le chiffre sans rang ni moyenne.
      });
    return () => {
      annule = true;
    };
  }, [lab.select, lab.sources]);

  /**
   * Le fondu ENCHAÎNÉ entre deux paliers.
   *
   * Les formes sont précalculées et discrètes, et on ne peut pas interpoler
   * leurs sommets — deux polygones successifs n'ont ni le même nombre de
   * sommets ni la même topologie. On fait donc coexister les deux paliers le
   * temps du passage, chacun avec sa propre opacité.
   *
   * L'ORDRE est ce qui supprime le clignotement. Une version précédente
   * remplaçait la forme d'un coup et faisait monter la nouvelle depuis zéro :
   * acceptable pour une tache, désastreux pour le voile, qui couvre toute la
   * ville. Mesuré : le voile tombait de 0,92 à 0,03 en une image, et toutes les
   * rues de la ville s'allumaient puis s'éteignaient à chaque cran.
   *
   * Désormais, première moitié : le nouveau palier MONTE par-dessus l'ancien,
   * qui reste plein. Seconde moitié : l'ancien s'EFFACE. À aucun instant la
   * ville n'est découverte — hors des deux aires, le voile ne fait que
   * s'épaissir un peu puis revenir. Seul change l'anneau entre les deux
   * bords, qui se révèle ou se recouvre en douceur, dans un sens comme dans
   * l'autre.
   */
  const palierPrecedent = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    const duree = select?.slider?.fade;
    const champ = select?.slider?.field;
    const reveles = select?.revealLayers;
    if (!map || !select || !duree || !champ || !reveles?.length) return;
    if (palierCourant === null) return;

    const avant = palierPrecedent.current;
    palierPrecedent.current = palierCourant;
    if (avant === null || avant === palierCourant || !choisi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const apres = palierCourant;
    const valeurCle = choisi[select.key] as string;

    // Les couches qui fondent : l'aire, son contour et le voile — qu'ils
    // arrivent au chargement ou au clic. Pas les rues du fond : elles ne
    // changent pas d'un palier à l'autre, et les faire varier serait un
    // défaut, pas un effet.
    //
    // L'opacité de repos vient de la DÉFINITION du lab, pas de la carte : lue
    // sur la carte pendant un fondu interrompu, elle aurait pu valoir une
    // expression à mi-chemin.
    const parOpacite = new Set(select.revealByOpacity ?? []);
    const couches: Array<{
      id: string;
      prop: string;
      plein: number;
      declare?: unknown[];
    }> = [];
    for (const index of reveles) {
      if (parOpacite.has(index)) continue;
      const id = `lab-layer-${index}`;
      const couche = map.getLayer(id);
      if (!couche) continue;
      const definition = lab.layers[index];
      const plein =
        definition && "opacity" in definition && definition.opacity !== undefined
          ? definition.opacity
          : couche.type === "fill"
            ? 0.5
            : 1;
      couches.push({
        id,
        prop: couche.type === "fill" ? "fill-opacity" : "line-opacity",
        plein,
        // Le filtre déclaré par la couche (« je suis le voile ») : complété,
        // jamais remplacé — voir l'effet qui applique les filtres.
        declare: definition?.filter,
      });
    }
    if (!couches.length) return;

    // Même échappatoire que pour le `fade` du fond : le nom de la propriété
    // est une variable, la signature typée de MapLibre attend un littéral.
    // `.bind(map)` : sans lui, la méthode rangée dans une variable perd son
    // `this`, chaque appel lève en silence dans le `try`, et le fondu ne se
    // voit jamais.
    const peindre = map.setPaintProperty.bind(map) as (
      id: string,
      nom: string,
      valeur: unknown,
    ) => void;

    const filtre = (declare: unknown[] | undefined, paliers: number[]) =>
      [
        "all",
        ...(declare ? [declare] : []),
        ["==", ["get", select.key], valeurCle],
        ["in", ["get", champ], ["literal", paliers]],
      ] as never;

    // Les deux paliers visibles pendant le passage. Le palier zéro n'a pas de
    // forme : il ne coûte rien de le demander.
    for (const { id, declare } of couches) {
      try {
        map.setFilter(id, filtre(declare, [avant, apres]));
      } catch {
        // Couche disparue : rien à fondre.
      }
    }

    // Fin du passage : retour à un seul palier et à une opacité constante —
    // une expression par entité coûte plus cher qu'un nombre au rendu.
    const conclure = () => {
      for (const { id, prop, plein, declare } of couches) {
        try {
          map.setFilter(id, filtre(declare, [apres]));
          peindre(id, prop, plein);
        } catch {
          // Idem.
        }
      }
    };

    // Courbe douce aux deux bouts : le mouvement démarre et s'arrête sans
    // à-coup, ce qu'une progression linéaire ne fait pas.
    const doux = (x: number) => x * x * (3 - 2 * x);

    // `performance.now()` lu DANS le rappel, et borné à [0, 1]. L'horodatage
    // passé par `requestAnimationFrame` date du début de l'image : il peut
    // précéder l'instant où le fondu a été lancé, et donnait alors une
    // opacité négative que MapLibre refusait — avec, en prime, le bandeau
    // d'erreur.
    const debut = performance.now();
    let image = 0;
    const animer = () => {
      const t = Math.min(1, Math.max(0, (performance.now() - debut) / duree));
      const monte = doux(Math.min(1, t * 2));
      const efface = 1 - doux(Math.max(0, t * 2 - 1));
      for (const { id, prop, plein } of couches) {
        try {
          peindre(id, prop, [
            "case",
            ["==", ["get", champ], apres],
            plein * monte,
            plein * efface,
          ]);
        } catch {
          // Idem.
        }
      }
      if (t < 1) image = requestAnimationFrame(animer);
      else conclure();
    };
    image = requestAnimationFrame(animer);

    // Interrompu par un nouveau cran (curseur glissé vite) : on fige l'état
    // d'arrivée. Le fondu suivant repart de lui, sans saut.
    return () => {
      cancelAnimationFrame(image);
      conclure();
    };
  }, [palierCourant, choisi, lab.select, lab.layers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const basemap = lab.basemap ?? { kind: "none" };

    // Le fond suit le thème du site : on lit le jeton CSS plutôt que de figer
    // une couleur, sinon la carte reste blanche en thème sombre.
    const readBackground = () =>
      getComputedStyle(container).getPropertyValue("--surface-muted").trim() ||
      "#f4f8f5";

    const map = new MapLibreMap({
      container,
      // Tolérance du clic, en pixels : au-delà, MapLibre prend le geste pour
      // un glissement de carte et n'émet pas `click`. Le défaut (3 px) est trop
      // strict pour une vraie main — mesuré : un appui qui dérive de 4 px entre
      // la pression et le relâchement ne sélectionnait plus la station. Huit
      // pixels laissent le clic passer sans gêner le déplacement volontaire.
      clickTolerance: 8,
      style:
        basemap.kind === "style"
          ? basemap.url
          : {
              version: 8,
              // Sans `glyphs`, aucune étiquette ne peut être dessinée : le
              // moteur n'a pas de police à poser. Un lab sans fond qui déclare
              // une couche `label` afficherait donc une carte muette, sans
              // erreur. On pointe le serveur de polices de MapLibre — c'est la
              // seule requête extérieure que fait un lab sans fond, et elle
              // n'intervient que si des étiquettes existent.
              glyphs:
                "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
              sources: {},
              layers: [
                {
                  id: BACKGROUND_LAYER,
                  type: "background",
                  paint: { "background-color": readBackground() },
                },
              ],
            },
      ...("bounds" in lab.view
        ? {
            bounds: boundsPair(lab.view.bounds),
            fitBoundsOptions: fitOptions(lab.view),
          }
        : { center: lab.view.center, zoom: lab.view.zoom }),
      ...cameraFor(lab.view, container.clientWidth < 640),
      minZoom: lab.minZoom,
      maxZoom: lab.maxZoom,
      // La molette zoome directement, sans Ctrl.
      //
      // La contrainte inverse — exiger Ctrl — protège le défilement d'un
      // article quand une carte est posée au milieu du texte. Ici la carte
      // occupe la page entière : il n'y a rien derrière elle à faire défiler,
      // donc rien à protéger, et l'exigence ne faisait que gêner.
      //
      // Le jour où un lab revient s'insérer dans une colonne de lecture, la
      // question se reposera — mais elle se posera pour ce lab-là, pas ici.
      cooperativeGestures: false,
      attributionControl: {
        compact: true,
        // L'attribution d'un fond n'est pas une politesse : la plupart des
        // fournisseurs l'exigent par licence. Elle est déclarée dans le lab
        // plutôt que devinée du style — tous ne la portent pas.
        ...(basemap.kind === "style" && basemap.attribution
          ? { customAttribution: basemap.attribution[lang] }
          : {}),
      },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    /**
     * UN SEUL gestionnaire de survol, pour l'infobulle et pour le curseur.
     *
     * `queryRenderedFeatures` est l'opération la plus chère de MapLibre côté
     * processeur. En appeler deux — une pour l'infobulle, une pour le curseur —
     * à chaque pixel parcouru par la souris rend le déplacement pâteux, bien
     * plus que le volume des données. Une seule passe les sert tous les deux,
     * et un garde-fou d'une image évite les centaines de requêtes qu'une
     * traversée rapide déclencherait pour rien.
     */
    if (lab.hover || lab.select) {
      const cibles = (lab.hover?.layers ?? []).map((i) => `lab-layer-${i}`);
      const cliquables = (lab.select?.layers ?? []).map((i) => `lab-layer-${i}`);

      /**
       * Tolérance de visée, en pixels.
       *
       * `queryRenderedFeatures` sur un point n'interroge que ce pixel-là. Une
       * station fait sept pixels de rayon : viser juste devient un exercice
       * d'adresse, impossible au doigt.
       */
      const TOLERANCE = 12;

      // Les couches existantes ne sont filtrées qu'une fois : `getLayer` à
      // chaque mouvement sur chaque identifiant était du travail répété.
      let couchesPretes: { survol: string[]; clic: string[] } | null = null;
      // Mémorisé SEULEMENT une fois toutes les couches posées. Un survol
      // pendant le chargement — le geste naturel de qui voit la carte
      // apparaître — figeait sinon une liste vide pour toute la session : plus
      // de main au survol, plus de clic sur les stations.
      const couches = () => {
        if (couchesPretes) return couchesPretes;
        const survol = cibles.filter((id) => map.getLayer(id));
        const clic = cliquables.filter((id) => map.getLayer(id));
        const completes =
          survol.length === cibles.length && clic.length === cliquables.length;
        if (completes) couchesPretes = { survol, clic };
        return { survol, clic };
      };

      const boite = (p: { x: number; y: number }) =>
        [
          [p.x - TOLERANCE, p.y - TOLERANCE],
          [p.x + TOLERANCE, p.y + TOLERANCE],
        ] as [[number, number], [number, number]];

      let enAttente = 0;
      let dernierPoint: { x: number; y: number } | null = null;

      const examiner = () => {
        enAttente = 0;
        const point = dernierPoint;
        if (!point) return;
        const { survol, clic } = couches();

        // Le clic d'abord : s'il y a une entité cliquable sous le pointeur,
        // c'est elle qui décide du curseur.
        if (clic.length && map.queryRenderedFeatures(boite(point), { layers: clic }).length) {
          map.getCanvas().style.cursor = "pointer";
          setSurvol(null);
          return;
        }

        if (!survol.length) {
          map.getCanvas().style.cursor = "";
          setSurvol(null);
          return;
        }

        const trouve = map.queryRenderedFeatures([point.x, point.y], {
          layers: survol,
        });
        if (!trouve.length) {
          map.getCanvas().style.cursor = "";
          setSurvol(null);
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        setSurvol({
          x: point.x,
          y: point.y,
          props: trouve[0].properties ?? {},
        });
      };

      map.on("mousemove", (e) => {
        dernierPoint = { x: e.point.x, y: e.point.y };
        if (!enAttente) enAttente = requestAnimationFrame(examiner);
      });

      map.on("mouseout", () => {
        if (enAttente) cancelAnimationFrame(enAttente);
        enAttente = 0;
        dernierPoint = null;
        map.getCanvas().style.cursor = "";
        setSurvol(null);
      });

      // Sélection au clic. Fonctionne aussi au doigt : MapLibre émet `click`
      // sur un appui, là où `mousemove` n'existe pas.
      if (lab.select) {
        map.on("click", (e) => {
          const trouve = map.queryRenderedFeatures(boite(e.point), {
            layers: couches().clic,
          });
          // Un clic à côté referme : c'est le geste attendu, et il évite
          // d'avoir à viser une croix.
          setChoisi(trouve.length ? (trouve[0].properties ?? {}) : null);
        });
      }
    }

    map.on("load", () => {
      // Le fond est un repère, pas le sujet. On masque ce qu'il redit
      // autrement, et on atténue le reste, avant d'ajouter nos couches.
      if (basemap.kind === "style") {
        for (const id of basemap.hideLayers ?? []) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        }

        // Les couches repeintes sont exclues de l'atténuation : `fade` parcourt
        // tout le style, et écraserait l'opacité qu'on vient de poser.
        const preservees = new Set(
          (basemap.restyleLayers ?? [])
            .filter((c) => c.keepOpacity)
            .map((c) => c.id),
        );

        if (basemap.fade !== undefined) {
          // Chaque type de couche a sa propre propriété d'opacité : il n'en
          // existe pas de globale dans la spécification de style.
          const proprietes: Record<string, string[]> = {
            background: ["background-opacity"],
            fill: ["fill-opacity"],
            line: ["line-opacity"],
            symbol: ["icon-opacity", "text-opacity"],
            raster: ["raster-opacity"],
            circle: ["circle-opacity"],
            // Les bâtiments 3D d'un fond : sans cette entrée ils restaient
            // pleinement opaques pendant que tout le reste reculait, et
            // ressortaient donc PLUS que la carte thématique posée dessus.
            "fill-extrusion": ["fill-extrusion-opacity"],
          };
          for (const couche of map.getStyle().layers ?? []) {
            if (preservees.has(couche.id)) continue;
            for (const prop of proprietes[couche.type] ?? []) {
              try {
                // Le nom de la propriété est choisi d'après le type de la
                // couche, ce que la signature typée de MapLibre ne peut pas
                // suivre : elle attend un littéral, on lui passe une variable.
                (
                  map.setPaintProperty as (
                    id: string,
                    nom: string,
                    valeur: unknown,
                  ) => void
                )(couche.id, prop, basemap.fade);
              } catch {
                // Une couche peut refuser la propriété si elle la dérive d'une
                // expression. Ce n'est pas une panne : elle garde son opacité.
              }
            }
          }
        }

        // Repeindre après l'atténuation : le lab a le dernier mot sur les
        // couches qu'il réclame.
        for (const consigne of basemap.restyleLayers ?? []) {
          // Une couche absente du style n'est pas une erreur : un fond qui ne
          // la porte pas ne doit pas empêcher la carte de s'afficher.
          if (!map.getLayer(consigne.id)) continue;

          if (consigne.minzoom !== undefined) {
            // La borne haute du fond est conservée : l'abaisser ne servirait à
            // rien, et la relever ferait disparaître la couche en zoomant.
            const actuel = map.getLayer(consigne.id)?.maxzoom;
            map.setLayerZoomRange(consigne.id, consigne.minzoom, actuel ?? 24);
          }

          for (const [nom, valeur] of Object.entries(consigne.layout ?? {})) {
            try {
              (
                map.setLayoutProperty as (
                  id: string,
                  nom: string,
                  valeur: unknown,
                ) => void
              )(consigne.id, nom, valeur);
            } catch {
              // Propriété inconnue de ce type de couche : on continue.
            }
          }

          for (const [nom, valeur] of Object.entries(consigne.paint ?? {})) {
            try {
              (
                map.setPaintProperty as (
                  id: string,
                  nom: string,
                  valeur: unknown,
                ) => void
              )(consigne.id, nom, valeur);
            } catch {
              // Idem : une consigne qui ne s'applique pas est ignorée plutôt
              // que de faire tomber la carte entière.
            }
          }
        }
      }

      // La lumière n'a d'effet que sur les volumes. Posée après le fond, pour
      // qu'elle vaille aussi pour ses extrusions repeintes.
      if (lab.light) {
        map.setLight({
          anchor: "map",
          ...(lab.light.color ? { color: lab.light.color } : {}),
          ...(lab.light.intensity !== undefined
            ? { intensity: lab.light.intensity }
            : {}),
          ...(lab.light.position ? { position: lab.light.position } : {}),
        });
      }

      for (const [id, url] of Object.entries(lab.sources)) {
        map.addSource(id, { type: "geojson", data: url });
      }

      // La source alimentée au clic naît vide : ses couches existent dès le
      // départ, sinon leur ordre de peinture dépendrait du moment du premier
      // clic.
      if (lab.select?.onDemand) {
        map.addSource(lab.select.onDemand.source, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // L'ordre du tableau est l'ordre de peinture : la dernière couche
      // déclarée est celle qui reste au-dessus.
      //
      // Chaque couche est posée dans son propre `try` : une erreur sur l'une
      // — une source du fond pas encore prête, un filtre mal formé — ne doit
      // pas empêcher les suivantes d'exister. Sans cela, une capa 0 en échec
      // aurait aussi emporté les stations de la capa 8, et le clic n'aurait
      // plus rien trouvé sans qu'aucun message n'explique pourquoi.
      lab.layers.forEach((layer, index) => {
        try {
          poserCouche(layer, index);
        } catch (err) {
          console.error("[lab]", lab.id, `lab-layer-${index}`, "n'a pas pu être posée :", err);
        }
      });

      function poserCouche(layer: typeof lab.layers[number], index: number) {
        const id = `lab-layer-${index}`;

        // Une source partagée par plusieurs couches : le filtre dit laquelle
        // prend quelles entités.
        const filter = layer.filter
          ? { filter: layer.filter as never }
          : {};

        /**
         * Ce qui se déclare pareil quel que soit le type de rendu.
         *
         * `source-layer` nomme la couche interne d'une source en tuiles : sans
         * elle, une couche branchée sur le fond de carte ne dessine rien, et
         * MapLibre ne s'en plaint pas.
         */
        const commun = {
          ...filter,
          ...(layer.sourceLayer ? { "source-layer": layer.sourceLayer } : {}),
          ...(layer.minZoom !== undefined ? { minzoom: layer.minZoom } : {}),
          ...(layer.maxZoom !== undefined ? { maxzoom: layer.maxZoom } : {}),
        };

        switch (layer.kind) {
          case "fill":
            map.addLayer({
              id,
              type: "fill",
              source: layer.source,
              ...commun,
              paint: {
                "fill-color": colorValue(layer.color, container),
                "fill-opacity": layer.opacity ?? 0.5,
                ...(layer.outlineColor
                  ? { "fill-outline-color": layer.outlineColor }
                  : {}),
              },
            });
            break;

          case "extrusion":
            map.addLayer({
              id,
              type: "fill-extrusion",
              source: layer.source,
              ...commun,
              paint: {
                "fill-extrusion-color": colorValue(layer.color, container),
                "fill-extrusion-height": heightValue(layer.height),
                "fill-extrusion-opacity": layer.opacity ?? 0.85,
                // Les blocs montent depuis le sol : une base flottante
                // donnerait une impression d'épaisseur qui ne veut rien dire.
                "fill-extrusion-base": 0,
              },
            });
            break;

          case "line":
            map.addLayer({
              id,
              type: "line",
              source: layer.source,
              ...commun,
              layout: {
                ...(layer.cap ? { "line-cap": layer.cap } : {}),
                ...(layer.join ? { "line-join": layer.join } : {}),
              },
              paint: {
                "line-color": colorValue(layer.color, container),
                // Un nombre ou une expression de zoom : MapLibre accepte les
                // deux, sa signature typée n'en connaît qu'un.
                "line-width": (layer.width ?? 1) as number,
                "line-opacity": layer.opacity ?? 1,
                ...(layer.dash ? { "line-dasharray": layer.dash } : {}),
                ...(layer.gapWidth !== undefined
                  ? { "line-gap-width": layer.gapWidth as number }
                  : {}),
              },
            });
            break;

          case "label":
            map.addLayer({
              id,
              type: "symbol",
              source: layer.source,
              ...commun,
              layout: {
                "text-field": layer.text as never,
                "text-size": layer.size ?? 12,
                // « Noto Sans Regular » est la seule police servie à la fois
                // par le fond de CARTO et par le serveur de repli. Demander une
                // police absente ne lève pas d'erreur : le texte ne s'affiche
                // simplement pas.
                "text-font": [layer.font ?? "Noto Sans Regular"],
                "text-offset": [layer.offsetX ?? 0, layer.offsetY ?? 0],
                "text-anchor": layer.anchor ?? "center",
                // Les étiquettes ne se masquent pas entre elles : sur cinq
                // entités, mieux vaut un chevauchement qu'un nom manquant.
                "text-allow-overlap": layer.allowOverlap ?? true,
                "text-line-height": 1.2,
              },
              paint: {
                "text-color": layer.color ?? "#1a1a1a",
                "text-halo-color": layer.haloColor ?? "#ffffff",
                "text-halo-width": layer.haloWidth ?? 1.5,
              },
            });
            break;

          case "circle":
            map.addLayer({
              id,
              type: "circle",
              source: layer.source,
              ...commun,
              paint: {
                "circle-color": colorValue(layer.color, container),
                "circle-radius": layer.radius ?? 4,
                "circle-opacity": layer.opacity ?? 1,
                ...(layer.strokeColor
                  ? { "circle-stroke-color": layer.strokeColor }
                  : {}),
                "circle-stroke-width": layer.strokeWidth ?? 0,
              },
            });
            break;
        }
      }

      // Les couches révélées naissent éteintes : rien n'est encore choisi, et
      // vingt-neuf aires superposées ne seraient qu'une tache.
      const parOpacite = new Set(lab.select?.revealByOpacity ?? []);
      for (const index of lab.select?.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) continue;

        // Une couche branchée sur le fond de carte n'a pas les champs du
        // GeoJSON du lab : le filtre habituel ne la toucherait jamais. On
        // l'éteint donc par opacité, à zéro, plutôt que par un filtre qui ne
        // la concerne pas.
        if (parOpacite.has(index)) {
          const prop = couche.type === "fill" ? "fill-opacity" : "line-opacity";
          try {
            (
              map.setPaintProperty as (
                id: string,
                nom: string,
                valeur: unknown,
              ) => void
            )(id, prop, 0);
          } catch {
            // Couche sans opacité déclarée : rien à éteindre.
          }
          continue;
        }

        map.setFilter(id, ["==", ["literal", false], true]);
      }

      // La première scène est appliquée dès le chargement — sinon les couches
      // qu'elle masque apparaissent une fraction de seconde.
      applyScene(0, false);
      mapRef.current = map;
    });

    /**
     * Passe à une scène : visibilité des couches, puis déplacement de caméra.
     *
     * `animate` est faux au chargement et quand le lecteur a demandé moins
     * d'animation : la scène est alors atteinte d'un coup. Le contenu est le
     * même dans les deux cas — l'animation n'est jamais porteuse
     * d'information, seulement de confort.
     */
    function applyScene(index: number, animate: boolean) {
      const target = lab.scenes?.[index];
      if (!target) return;

      lab.layers.forEach((_, i) => {
        const id = `lab-layer-${i}`;
        if (!map.getLayer(id)) return;
        const visible = !target.layers || target.layers.includes(i);
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      });

      const view = target.view;
      if (!view) return;

      const camera = cameraFor(view, container!.clientWidth < 640);
      const duration = animate ? target.duration ?? 1600 : 0;

      if ("bounds" in view) {
        map.fitBounds(boundsPair(view.bounds), {
          ...fitOptions(view),
          ...camera,
          duration,
        });
      } else {
        map.easeTo({ center: view.center, zoom: view.zoom, ...camera, duration });
      }
    }

    sceneRef.current = applyScene;

    // Toute erreur est signalée au lecteur, pas seulement les requêtes en
    // échec. Une carte muette est le pire des cas : on cherche dans la console
    // ce que la page aurait pu dire. Le message reste générique — l'auteur a le
    // détail en console.
    map.on("error", (event) => {
      console.error("[lab]", lab.id, event.error);
      // Le bandeau dit « données introuvables » : il ne s'affiche que si l'une
      // de NOS sources n'a pas pu être chargée. Toute erreur l'affichait — une
      // opacité refusée pendant un fondu suffisait à annoncer des données
      // absentes, ce qui était faux et alarmant.
      const source = (event as { sourceId?: string }).sourceId;
      if (source && source in lab.sources) setFailed(true);
    });

    // Un style invalide lève pendant `addLayer`, à l'intérieur du gestionnaire
    // `load` : l'exception n'y est captée ni par `map.on("error")`, ni par un
    // périmètre d'erreur React, qui ne voit pas les rappels asynchrones.
    // Sans ce filet, les couches suivantes disparaissent en silence.
    map.on("load", () => {
      if (!lab.layers.every((_, i) => map.getLayer(`lab-layer-${i}`))) {
        console.error("[lab]", lab.id, "couches manquantes — style invalide ?");
        setFailed(true);
      }
    });

    // Compte rendu de ce que la carte contient réellement, une seconde après
    // le chargement. Sur une carte muette, c'est la seule façon de distinguer
    // « la couche n'existe pas » de « la couche est vide » et de « la couche
    // est là mais hors champ » — trois pannes qui se ressemblent à l'écran.
    map.on("idle", function rapport() {
      map.off("idle", rapport);
      const lignes = lab.layers.map((_, i) => {
        const id = `lab-layer-${i}`;
        if (!map.getLayer(id)) return `${i}:absente`;
        const n = map.queryRenderedFeatures({ layers: [id] }).length;
        return `${i}:${n}`;
      });
      const source = map.getSource(Object.keys(lab.sources)[0]);
      const resume =
        `couches ${lignes.join(" ")} · source ${source ? "ok" : "ABSENTE"} · ` +
        `centre ${map.getCenter().toArray().map((v) => v.toFixed(3)).join(",")} · ` +
        `zoom ${map.getZoom().toFixed(2)} · pitch ${map.getPitch().toFixed(0)}°`;
      // En console seulement : sous la carte, ce relevé prenait la place de
      // ce qu'on vient regarder.
      console.info("[lab]", lab.id, resume);

      // Les couches réclamées au fond : un lab qui en repeint une veut savoir
      // si elle a été trouvée, si elle est dans sa plage de zoom, et si elle
      // dessine quelque chose. Trois pannes qui se ressemblent à l'écran — et
      // qu'un identifiant changé chez le fournisseur du fond suffit à causer.
      if (basemap.kind === "style" && basemap.restyleLayers?.length) {
        const zoom = map.getZoom();
        const etat = basemap.restyleLayers.map((consigne) => {
          const couche = map.getLayer(consigne.id);
          if (!couche) return `${consigne.id}:ABSENTE`;
          const min = couche.minzoom ?? 0;
          const max = couche.maxzoom ?? 24;
          if (zoom < min || zoom > max) {
            return `${consigne.id}:hors-zoom(${min}–${max})`;
          }
          const n = map.queryRenderedFeatures({ layers: [consigne.id] }).length;
          return `${consigne.id}:${n}`;
        });
        console.info("[lab]", lab.id, "fond", etat.join(" "));
      }
    });

    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncBackground = () => {
      if (basemap.kind !== "none" || !map.getLayer(BACKGROUND_LAYER)) return;
      map.setPaintProperty(BACKGROUND_LAYER, "background-color", readBackground());
    };

    /**
     * Les couches dont la couleur est un jeton CSS se relisent au changement
     * de thème.
     *
     * Sans cela, un voile calculé en thème clair resterait clair sur une page
     * devenue sombre — et comme il couvre tout l'écran, l'erreur ne serait pas
     * un détail : la carte deviendrait illisible d'un coup.
     */
    const syncCouleurs = () => {
      lab.layers.forEach((layer, index) => {
        const couleur = layer.color;
        if (
          !couleur ||
          typeof couleur === "string" ||
          Array.isArray(couleur) ||
          !("cssVar" in couleur)
        ) {
          return;
        }
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) return;
        const prop =
          couche.type === "fill"
            ? "fill-color"
            : couche.type === "line"
              ? "line-color"
              : couche.type === "circle"
                ? "circle-color"
                : "fill-extrusion-color";
        try {
          map.setPaintProperty(id, prop, colorValue(couleur, container));
        } catch {
          // Couche disparue entre-temps : rien à repeindre.
        }
      });
    };

    const suivreTheme = () => {
      syncBackground();
      syncCouleurs();
    };
    theme.addEventListener("change", suivreTheme);

    /**
     * La carte suit la taille de SON conteneur, pas celle de la fenêtre.
     *
     * MapLibre ne se redimensionne seul que sur `resize` de la fenêtre. Or le
     * conteneur change aussi quand la grille se recalcule — panneau à côté
     * ou dessous, police chargée en retard, barre de défilement qui apparaît.
     * Sans cet observateur, le canevas garde sa première mesure et les clics
     * tombent à côté de ce qui est dessiné.
     */
    const observateur = new ResizeObserver(() => map.resize());
    observateur.observe(container);

    return () => {
      observateur.disconnect();
      theme.removeEventListener("change", suivreTheme);
      sceneRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [lab, lang, fill]);

  const current = scenes[scene];

  /**
   * Le panneau n'existe que pour un lab qui déclare une sélection.
   *
   * Les labs sans clic — une carte qu'on lit sans la manipuler — gardent leur
   * pleine largeur : une colonne vide à côté d'eux ne dirait rien.
   *
   * EN PLEIN ÉCRAN, il n'apparaît qu'une fois une entité choisie : on y entre
   * pour regarder la carte, qui prend alors tout l'écran. Le clic sur une
   * station ouvre le panneau ; le fermer rend l'écran entier à la carte.
   * L'observateur de taille redimensionne MapLibre à chaque bascule.
   */
  const panneau = Boolean(lab.select) && (!pleinEcran || Boolean(choisi));

  // Le titre du panneau : le champ déclaré, sinon la clé elle-même.
  const titrePanneau = choisi
    ? String(choisi[lab.select?.titleField ?? lab.select?.key ?? ""] ?? "")
    : "";

  return (
    <div
      ref={wrapperRef}
      // En plein écran, le conteneur devient la page : il prend toute la
      // hauteur et reçoit un fond, sinon le navigateur peint du noir autour
      // des boutons et de la légende.
      className={
        pleinEcran
          ? "flex h-full flex-col bg-surface p-4"
          : fill
            ? "relative flex h-full flex-col"
            : "relative"
      }
    >
      {/*
        Carte et panneau côte à côte.

        Le panneau est DEHORS, jamais posé sur la carte : un panneau en
        surimpression masque le territoire au moment précis où le lecteur veut
        le regarder, et il masque le plus souvent ce qui entoure l'entité
        choisie — c'est-à-dire ce qu'on vient d'ouvrir.

        La colonne garde sa largeur même sans sélection : sans cela la carte
        s'élargirait et se rétrécirait à chaque clic, et MapLibre redessinerait
        tout à chaque fois. Sous 1024 px le panneau passe SOUS la carte — à
        cette largeur, deux colonnes donnent deux bandes trop étroites pour
        l'une comme pour l'autre.
      */}
      {/*
        Les rangées sont DÉCLARÉES, et c'est vital : sans elles, la rangée de
        la carte prend la hauteur de son contenu — or un conteneur MapLibre
        n'a pas de contenu, il a une taille. La carte s'initialisait alors dans
        41 px de haut, le cadrage échouait, et elle s'ouvrait centrée sur
        0° / 0° : aucune station à l'écran, donc aucun clic possible.
        `minmax(0, 1fr)` donne à la carte toute la hauteur restante, et le `0`
        l'autorise à rétrécir au lieu de pousser la page.

        Sous 1024 px, le panneau passe dessous, et la hauteur est PARTAGÉE :
        trois cinquièmes pour la carte, deux pour le panneau, qui défile en
        interne. Une rangée `auto` laissait le panneau prendre ce qu'il voulait
        — la carte tombait à une bande de 41 px, stations hors champ.

        Hors plein cadre (`fill` absent), la carte a sa hauteur fixe : des
        rangées automatiques suffisent.
      */}
      <div
        className={`grid min-h-0 gap-3 ${
          !(pleinEcran || fill)
            ? panneau
              ? "lg:grid-cols-[1fr_20rem]"
              : ""
            : panneau
              ? "grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-[1fr_20rem] lg:grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[minmax(0,1fr)]"
        } ${pleinEcran || fill ? "flex-1" : ""}`}
      >
        {/*
          Le conteneur de la carte porte son propre `relative` : le bouton de
          plein écran s'ancre à LA CARTE. Ancré à la grille entière, il
          tombait sur le panneau et masquait la borne du curseur.
        */}
        <div
          className={`relative min-h-0 ${pleinEcran || fill ? "h-full" : ""}`}
        >
          <div
            ref={containerRef}
            role="region"
            aria-label={label}
            className={`w-full overflow-hidden rounded-xl border border-line ${
              pleinEcran || fill ? "h-full" : "h-[420px] sm:h-[520px]"
            }`}
          />

          {/*
            Plein écran. Placé dans le flux plutôt qu'en surimpression sur la
            carte : un bouton posé sur la carte masque une partie des données, et
            se retrouve sous le curseur au moment où l'on explore.
          */}
          <button
            type="button"
            onClick={basculerPleinEcran}
            aria-pressed={pleinEcran}
            // Sous la pile de zoom de MapLibre, pas à côté : ses deux boutons
            // s'ancrent eux aussi en haut à droite, et se recouvraient. `top-24`
            // laisse passer les deux (29 px chacun) plus leur marge.
            className="absolute right-[10px] top-24 z-10 rounded-lg border border-line bg-surface/90 p-2 text-fg-muted shadow-sm backdrop-blur-sm transition-colors hover:text-fg"
            title={
              pleinEcran
                ? lang === "fr" ? "Quitter le plein écran" : "Exit full screen"
                : lang === "fr" ? "Plein écran" : "Full screen"
            }
          >
            <span className="sr-only">
              {pleinEcran
                ? lang === "fr" ? "Quitter le plein écran" : "Exit full screen"
                : lang === "fr" ? "Plein écran" : "Full screen"}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {pleinEcran ? (
                <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
              ) : (
                <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
              )}
            </svg>
          </button>
        </div>

        {panneau && (
          <LabPanel
            titre={titrePanneau}
            lignes={lab.select?.rows ?? []}
            donnees={mesures ?? {}}
            curseur={curseur}
            palier={palierCourant}
            onPalier={setPalier}
            onFermer={() => setChoisi(null)}
            config={lab.select?.panel}
            entite={choisi}
            serie={serie}
            ensemble={ensemble}
            lang={lang}
            vide={lab.select?.empty}
            legende={lab.legend}
          />
        )}
      </div>


      {/*
        Des boutons, pas un défilement détourné : le défilement narratif se
        bat avec celui de l'article, casse sur mobile et ne se pilote pas au
        clavier. Trois boutons marchent partout.
      */}
      {scenes.length > 1 && (
        <div className="mt-3">
          <div
            role="tablist"
            aria-label={label}
            className="flex flex-wrap gap-2"
          >
            {scenes.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={i === scene}
                onClick={() => setScene(i)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  i === scene
                    ? "border-fg bg-fg text-surface"
                    : "border-line text-fg-muted hover:text-fg"
                }`}
              >
                <span aria-hidden="true" className="mr-1.5 tabular-nums opacity-60">
                  {i + 1}
                </span>
                {s.label[lang]}
              </button>
            ))}
          </div>

          {current?.caption && (
            <p
              // `aria-live` : le texte change sans que la page bouge, donc un
              // lecteur d'écran ne le verrait jamais sans annonce.
              aria-live="polite"
              className="mt-3 text-sm leading-relaxed text-fg-muted"
            >
              {current.caption[lang]}
            </p>
          )}
        </div>
      )}

      {survol && lab.hover && (
        <div
          // `pointer-events-none` : sans cela l'infobulle passe sous le
          // curseur et déclenche un clignotement sans fin.
          // Teinte d'eau plutôt que la surface neutre du site : l'infobulle
          // appartient à une carte dont l'eau est le sujet. Le bleu reste très
          // dilué — assez pour situer, pas assez pour concurrencer les marques.
          className="pointer-events-none absolute z-10 max-w-64 rounded-lg border border-sky-200/70 bg-sky-50/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm dark:border-sky-900/60 dark:bg-slate-900/95 dark:text-slate-200"
          style={{
            left: Math.min(survol.x + 14, (containerRef.current?.clientWidth ?? 0) - 220),
            top: survol.y + 14,
          }}
        >
          {lab.hover.rows.map((row) => {
            // Une ligne conditionnelle ne s'écrit que pour l'entité qu'elle
            // concerne : un lac n'a pas de population, une municipalité
            // desservie n'a pas de part de bassin.
            if (row.when) {
              const brut = survol.props[row.when.field];
              const attendu = row.when.equals;
              const valeur =
                typeof brut === "string" && typeof attendu === "boolean"
                  ? brut === "true"
                  : brut;
              if (valeur !== attendu) return null;
            }

            const v = survol.props[row.field];
            if (v === undefined || v === null || v === "") return null;

            if (row.title) {
              return (
                <p key={row.field} className="font-semibold text-sky-950 dark:text-sky-100">
                  {String(v)}
                  {row.suffix ?? ""}
                </p>
              );
            }

            // Une série temporelle arrive en texte : MapLibre sérialise les
            // propriétés imbriquées d'une entité GeoJSON.
            if (row.spark) {
              const serie: Record<string, number> | null =
                typeof v === "string"
                  ? (JSON.parse(v) as Record<string, number>)
                  : (v as Record<string, number>);
              if (!serie || typeof serie !== "object") return null;
              const annees = Object.keys(serie).sort();
              return (
                <div key={row.field} className="mt-2 border-t border-sky-200/70 pt-2 dark:border-sky-900/60">
                  <p className="text-slate-500 dark:text-slate-400">
                    {row.label ? row.label[lang] : ""}
                  </p>
                  <Courbe
                    serie={serie}
                    color={row.spark.color}
                    hauteur={row.spark.height}
                  />
                  <p className="flex justify-between tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {annees[0]} · {serie[annees[0]].toLocaleString(lang)}
                    </span>
                    <span>
                      {annees[annees.length - 1]} ·{" "}
                      {serie[annees[annees.length - 1]].toLocaleString(lang)}
                    </span>
                  </p>
                </div>
              );
            }

            if (row.bar) {
              return (
                <div key={row.field} className="mt-1">
                  <p className="text-slate-500 dark:text-slate-400">
                    {row.label ? `${row.label[lang]} : ` : ""}
                    <span className="tabular-nums font-medium text-sky-950 dark:text-sky-100">{String(v)}</span>
                    {row.suffix ?? ""}
                  </p>
                  <Barre
                    valeur={Number(v)}
                    max={row.bar.max}
                    color={row.bar.color}
                  />
                </div>
              );
            }

            return (
              <p key={row.field} className="text-slate-500 dark:text-slate-400">
                {row.label ? `${row.label[lang]} : ` : ""}
                <span className="tabular-nums font-medium text-sky-950 dark:text-sky-100">
                  {String(v)}
                </span>
                {row.suffix ?? ""}
              </p>
            );
          })}
        </div>
      )}

      {/*
        En plein écran, la légende est reprise ici : celle de l'entrée vit
        dans `LabEmbed`, hors du conteneur agrandi, et disparaîtrait donc au
        moment précis où la carte occupe tout l'écran.
      */}
      {pleinEcran && lab.legend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {lab.legend.map((item) => (
            <li key={item.label.en} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm border border-line"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-fg-muted">{item.label[lang]}</span>
            </li>
          ))}
        </ul>
      )}

      {failed && (
        <p
          role="status"
          className="absolute inset-x-3 bottom-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg-muted"
        >
          {errorLabel}
        </p>
      )}
    </div>
  );
}
