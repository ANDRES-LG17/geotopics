# Diario — Desiertos de acceso

Lo que se hizo, y **por qué**. Los gestos quedan en los archivos; las
decisiones, no. Aquí se escriben las segundas.

Este diario es la materia prima del artículo: la sección "lo que supusimos"
se escribe sola cuando las hipótesis se anotaron en el momento de tomarlas.

---

## Pregunta de partida

¿Cuánto tiempo le toma a un trabajador agrícola temporal, sin coche, llegar a
un hospital, una tienda, la CNESST o su consulado — comparado con quien sí
tiene coche?

## Zona de estudio y SCR

- **Extensión**: todo el territorio agrícola cultivado de Quebec (BDPPAD);
- **SCR de trabajo**: EPSG:32198 (Québec Lambert) — proyectado, para que las
  distancias y superficies tengan sentido a escala provincial; un solo huso
  MTM no basta;
- **SCR de salida**: EPSG:4326 — impuesto por MapLibre.

Trabajar en geográfico falsea toda medición. Reproyectar a la entrada, una
vez, y no salir de ahí hasta el export.

---

## 2026-10-14

**Hecho** — Proyecto creado (`03-deserts-acces`, en lugar de
`ville-15-minutes`, abandonado). Descargada la BDPPAD 2025 de la FADQ y su
guía de usuario en `00-brut/fadq/`.

**Por qué** — La BDPPAD dice **dónde se cultiva de verdad**, con el cultivo
declarado. La zona agrícola de la CPTAQ es zonificación: incluye bosque y
tierras sin cultivar, lo que diluiría el mapa. Formato en polígonos, todo
Quebec, licencia abierta.

**Hipótesis planteada** — La unidad del mapa será la zona cultivada de cada
municipio, no la parcela ni el hexágono: tiene nombre, protege a las granjas
y pesa poco. Si es falsa (municipios demasiado extensos), los tiempos de un
polígono representan mal a sus granjas lejanas → partir los polígonos grandes.

**Por verificar** — Número de parcelas con cultura declarada en 2025; peso
tras disolver y simplificar; qué parte es hortícola.

---

## Decisiones estructurantes

A retomar casi tal cual en el artículo:

| Decisión | Razón | Consecuencia si es falsa |
| --- | --- | --- |
| BDPPAD en lugar de la zona CPTAQ | la actividad real, no la zonificación | se omiten las granjas que nunca fueron clientes de la FADQ |
| Año 2025, no 2026 | última temporada con declaraciones estables | ninguna, salvo cambios marginales de contorno |
| Zona cultivada por municipio | ética, legibilidad, peso | tiempos poco representativos en municipios extensos |

## Controles de calidad

- [ ] geometrías válidas;
- [ ] sin duplicados ni entidades vacías;
- [ ] SCR declarado = SCR real (superponer a un fondo conocido);
- [ ] superficie total cruzada con una fuente independiente (StatCan,
      Censo agrícola 2021);
- [ ] órdenes de magnitud plausibles.
