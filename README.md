# GeoTopics

Portafolio profesional bilingüe (FR/EN) en geomática, CAD y cartografía narrativa.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · next-intl · TypeScript

---

## Arranque rápido

```bash
npm install
npm run dev
```

- Francés (por defecto): http://localhost:3000/fr
- Inglés: http://localhost:3000/en

`/` redirige automáticamente según el idioma del navegador.

---

## Dónde editar cada cosa

| Quiero cambiar…                    | Archivo                                      |
| ---------------------------------- | -------------------------------------------- |
| Textos de la interfaz (FR)         | `messages/fr.json`                            |
| Textos de la interfaz (EN)         | `messages/en.json`                            |
| Proyectos del portafolio           | `src/data/projects.ts`                        |
| Story Maps (URLs de ArcGIS)        | `src/data/storymaps.ts`                       |
| Experiencia, formación, skills     | `src/data/cv.ts`                              |
| Email, LinkedIn, GitHub, URL       | `src/lib/site.ts`                             |
| Colores y tipografía               | `src/app/globals.css`                         |
| Artículos del blog                 | `content/blog/*.md`                           |
| CV en PDF                          | `public/cv/`                                  |

**Regla general:** los textos van en `messages/*.json`, los datos estructurados en `src/data/`. No hace falta tocar los componentes para actualizar contenido.

---

## Añadir un artículo al blog

Crea **dos** archivos en `content/blog/` con el mismo slug:

```
content/blog/mi-articulo.fr.md
content/blog/mi-articulo.en.md
```

Con este encabezado:

```markdown
---
title: "Título del artículo"
description: "Resumen de una o dos líneas (se usa en Google y LinkedIn)."
date: "2026-08-15"
tags: ["SIG", "Python"]
---

Contenido en markdown…
```

El slug idéntico en ambos idiomas es lo que permite que el selector FR/EN salte
a la traducción del mismo artículo. El tiempo de lectura se calcula solo.

---

## Publicar una Story Map

1. Abre tu historia en [storymaps.arcgis.com](https://storymaps.arcgis.com)
2. Publícala con acceso **«Everyone (public)»** — sin esto el iframe sale vacío
3. Copia la URL y pégala en el campo `embedUrl` de `src/data/storymaps.ts`

Mientras `embedUrl` sea `null`, la tarjeta muestra un estado «próximamente»
en lugar de un marco roto.

---

## Formulario de contacto

Usa [Resend](https://resend.com) (plan gratuito: 3000 correos/mes).

1. Crea la cuenta y genera una API key
2. Añádela como `RESEND_API_KEY` en Vercel → Settings → Environment Variables
3. Redespliega

Sin la clave, el formulario valida los campos pero devuelve error al enviar.
La ruta incluye validación en servidor y un campo trampa contra bots.

---

## SEO bilingüe

Ya configurado, no requiere mantenimiento:

- `hreflang` recíproco FR ⇄ EN + `x-default` en todas las páginas
- URL canónica por idioma
- Open Graph con imagen generada automáticamente (se ve bien al compartir en LinkedIn)
- `sitemap.xml` con las dos versiones de cada URL
- `robots.txt`

Solo define `NEXT_PUBLIC_SITE_URL` en Vercel cuando tengas el dominio final.

---

## Despliegue en Vercel

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create geotopics --public --source=. --push
```

Luego importa el repo en [vercel.com/new](https://vercel.com/new). No hace falta
configuración: Vercel detecta Next.js automáticamente. Añade las variables de
entorno de `.env.example` antes del primer despliegue.

---

## Scripts

```bash
npm run dev     # desarrollo con Turbopack
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
```
