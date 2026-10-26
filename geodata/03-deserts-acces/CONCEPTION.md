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
  empresas con nombre propio. Los orígenes son **puntos representativos**
  tomados dentro de las zonas agrícolas, o **celdas agregadas** (hexágonos),
  nunca direcciones;
- ningún dato nominativo, ningún testimonio geolocalizado;
- la nota de método lo dice explícitamente: "los puntos de partida son
  ficticios y representativos del territorio agrícola, no lugares de trabajo
  reales".

## 4. Zona de estudio

Prevista: **Saguenay–Lac-Saint-Jean** (alrededor de Chicoutimi) y
**Bas-Saint-Laurent**.

> **A verificar primero**: no son las regiones que más trabajadores agrícolas
> temporales reciben en Quebec — Montérégie, Lanaudière, Laurentides y
> Capitale-Nationale (île d'Orléans) concentran más. Dos lecturas posibles:
>
> 1. **quedarse con las regiones alejadas** — el aislamiento es máximo, es el
>    caso extremo;
> 2. **añadir una región de comparación** con alta concentración (Montérégie)
>    — para mostrar que el problema no es exclusivo de los confines.
>
> La segunda hace la tesis más sólida: si incluso en Montérégie, a una hora de
> Montreal, la diferencia auto / sin auto es enorme, el argumento se sostiene
> en todas partes.

- **SCR de trabajo**: EPSG:32198 (Québec Lambert) — la zona supera un solo
  huso MTM;
- **SCR de salida**: EPSG:4326, impuesto por MapLibre.

## 5. Lo que el mapa va a mostrar

### Indicador 1 — la diferencia auto / sin auto *(el corazón)*

- **Lo que se ve**: para cada celda agrícola, el tiempo hasta el servicio más
  cercano **en coche**, y luego **a pie** o **en transporte público**;
- **Geometría**: isócronas de 15, 30, 60 y 120 min alrededor de los
  servicios; celdas coloreadas según la relación entre ambos tiempos;
- **La cifra que debe quedar**: "una clínica a 25 min en coche está a 6 h 40
  a pie, e inaccesible en transporte público" — calculada, no citada.

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

- **Interacción**: el lector hace clic en un punto de partida (ficticio, § 3)
  y elige un destino: hospital, supermercado, CNESST, consulado;
- **Respuesta**: el trayecto en coche, luego a pie, luego en transporte
  público. "Ningún trayecto en transporte público" o "7 h 50 a pie, de ellas
  22 km por la ruta 175, sin arcén";
- **Impacto**: el lector vive en primera persona la impotencia del
  trabajador.

**Restricción técnica**: *un lab no depende de nada externo*. Los trayectos
**no** se calculan en directo con una API de rutas: se **precalculan** para
cada punto de partida × destino, y el lab solo los muestra. Un número
limitado de puntos (una treintena) lo hace razonable.

## 7. Datos previstos

Fichas completas en `SOURCES.md`, **en el momento de la descarga**.

| Dato | Fuente | ¿Existe? | Notas |
| --- | --- | --- | --- |
| **Territorio agrícola** | CPTAQ — zona agrícola | sí | Es zonificación, no actividad real |
| **Parcelas cultivadas** | FADQ — parcelas y producciones agrícolas declaradas | **por verificar** | Más preciso que la zonificación: dónde se cultiva de verdad. Horticultura = mano de obra temporal |
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

- [ ] **la zona de estudio** (§ 4): ¿solo regiones alejadas, o con una región
      de comparación?
- [ ] **la regla ética** (§ 3): ¿puntos ficticios o celdas agregadas?
- [ ] verificar que exista un GTFS para cada región elegida
- [ ] verificar la resolución de los datos de cobertura móvil de ISDE
- [ ] contactar al CTI: interés, lista de recursos, relectura del propósito

**Lo visual después**

- [ ] una sola región, un solo servicio (el hospital): coche vs a pie
- [ ] **primer mapa en pantalla** con el cambio coche / sin coche
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
