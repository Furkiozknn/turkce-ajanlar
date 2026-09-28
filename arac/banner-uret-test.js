/*
 * banner-uret-test.js — banner ve sosyal kartta "N ajan" etiketi gorunur mu?
 *
 *   node arac/banner-uret-test.js
 *
 * Neden: etiketin x konumu ajan sayisiyla hesaplaniyordu ama cizilen nokta
 * sayisi 8'de kesiliyordu. 70 ajanda etiket x=1900'e (banner 1200 genis),
 * sosyal kartta x=2932'ye (kart 1280 genis) dustu; README'nin en ustundeki
 * gorselde ajan sayisi hic gorunmuyordu ve hicbir kapi bunu fark etmedi.
 *
 * Iki katman:
 *   1. Uretec: farkli ajan sayilarinda her <text> ve <circle> tuvalin icinde.
 *   2. Depodaki dosyalar: assets/banner.svg ve social.svg guncel sayiyi
 *      tasiyor ve etiket tuvalin icinde (ajan eklenip banner yenilenmezse
 *      burada kirmizi yanar).
 *
 * Tarayici gerekmez; SVG metni uzerinden olcer. Cikis kodu: dusen varsa 1.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { bannerSvg, sosyalSvg } = require("./banner-uret.js");

const KOK = path.resolve(__dirname, "..");

let gecen = 0;
let kalan = 0;
function bekle(ad, kosul, ipucu) {
  if (kosul) { gecen++; console.log("  ok   " + ad); }
  else { kalan++; console.log("  DUS  " + ad + (ipucu ? "\n       " + ipucu : "")); }
}

function genislik(svg) {
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return m ? Number(m[1]) : NaN;
}

// Tuvalin disina tasan x degerleri (text-anchor="end" olanlar sagdan olculur).
function tasanlar(svg) {
  const w = genislik(svg);
  const tasan = [];
  for (const m of svg.matchAll(/<(text|circle)\b[^>]*?\b(?:x|cx)="(-?[\d.]+)"[^>]*>([^<]*)/g)) {
    const x = Number(m[2]);
    if (!(x >= 0 && x <= w)) tasan.push(m[1] + " x=" + x + " '" + m[3].trim() + "'");
  }
  return tasan;
}

function etiketX(svg, n) {
  const m = svg.match(new RegExp('<text[^>]*\\bx="(-?[\\d.]+)"[^>]*>' + n + " ajan</text>"));
  return m ? Number(m[1]) : null;
}

console.log("— Uretec —");
for (const n of [1, 8, 9, 71, 250]) {
  for (const [ad, uret] of [["banner", bannerSvg], ["sosyal", sosyalSvg]]) {
    const svg = uret(n, null);
    const x = etiketX(svg, n);
    bekle(ad + " " + n + " ajan: etiket var ve tuvalde", x !== null && x < genislik(svg), "x=" + x + " genislik=" + genislik(svg));
    const t = tasanlar(svg);
    bekle(ad + " " + n + " ajan: tasan oge yok", t.length === 0, t.join(" | "));
  }
}

console.log("\n— Depodaki dosyalar —");
const ajanSayisi = fs.readdirSync(path.join(KOK, "agents")).filter((f) => f.endsWith(".md")).length;
for (const dosya of ["assets/banner.svg", "assets/social.svg"]) {
  const svg = fs.readFileSync(path.join(KOK, dosya), "utf8");
  const x = etiketX(svg, ajanSayisi);
  bekle(
    dosya + ": '" + ajanSayisi + " ajan' yaziyor ve gorunur",
    x !== null && x < genislik(svg),
    x === null
      ? "etiket bulunamadi; calistir: node arac/banner-uret.js"
      : "x=" + x + " genislik=" + genislik(svg)
  );
}

console.log("\n" + gecen + " gecti, " + kalan + " kaldi");
process.exit(kalan ? 1 : 0);
