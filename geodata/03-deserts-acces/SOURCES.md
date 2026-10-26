# Fuentes — Desiertos de acceso

Una ficha por conjunto de datos, **rellenada en el momento de la descarga**.
La URL exacta y la licencia son imposibles de encontrar seis meses después, y
es justo al publicar cuando hacen falta: el campo `attribution` del lab debe
decir la verdad.

---

## Base de datos de parcelas y producciones agrícolas declaradas (BDPPAD)

| | |
| --- | --- |
| **Proveedor** | La Financière agricole du Québec (FADQ), vía Données Québec |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/base-de-donnees-des-parcelles-et-productions-agricoles-declarees-bdppad — enlace directo: https://www.fadq.qc.ca/fileadmin/geo4tb/BDPPAD/BDPPAD_V03_2025.zip |
| **Descargado el** | 2026-10-14 |
| **Año de los datos** | 2025 (año de seguro). Extracción del 2026-10-12 (sufijo `_s_20261012` del archivo) |
| **Licencia** | CC-BY 4.0 — [licencia de Données Québec](https://www.donneesquebec.ca/licence/) |
| **Atribución exigida** | CC-BY: citar la fuente, sin fórmula impuesta. Propuesta: « La Financière agricole du Québec — Base de données des parcelles et productions agricoles déclarées (BDPPAD), 2025 » |
| **Redistribución** | autorizada, con atribución |
| **Archivo** | `00-brut/fadq/BDPPAD_V03_2025.zip` (171 Mo) — SHA-256 `4E0E2636…5E27756B` |
| **Guía** | `00-brut/fadq/bdppad-v03-guide-utilisateur.pdf` (versión 03, marzo de 2025) |
| **SCR de origen** | NAD83 geográfico (EPSG:4269) — grados decimales |
| **Volumen** | **375 107 parcelas** (deducido del `.shx`); `.shp` 236 Mo, `.dbf` 1,05 Go |

Por qué 2025 y no 2026: el archivo 2026 existe, pero las declaraciones de un
año se consideran completas el 1.º de agosto y siguen corrigiéndose hasta
septiembre; además, los contornos pueden modificarse durante dos años. 2025
es la última temporada estable.

**Campos utilizados** — según la guía de usuario, tabla 1:

- `SUPHEC` — superficie de la parcela en hectáreas, calculada de la geometría;
- `GROPRO` / `DESGROPRO` — grupo de producción (tabla 3 de la guía). `MUL` =
  varias culturas en la misma parcela; `INC` = desconocido;
- `NBPRO` — número de producciones declaradas en la parcela (hasta 15);
- `CODPRO1…15` / `PRCSUPPR1…15` — código de cada cultura y su porcentaje de
  la parcela, en orden decreciente. Necesario para las parcelas `MUL`.

**Grupos hortícolas** — donde se concentra la mano de obra temporal:
`CMA` (multiples maraîchères), `DIV` (légumes divers), `FEU` (feuillus),
`RAC` (racines), `VIV` (vivaces), `FRU` (fruits), `LDT` (légumes de
transformation), `PDT` (pommes de terre), `POM` (pommes), `PTF` (petits
fruits). Lista a validar con los datos.

**Límites conocidos** — lo que nutre la nota del lab:

- **No es exhaustiva.** Solo las tierras de productores que fueron clientes
  de la FADQ en algún momento desde 2003. Cubre "una gran mayoría" del
  territorio cultivado, no su totalidad;
- **La cultura es una declaración**, no una verdad de terreno;
- **Parcelas sin cultura**: el archivo de un año mezcla parcelas declaradas
  ese año y parcelas antiguas sin cultura conocida, a veces nunca
  reverificadas. Filtrar por cultura declarada;
- **Los vergers no siempre llevan el código `POM`** — solo cuando el cliente
  declara también otras culturas. La horticultura frutícola está
  subestimada;
- en el **maraîcher**, cuando hay cultivos sucesivos en una parcela, la FADQ
  a veces suprime los códigos: otra subestimación de lo hortícola;
- algunas parcelas cerca de la frontera están en **Ontario** — recortar.

---

## Verificación antes de publicar

- [ ] la redistribución del derivado está permitida por cada licencia;
- [ ] el `attribution` del lab recoge las fórmulas exigidas;
- [ ] el año de los datos aparece en la entrada — un mapa sin fecha miente
      por omisión;
- [ ] ningún dato personal ni dirección precisa en el export.
