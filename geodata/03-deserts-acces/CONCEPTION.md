# Desiertos de acceso — el aislamiento de los trabajadores agrícolas temporales

Lab interactivo para GeoTopics — tercer proyecto del taller, pensado para
presentarse al **CTI** (Centre des travailleurs et travailleuses immigrants).

Estado: **idea encuadrada, datos por verificar**. Este documento se escribe
*antes* de tocar los datos y el código.

> Documento de concepción. Lo que cambie en el camino se anota en
> `JOURNAL.md`; la procedencia de los datos, en `SOURCES.md`.

---

## 1. La pregunta de partida

> **¿Sigue estando una clínica "a 30 minutos" para alguien que no tiene ni
> coche, ni licencia canadiense, ni autobús?**

Los trabajadores agrícolas temporales (PTAT y volet agricole del PTET) llegan
con un **permiso de trabajo cerrado**, ligado a un solo empleador. Dejar al
empleador es poner en juego su estatus legal. A esa dependencia jurídica se
suma una dependencia física: la granja está en zona rural, lejos de todo
servicio y sin transporte público.

El empleador se convierte en el único medio para ir al médico, hacer la
compra o presentar una denuncia — incluso cuando es de él de quien uno
necesita quejarse.

**El propósito del lab**: hacer medible una forma de aislamiento que se
presenta como "geografía natural". La distancia no es neutra cuando el único
vehículo disponible pertenece al empleador.

## 2. La tesis (a verificar con la medición)

> La diferencia entre el tiempo de viaje **en automóvil** y el tiempo **sin
> automóvil** (a pie, en transporte público) mide la dependencia del
> trabajador respecto a su empleador. Cuanto mayor es la diferencia, más pasa
> el acceso a los derechos por la misma persona de la que podría necesitar
> protegerse.

**Si la medición contradice esta frase, ese es el tema del artículo.**

### Lo que hay que decir con honestidad

- **El permiso cerrado no es una prisión absoluta.** Desde 2019 existe el
  **permiso de trabajo abierto para trabajadores vulnerables**, que permite
  dejar a un empleador abusivo. El mapa no niega ese recurso: muestra que
  primero hay que **poder llegar** a quienes ayudan a obtenerlo;
- **No todos los empleadores son abusivos.** El lab mide una *exposición al
  riesgo*, no abusos;
- **El transporte informal existe** — viajes compartidos entre trabajadores,
  lanzaderas de organismos, bicicletas. Escapa a los datos: límite a escribir.

**Lo que el mapa no pretende decir** — ni qué empleadores abusan, ni cuántos
abusos ocurren. Mide una distancia a los servicios, según el modo de
transporte disponible.

## 3. Ética: lo que el mapa no debe mostrar

**Punto no negociable, a resolver antes de cualquier dato.**

- **Ninguna granja real identificable.** Señalar las explotaciones que
  emplean trabajadores temporales expondría a personas vulnerables y a
  empresas con nombre propio. La unidad del mapa es la **zona agrícola de
  un municipio** — las parcelas cultivadas disueltas y agregadas (§ 5),
  nunca una parcela ni una dirección;
- ningún dato nominativo, ningún testimonio geolocalizado;
- la nota de método lo dice explícitamente: "los puntos de partida son
  representativos de la zona agrícola de cada municipio, no lugares de
  trabajo reales".

## 4. Zona de estudio

**Todas las regiones agrícolas productoras de Quebec** — de Montérégie y
Lanaudière, que reciben más trabajadores temporales, a Saguenay–Lac-Saint-Jean
y Bas-Saint-Laurent, donde el aislamiento es máximo.

Cubrir todo el territorio resuelve dos problemas a la vez:

- **la comparación es automática** — si incluso en Montérégie, a una hora de
  Montreal, la diferencia auto / sin auto es enorme, el argumento se sostiene
  en todas partes;
- **no hay que elegir regiones a mano**, lo que podría parecer un sesgo.

Las escenas narrativas (§ 6) siguen haciendo zoom en un caso concreto
(Saguenay, por ejemplo), pero el mapa base es provincial.

- **SCR de trabajo**: EPSG:32198 (Québec Lambert) — la zona supera un solo
  huso MTM;
- **SCR de salida**: EPSG:4326, impuesto por MapLibre.

## 5. Lo que el mapa va a mostrar

### Indicador 1 — el tiempo para llegar a cada servicio *(el corazón)*

**Sin índice de vulnerabilidad.** Un índice compuesto mezcla variables con
pesos arbitrarios y obliga a creer en la fórmula. Un tiempo de viaje no
necesita explicación: "4 h 10 a pie hasta el hospital" lo entiende cualquiera.

- **Geometría**: un **polígono por municipio agrícola** — la superficie
  realmente cultivada, disuelta y simplificada (ver "De las parcelas a los
  polígonos", más abajo);
- **Color**: el tiempo **sin coche** hasta el servicio elegido (por defecto,
  el hospital). Un selector cambia de servicio;
- **Al pasar el cursor**: una ficha con los tiempos hacia cada servicio, en
  cada modo de transporte:

```
┌──────────────────────────────────────────────┐
│ Saint-Rémi · Montérégie                      │
│ 4 820 ha cultivadas · 38 % hortícola         │
│                                              │
│                  Coche    A pie    Bus       │
│ Hospital         24 min   5 h 50   —         │
│ CLSC             12 min   2 h 40   —         │
│ Supermercado      9 min   1 h 55   —         │
│ CNESST           38 min   9 h 10   —         │
│ CTI / organismo  52 min   —        —         │
│ Consulado        48 min   —        2 h 30*   │
│                                              │
│ Cobertura móvil: débil                       │
│                                              │
│ « Sin coche, el hospital está 15 veces más   │
│   lejos. Ningún autobús llega a esta zona. » │
└──────────────────────────────────────────────┘
  — = sin trayecto posible   * con transbordos
```

*(Valores ilustrativos.)*

- **Una frase de síntesis** por polígono, generada a partir de los datos —
  como en el panel del tramway;
- **Servicios alcanzables**: "0 de 6 servicios a menos de 1 h sin coche" —
  un conteo de tiempos, no un índice con pesos. Candidato para el color;
- **A pie, más allá de un umbral** (8 h, por ejemplo), el tiempo se muestra
  como "—": una caminata de 15 h no es un trayecto, es la ausencia de uno;
- **La cifra que debe quedar**: "una clínica a 25 min en coche está a 6 h 40
  a pie, e inaccesible en transporte público" — calculada, no citada.

### De las parcelas a los polígonos

Fuente: **BDPPAD** de la FADQ (§ 7) — las parcelas realmente cultivadas, con
su cultivo declarado. Cientos de miles de polígonos: inutilizables tal cual
en un navegador.

```
Parcelas BDPPAD (año más reciente completo)
   │ 1. filtrar: parcelas con cultivo declarado ese año
   │ 2. disolver: unir parcelas vecinas en una sola mancha
   │    (buffer +200 m → dissolve → buffer −200 m, para soldar las que
   │     solo separa un camino)
   │ 3. cortar por municipio → "zona agrícola de Saint-Rémi"
   │ 4. simplificar contornos (≈ 100 m), redondear coordenadas
   ▼
~1 000 polígonos con nombre — objetivo < 1 Mo
```

En cada polígono se mide, **antes** de simplificar: hectáreas cultivadas,
parte hortícola (frutas y hortalizas, donde se concentra la mano de obra
temporal), y el **punto de partida** — el centro de la superficie cultivada,
no el centro geométrico, que podría caer en un bosque.

**Límite a escribir**: un municipio extenso tiene granjas a 5 km del pueblo y
otras a 25 km. El tiempo es representativo, no exacto. Si un polígono es
demasiado grande, se parte en dos.

### Indicador 2 — qué servicio, a qué distancia

Cuatro familias de destinos, cada una con su mapa:

| Familia | Destinos | Por qué |
| --- | --- | --- |
| **Salud** | Hospitales, CLSC, GMF | Accidentes de trabajo, atención básica |
| **Alimentación** | Supermercados (IGA, Metro, Maxi, Super C) | La autonomía básica: hacer la compra solo |
| **Recursos** | Oficinas de la **CNESST**, CTI, sindicatos y organismos aliados | Denunciar, declarar un accidente |
| **Consular** | Consulados de México y Guatemala | Casi exclusivamente en Montreal |

### Indicador 3 — la cobertura celular *(el punto ciego)*

- **Lo que se ve**: las zonas con cobertura móvil débil o nula, superpuestas
  a las zonas agrícolas;
- **Por qué**: sin red, incluso una llamada a la CNESST o al CTI se vuelve
  imposible. El aislamiento es físico **y** digital;
- **Límite**: los mapas de cobertura declarados por los operadores son
  optimistas, sobre todo dentro de los edificios. Hay que decirlo.

### Lo que no es un indicador

Las recomendaciones (lanzaderas, clínicas móviles…). El mapa mide, el
artículo comenta — y es el CTI quien lleva las reivindicaciones.

## 6. El dispositivo: un recorrido en tres escenas

**Con botones, como los demás labs** — no con scroll secuestrado, que rompe
la lectura de la página y no se maneja con teclado. `LabScene` ya lo sabe
hacer.

### Escena 1 — El contrato de cautiverio

- **Visual**: fondo oscuro de Quebec. Se encienden dos puntos: el aeropuerto
  Montréal-Trudeau, y luego la zona agrícola de llegada. Una línea los une;
- **Texto**: qué es un permiso de trabajo cerrado, en dos frases. El
  trabajador llega y es trasladado a cientos de kilómetros. No conoce el
  idioma, ni las leyes, ni el territorio.

### Escena 2 — El desierto de acceso

- **Visual**: zoom sobre la región de estudio. Aparecen las zonas agrícolas,
  luego los servicios, luego las isócronas en coche — que lo cubren casi todo.
  Cambio a modo "sin coche": las isócronas se encogen alrededor de las
  ciudades y las zonas agrícolas quedan en frío;
- **Texto**: el aislamiento rural protege al mal empleador. Sin transporte,
  no hay forma de ir a una inspección laboral ni de buscar ayuda externa.

### Escena 3 — "Intenta buscar ayuda"

- **Interacción**: el lector hace clic en una zona agrícola (§ 3) y elige
  un destino: hospital, supermercado, CNESST, consulado;
- **Respuesta**: el trayecto en coche, luego a pie, luego en transporte
  público. "Ningún trayecto en transporte público" o "7 h 50 a pie, de ellas
  22 km por la ruta 175, sin arcén";
- **Impacto**: el lector vive en primera persona la impotencia del
  trabajador.

**Restricción técnica**: *un lab no depende de nada externo*. Los trayectos
**no** se calculan en directo con una API de rutas: se **precalculan** para
cada polígono × destino, y el lab solo los muestra. Los **tiempos** de todos
los polígonos se precalculan; el **trazado** de la ruta en el mapa, solo
para una selección de zonas (una treintena), por peso.

## 7. Datos previstos

Fichas completas en `SOURCES.md`, **en el momento de la descarga**.

| Dato | Fuente | ¿Existe? | Notas |
| --- | --- | --- | --- |
| **Parcelas cultivadas** | FADQ — BDPPAD | **sí, descargado** | **Fuente principal.** Dónde se cultiva de verdad, con el cultivo. Solo clientes asegurados de la FADQ — límite a decir |
| Territorio agrícola | CPTAQ — zona agrícola transpuesta | sí | Contexto: es zonificación, no actividad real |
| **Límites municipales** | MRNF — découpages administratifs (SDA) | sí | Para cortar las zonas por municipio |
| **Trabajadores temporales por región** | IRCC / EDSC — puestos aprobados por EIMT, datos abiertos | **por verificar** | Para elegir la zona de estudio (§ 4) y cifrar el contexto |
| **Hospitales, CLSC** | MSSS — repertorio de instalaciones (M02) | sí | Coordenadas a controlar |
| **Supermercados** | OpenStreetMap | sí | Completitud rural a verificar en la zona de estudio |
| **Oficinas CNESST** | CNESST — lista de oficinas regionales | sí | A geocodificar |
| **CTI, organismos** | CTI, RATTMAQ, sindicatos | a pedir | **Que el CTI valide** la lista |
| **Consulados** | Asuntos Globales Canadá — lista de representaciones | sí | México y Guatemala: Montreal |
| **Red vial y peatonal** | OpenStreetMap / Adresses Québec | sí | La ausencia de arcén rara vez está cartografiada — **límite** |
| **Transporte público** | GTFS — STS (Saguenay), transporte regional BSL | **por verificar** | A menudo es transporte a demanda, sin GTFS: tratar aparte |
| **Cobertura celular** | ISDE — mapa nacional de disponibilidad de servicios (LTE móvil) | **por verificar** | Formato y resolución a confirmar |

### Las herramientas de cálculo

- **Coche y a pie**: OSRM o Valhalla sobre el extracto OSM de Quebec;
- **Transporte público**: r5py (R5) con GTFS + OSM — cálculo multimodal
  honesto, con horarios reales;
- **Isócronas**: desde los servicios (cuánto territorio cubre cada servicio),
  y trayectos **desde** los puntos de partida (lo que vive el trabajador).

## 8. Lo que este proyecto debe demostrar

Lac Saint-Charles: superposición, proporciones, proyección, tooltip rico.
Tramway: lidar, 3D, volumen de datos, panel de indicadores.

Este añadiría:

1. **el análisis de redes multimodal** — coche, a pie y transporte público
   sobre grafo real, con horarios;
2. **la accesibilidad como indicador** — un saber hacer directamente
   transferible a la salud pública y al urbanismo;
3. **la geomática al servicio de un organismo** — un entregable pensado para
   un cliente real, con sus restricciones éticas.

## 9. La cadena

```
geodata/03-deserts-acces/               ← esta carpeta
scripts/analysis/deserts-acces.py       ← el método, versionado
public/data/deserts-acces-v1.geojson    ← < 500 Ko de preferencia
src/labs/deserts-acces.ts               ← + una línea en src/labs/index.ts
content/entries/deserts-acces.fr.md     ← la entrada
content/entries/deserts-acces.en.md     ← la misma, en inglés
```

Nombre provisional. Una versión en español de la entrada tendría sentido para
los propios trabajadores — a discutir con el CTI.

## 10. Próximos pasos

**Decidir primero**

- [x] **la fuente del territorio agrícola**: parcelas FADQ (BDPPAD 2025)
- [ ] medir la BDPPAD: número de parcelas, peso, superficie hortícola
- [ ] probar la simplificación (§ 5) en **una sola región** (Montérégie)
- [ ] inventariar los GTFS disponibles en las regiones agrícolas
- [ ] verificar la resolución de los datos de cobertura móvil de ISDE
- [ ] contactar al CTI: interés, lista de recursos, relectura del propósito

**Lo visual después**

- [ ] una sola región, un solo servicio (el hospital): coche vs a pie
- [ ] **primer mapa en pantalla** con la ficha al pasar el cursor
- [ ] extender a todas las regiones agrícolas
- [ ] medir el peso de las isócronas → estrategia de extensión

**La medición**

- [ ] las cuatro familias de destinos
- [ ] el transporte público (r5py)
- [ ] la cobertura celular
- [ ] los trayectos precalculados para la escena 3

**El acabado**

- [ ] escribir las tres escenas (FR + EN)
- [ ] redactar la nota de método: hipótesis, límites, puntos ficticios
- [ ] publicar con `labOnly: true`, hacerlo revisar por el CTI, y compartir

**La trampa a evitar**: un alegato sin medición. El propósito es fuerte; es
el rigor del cálculo lo que lo hará irrefutable.
