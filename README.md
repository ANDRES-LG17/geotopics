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

| `category`  | Se muestra como |
| ----------- | --------------- |
| `storymap`  | Story Maps      |
| `gis`       | SIG             |
| `cad`       | CAO             |
| `web`       | Web             |

Una entrada `storymap` embebe su mapa automáticamente encima del texto.

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
---

Contenido en markdown…
```

El slug idéntico en ambos idiomas es lo que permite que el selector FR/EN salte a la traducción de la misma entrada. El tiempo de lectura se calcula solo. Las categorías sin ninguna entrada no muestran filtro.

### Publicar una Story Map

1. Abre tu historia en [storymaps.arcgis.com](https://storymaps.arcgis.com)
2. Publícala con acceso **«Everyone (public)»** — sin esto el iframe sale vacío
3. Pega la URL en `storyMapUrl`

Mientras sea `null`, se muestra un estado "próximamente" limpio en lugar de un marco roto. El mapa no se carga hasta que el lector hace clic: una Story Map pesa varios MB y no debe penalizar a quien solo viene a leer.

---

## Dónde editar cada cosa

| Quiero cambiar…              | Archivo                  |
| ---------------------------- | ------------------------ |
| Textos de la interfaz (FR)   | `messages/fr.json`       |
| Textos de la interfaz (EN)   | `messages/en.json`       |
| Entradas (proyectos/artículos) | `content/entries/*.md` |
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
npm run dev     # desarrollo con Turbopack
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
```
