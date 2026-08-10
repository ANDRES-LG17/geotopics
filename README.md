# GeoTopics

Carnet bilingüe (FR/EN) de geomática, CAD y cartografía. **No es una página de servicios:** es un blog donde cada proyecto se cuenta como una entrada.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · next-intl · TypeScript

---

## Arranque rápido

```bash
npm install
npm run dev
```

- Francés (por defecto): http://localhost:3000/fr
- Inglés: http://localhost:3000/en

---

## La idea central: un proyecto es una entrada

No hay "portafolio" separado del "blog". Todo vive en `content/entries/` como markdown y se distingue por el campo `category`:

| `category`  | Se muestra como     |
| ----------- | ------------------- |
| `storymap`  | Story Maps          |
| `gis`       | SIG                 |
| `cad`       | CAO                 |
| `web`       | Web                 |
| `lab`       | Cartes interactives |

Una entrada `storymap` embebe su mapa automáticamente encima del texto. Una entrada con el campo `lab` embebe una carta MapLibre propia en ese mismo sitio — ver [Cartas interactivas](#cartas-interactivas-labs).

---

## Añadir una entrada

Crea **dos** archivos con el mismo slug:

```
content/entries/mi-proyecto.fr.md
content/entries/mi-proyecto.en.md
```

```markdown
---
title: "Título de la entrada"
description: "Resumen de una o dos líneas. Es lo que se ve en Google y en LinkedIn."
date: "2026-08-15"
category: "storymap"
tools: ["ArcGIS StoryMaps", "ArcGIS Pro"]
storyMapUrl: null
lab: null # id de una carta interactiva de src/labs/
draft: false # true = solo visible en desarrollo
---

Contenido en markdown…
```

El slug idéntico en ambos idiomas es lo que permite que el selector FR/EN salte a la traducción de la misma entrada. El tiempo de lectura se calcula solo. Las categorías sin ninguna entrada no muestran filtro.

### Borradores

`draft: true` deja la entrada **solo en desarrollo**: en el sitio publicado no existe ni la página, ni el enlace, ni la línea en el RSS o el sitemap. Un solo interruptor (`NODE_ENV`), para que la regla sea fácil de tener en la cabeza.

### Publicar una Story Map

1. Abre tu historia en [storymaps.arcgis.com](https://storymaps.arcgis.com)
2. Publícala con acceso **«Everyone (public)»** — sin esto el iframe sale vacío
3. Pega la URL en `storyMapUrl`

Mientras sea `null`, se muestra un estado "próximamente" limpio en lugar de un marco roto. El mapa no se carga hasta que el lector hace clic: una Story Map pesa varios MB y no debe penalizar a quien solo viene a leer.

---

## Cartas interactivas (labs)

Un **lab** es una carta MapLibre propia, con datos precalculados, incrustada dentro de una entrada. No es una página aparte: vive bajo la introducción del artículo, en el mismo sitio que ocupa una Story Map. La regla del carnet no cambia — un proyecto es una entrada, nunca un segundo sitio al lado del primero.

### La arquitectura en una línea

> El cálculo pesado ocurre **una vez, en tu máquina**; el sitio solo sirve un archivo.

Sin base de datos, sin backend, sin clave de API. Un lab sin fondo de mapa no hace ni una sola petición fuera del propio sitio, así que no puede dejar de funcionar porque una cuenta de terceros haya caducado.

### Los tres archivos de un lab

```
scripts/build-mi-lab.mjs        1. calcula  → escribe el GeoJSON
public/data/mi-lab-v1.geojson   2. el dato, versionado en git
src/labs/mi-lab.ts              3. qué dibujar: capas, colores, leyenda, fuente
```

Y en el front matter de la entrada: `lab: "mi-lab"`. Nada más que conectar.

### Crear uno

1. `cp scripts/build-demo-isochrones.mjs scripts/build-mi-lab.mjs` y sustituye la sección de datos de entrada. Ver [`scripts/README.md`](scripts/README.md).
2. `cp src/labs/demo-isochrones.ts src/labs/mi-lab.ts` y ajusta capas, colores, emprisa y leyenda.
3. Regístralo en [`src/labs/index.ts`](src/labs/index.ts) — una línea.
4. Crea la entrada FR/EN con `lab: "mi-lab"`.

El gabarit completo y funcional está en `content/entries/demo-carte-interactive.*.md` (borrador: se ve con `npm run dev`, nunca en producción).

### Decisiones que ya están tomadas

- **MapLibre GL JS, no Mapbox GL.** Licencia BSD, sin token, sin facturación por cargas. Mapbox GL es propietario desde la v2: un token que caduca es un mapa que se rompe solo dentro de seis meses.
- **Sin fondo de mapa por defecto.** Los datos se leen mejor sin el ruido de un fondo, y ningún tercero entra en la ecuación. Si algún día hace falta, `basemap: { kind: "style", url }` acepta cualquier estilo MapLibre — revisa entonces las condiciones de uso del proveedor, que es por donde vuelve la factura.
- **Carga bajo demanda.** MapLibre (~250 KB) y los datos solo se descargan cuando el lector pulsa el botón. Quien viene únicamente a leer no paga ese peso.
- **La leyenda, la nota de método y la fuente se renderizan siempre**, antes del clic: siguen siendo legibles sin JavaScript e indexables.
- **`Cache-Control: immutable` sobre `/data/*`.** Por eso los nombres llevan versión — un archivo publicado no se sobrescribe nunca. Ver [`public/data/README.md`](public/data/README.md).

### Qué NO hace esta arquitectura

No hay cálculo en la visita, así que nada de rutas a la carta, geocodificación en vivo ni consultas del usuario contra una base. Si un proyecto lo necesita de verdad, merece su propio repositorio y despliegue; el carnet se queda con el artículo y el enlace.

---

## El fondo de la portada

No es una textura: es una **escena axonométrica** — un tejido urbano extruido que se enrarece hasta dejar solo el relieve, con las curvas de nivel llevadas a su altura real. Un modelo LOD1 sobre un MNT.

```bash
npm run topo     # regenera public/topo/scene-v1.svg
```

**La regla que lo gobierna: tinta constante.** El ojo no cuenta trazos, percibe cantidad de tinta. Por eso las dos capas no se superponen — bajo la ciudad se dibujan *menos* curvas, no curvas más tenues, y cada nivel se retira a una densidad urbana distinta para que no se vea una costura.

Los valores por defecto de [`scripts/build-topo-scene.mjs`](scripts/build-topo-scene.mjs) no son estimaciones: salen de medir la densidad de tinta columna por columna. El resultado instalado da **tinta 0,80 y variación 25,7%** (el fondo anterior, solo curvas, daba 0,63 y 20,5%). Es medidamente más denso, a cambio de que la portada hable de urbanismo.

Todos los parámetros se ajustan por variable de entorno, para rehacer el barrido sin editar el archivo:

```bash
ZOOM=2.8 LEVELS=16 node scripts/build-topo-scene.mjs
```

`SEED` redibuja el terreno y la ciudad por completo.

---

## Dónde editar cada cosa

| Quiero cambiar…              | Archivo                  |
| ---------------------------- | ------------------------ |
| Textos de la interfaz (FR)   | `messages/fr.json`       |
| Textos de la interfaz (EN)   | `messages/en.json`       |
| Entradas (proyectos/artículos) | `content/entries/*.md` |
| Cartas interactivas          | `src/labs/*.ts`          |
| Datos de las cartas          | `public/data/*.geojson`  |
| Herramientas de À propos     | `src/data/toolbox.ts`    |
| Email, LinkedIn, GitHub, URL | `src/lib/site.ts`        |
| Colores y tipografía         | `src/app/globals.css`    |

---

## Frontera servidor / cliente

Dos módulos separados a propósito:

- `src/lib/entries.ts` — tipos, categorías, formato de fecha. **Importable desde el cliente.**
- `src/lib/content.ts` — lee los markdown del disco. **Solo servidor** (lleva `import "server-only"`).

Si un componente cliente importa `content.ts`, el build falla de inmediato con un mensaje claro en vez de un error críptico sobre `node:fs`.

---

## LinkedIn

Es el canal principal del sitio, así que está cuidado:

- **Una imagen OG por entrada**, generada con su título y su categoría. Al compartir sale una tarjeta diseñada, no un enlace pelado.
- Botón *Partager sur LinkedIn* al pie de cada entrada.
- LinkedIn ocupa el lugar del CV en À propos. **No se aloja ningún PDF personal en el sitio.**

LinkedIn cachea las vistas previas de forma agresiva. Si cambias el título de una entrada ya compartida, pasa la URL por el [Post Inspector](https://www.linkedin.com/post-inspector/) para forzar el refresco.

---

## SEO bilingüe

Configurado, no requiere mantenimiento: `hreflang` recíproco FR ⇄ EN + `x-default`, canónica por idioma, Open Graph, `sitemap.xml` con las dos versiones de cada URL, y `robots.txt`.

Define `NEXT_PUBLIC_SITE_URL` en Vercel cuando tengas el dominio final.

---

## Despliegue en Vercel

```bash
gh repo create geotopics --public --source=. --push
```

Luego importa el repo en [vercel.com/new](https://vercel.com/new). Vercel detecta Next.js automáticamente.

---

## Scripts

```bash
npm run dev        # desarrollo con Turbopack (los borradores se ven aquí)
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run data:demo  # regenera los datos del lab de demostración
npm run topo       # regenera la escena axonométrica del fondo de la portada
```
