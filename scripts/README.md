# Precálculo

Aquí vive el trabajo pesado. Se ejecuta **a mano, en tu máquina**, no en el servidor:

```bash
node scripts/build-demo-isochrones.mjs
```

El resultado se escribe en `public/data/` y se versiona en git junto al código. El sitio publicado solo sirve ese archivo.

## Por qué así

Es el mismo patrón que usa Chronotrains, sin la base de datos: ellos recorren el grafo ferroviario europeo una vez y guardan el resultado en Postgres porque son ~20 000 estaciones. A escala de una región, el resultado cabe en un archivo — y un archivo se versiona, se revisa en un diff y sigue funcionando dentro de cinco años sin que nadie mantenga nada encendido.

La regla: **si un cálculo puede hacerse antes, no se hace en la visita.**

## Los tres tiempos de un script

1. leer los datos de origen;
2. calcular;
3. escribir un GeoJSON versionado en `public/data/`.

`build-demo-isochrones.mjs` es el ejemplo mínimo y comentado. Cópialo.

## Geoprocesamiento de verdad

El script de ejemplo no tiene dependencias a propósito. Cuando necesites operaciones reales:

```bash
npm i -D @turf/turf          # buffer, union, simplify, intersect…
```

Va en `devDependencies`: es una herramienta de construcción, nunca llega al navegador.

Y si prefieres preparar los datos en **Python o QGIS** — que para geomática suele ser lo natural — perfecto: este directorio no impone lenguaje. Lo único que el sitio exige es que el resultado sea un GeoJSON en `public/data/` con un nombre versionado. Un script `.py` aquí al lado es igual de válido.

## Antes de publicar un dato

- redondea coordenadas (4 decimales ≈ 11 m);
- simplifica al detalle que el zoom máximo justifique;
- deja un bloque `metadata` en el GeoJSON diciendo qué script lo generó y cuándo;
- comprueba el peso contra la tabla de `public/data/README.md`.
