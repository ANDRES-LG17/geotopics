/**
 * Moteur des vidéos de carte : on PILOTE la vraie interface du lab (souris,
 * clavier, caméra) sous une horloge contrôlée, image par image, puis on
 * monte (recadrage, titres) et on encode.
 *
 * Pourquoi image par image : un portable modeste ne tient pas 30 images/s à
 * 2160 px. Ici chaque image prend le temps qu'il faut, et la vidéo reste
 * fluide — l'horloge de la page (Date, setTimeout, requestAnimationFrame,
 * performance) n'avance que de 1/30 s entre deux captures.
 *
 * Trois étapes, chacune relançable seule :
 *   1. record  — images brutes en 2× (`.video-cache/<id>-<format>-<lang>/frames`)
 *                + `timeline.json` (recadrage par image, titres) ;
 *   2. overlay — les titres, rendus en HTML transparent, une image par état ;
 *   3. compose — recadrage + titres (sharp), puis encodage (ffmpeg).
 */

import { createRequire } from "node:module";
import { mkdir, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

export const FORMATS = {
  // LinkedIn : 4:5, plein dans le fil sur téléphone. Capture en 2× : le
  // recadrage sur le panneau garde toute sa netteté.
  "4x5": { w: 1080, h: 1350, dsf: 2 },
  // Blog : 16:9, lu à ~900 px de large ; 1,5× suffit au recadrage.
  "16x9": { w: 1920, h: 1080, dsf: 1.5 },
};

const FPS = 30;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * ffmpeg : $FFMPEG, sinon l'exécutable installé par winget (le lien de
 * `WinGet\Links` ne se lance pas depuis Node), sinon celui du PATH.
 */
function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const paquets = path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  if (existsSync(paquets)) {
    for (const p of readdirSync(paquets).filter((d) => d.startsWith("Gyan.FFmpeg"))) {
      for (const v of readdirSync(path.join(paquets, p))) {
        const exe = path.join(paquets, p, v, "bin", "ffmpeg.exe");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return "ffmpeg";
}

function run(bin, args) {
  return new Promise((ok, ko) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.on("error", ko);
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) => (c === 0 ? ok() : ko(new Error(`${bin} → ${c}\n${err.slice(-2000)}`))));
  });
}

/* ───────────────────────────── 1. RECORD ───────────────────────────── */

export async function record(story, { format, lang, base, dir }) {
  const F = FORMATS[format];
  const frames = path.join(dir, "frames");
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });

  const browser = await chromium.launch({
    channel: "chromium",
    // La carte est en WebGL : on veut la vraie carte graphique (ANGLE / D3D11).
    args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"],
  });
  // Fenêtre de CAPTURE : celle du format, sauf si le scénario en demande une
  // autre (ex. 540 × 675 en 4× : la mise en page du téléphone, même sortie
  // 1080 × 1350). Le rapport largeur / hauteur doit rester celui du format.
  const C = story.capture ?? F;
  const page = await browser.newPage({ viewport: { width: C.w, height: C.h }, deviceScaleFactor: C.dsf });
  await page.clock.install();
  const url = `${base}${story.path}${story.path.includes("?") ? "&" : "?"}video=1${lang === "en" ? "&locale=en" : ""}`;
  console.log("→", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForFunction(() => window.__geoVideo?.map?.loaded(), null, { timeout: 180000 });
  // Le bouton « N » de Next en développement n'a rien à faire à l'image.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  // Les transitions CSS ne suivent pas l'horloge simulée : on les ralentit
  // au rythme moyen de la capture (≈ 1/30 s d'image pour ≈ 0,33 s réelle).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });

  // Curseur visible : le curseur du système n'est pas dans les captures. On
  // reprend celui du lab (la bicyclette), agrandi pour un écran de téléphone.
  // Taille : 44 px dans une fenêtre de 1080, à l'échelle d'une fenêtre plus petite.
  const taille = Math.max(26, Math.round((44 * C.w) / F.w));
  await page.evaluate((taille) => {
    const m = window.__geoVideo.map;
    let src = null;
    for (let el = m.getCanvas(); el && !src; el = el.parentElement) {
      const c = getComputedStyle(el).cursor;
      const k = c.match(/url\("?(data:image\/svg\+xml[^")]+)"?\)/);
      if (k) src = k[1];
    }
    const d = document.createElement("div");
    d.id = "__curseur";
    d.style.cssText = `position:fixed;left:0;top:0;width:${taille}px;height:${taille}px;margin:${-taille / 2}px 0 0 ${-taille / 2}px;z-index:2147483647;pointer-events:none;display:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))`;
    d.innerHTML = `<div id="__onde" style="position:absolute;inset:0;border-radius:50%;border:3px solid #104281;opacity:0"></div>` +
      (src ? `<img src="${src.replace(/"/g, "&quot;")}" style="width:100%;height:100%">` : `<div style="width:100%;height:100%;border-radius:50%;background:#fff;border:3px solid #104281"></div>`);
    document.body.appendChild(d);
  }, taille);

  const proj = (lonlat) =>
    page.evaluate(([lon, lat]) => {
      const m = window.__geoVideo.map;
      const r = m.getCanvas().getBoundingClientRect();
      const p = m.project([lon, lat]);
      return { x: r.left + p.x, y: r.top + p.y };
    }, lonlat);
  const camNow = () =>
    page.evaluate(() => {
      const m = window.__geoVideo.map;
      const c = m.getCenter();
      return { center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
    });

  const full = { x: 0, y: 0, w: C.w * C.dsf, h: C.h * C.dsf };
  const state = {
    f: 0,
    cursor: null, // [lon, lat]
    cursorTween: null,
    camTween: null,
    crop: { ...full },
    cropTween: null,
    ripple: -1,
    captions: [],
    crops: [],
  };

  /** Rectangle (px de l'image 2×) d'un élément, élargi au format de sortie. */
  const cropOf = async (target, pad = {}) => {
    if (target === "full") return { ...full };
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    }, target);
    if (!r) {
      console.warn("  (zoom : élément introuvable)", target);
      return { ...full };
    }
    const p = { top: 24, right: 24, bottom: 24, left: 24, ...pad };
    let x = (r.x - p.left) * C.dsf;
    let y = (r.y - p.top) * C.dsf;
    let w = (r.w + p.left + p.right) * C.dsf;
    let h = (r.h + p.top + p.bottom) * C.dsf;
    const A = F.w / F.h;
    // Au format de sortie, sans jamais agrandir au-delà de la capture.
    if (w / h < A) { const nw = h * A; x -= (nw - w) / 2; w = nw; } else { const nh = w / A; y -= (nh - h) / 2; h = nh; }
    if (w < F.w) { const k = F.w / w; x -= (w * k - w) / 2; y -= (h * k - h) / 2; w *= k; h *= k; }
    w = Math.min(w, full.w); h = Math.min(h, full.h);
    x = Math.max(0, Math.min(full.w - w, x));
    y = Math.max(0, Math.min(full.h - h, y));
    return { x, y, w, h };
  };

  const step = async () => {
    const t = state.f / FPS;
    // Caméra.
    if (state.camTween) {
      const { from, to, f0, n } = state.camTween;
      const k = ease(Math.min(1, (state.f - f0) / n));
      await page.evaluate((c) => window.__geoVideo.map.jumpTo(c), {
        center: [lerp(from.center[0], to.center[0], k), lerp(from.center[1], to.center[1], k)],
        zoom: lerp(from.zoom, to.zoom, k),
        bearing: lerp(from.bearing, to.bearing ?? from.bearing, k),
        pitch: lerp(from.pitch, to.pitch ?? from.pitch, k),
      });
      if (k >= 1) state.camTween = null;
    }
    // Curseur : le long d'une polyligne, à vitesse lissée.
    let bouge = Boolean(state.camTween);
    if (state.cursorTween) {
      const { pts, cum, f0, n } = state.cursorTween;
      const k = ease(Math.min(1, (state.f - f0) / n)) * cum[cum.length - 1];
      let i = 1;
      while (i < cum.length - 1 && cum[i] < k) i++;
      const u = (k - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      state.cursor = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
      if (state.f - f0 >= n) state.cursorTween = null;
      bouge = true;
    }
    if (state.cursor && bouge) {
      const p = await proj(state.cursor);
      await page.mouse.move(p.x, p.y);
    }
    if (state.cursor) {
      const p = await proj(state.cursor);
      const age = state.ripple < 0 ? 99 : (state.f - state.ripple) / FPS;
      await page.evaluate(([x, y, age]) => {
        const d = document.getElementById("__curseur");
        d.style.display = "block";
        d.style.left = `${x}px`;
        d.style.top = `${y}px`;
        const o = document.getElementById("__onde");
        const k = Math.min(1, age / 0.5);
        o.style.opacity = age < 0.5 ? String(1 - k) : "0";
        o.style.transform = `scale(${1 + k * 1.6})`;
      }, [p.x, p.y, age]);
    }
    // L'horloge avance d'une image ; les vidéos du panneau suivent.
    await page.clock.runFor(1000 / FPS);
    await page.evaluate(async (t) => {
      const vids = [...document.querySelectorAll("video")];
      await Promise.all(vids.map((v) => new Promise((ok) => {
        v.pause();
        if (!v.duration || !isFinite(v.duration)) return ok();
        const cible = (t * (v.playbackRate || 1)) % v.duration;
        if (Math.abs(v.currentTime - cible) < 0.004) return ok();
        const fin = () => { v.removeEventListener("seeked", fin); ok(); };
        v.addEventListener("seeked", fin);
        v.currentTime = cible;
        setTimeout(fin, 400);
      })));
    }, t);
    // Recadrage de montage.
    if (state.cropTween) {
      const { from, to, f0, n } = state.cropTween;
      const k = ease(Math.min(1, (state.f - f0) / n));
      state.crop = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), w: lerp(from.w, to.w, k), h: lerp(from.h, to.h, k) };
      if (k >= 1) state.cropTween = null;
    }
    state.crops.push({ ...state.crop });
    await page.screenshot({ path: path.join(frames, `${String(state.f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92, caret: "hide" });
    state.f++;
    if (state.f % 30 === 0) process.stdout.write(`  ${t.toFixed(0)} s\r`);
  };

  // L'API des scénarios. Tout ce qui DURE (curseur, caméra, zoom, titre) part
  // sans attendre ; seul `wait` fait avancer le temps.
  const v = {
    page,
    lang,
    t: (o) => (typeof o === "string" ? o : o[lang] ?? o.fr),
    now: () => state.f / FPS,
    /** Réglages avant la première image : caméra, préchargements. */
    async setup(fn) {
      await page.clock.pauseAt(Date.now() + 3000);
      await fn?.();
      await page.clock.runFor(1500);
    },
    jump: (c) => page.evaluate((c) => window.__geoVideo.map.jumpTo(c), c),
    async camera(to, sec) {
      state.camTween = { from: await camNow(), to, f0: state.f, n: Math.max(1, Math.round(sec * FPS)) };
    },
    /** Pose le curseur sur un point (sans déplacement). */
    async at(lonlat) {
      state.cursor = lonlat;
      const p = await proj(lonlat);
      await page.mouse.move(p.x, p.y);
    },
    glide(points, sec) {
      const pts = [state.cursor ?? points[0], ...points];
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      state.cursorTween = { pts, cum, f0: state.f, n: Math.max(1, Math.round(sec * FPS)) };
    },
    async click() {
      const p = await proj(state.cursor);
      await page.mouse.click(p.x, p.y);
      state.ripple = state.f;
    },
    key: (k) => page.keyboard.press(k),
    select: (sel, value) => page.selectOption(sel, value),
    async zoom(target, sec = 0.7, pad) {
      state.cropTween = { from: { ...state.crop }, to: await cropOf(target, pad), f0: state.f, n: Math.max(1, Math.round(sec * FPS)) };
    },
    /** Titre : `style` hook | lower | end ; durée en secondes. */
    caption(style, title, sub, sec, extra = {}) {
      state.captions.push({
        style,
        title: v.t(title),
        sub: sub ? v.t(sub) : null,
        kicker: extra.kicker ? v.t(extra.kicker) : null,
        url: extra.url ?? null,
        // « top » : le titre en haut de l'image (quand le bas porte le propos).
        pos: extra.pos ?? null,
        start: state.f / FPS,
        end: state.f / FPS + sec,
      });
    },
    async wait(sec) {
      const n = Math.round(sec * FPS);
      for (let i = 0; i < n; i++) await step();
    },
    /** Texte du panneau, pour des titres chiffrés par la carte elle-même. */
    text: (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? "", sel),
  };

  const t0 = Date.now();
  await story.run(v);
  await browser.close();
  await writeFile(path.join(dir, "timeline.json"), JSON.stringify({ format, lang, fps: FPS, frames: state.f, crops: state.crops, captions: state.captions, poster: story.poster ?? 0.5, accent: story.accent ?? null }, null, 1));
  console.log(`  ${state.f} images en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

/* ───────────────────────────── 2. OVERLAY ───────────────────────────── */

const OVERLAY_HTML = (w, h, accent = "#c84a12") => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
:root{--u:${Math.min(w, h) / 1080}px;--encre:#14261f;--gris:#475569;--accent:${accent}}
.c.top{top:4%;bottom:auto}
html,body{margin:0;width:${w}px;height:${h}px;background:transparent;overflow:hidden;font-family:Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.c{position:absolute;left:50%;transform:translate(-50%,0);box-sizing:border-box;color:var(--encre)}
.carte{background:rgba(255,255,255,.95);border-radius:calc(24*var(--u));box-shadow:0 calc(10*var(--u)) calc(40*var(--u)) rgba(20,38,31,.22);padding:calc(30*var(--u)) calc(40*var(--u));border-left:calc(10*var(--u)) solid var(--accent)}
.hook{bottom:${h > w ? 8 : 9}%;width:${h > w ? 88 : 62}%}
.hook .t{font-size:calc(70*var(--u));font-weight:700;letter-spacing:-.02em;line-height:1.05}
.hook .s{font-size:calc(40*var(--u));font-weight:500;color:var(--gris);margin-top:calc(10*var(--u))}
.lower{bottom:${h > w ? 8 : 9}%;width:${h > w ? 88 : 56}%}
.lower .t{font-size:calc(54*var(--u));font-weight:700;letter-spacing:-.015em;line-height:1.08}
.lower .s{font-size:calc(34*var(--u));font-weight:500;color:var(--gris);margin-top:calc(8*var(--u))}
.end{inset:0;left:0;transform:none;width:100%;height:100%;background:rgba(250,250,248,.9);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 8%}
.end .k{font-size:calc(30*var(--u));font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.end .t{font-size:calc(84*var(--u));font-weight:700;letter-spacing:-.025em;line-height:1.02;margin-top:calc(24*var(--u))}
.end .u{margin-top:calc(44*var(--u));font-size:calc(46*var(--u));font-weight:600;color:#fff;background:var(--encre);padding:calc(18*var(--u)) calc(36*var(--u));border-radius:calc(999*var(--u))}
.end .s{margin-top:calc(40*var(--u));font-size:calc(32*var(--u));font-weight:500;color:var(--gris)}
</style></head><body><div id="r"></div>
<script>
window.render = (list) => {
  const r = document.getElementById("r");
  r.innerHTML = "";
  for (const c of list) {
    const d = document.createElement("div");
    d.className = "c " + c.style + (c.style === "end" ? "" : " carte") + (c.pos === "top" ? " top" : "");
    d.style.opacity = c.o;
    const dy = (1 - c.o) * 24;
    if (c.style !== "end") d.style.transform = "translate(-50%," + dy + "px)";
    if (c.style === "end") {
      d.innerHTML = '<div class="k">' + (c.kicker || "") + '</div><div class="t">' + c.title + '</div>' +
        (c.url ? '<div class="u">' + c.url + '</div>' : "") + (c.sub ? '<div class="s">' + c.sub + '</div>' : "");
    } else {
      d.innerHTML = '<div class="t">' + c.title + '</div>' + (c.sub ? '<div class="s">' + c.sub + '</div>' : "");
    }
    r.appendChild(d);
  }
};
</script></body></html>`;

export async function overlay({ dir }) {
  const tl = JSON.parse(await readFile(path.join(dir, "timeline.json"), "utf8"));
  const F = FORMATS[tl.format];
  const out = path.join(dir, "overlay");
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: F.w, height: F.h } });
  await page.setContent(OVERLAY_HTML(F.w, F.h, tl.accent ?? undefined), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const FONDU = 0.3;
  const cache = new Map();
  const map = [];
  for (let i = 0; i < tl.frames; i++) {
    const t = i / tl.fps;
    const list = tl.captions
      .filter((c) => t >= c.start && t < c.end)
      .map((c) => {
        const entree = c.start === 0 ? 1 : Math.min(1, (t - c.start) / FONDU);
        const sortie = Math.min(1, (c.end - t) / FONDU);
        return { ...c, o: Math.round(ease(Math.min(entree, sortie)) * 20) / 20 };
      });
    if (!list.length) { map.push(null); continue; }
    const key = JSON.stringify(list.map(({ start, end, ...r }) => r));
    if (!cache.has(key)) {
      const f = path.join(out, `${cache.size}.png`);
      await page.evaluate((l) => window.render(l), list);
      await page.screenshot({ path: f, omitBackground: true });
      cache.set(key, f);
    }
    map.push(cache.get(key));
  }
  await browser.close();
  await writeFile(path.join(dir, "overlay.json"), JSON.stringify(map));
  console.log(`  ${cache.size} états de titres`);
}

/* ───────────────────────────── 3. COMPOSE ───────────────────────────── */

export async function compose({ dir, outBase, web }) {
  const tl = JSON.parse(await readFile(path.join(dir, "timeline.json"), "utf8"));
  const ov = JSON.parse(await readFile(path.join(dir, "overlay.json"), "utf8"));
  const F = FORMATS[tl.format];
  const out = path.join(dir, "final");
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const files = (await readdir(path.join(dir, "frames"))).sort();
  let i = 0;
  const worker = async () => {
    while (i < files.length) {
      const k = i++;
      const c = tl.crops[k];
      let img = sharp(path.join(dir, "frames", files[k]))
        .extract({ left: Math.round(c.x), top: Math.round(c.y), width: Math.round(c.w), height: Math.round(c.h) })
        .resize(F.w, F.h, { kernel: "lanczos3" });
      if (ov[k]) img = sharp(await img.toBuffer()).composite([{ input: ov[k] }]);
      await img.jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toFile(path.join(out, files[k]));
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  await mkdir(path.dirname(outBase), { recursive: true });
  const ff = ffmpegBin();
  const seq = ["-y", "-framerate", String(tl.fps), "-i", path.join(out, "%05d.jpg")];
  await run(ff, [...seq, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${outBase}.mp4`]);
  console.log("  ✓", `${outBase}.mp4`);
  if (web) {
    await run(ff, [...seq, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-row-mt", "1", "-pix_fmt", "yuv420p", `${outBase}.webm`]);
    console.log("  ✓", `${outBase}.webm`);
  }
  const poster = files[Math.min(files.length - 1, Math.round(tl.poster * tl.fps))];
  await sharp(path.join(out, poster)).webp({ quality: 85 }).toFile(`${outBase}.webp`);
  console.log("  ✓", `${outBase}.webp`);
}
