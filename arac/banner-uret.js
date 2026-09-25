/*
 * banner-uret.js — README banner'ini uretir.
 *
 *   node arac/banner-uret.js
 *
 * Cikti: assets/banner.svg  (1200x320)
 *
 * Neden SVG, neden uretilmis bir gorsel degil:
 *   - Kullanicinin diger 15 deposu ayni kalibi kullaniyor (1200x320,
 *     gomulu JetBrains Mono). Ayni aileden gorunmesi icin ayni kalip.
 *   - Metin iceren banner'da SVG her olcekte keskin kaliyor; uretilmis
 *     raster gorselde yazi bozuluyor.
 *   - Font gomulu oldugu icin her makinede ayni goruntu.
 *
 * Font, kullanicinin kendi deposundaki banner'dan alinir (ayni ev stili).
 */

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const CIKTI_KLASOR = path.join(KOK, "assets");
const CIKTI = path.join(CIKTI_KLASOR, "banner.svg");

// Ev stilindeki font blogunu kullanicinin mevcut bir banner'indan al.
const FONT_KAYNAKLARI = [
  "D:/Repolar/mcp-vet/assets/banner.svg",
  "D:/Repolar/ai-job-gateway/assets/banner.svg",
  "D:/Repolar/model-comparison-harness/assets/banner.svg",
];

function fontBlogu() {
  for (const k of FONT_KAYNAKLARI) {
    if (!fs.existsSync(k)) continue;
    const s = fs.readFileSync(k, "utf8");
    const m = s.match(/@font-face\s*\{[\s\S]*?\}/);
    if (m) return { blok: m[0], kaynak: k };
  }
  return { blok: null, kaynak: null };
}

function aile(blok) {
  return blok ? "'JetBrains Mono', ui-monospace, monospace" : "ui-monospace, monospace";
}

// Ajan sayisini gercek dosyalardan oku - elle yazip bayatlamasin.
function ajanSay(klasor) {
  return fs.existsSync(klasor)
    ? fs.readdirSync(klasor).filter((f) => f.endsWith(".md")).length
    : 0;
}

// Web arayuzuyle ayni palet.
const R = {
  zemin: "#16150f",
  kart: "#1f1e18",
  kenar: "#33312a",
  metin: "#eeece4",
  sonuk: "#a09a8c",
  vurgu: "#e08c62",
};

// Ajan renkleri - web arayuzundeki noktalarla ayni
const NOKTALAR = ["#8b6bb1", "#4a7fb5", "#5a9367", "#4a9ba5", "#c67b3f", "#c9a227", "#b5544a", "#8a8578"];

/*
 * Nokta sayisi palet uzunluguyla (8) sinirli; "N ajan" etiketi CIZILEN
 * son noktanin yanina konmali. Eskiden ajan sayisiyla hesaplaniyordu:
 * 70 ajanda x=1900 -> 1200 genislikteki banner'in disina dusup hic
 * gorunmuyordu (sosyal kartta x=2932). banner-uret-test.js bunu olcer.
 */
function noktaAdedi(ajanSayisi) {
  return Math.min(Math.max(ajanSayisi, 1), NOKTALAR.length);
}

function bannerSvg(ajanSayisi, blok) {
  const AILE = aile(blok);
  const n = noktaAdedi(ajanSayisi);
  const noktaSvg = NOKTALAR.slice(0, n)
    .map((c, i) => `<circle cx="${72 + i * 26}" cy="243" r="5.5" fill="${c}"/>`)
    .join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320" role="img" aria-label="turkce-ajanlar — Claude Code icin Turkce alt-ajan seti">
  <defs>
    <style>
      ${blok || "/* gomulu font yok */"}
      .baslik { font-family: ${AILE}; font-weight: 400; }
      .metin  { font-family: ${AILE}; font-weight: 400; }
    </style>
    <linearGradient id="cizgi" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="${R.vurgu}" stop-opacity="0"/>
      <stop offset=".18" stop-color="${R.vurgu}" stop-opacity=".9"/>
      <stop offset=".82" stop-color="${R.vurgu}" stop-opacity=".9"/>
      <stop offset="1"   stop-color="${R.vurgu}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="320" fill="${R.zemin}"/>

  <!-- ince cerceve -->
  <rect x="40" y="34" width="1120" height="252" rx="14" fill="${R.kart}" stroke="${R.kenar}" stroke-width="1"/>

  <!-- ust vurgu cizgisi -->
  <rect x="40" y="34" width="1120" height="2" fill="url(#cizgi)"/>

  <!-- istem satiri -->
  <text class="metin" x="72" y="96" font-size="15" fill="${R.sonuk}">$ claude</text>

  <!-- baslik -->
  <text class="baslik" x="72" y="152" font-size="42" fill="${R.metin}" letter-spacing="-1">turkce-ajanlar</text>

  <!-- alt baslik -->
  <text class="metin" x="72" y="190" font-size="17" fill="${R.sonuk}">Claude Code icin Turkce alt-ajan seti</text>

  <!-- ayrac -->
  <rect x="72" y="212" width="1056" height="1" fill="${R.kenar}"/>

  <!-- ajan noktalari -->
  ${noktaSvg}

  <text class="metin" x="${72 + n * 26 + 8}" y="248" font-size="14" fill="${R.sonuk}">${ajanSayisi} ajan</text>

  <!-- sag taraf: ayirt edici ozellik -->
  <text class="metin" x="1128" y="248" font-size="14" fill="${R.vurgu}" text-anchor="end">ciktilar Turkce · bulgu sismez</text>
</svg>
`;
}

// --- Sosyal kart: 1280x640 (GitHub "social preview" orani) -------------------
// GitHub SVG kabul etmiyor; bu SVG arac/sosyal-kart.js ile PNG'ye cevrilir.
const SOSYAL = path.join(CIKTI_KLASOR, "social.svg");

function sosyalSvg(ajanSayisi, blok) {
  const AILE = aile(blok);
  const n = noktaAdedi(ajanSayisi);
  const sosyalNoktalar = NOKTALAR.slice(0, n)
    .map((c, i) => `<circle cx="${120 + i * 40}" cy="486" r="9" fill="${c}"/>`)
    .join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640" role="img" aria-label="turkce-ajanlar">
  <defs>
    <style>
      ${blok || "/* gomulu font yok */"}
      .baslik { font-family: ${AILE}; font-weight: 400; }
      .metin  { font-family: ${AILE}; font-weight: 400; }
    </style>
    <linearGradient id="cizgi2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="${R.vurgu}" stop-opacity="0"/>
      <stop offset=".2"  stop-color="${R.vurgu}" stop-opacity=".9"/>
      <stop offset=".8"  stop-color="${R.vurgu}" stop-opacity=".9"/>
      <stop offset="1"   stop-color="${R.vurgu}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="640" fill="${R.zemin}"/>
  <rect x="64" y="64" width="1152" height="512" rx="20" fill="${R.kart}" stroke="${R.kenar}" stroke-width="1.5"/>
  <rect x="64" y="64" width="1152" height="3" fill="url(#cizgi2)"/>
  <text class="metin" x="120" y="170" font-size="24" fill="${R.sonuk}">$ claude</text>
  <text class="baslik" x="120" y="270" font-size="76" fill="${R.metin}" letter-spacing="-2">turkce-ajanlar</text>
  <text class="metin" x="120" y="330" font-size="28" fill="${R.sonuk}">Claude Code icin Turkce alt-ajan seti</text>
  <text class="metin" x="120" y="386" font-size="22" fill="${R.sonuk}">Az sayida, gercekten kullanilan, calistigi makinenin tuzaklarini bilen ajanlar.</text>
  <rect x="120" y="432" width="1040" height="1.5" fill="${R.kenar}"/>
  ${sosyalNoktalar}
  <text class="metin" x="${120 + n * 40 + 12}" y="494" font-size="22" fill="${R.sonuk}">${ajanSayisi} ajan</text>
  <text class="metin" x="1160" y="494" font-size="22" fill="${R.vurgu}" text-anchor="end">ciktilar Turkce · bulgu sismez · MIT</text>
</svg>
`;
}

module.exports = { bannerSvg, sosyalSvg, noktaAdedi, NOKTALAR };

if (require.main === module) {
  const { blok, kaynak } = fontBlogu();
  if (blok) console.log("Font ev stilinden alindi: " + kaynak);
  else console.log("UYARI: gomulu font bulunamadi, sistem monospace kullanilacak.");

  const ajanSayisi = ajanSay(path.join(KOK, "agents"));
  const svg = bannerSvg(ajanSayisi, blok);
  const sosyal = sosyalSvg(ajanSayisi, blok);

  fs.mkdirSync(CIKTI_KLASOR, { recursive: true });
  fs.writeFileSync(CIKTI, svg, "utf8");
  fs.writeFileSync(SOSYAL, sosyal, "utf8");
  console.log("Uretildi: " + SOSYAL + "  (" + (Buffer.byteLength(sosyal, "utf8") / 1024).toFixed(1) + " KB)");

  console.log("Uretildi: " + CIKTI);
  console.log("  ajan sayisi : " + ajanSayisi);
  console.log("  boyut       : " + (Buffer.byteLength(svg, "utf8") / 1024).toFixed(1) + " KB");
}
