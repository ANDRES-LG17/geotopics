---
name: video-mapa
description: Crea un video corto y profesional (LinkedIn 4:5 y/o blog 16:9) de un lab de mapa del sitio GeoTopics, pilotando la interfaz real del mapa, y redacta el post de LinkedIn. Usar cuando el usuario pida "haz el video del lab X", "video para LinkedIn de un mapa" o invoque /video-mapa.
---

# Video de mapa para LinkedIn

Objetivo: que el público de LinkedIn (reclutadores y gente de geomática en Quebec) **no haga scroll** y **vaya a la web**. El video muestra el mapa funcionando desde el primer segundo y termina invitando a probarlo.

Responde al usuario en **español**. Los textos del video y del post van en **francés** (preparados también en inglés).

## Reglas que no se negocian

- **Todo desde el primer segundo.** Nada de intro ni logo. El primer fotograma ya es el mapa funcionando, con un título gancho. (El primer video publicado falló porque las herramientas tardaban en aparecer.)
- **30 s aprox., 1080×1350 (4:5), silencio.** Subtítulos siempre (LinkedIn arranca sin sonido).
- **Estilo sobrio y técnico.** Colores y tipografía del lab (Geist), una idea por escena, de 4 a 6 s cada una.
- **Las cifras salen del mapa**, leídas del panel durante la grabación (`v.text(...)`), o de las notas del lab. Nunca inventar una cifra. Si falta una fuente, decirlo.
- **Cambios mínimos en el sitio.** El único enganche es `?video=1` en `LabMap.tsx` (expone `window.__geoVideo.map`). No tocar nada más del lab sin preguntar.
- **No publicar ni hacer commit sin que el usuario lo pida.**

## Paso 1 — Preguntas (con AskUserQuestion, todas de una vez)

1. **¿Qué lab?** Lista los ids de `src/labs/index.ts` como opciones.
2. **¿Cuál es el mensaje principal?** Propón 2 o 3 ganchos sacados de lo que el lab sabe hacer (por ejemplo, el contraste verano/invierno, una barrera, un hallazgo con cifra).
3. **¿Qué formatos?** Solo LinkedIn 4:5 (recomendado) / 4:5 + blog 16:9.
4. **¿Idioma?** Francés (recomendado) / francés + inglés.

Si el usuario ya dio alguna respuesta en su mensaje, no la vuelvas a preguntar.

## Paso 2 — Estudiar el lab (solo leer)

- Lee `src/labs/<id>.ts`: capas, escenas, `reach`, paneles, textos y fuentes de las cifras.
- Busca en `src/components/LabMap.tsx` y `ReachPanel.tsx` los controles que se pueden pilotar: teclas (H = estación, Escape = soltar), `#vue-portee`, botones de escena, clic para fijar.
- Lee las notas del atelier (`geodata/<nn>-<id>/JOURNAL.md`, `CONTEXTE-*.md`) para los datos citables.

## Paso 3 — Proponer el guion y esperar aprobación

Presenta una tabla **Tiempo | Imagen | Texto en pantalla** (unas 6 escenas):

| Tiempo | Rol |
|---|---|
| 0–3 s | Gancho: la herramienta más llamativa ya en marcha y un título grande |
| 3–25 s | De 3 a 4 herramientas, 4–6 s cada una, con zoom al panel si la cifra importa |
| 25–30 s | Tarjeta final: « Essayez depuis votre adresse » · geotopics.vercel.app · nombre |

**No escribas código hasta que el usuario apruebe el guion.**

## Paso 4 — Escribir el storyboard

Archivo: `scripts/video/storyboards/<id>.mjs`. Copia la estructura de `velo-quebec-levis.mjs`. API (`v`):

| Llamada | Efecto |
|---|---|
| `v.setup(fn)` | Antes de la primera imagen: `v.jump(vista)` y **precargar** los datos que se cargan al primer uso (vistas, estaciones, clic + Escape) |
| `v.at([lon,lat])` / `v.glide([[lon,lat]…], s)` | Posa o desliza el cursor (la mancha lo sigue) |
| `v.camera({center,zoom}, s)` | Movimiento de cámara suave |
| `v.key("h")`, `v.select(sel, valor)`, `v.click()` | Interacciones reales |
| `v.zoom(selector \| "full", s, pad)` | Zoom de montaje (captura en 2×, sin pérdida) |
| `v.caption("hook" \| "lower" \| "end", título, sub, s, extra)` | Títulos `{fr, en}` |
| `v.wait(s)` | **Lo único que avanza el tiempo**; todo lo demás arranca en paralelo |
| `v.text(selector)` | Lee el panel para poner cifras reales en los títulos |

Selectores útiles: panel izquierdo `aside:not([aria-hidden])`, panel de resultados `aside[aria-hidden="false"]`.

## Paso 5 — Generar

1. El sitio tiene que estar encendido: comprueba `http://localhost:3000`; si no responde, lanza `npm run dev` en segundo plano.
2. `npm run video -- <id>` (añade `--format 16x9` o `--lang en` según lo pedido). Tarda unos 5–10 min: lánzalo en segundo plano.
   - Se puede rehacer una sola etapa: `--only record|overlay|compose`.
   - ffmpeg se busca en `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*` (el enlace de `WinGet\Links` no se ejecuta desde Node).

## Paso 6 — Revisar ANTES de enseñarlo

Haz una hoja de fotogramas y mírala:

```powershell
$ff=(Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe | Select-Object -First 1).FullName
& $ff -y -loglevel error -i videos\<id>\<id>-4x5-fr.mp4 -vf "select='eq(n\,5)+eq(n\,90)+eq(n\,200)+eq(n\,320)+eq(n\,450)+eq(n\,560)+eq(n\,680)+eq(n\,820)',scale=540:-1,tile=4x2" -frames:v 1 <scratchpad>\hoja.jpg
```

Comprueba: el cursor de bici se ve, los paneles muestran datos (nada de "—"), los títulos no tapan lo importante y la tarjeta final se lee. Corrige y vuelve a generar si hace falta.

Después entrega la **ruta completa** del video (`E:\Documents\PROFESIONAL\CV\BLOG\videos\<id>\…mp4`) y una tabla de lo que se ve, escena por escena.

## Paso 7 — Post de LinkedIn

Pregunta (AskUserQuestion): **¿post nuevo o repost?** y **¿qué ángulo?** (propón 2 o 3 que no repitan posts anteriores).

Formato que le gusta al usuario (el de su primer post):

```
<Gancho de una línea con contraste> 🚲❄️

<2–3 frases: el problema urbano general (ciudad de 15 min, movilidad activa, cuatro estaciones) y qué hace el mapa>

Ce qu'elle révèle :
→ <hallazgo con cifra y fuente>
→ <hallazgo>
→ <hallazgo>

<Frase de cierre: la idea para planificar la ciudad>

👉 La carte est dans le premier commentaire.

[opcional] Je cherche à mettre ce genre d'analyse au service d'une équipe à Québec.

#Vélo #MobilitéActive #TransportDurable #VilleDes15Minutes #Urbanisme (+ 1 o 2 del tema)
```

- Corto. Habla de temas generales (movilidad, urbanismo), con Québec–Lévis como ejemplo.
- El enlace va en el **primer comentario**, no en el post: `https://geotopics.vercel.app/fr/blog/<id>`.
- Debajo del post, di de dónde sale cada cifra.

## Si el video ya está aprobado para el blog

Copia el `.mp4`, el `.webm` y el `.webp` (16:9) a `public/data/` con sufijo de versión (`-v1`), solo si el usuario lo pide.
