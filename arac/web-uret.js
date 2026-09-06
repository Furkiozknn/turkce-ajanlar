/*
 * web-uret.js — ajanlar/*.md dosyalarindan tek dosyalik web arayuzu uretir.
 *
 *   node arac/web-uret.js
 *
 * Cikti: web/index.html
 *   - Bagimlilik yok, derleme adimi yok
 *   - Dosyadan (file://) acilinca da calisir
 *   - Ajan icerigi HTML'e gomulur, ayri istek yapmaz
 */

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const KAYNAK = path.join(KOK, "ajanlar");
const CIKTI_KLASOR = path.join(KOK, "web");
const CIKTI = path.join(CIKTI_KLASOR, "index.html");

// --- frontmatter ayristirma ------------------------------------------------
function ayristir(ham, dosyaAdi) {
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${dosyaAdi}: frontmatter bulunamadi`);

  const alanlar = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const k = satir.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!k) continue;
    let deger = k[2].trim();
    if (deger.startsWith("[") && deger.endsWith("]")) {
      deger = deger
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      deger = deger.replace(/^["']|["']$/g, "");
    }
    alanlar[k[1]] = deger;
  }
  return { alanlar, govde: m[2].trim(), ham };
}

// --- markdown isaretlerini temizle (kart ozeti icin) -----------------------
function sadeMetin(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- description icindeki tetikleyici ifadeleri cikar ----------------------
function tetikleyiciler(aciklama) {
  const bulunan = [];
  const re = /"([^"]{3,60})"/g;
  let m;
  while ((m = re.exec(aciklama)) !== null) bulunan.push(m[1]);
  return bulunan.slice(0, 6);
}

// --- ajanlari oku ----------------------------------------------------------
if (!fs.existsSync(KAYNAK)) {
  console.error("ajanlar klasoru yok: " + KAYNAK);
  process.exit(1);
}

const ajanlar = [];
for (const ad of fs.readdirSync(KAYNAK).sort()) {
  if (!ad.endsWith(".md")) continue;
  const ham = fs.readFileSync(path.join(KAYNAK, ad), "utf8");
  const { alanlar, govde } = ayristir(ham, ad);
  ajanlar.push({
    ad: alanlar.name || ad.replace(/\.md$/, ""),
    dosya: ad,
    aciklama: alanlar.description || "",
    renk: alanlar.color || "gray",
    araclar: Array.isArray(alanlar.tools) ? alanlar.tools : [],
    model: alanlar.model || "inherit",
    tetik: tetikleyiciler(alanlar.description || ""),
    // Ilk paragraf: karttaki ozet. Markdown isaretlerini temizle -
    // kartta ham "**kalin**" gorunmesin.
    ozet: sadeMetin(govde.split(/\r?\n\r?\n/)[0] || ""),
    ham,
  });
}

if (ajanlar.length === 0) {
  console.error("hic ajan bulunamadi");
  process.exit(1);
}

// --- HTML --------------------------------------------------------------
const VERI = JSON.stringify(ajanlar)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

const damga = new Date().toLocaleString("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Türkçe Ajanlar — Claude Code alt-ajan seti</title>
<style>
:root {
  color-scheme: light dark;
  --zemin: #fbfaf8;
  --kart: #ffffff;
  --kenar: #e5e1da;
  --metin: #1c1a17;
  --sonuk: #6b6559;
  --vurgu: #b8532f;
  --vurgu-zemin: #fdf3ef;
  --golge: 0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04);
  --r: 10px;
}
:root:not([data-tema="light"]) {
  @media (prefers-color-scheme: dark) {
    --zemin: #16150f;
    --kart: #1f1e18;
    --kenar: #33312a;
    --metin: #eeece4;
    --sonuk: #a09a8c;
    --vurgu: #e08c62;
    --vurgu-zemin: #2a231d;
    --golge: 0 1px 2px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.25);
  }
}
:root[data-tema="dark"] {
  --zemin: #16150f;
  --kart: #1f1e18;
  --kenar: #33312a;
  --metin: #eeece4;
  --sonuk: #a09a8c;
  --vurgu: #e08c62;
  --vurgu-zemin: #2a231d;
  --golge: 0 1px 2px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.25);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--zemin); color: var(--metin);
  font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.sarmal { max-width: 1080px; margin: 0 auto; padding: 32px 20px 80px; }

header h1 { font-size: 27px; margin: 0 0 6px; letter-spacing: -.02em; }
header p { margin: 0; color: var(--sonuk); max-width: 62ch; }
.ust { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.tema-dugme {
  flex: none; background: var(--kart); border: 1px solid var(--kenar);
  color: var(--sonuk); border-radius: var(--r); padding: 7px 12px;
  cursor: pointer; font: inherit; font-size: 13px;
}
.tema-dugme:hover { color: var(--metin); border-color: var(--sonuk); }

.arama-satir { display: flex; gap: 10px; align-items: center; margin: 24px 0 6px; }
#arama {
  flex: 1; padding: 11px 14px; font: inherit;
  background: var(--kart); color: var(--metin);
  border: 1px solid var(--kenar); border-radius: var(--r);
}
#arama:focus { outline: 2px solid var(--vurgu); outline-offset: -1px; border-color: transparent; }
#arama::placeholder { color: var(--sonuk); }
.sayac { color: var(--sonuk); font-size: 13px; margin-bottom: 20px; }
kbd {
  font: 11px ui-monospace, monospace; background: var(--vurgu-zemin);
  border: 1px solid var(--kenar); border-radius: 4px; padding: 1px 5px; color: var(--sonuk);
}

.izgara { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); }
.kart {
  background: var(--kart); border: 1px solid var(--kenar); border-radius: var(--r);
  padding: 16px 18px; cursor: pointer; text-align: right;
  box-shadow: var(--golge); transition: border-color .12s, transform .12s;
  display: flex; flex-direction: column; gap: 8px; text-align: left;
  font: inherit; color: inherit; width: 100%;
}
.kart:hover, .kart:focus-visible {
  border-color: var(--vurgu); transform: translateY(-1px); outline: none;
}
.kart h2 {
  margin: 0; font-size: 15.5px; font-family: ui-monospace, monospace;
  display: flex; align-items: center; gap: 8px; letter-spacing: -.01em;
}
.nokta { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.kart p { margin: 0; color: var(--sonuk); font-size: 13.5px; }
.cipler { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.cip {
  font: 11px ui-monospace, monospace; background: var(--vurgu-zemin);
  color: var(--sonuk); border-radius: 5px; padding: 2px 7px;
  border: 1px solid var(--kenar);
}

.bos { color: var(--sonuk); padding: 48px 0; text-align: center; }

/* --- detay --- */
dialog {
  border: 1px solid var(--kenar); border-radius: 14px; padding: 0;
  background: var(--kart); color: var(--metin);
  max-width: 780px; width: calc(100% - 32px); max-height: 86vh;
  box-shadow: 0 12px 48px rgba(0,0,0,.28);
}
dialog::backdrop { background: rgba(0,0,0,.45); }
.detay-ust {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 18px 22px; border-bottom: 1px solid var(--kenar);
  position: sticky; top: 0; background: var(--kart); border-radius: 14px 14px 0 0;
}
.detay-ust h2 { margin: 0; font-size: 17px; font-family: ui-monospace, monospace; }
.detay-govde { padding: 20px 22px; overflow-y: auto; max-height: calc(86vh - 72px); }
.detay-govde h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em;
  color: var(--sonuk); margin: 22px 0 8px; font-weight: 600; }
.detay-govde h3:first-child { margin-top: 0; }
pre {
  background: var(--zemin); border: 1px solid var(--kenar); border-radius: 8px;
  padding: 13px 15px; overflow-x: auto; font: 12.5px/1.55 ui-monospace, monospace;
  margin: 0; white-space: pre-wrap; word-break: break-word;
}
.dugmeler { display: flex; gap: 8px; flex-wrap: wrap; }
button.eylem {
  background: var(--vurgu); color: #fff; border: none; border-radius: 8px;
  padding: 9px 15px; font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
}
button.eylem:hover { filter: brightness(1.07); }
button.ikincil { background: transparent; color: var(--sonuk); border: 1px solid var(--kenar); }
button.ikincil:hover { color: var(--metin); border-color: var(--sonuk); }
.kapat {
  background: none; border: none; color: var(--sonuk); font-size: 22px;
  cursor: pointer; line-height: 1; padding: 0 4px;
}
.kapat:hover { color: var(--metin); }
ul.tetik { margin: 0; padding-left: 20px; color: var(--sonuk); font-size: 13.5px; }
ul.tetik li { margin-bottom: 3px; }

footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--kenar);
  color: var(--sonuk); font-size: 13px; }
footer a { color: var(--vurgu); }

@media (max-width: 560px) {
  .sarmal { padding: 22px 14px 60px; }
  header h1 { font-size: 22px; }
  .izgara { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="sarmal">

<header>
  <div class="ust">
    <div>
      <h1>Türkçe Ajanlar</h1>
      <p>Claude Code için Türkçe alt-ajan seti. Az sayıda, gerçekten
         kullanılan, ve çalıştığı makinenin tuzaklarını bilen ajanlar.</p>
    </div>
    <button class="tema-dugme" id="tema" title="Temayı değiştir">Tema</button>
  </div>
</header>

<div class="arama-satir">
  <input id="arama" type="search" placeholder="Ara — ad, ne yaptığı, tetikleyici ifade…"
         autocomplete="off" spellcheck="false">
</div>
<div class="sayac"><span id="sayac"></span> · Aramaya atlamak için <kbd>/</kbd></div>

<div class="izgara" id="izgara"></div>
<div class="bos" id="bos" hidden>Eşleşen ajan yok. Başka bir kelime dene.</div>

<footer>
  <strong id="toplam"></strong> ajan · Son güncelleme ${damga} ·
  MIT lisansı · Kurulum: <code>kur.ps1</code>
</footer>

</div>

<dialog id="detay">
  <div class="detay-ust">
    <h2 id="d-ad"></h2>
    <button class="kapat" id="d-kapat" aria-label="Kapat">&times;</button>
  </div>
  <div class="detay-govde">
    <h3>Ne yapar</h3>
    <p id="d-aciklama" style="margin:0;color:var(--sonuk);font-size:13.5px"></p>

    <div id="d-tetik-blok">
      <h3>Bunları dediğinde çağrılır</h3>
      <ul class="tetik" id="d-tetik"></ul>
    </div>

    <h3>Araçlar</h3>
    <div class="cipler" id="d-araclar"></div>

    <h3>Kurulum</h3>
    <pre id="d-kurulum"></pre>

    <h3>Tam tanım</h3>
    <div class="dugmeler" style="margin-bottom:10px">
      <button class="eylem" id="d-kopyala">Markdown'ı kopyala</button>
      <button class="eylem ikincil" id="d-indir">Dosya olarak indir</button>
    </div>
    <pre id="d-ham"></pre>
  </div>
</dialog>

<script>
const AJANLAR = ${VERI};

const RENK = {
  purple: "#8b6bb1", blue: "#4a7fb5", green: "#5a9367",
  cyan: "#4a9ba5", orange: "#c67b3f", yellow: "#c9a227",
  red: "#b5544a", gray: "#8a8578"
};

const $ = (s) => document.querySelector(s);
const izgara = $("#izgara"), bos = $("#bos"), arama = $("#arama");
const detay = $("#detay");

function kartYap(a, i) {
  const b = document.createElement("button");
  b.className = "kart";
  b.type = "button";
  b.dataset.i = i;

  const h = document.createElement("h2");
  const nokta = document.createElement("span");
  nokta.className = "nokta";
  nokta.style.background = RENK[a.renk] || RENK.gray;
  h.append(nokta, document.createTextNode(a.ad));

  const p = document.createElement("p");
  p.textContent = a.ozet.length > 155 ? a.ozet.slice(0, 152) + "…" : a.ozet;

  const c = document.createElement("div");
  c.className = "cipler";
  for (const t of a.araclar.slice(0, 5)) {
    const s = document.createElement("span");
    s.className = "cip";
    s.textContent = t;
    c.appendChild(s);
  }

  b.append(h, p, c);
  b.addEventListener("click", () => ac(a));
  return b;
}

function ciz(liste) {
  izgara.replaceChildren();
  liste.forEach((a) => izgara.appendChild(kartYap(a, AJANLAR.indexOf(a))));
  bos.hidden = liste.length > 0;
  $("#sayac").textContent = liste.length === AJANLAR.length
    ? AJANLAR.length + " ajan"
    : liste.length + " / " + AJANLAR.length + " ajan";
}

function ac(a) {
  $("#d-ad").textContent = a.ad;
  $("#d-aciklama").textContent = a.aciklama;

  const tb = $("#d-tetik");
  tb.replaceChildren();
  if (a.tetik.length) {
    for (const t of a.tetik) {
      const li = document.createElement("li");
      li.textContent = '"' + t + '"';
      tb.appendChild(li);
    }
    $("#d-tetik-blok").hidden = false;
  } else {
    $("#d-tetik-blok").hidden = true;
  }

  const ar = $("#d-araclar");
  ar.replaceChildren();
  for (const t of a.araclar) {
    const s = document.createElement("span");
    s.className = "cip";
    s.textContent = t;
    ar.appendChild(s);
  }

  $("#d-kurulum").textContent =
    "# Depodan kur (tavsiye edilen)\\n" +
    "powershell -ExecutionPolicy Bypass -File kur.ps1\\n\\n" +
    "# Ya da tek ajanı elle:\\n" +
    "# asagidaki markdown'i su dosyaya kaydet\\n" +
    ".claude/agents/" + a.dosya;

  $("#d-ham").textContent = a.ham;
  detay.showModal();
}

$("#d-kapat").addEventListener("click", () => detay.close());
detay.addEventListener("click", (e) => { if (e.target === detay) detay.close(); });

$("#d-kopyala").addEventListener("click", async (e) => {
  const metin = $("#d-ham").textContent;
  try {
    await navigator.clipboard.writeText(metin);
    e.target.textContent = "Kopyalandı ✓";
  } catch {
    // file:// altinda pano engellenebilir - secerek gosterelim
    const r = document.createRange();
    r.selectNodeContents($("#d-ham"));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    e.target.textContent = "Seçildi — Ctrl+C";
  }
  setTimeout(() => (e.target.textContent = "Markdown'ı kopyala"), 2200);
});

$("#d-indir").addEventListener("click", () => {
  const ad = $("#d-ad").textContent + ".md";
  const b = new Blob([$("#d-ham").textContent], { type: "text/markdown" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
});

arama.addEventListener("input", () => {
  const q = arama.value.trim().toLocaleLowerCase("tr");
  if (!q) return ciz(AJANLAR);
  ciz(AJANLAR.filter((a) =>
    (a.ad + " " + a.aciklama + " " + a.ham).toLocaleLowerCase("tr").includes(q)
  ));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== arama) {
    e.preventDefault(); arama.focus(); arama.select();
  }
  if (e.key === "Escape" && !detay.open && arama.value) {
    arama.value = ""; ciz(AJANLAR);
  }
});

// tema
const kayit = (() => { try { return localStorage.getItem("tema"); } catch { return null; } })();
if (kayit) document.documentElement.dataset.tema = kayit;
$("#tema").addEventListener("click", () => {
  const su = document.documentElement.dataset.tema;
  const koyu = su ? su === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const yeni = koyu ? "light" : "dark";
  document.documentElement.dataset.tema = yeni;
  try { localStorage.setItem("tema", yeni); } catch {}
});

$("#toplam").textContent = AJANLAR.length;
ciz(AJANLAR);
</script>
</body>
</html>
`;

fs.mkdirSync(CIKTI_KLASOR, { recursive: true });
fs.writeFileSync(CIKTI, html, "utf8");

console.log("Uretildi: " + CIKTI);
console.log("  ajan sayisi : " + ajanlar.length);
console.log("  boyut       : " + (Buffer.byteLength(html, "utf8") / 1024).toFixed(1) + " KB");
for (const a of ajanlar) {
  console.log("  - " + a.ad + "  (" + a.araclar.length + " arac)");
}
