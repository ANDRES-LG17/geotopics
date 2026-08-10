# Datos de los labs

Aquí viven los archivos que consumen las cartas interactivas. Se sirven tal cual, sin pasar por ningún código de servidor.

## Regla única: el nombre lleva la versión

```
demo-isochrones-v1.geojson
rtc-isochrones-v3.geojson
```

`next.config.ts` marca todo `/data/*` como `immutable` durante un año. Eso significa que **un archivo publicado nunca debe cambiar de contenido**: si lo sobrescribes, los navegadores que ya lo tienen seguirán mostrando los datos viejos durante meses.

Para actualizar un dato:

1. escribe `…-v2.geojson`;
2. cambia la ruta en `src/labs/<lab>.ts`;
3. borra el `-v1` cuando estés seguro.

## Tamaño

Estos archivos viajan enteros al navegador. Órdenes de magnitud razonables:

| Peso | Veredicto |
| --- | --- |
| < 500 KB | sin problema |
| 500 KB – 2 MB | aceptable si la carta es el tema de la entrada |
| > 2 MB | simplifica geometrías, recorta decimales, o pasa a teselas vectoriales |

Dos palancas antes de rendirse: redondear coordenadas a 4 decimales (~11 m) y simplificar con una tolerancia visible al zoom máximo que permites.

Si aun así no baja, el paso siguiente son teselas: un `.pmtiles` servido por rangos HTTP conserva la propiedad de "cero backend". Requiere el paquete `pmtiles` y registrar su protocolo en `LabMap`.
