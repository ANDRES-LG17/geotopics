#!/usr/bin/env bash
# Bandeaux animés « à pied » et « en auto » du lab modes-quebec-levis :
# boucle, recadrage 5:2, compression — le traitement du cycliste du lab vélo.
#
#     bash scripts/analysis/modes-quebec-levis-02-bandeaux.sh
#
# Entrées : geodata/07-modes-quebec-levis/00-brut/ia/bandeau-{pied,auto}-{ete,hiver}.mp4
#           (Veo, 864 × 496, 24 i/s, 217 images)
# Sorties : geodata/07-modes-quebec-levis/30-export/bandeaux/ puis public/data/
#           modes-quebec-levis-{pied,auto}-{ete,hiver}-v1.{webm,mp4,webp}
#
# BOUCLE (PSNR de chaque image contre la première, bande recadrée ; entre
# images voisines ≈ 18–22 dB) :
#   auto été    image 209 = 21,4 dB → on garde 0–208, la boucle se ferme seule
#   auto hiver  image 216 = 18,5 dB → on garde 0–215
#   à pied      ≤ 15,3 dB : pas de raccord naturel → fondu enchaîné de 24
#               images (1 s) : la fin se fond dans le début, la boucle repart
#               à l'image 24.
# RECADRAGE : 5:2, 864 × 346 à y = 83 (la bande du cycliste, y = 120 sur 720,
# ramenée à 496), réduit à 704 × 282 comme le cycliste.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
BRUT="$RACINE/geodata/07-modes-quebec-levis/00-brut/ia"
SORTIE="$RACINE/geodata/07-modes-quebec-levis/30-export/bandeaux"
PUBLIC="$RACINE/public/data"
mkdir -p "$SORTIE"

CADRE="crop=864:346:0:83,scale=704:282:flags=lanczos,setsar=1"
F=24   # images du fondu

encoder () {  # $1 nom de sortie, $2 graphe de filtres (sortie [v]), $3 entrée
  local nom="$1" graphe="$2" entree="$3"
  ffmpeg -v error -y -i "$entree" -filter_complex "$graphe" -map "[v]" -an \
    -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p \
    "$SORTIE/$nom.webm"
  ffmpeg -v error -y -i "$entree" -filter_complex "$graphe" -map "[v]" -an \
    -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart \
    "$SORTIE/$nom.mp4"
  ffmpeg -v error -y -i "$SORTIE/$nom.mp4" -frames:v 1 -c:v libwebp -quality 80 "$SORTIE/$nom.webp"
  cp "$SORTIE/$nom".{webm,mp4,webp} "$PUBLIC/"
  printf '%s : %s Ko (webm), %s Ko (mp4)\n' "$nom" \
    "$(( $(stat -c %s "$SORTIE/$nom.webm") / 1024 ))" "$(( $(stat -c %s "$SORTIE/$nom.mp4") / 1024 ))"
}

# En auto : on coupe à l'image de raccord.
encoder modes-quebec-levis-auto-ete-v1 \
  "[0:v]trim=end_frame=209,setpts=PTS-STARTPTS,$CADRE[v]" "$BRUT/bandeau-auto-ete.mp4"
encoder modes-quebec-levis-auto-hiver-v1 \
  "[0:v]trim=end_frame=216,setpts=PTS-STARTPTS,$CADRE[v]" "$BRUT/bandeau-auto-hiver.mp4"

# À pied : corps [F ; N−F[, puis la queue [N−F ; N[ fondue dans la tête [0 ; F[.
for s in ete hiver; do
  N=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames \
      -of csv=p=0 "$BRUT/bandeau-pied-$s.mp4")
  encoder "modes-quebec-levis-pied-$s-v1" \
    "[0:v]split=3[a][b][c];\
[a]trim=start_frame=$F:end_frame=$((N - F)),setpts=PTS-STARTPTS[corps];\
[b]trim=start_frame=$((N - F)):end_frame=$N,setpts=PTS-STARTPTS[queue];\
[c]trim=end_frame=$F,setpts=PTS-STARTPTS[tete];\
[queue][tete]blend=all_expr='A*(1-N/$((F - 1)))+B*(N/$((F - 1)))'[fondu];\
[corps][fondu]concat=n=2:v=1:a=0,$CADRE[v]" "$BRUT/bandeau-pied-$s.mp4"
done
