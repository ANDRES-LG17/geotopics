# Sources — 15 minutes à pied, à vélo, en auto

Les données brutes sont celles du lab vélo, lues dans son atelier sans copie :
voir `geodata/04-velo-quebec-levis/SOURCES.md` pour OpenStreetMap (réseau
viaire, 2026-10-21), la Ville de Québec (`vdq-voiepublique`, VITESSEMAX),
l'ISQ (aires de diffusion, masque de terre), RNCan (HRDEM, MRDEM-30) et le
bandeau du cycliste (Google Gemini, Veo).

---

## Littérature — vitesses et hiver

Pas des jeux de données : les études qui fondent les vitesses.

- **Tobler, W. (1993).** « Three presentations on geographical analysis and
  modeling », NCGIA Technical Report 93-1. Fonction de marche selon la pente,
  `6 · exp(−3,5 · |s + 0,05|)` km/h.
- **NTNU (2021).** « The walking speed of pedestrians on various pavement
  surface conditions during winter », NTNU Open,
  https://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/2978451 — trottoir d'hiver
  entretenu ≈ +1 min/km à plat, glace vive ≈ +2 min/km. Auteurs et chiffres
  exacts à vérifier dans le texte intégral.
- **FHWA, Road Weather Management Program.** « How Do Weather Events Impact
  Roads? », https://ops.fhwa.dot.gov/weather/roadimpact.htm — artères :
  −30 à −40 % de vitesse sur chaussée enneigée ou fondante ; autoroutes :
  −3 à −13 % en neige légère, −5 à −40 % en neige abondante.
- **Shoman et al. (2023)**, *IEEE Access* — vélo en hiver × 0,79 : voir le
  lab vélo.

## Bandeaux à pied et en auto — illustration et animation générées par IA

| | |
| --- | --- |
| **Fournisseur** | Google : Gemini (Nano Banana) pour les images, Veo pour les vidéos — générées par l'auteur |
| **URL** | — (génération dans l'application Gemini / Flow) |
| **Déposé le** | 2026-11-17 |
| **Licence** | contenu généré par IA, selon les conditions d'utilisation de Google applicables au compte de l'auteur — à vérifier avant publication |
| **Attribution exigée** | aucune imposée ; mention d'honnêteté : « illustration et animation générées par IA (Google Gemini, Veo) » |
| **Fichiers** | `00-brut/ia/bandeau-{pied,auto}-{ete,hiver}-image.png`, `bandeau-{pied,auto}-{ete,hiver}.mp4` (864 × 496, 24 i/s, 217 images, 9,1 s) |

**Méthode** : images du cycliste du lab vélo
(`04-velo-quebec-levis/00-brut/ia/bandeau-velo-{ete,hiver}-image.png`)
ÉDITÉES dans Gemini — seul le sujet change, décor et personnage gardés —,
puis animées dans Veo. Prompts : `40-livrables/PROMPTS-VIDEOS.md`.

**Traitement** — `scripts/analysis/modes-quebec-levis-02-bandeaux.sh`
(ffmpeg) : boucle (auto : coupée à l'image de raccord, 209 et 216 ;
à pied : fondu enchaîné d'une seconde) ; recadrage 5:2 864 × 346 à y = 83 ;
704 × 282 ; son retiré ; WebM VP9, MP4 H.264, affiche WebP. Sorties
`30-export/bandeaux/`, copiées dans
`public/data/modes-quebec-levis-{pied,auto}-{ete,hiver}-v1.*`
(WebM 409 à 975 Ko).

**Limites connues** — illustration, sans valeur documentaire.
