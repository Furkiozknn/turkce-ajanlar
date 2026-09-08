/*
 * web-uret.js — agents/*.md dosyalarindan tek dosyalik web arayuzu uretir.
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
const KAYNAK = path.join(KOK, "agents");
const CIKTI_KLASOR = path.join(KOK, "web");
const CIKTI = path.join(CIKTI_KLASOR, "index.html");

// --- frontmatter ayristirma ------------------------------------------------
function ayristir(ham, dosyaAdi) {
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${dosyaAdi}: frontmatter bulunamadi`);

  const alanlar = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const k = satir.match(/^([a-zA-Z_-]+):\s*(.*)$/);
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

// --- description icindeki tetikleyici ifadeleri cikar ----------------------
function tetikleyiciler(aciklama) {
  const bulunan = [];
  const re = /"([^"]{3,60})"/g;
  let m;
  while ((m = re.exec(aciklama)) !== null) bulunan.push(m[1]);
  return bulunan.slice(0, 6);
}

// --- description'i "ne yapar" + "siniri" diye ikiye bol --------------------
//
// Ajan aciklamalari su kaliba gore yazilir:
//   <ne yapar>. Kullanici "..." , "..." dediginde kullan. <siniri>.
// Kartta gosterilecek olan ilk parca; "siniri" ise kullanicinin en cok
// merak ettigi sey ("silmez mi?", "yazar mi?") oldugu icin ayri gosterilir.
// Kalip tutmazsa ilk cumleyi ozet sayariz — hicbir zaman bos donmez.
function bolumle(aciklama) {
  const m = aciklama.match(
    /^([\s\S]*?)(\s*Kullanıcı[^.]*?dediğinde[^.]*?\.)([\s\S]*)$/
  );
  if (m) return { ozet: m[1].trim(), sinir: m[3].trim() };
  const nokta = aciklama.indexOf(". ");
  if (nokta > 0) {
    return {
      ozet: aciklama.slice(0, nokta + 1).trim(),
      sinir: aciklama.slice(nokta + 1).trim(),
    };
  }
  return { ozet: aciklama.trim(), sinir: "" };
}

// --- ajanlari oku ----------------------------------------------------------
if (!fs.existsSync(KAYNAK)) {
  console.error("agents klasoru yok: " + KAYNAK);
  process.exit(1);
}

const ajanlar = [];
for (const ad of fs.readdirSync(KAYNAK).sort()) {
  if (!ad.endsWith(".md")) continue;
  const ham = fs.readFileSync(path.join(KAYNAK, ad), "utf8");
  const { alanlar } = ayristir(ham, ad);
  const aciklama = alanlar.description || "";
  const { ozet, sinir } = bolumle(aciklama);
  ajanlar.push({
    ad: alanlar.name || ad.replace(/\.md$/, ""),
    dosya: ad,
    aciklama,
    // Kartta gorunen metin: ajanin NE YAPTIGI. Gövdenin ilk paragrafi
    // ("Sen bir dosya duzenleyicisin...") Claude'a yazilmis bir talimat,
    // ajani secmeye calisan kullaniciya bir sey anlatmaz.
    ozet,
    sinir,
    renk: alanlar.color || "gray",
    araclar: Array.isArray(alanlar.tools) ? alanlar.tools : [],
    model: alanlar.model || "inherit",
    tetik: tetikleyiciler(aciklama),
    ham,
  });
}

if (ajanlar.length === 0) {
  console.error("hic ajan bulunamadi");
  process.exit(1);
}

// --- komutlar ve beceriler (plugin ekleri) ---------------------------------
// Ajan gibi kart degil, kisa liste: komutu kullanici cagirir, beceri konu
// acilinca kendiliginden yuklenir. Ikisi de plugin kurulunca gelir.
const ekler = [];
const komutKlasor = path.join(KOK, "commands");
if (fs.existsSync(komutKlasor)) {
  for (const f of fs.readdirSync(komutKlasor).filter((x) => x.endsWith(".md")).sort()) {
    const { alanlar } = ayristir(fs.readFileSync(path.join(komutKlasor, f), "utf8"), f);
    const ad = f.replace(/\.md$/, "");
    const ipucu = alanlar["argument-hint"] ? " " + alanlar["argument-hint"] : "";
    ekler.push({ tur: "komut", ad, cagri: "/turkce-ajanlar:" + ad + ipucu, aciklama: alanlar.description || "" });
  }
}
const beceriKlasor = path.join(KOK, "skills");
if (fs.existsSync(beceriKlasor)) {
  for (const d of fs.readdirSync(beceriKlasor).sort()) {
    const sk = path.join(beceriKlasor, d, "SKILL.md");
    if (!fs.existsSync(sk)) continue;
    const { alanlar } = ayristir(fs.readFileSync(sk, "utf8"), d + "/SKILL.md");
    const ad = alanlar.name || d;
    ekler.push({ tur: "beceri", ad, cagri: "/turkce-ajanlar:" + ad, aciklama: alanlar.description || "" });
  }
}
const kacirHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const eklerHtml = ekler
  .map((e) => `    <li><span class="tur tur-${e.tur}">${e.tur}</span><code>${kacirHtml(e.cagri)}</code><span class="ek-aciklama">${kacirHtml(e.aciklama)}</span></li>`)
  .join("\n");
const komutSayisi = ekler.filter((e) => e.tur === "komut").length;
const beceriSayisi = ekler.length - komutSayisi;

// --- HTML --------------------------------------------------------------
const VERI = JSON.stringify(ajanlar)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

// Tarih damgasi DETERMINISTIK olmali: CI "web/index.html bayat mi" diye
// yeniden uretip diff aliyor; "simdi" yazilirsa her CI kosusu farkli cikar.
// Kaynak: agents/ klasorunun son commit tarihi; git yoksa bugun.
// agents/ altinda commit'lenmemis degisiklik varsa damga BUGUN olur: o degisiklik
// bugun commit'lenecek ve CI ayni tarihi gorecek. (Aksi halde yerel uretim dunku
// tarihi yazar, CI bugunkuyle yeniden uretir, "bayat" der — 8 Eylul 2026'da yasandi.)
function sonGuncellemeTarihi() {
  try {
    const cp = require("child_process");
    const kirli = cp.execFileSync("git", ["-C", KOK, "status", "--porcelain", "--", "agents"], { encoding: "utf8" }).trim();
    if (kirli) return new Date(new Date().toISOString().slice(0, 10) + "T12:00:00Z");
    const iso = cp.execFileSync("git", ["-C", KOK, "log", "-1", "--format=%cs", "--", "agents"], { encoding: "utf8" }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + "T12:00:00Z");
  } catch {}
  return new Date();
}
const damga = sonGuncellemeTarihi().toLocaleString("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Türkçe Ajanlar — Claude Code alt-ajan seti</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23b8532f'/%3E%3Ctext x='16' y='23' font-size='20' font-family='sans-serif' font-weight='700' fill='%23fff' text-anchor='middle'%3ETA%3C/text%3E%3C/svg%3E">
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

/* Klavyeyle gezenler odagin nerede oldugunu her yerde gorsun. */
:focus-visible { outline: 2px solid var(--vurgu); outline-offset: 2px; }

header h1 { font-size: 27px; margin: 0 0 6px; letter-spacing: -.02em; }
header p { margin: 0; color: var(--sonuk); max-width: 62ch; }
.ust { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.tema-dugme {
  flex: none; background: var(--kart); border: 1px solid var(--kenar);
  color: var(--sonuk); border-radius: var(--r); padding: 7px 12px;
  cursor: pointer; font: inherit; font-size: 13px; white-space: nowrap;
}
.tema-dugme:hover { color: var(--metin); border-color: var(--sonuk); }

/* "Kopyaladim, simdi ne olacak?" sorusunun cevabi sayfanin en basinda. */
.nasil {
  margin: 18px 0 0; padding: 12px 15px; border: 1px solid var(--kenar);
  border-left: 3px solid var(--vurgu); border-radius: var(--r);
  background: var(--vurgu-zemin); color: var(--sonuk); font-size: 13.5px;
  max-width: 72ch;
}
.nasil b { color: var(--metin); font-weight: 600; }
.nasil ol { margin: 6px 0 0; padding-left: 20px; }
.nasil li { margin-bottom: 2px; }
.nasil code {
  font: 12.5px ui-monospace, monospace; background: var(--kart);
  border: 1px solid var(--kenar); border-radius: 4px; padding: 1px 5px;
}

.arama-satir { display: flex; gap: 10px; align-items: center; margin: 22px 0 6px; }
#arama {
  flex: 1; padding: 11px 14px; font: inherit; min-width: 0;
  background: var(--kart); color: var(--metin);
  border: 1px solid var(--kenar); border-radius: var(--r);
}
#arama:focus { outline: 2px solid var(--vurgu); outline-offset: -1px; border-color: transparent; }
#arama::placeholder { color: var(--sonuk); }
.sayac { color: var(--sonuk); font-size: 13px; margin-bottom: 18px; }
.sayac .ipucu { opacity: .85; }
kbd {
  font: 11px ui-monospace, monospace; background: var(--vurgu-zemin);
  border: 1px solid var(--kenar); border-radius: 4px; padding: 1px 5px; color: var(--sonuk);
}
.derin-not {
  margin: -8px 0 16px; font-size: 13px; color: var(--sonuk);
  background: var(--vurgu-zemin); border: 1px solid var(--kenar);
  border-radius: var(--r); padding: 8px 12px;
}

.izgara { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); }
.kart {
  background: var(--kart); border: 1px solid var(--kenar); border-radius: var(--r);
  padding: 16px 18px; cursor: pointer;
  box-shadow: var(--golge); transition: border-color .12s, transform .12s;
  display: flex; flex-direction: column; gap: 8px; text-align: left;
  font: inherit; color: inherit; width: 100%;
}
.kart:hover { border-color: var(--vurgu); transform: translateY(-1px); }
.kart:focus-visible {
  border-color: var(--vurgu);
  outline: 2px solid var(--vurgu); outline-offset: 2px;
}
.kart h2 {
  margin: 0; font-size: 15.5px; font-family: ui-monospace, monospace;
  display: flex; align-items: center; gap: 8px; letter-spacing: -.01em;
}
.nokta { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.kart p { margin: 0; color: var(--sonuk); font-size: 13.5px; }
.kart .sinir {
  margin: 0; color: var(--sonuk); font-size: 12.5px; opacity: .9;
  border-left: 2px solid var(--kenar); padding-left: 8px;
}
.cipler { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.cip {
  font: 11px ui-monospace, monospace; background: var(--vurgu-zemin);
  color: var(--sonuk); border-radius: 5px; padding: 2px 7px;
  border: 1px solid var(--kenar);
}
/* Kartta arac adlari yerine tetikleyici ifadeler duruyor: bes ajanin da
   araclari ayni, ama soyledigin cumle farkli — ayirt eden bu. */
.cip.soz {
  font-family: inherit; font-size: 12px; background: transparent;
  border-style: dashed;
}

/* Komutlar ve beceriler: ajan gibi kart degil, kisa liste. */
.ekler { margin: 34px 0 0; }
.ekler h2 { font-size: 17px; margin: 0 0 4px; letter-spacing: -.01em; }
.ekler-not { margin: 0 0 12px; color: var(--sonuk); font-size: 13.5px; max-width: 72ch; }
.ekler-not code, .ekler li code {
  font: 12.5px ui-monospace, monospace; background: var(--kart);
  border: 1px solid var(--kenar); border-radius: 4px; padding: 1px 6px;
}
.ekler ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.ekler li {
  display: grid; grid-template-columns: auto auto 1fr; gap: 10px; align-items: baseline;
  background: var(--kart); border: 1px solid var(--kenar); border-radius: var(--r);
  padding: 10px 14px; box-shadow: var(--golge); font-size: 13.5px;
}
.ekler li[hidden] { display: none; }
.ek-aciklama { color: var(--sonuk); }
.tur {
  font: 11px ui-monospace, monospace; text-transform: uppercase; letter-spacing: .05em;
  border-radius: 5px; padding: 2px 7px; border: 1px solid var(--kenar); color: var(--sonuk);
}
.tur-komut { background: var(--vurgu-zemin); }
.tur-beceri { background: transparent; border-style: dashed; }
@media (max-width: 640px) {
  .ekler li { grid-template-columns: auto 1fr; }
  .ek-aciklama { grid-column: 1 / -1; }
}

.bos { color: var(--sonuk); padding: 48px 0; text-align: center; }

/* --- detay --- */
dialog {
  border: 1px solid var(--kenar); border-radius: 14px; padding: 0;
  background: var(--kart); color: var(--metin);
  max-width: 780px; width: calc(100% - 32px); max-height: 86vh;
  box-shadow: 0 12px 48px rgba(0,0,0,.28);
}
/* Sabit yukseklik hesabi yerine flex: baslik iki satira tasarsa da
   govde tasmaz, dugmeler kirpilmaz. */
dialog[open] { display: flex; flex-direction: column; }
dialog::backdrop { background: rgba(0,0,0,.45); }
.detay-ust {
  flex: none;
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 18px 22px; border-bottom: 1px solid var(--kenar);
  background: var(--kart); border-radius: 14px 14px 0 0;
}
.detay-ust h2 { margin: 0; font-size: 17px; font-family: ui-monospace, monospace; }
.detay-govde {
  flex: 1; min-height: 0; padding: 20px 22px;
  overflow-y: auto; overscroll-behavior: contain;
}
.detay-govde h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em;
  color: var(--sonuk); margin: 22px 0 8px; font-weight: 600; }
/* Yalniz govdenin ilk basligi ustten bosluksuz olsun. Once bu kural
   ic bloklarin ilk basligini da yakaliyordu, bolumler birbirine giriyordu. */
.detay-govde > h3:first-child { margin-top: 0; }
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
button.kucuk { font-size: 12.5px; padding: 6px 11px; }
.kapat {
  background: none; border: none; color: var(--sonuk); font-size: 22px;
  cursor: pointer; line-height: 1; padding: 0 4px;
}
.kapat:hover { color: var(--metin); }
ul.tetik { margin: 0; padding-left: 20px; color: var(--sonuk); font-size: 13.5px; }
ul.tetik li { margin-bottom: 3px; }
.meta { margin: 6px 0 0; color: var(--sonuk); font-size: 12.5px; }

/* --- kur ve kullan adimlari --- */
ol.adimlar { margin: 0; padding: 0; list-style: none; counter-reset: adim; }
ol.adimlar > li {
  position: relative; padding: 0 0 16px 34px; counter-increment: adim;
  border-left: 1px solid var(--kenar); margin-left: 11px;
}
ol.adimlar > li:last-child { border-left-color: transparent; padding-bottom: 0; }
ol.adimlar > li::before {
  content: counter(adim);
  position: absolute; left: -11px; top: 0;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--kart); border: 1px solid var(--kenar); color: var(--sonuk);
  font: 600 11px/20px ui-sans-serif, system-ui, sans-serif; text-align: center;
}
ol.adimlar > li.tamam::before {
  content: "✓"; background: var(--vurgu); border-color: var(--vurgu); color: #fff;
}
ol.adimlar > li.etkin::before { border-color: var(--vurgu); color: var(--vurgu); }
ol.adimlar > li.etkin { background: var(--vurgu-zemin); border-radius: 0 8px 8px 0; }
.adim-baslik { font-size: 13.5px; margin: 1px 0 7px; }
.adim-alt { color: var(--sonuk); font-size: 12.5px; margin: 7px 0 0; }
.satir-kod {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
}
.satir-kod code {
  flex: 1; min-width: 200px; font: 12.5px ui-monospace, monospace;
  background: var(--zemin); border: 1px solid var(--kenar);
  border-radius: 6px; padding: 7px 10px; word-break: break-all;
}

footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--kenar);
  color: var(--sonuk); font-size: 13px; }
footer a { color: var(--vurgu); }

@media (max-width: 560px) {
  .sarmal { padding: 22px 14px 60px; }
  header h1 { font-size: 22px; }
  .izgara { grid-template-columns: 1fr; }
  /* Dar ekranda pencere neredeyse tam ekran olsun; icerik dar bir
     serit icinde iki kat uzuyordu. */
  dialog { width: calc(100% - 16px); max-height: 92vh; }
  .detay-ust { padding: 15px 16px; }
  .detay-govde { padding: 16px; }
  .satir-kod code { min-width: 0; width: 100%; flex: none; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
  .kart:hover { transform: none; }
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
    <button class="tema-dugme" id="tema" aria-label="Temayı değiştir">Tema</button>
  </div>

  <div class="nasil">
    <b>Ajan nedir, nasıl çalışır?</b> Her ajan tek bir markdown dosyasıdır.
    <ol>
      <li>Dosyayı projendeki <code>.claude/agents/</code> klasörüne koy
          (ya da <code>kur.ps1</code> hepsini birden koysun).</li>
      <li>Yeni bir Claude Code oturumu aç — <code>/agents</code> listesinde görünür.</li>
      <li>Bir şey yazma; sadece işini normal cümleyle iste. Claude uygun
          ajanı kendi seçer. Israr etmek istersen ajanın adını cümlede geçir.</li>
    </ol>
  </div>
</header>

<div class="arama-satir">
  <input id="arama" type="search" aria-label="Ajan, komut ve becerilerde ara"
         placeholder="Ara — ajan, komut, beceri, tetikleyici ifade…"
         autocomplete="off" spellcheck="false">
</div>
<div class="sayac">
  <span id="sayac" role="status" aria-live="polite"></span>
  <span class="ipucu"> · <kbd>/</kbd> aramaya atla ·
  <kbd>↓</kbd> listeye geç · <kbd>Enter</kbd> ilk sonucu aç ·
  <kbd>Esc</kbd> aramayı temizle</span>
</div>

<div class="derin-not" id="derin-not" hidden></div>
<div class="izgara" id="izgara"></div>
<div class="bos" id="bos" hidden>Eşleşen ajan yok. Başka bir kelime dene.</div>

<section class="ekler" id="ekler" aria-labelledby="ekler-baslik">
  <h2 id="ekler-baslik">Komutlar ve beceriler</h2>
  <p class="ekler-not">Plugin olarak kurulunca gelir:
     <code>claude plugin install turkce-ajanlar@turkce-ajanlar</code>.
     Komutu sen çağırırsın; beceri konu açılınca kendiliğinden yüklenir,
     istersen aynı adla elle de çağrılır.</p>
  <ul id="ekler-liste">
${eklerHtml}
  </ul>
  <div class="bos" id="ekler-bos" hidden>Eşleşen komut veya beceri yok.</div>
</section>

<footer>
  <strong id="toplam"></strong> ajan · ${komutSayisi} komut · ${beceriSayisi} beceri · Son güncelleme ${damga} ·
  MIT lisansı · Kurulum: <code>kur.ps1</code>
</footer>

</div>

<dialog id="detay" aria-labelledby="d-ad">
  <div class="detay-ust">
    <h2 id="d-ad"></h2>
    <button class="kapat" id="d-kapat" aria-label="Kapat">&times;</button>
  </div>
  <div class="detay-govde">
    <h3>Ne yapar</h3>
    <p id="d-aciklama" style="margin:0;color:var(--sonuk);font-size:13.5px"></p>
    <p class="meta" id="d-sinir"></p>

    <div id="d-tetik-blok">
      <h3>Bunları dediğinde çağrılır</h3>
      <ul class="tetik" id="d-tetik"></ul>
    </div>

    <h3>Kur ve kullan</h3>
    <ol class="adimlar" id="d-adimlar">
      <li id="ad1" class="etkin">
        <div class="adim-baslik">Ajanın markdown'ını kopyala</div>
        <div class="dugmeler">
          <button class="eylem kucuk" id="d-kopyala">Markdown'ı kopyala</button>
          <button class="eylem ikincil kucuk" id="d-indir">Dosya olarak indir</button>
        </div>
      </li>
      <li id="ad2">
        <div class="adim-baslik">Projende şu dosyaya kaydet</div>
        <div class="satir-kod">
          <code id="d-yol"></code>
          <button class="eylem ikincil kucuk" id="d-yol-kopyala">Yolu kopyala</button>
        </div>
        <div class="adim-alt">Hepsini birden kurmak istersen bunun yerine:
          <code id="d-kur"></code></div>
      </li>
      <li id="ad3">
        <div class="adim-baslik">Yeni bir Claude Code oturumu aç</div>
        <div class="adim-alt"><code>/agents</code> listesinde
          <b id="d-ad2"></b> görünmeli. Sonra sadece yukarıdaki
          cümlelerden birini söyle — ajan kendiliğinden devreye girer.</div>
      </li>
    </ol>

    <h3>Araçlar</h3>
    <div class="cipler" id="d-araclar"></div>
    <p class="meta" id="d-model"></p>

    <h3>Tam tanım</h3>
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
const detay = $("#detay"), derinNot = $("#derin-not");

// --- Turkce arama ----------------------------------------------------------
// "gorev" yazan da "görev" yazan da ayni sonucu gormeli. Once tr
// kucultmesi (I -> ı), sonra aksan katlamasi.
const KATLA = { "ç":"c","ğ":"g","ı":"i","i̇":"i","î":"i","ö":"o","ş":"s","ü":"u","â":"a","û":"u" };
function sade(s) {
  return String(s).toLocaleLowerCase("tr").replace(/[çğıîöşüâû]/g, (c) => KATLA[c] || c);
}

// Her ajan icin iki saman yigini: hizli (ad + ozet + tetik + arac) ve
// derin (tum markdown). Once hizli aranir; hicbir sey cikmazsa derine
// inilir ve kullaniciya "govdede bulundu" denir.
AJANLAR.forEach((a) => {
  a._hizli = sade([a.ad, a.ozet, a.sinir, a.tetik.join(" "), a.araclar.join(" ")].join(" "));
  a._derin = sade(a.ham);
});

function puan(a, q) {
  const ad = sade(a.ad);
  if (ad === q) return 5;
  if (ad.startsWith(q)) return 4;
  if (ad.includes(q)) return 3;
  if (sade(a.tetik.join(" ")).includes(q)) return 2;
  if (a._hizli.includes(q)) return 1;
  return 0;
}

function ara(ham) {
  const q = sade(ham.trim());
  if (!q) return { liste: AJANLAR, derin: false };
  const puanli = AJANLAR.map((a, i) => ({ a, i, p: puan(a, q) })).filter((x) => x.p > 0);
  if (puanli.length) {
    puanli.sort((x, y) => y.p - x.p || x.i - y.i);
    return { liste: puanli.map((x) => x.a), derin: false };
  }
  return { liste: AJANLAR.filter((a) => a._derin.includes(q)), derin: true };
}

// --- kartlar ---------------------------------------------------------------
function kartYap(a) {
  const b = document.createElement("button");
  b.className = "kart";
  b.type = "button";
  b.setAttribute("aria-label", a.ad + " — ayrıntı");

  const h = document.createElement("h2");
  const nokta = document.createElement("span");
  nokta.className = "nokta";
  nokta.style.background = RENK[a.renk] || RENK.gray;
  h.append(nokta, document.createTextNode(a.ad));

  const p = document.createElement("p");
  p.textContent = a.ozet.length > 170 ? a.ozet.slice(0, 167) + "…" : a.ozet;

  b.append(h, p);

  if (a.tetik.length) {
    const c = document.createElement("div");
    c.className = "cipler";
    for (const t of a.tetik.slice(0, 3)) {
      const s = document.createElement("span");
      s.className = "cip soz";
      s.textContent = "“" + t + "”";
      c.appendChild(s);
    }
    b.appendChild(c);
  }

  if (a.sinir) {
    const s = document.createElement("p");
    s.className = "sinir";
    s.textContent = a.sinir;
    b.appendChild(s);
  }

  b.addEventListener("click", () => ac(a));
  return b;
}

let gorunen = [];

function ciz(sonuc) {
  gorunen = sonuc.liste;
  izgara.replaceChildren();
  for (const a of gorunen) izgara.appendChild(kartYap(a));
  bos.hidden = gorunen.length > 0;

  derinNot.hidden = !sonuc.derin || gorunen.length === 0;
  if (!derinNot.hidden) {
    derinNot.textContent =
      "Ad ve özetlerde bulunamadı — bu " + gorunen.length +
      " ajanın tam tanımının içinde geçiyor.";
  }

  $("#sayac").textContent = gorunen.length === AJANLAR.length
    ? AJANLAR.length + " ajan"
    : gorunen.length + " / " + AJANLAR.length + " ajan";

  // Komut ve beceri listesi ayni sorguyla suzulur.
  const q = sade(arama.value.trim());
  let ekGorunen = 0;
  for (const li of document.querySelectorAll("#ekler-liste li")) {
    const goster = !q || sade(li.textContent).includes(q);
    li.hidden = !goster;
    if (goster) ekGorunen++;
  }
  $("#ekler-bos").hidden = ekGorunen > 0;
}

// --- detay -----------------------------------------------------------------
function adimSifirla() {
  $("#ad1").className = "etkin";
  $("#ad2").className = "";
  $("#ad3").className = "";
}

function ac(a) {
  $("#d-ad").textContent = a.ad;
  $("#d-ad2").textContent = a.ad;
  $("#d-aciklama").textContent = a.ozet;
  $("#d-sinir").textContent = a.sinir;
  $("#d-sinir").hidden = !a.sinir;

  const tb = $("#d-tetik");
  tb.replaceChildren();
  if (a.tetik.length) {
    for (const t of a.tetik) {
      const li = document.createElement("li");
      li.textContent = "“" + t + "”";
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
  $("#d-model").textContent = "model: " + a.model;

  $("#d-yol").textContent = ".claude/agents/" + a.dosya;
  $("#d-kur").textContent = "powershell -ExecutionPolicy Bypass -File kur.ps1";
  $("#d-ham").textContent = a.ham;

  adimSifirla();
  $("#d-kopyala").textContent = "Markdown'ı kopyala";
  $("#d-yol-kopyala").textContent = "Yolu kopyala";

  try { history.replaceState(null, "", "#ajan=" + encodeURIComponent(a.ad)); } catch {}
  detay.showModal();
  detay.querySelector(".detay-govde").scrollTop = 0;
}

function kapat() {
  detay.close();
}

detay.addEventListener("close", () => {
  try { history.replaceState(null, "", location.pathname + location.search); } catch {}
});

$("#d-kapat").addEventListener("click", kapat);
detay.addEventListener("click", (e) => { if (e.target === detay) kapat(); });

// Pano file:// altinda engellenebilir; o zaman metni secip kullaniciya
// Ctrl+C dedirtiyoruz. Iki durumda da bir sonraki adima geciyoruz.
async function panoya(metin, dugme, basarili, secilecek) {
  let ok = true;
  try {
    await navigator.clipboard.writeText(metin);
  } catch {
    ok = false;
    if (secilecek) {
      const r = document.createRange();
      r.selectNodeContents(secilecek);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }
  dugme.textContent = ok ? basarili : "Seçildi — Ctrl+C";
  return ok;
}

$("#d-kopyala").addEventListener("click", async (e) => {
  const d = e.currentTarget;
  await panoya($("#d-ham").textContent, d, "Kopyalandı ✓ — şimdi 2. adım", $("#d-ham"));
  $("#ad1").className = "tamam";
  $("#ad2").className = "etkin";
  setTimeout(() => (d.textContent = "Markdown'ı kopyala"), 3000);
});

$("#d-yol-kopyala").addEventListener("click", async (e) => {
  const d = e.currentTarget;
  await panoya($("#d-yol").textContent, d, "Kopyalandı ✓", $("#d-yol"));
  $("#ad2").className = "tamam";
  $("#ad3").className = "etkin";
  setTimeout(() => (d.textContent = "Yolu kopyala"), 3000);
});

$("#d-indir").addEventListener("click", () => {
  const ad = $("#d-ad").textContent + ".md";
  const b = new Blob([$("#d-ham").textContent], { type: "text/markdown" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
  $("#ad1").className = "tamam";
  $("#ad2").className = "etkin";
});

// --- arama kutusu ----------------------------------------------------------
arama.addEventListener("input", () => ciz(ara(arama.value)));

arama.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && gorunen.length) {
    e.preventDefault();
    ac(gorunen[0]);
  }
  if (e.key === "ArrowDown") {
    const ilk = izgara.querySelector(".kart");
    if (ilk) { e.preventDefault(); ilk.focus(); }
  }
});

document.addEventListener("keydown", (e) => {
  if (detay.open) return;               // pencere acikken sayfa kisayollari susar
  if (e.key === "/" && document.activeElement !== arama) {
    e.preventDefault(); arama.focus(); arama.select();
  }
  if (e.key === "Escape" && arama.value) {
    arama.value = ""; ciz(ara(""));
  }
});

// --- tema ------------------------------------------------------------------
function temaYaz() {
  const su = document.documentElement.dataset.tema;
  const koyu = su ? su === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $("#tema").textContent = koyu ? "☀ Açık tema" : "☾ Koyu tema";
}
const kayit = (() => { try { return localStorage.getItem("tema"); } catch { return null; } })();
if (kayit) document.documentElement.dataset.tema = kayit;
$("#tema").addEventListener("click", () => {
  const su = document.documentElement.dataset.tema;
  const koyu = su ? su === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const yeni = koyu ? "light" : "dark";
  document.documentElement.dataset.tema = yeni;
  try { localStorage.setItem("tema", yeni); } catch {}
  temaYaz();
});
temaYaz();

// --- baslangic -------------------------------------------------------------
$("#toplam").textContent = AJANLAR.length;
ciz(ara(""));

// Adres cubugundaki #ajan=... ile dogrudan bir ajana baglanilabilir —
// birine tek bir ajanin linkini gonderebilesin diye.
const istenen = decodeURIComponent((location.hash.match(/^#ajan=(.*)$/) || [])[1] || "");
if (istenen) {
  const a = AJANLAR.find((x) => x.ad === istenen);
  if (a) ac(a);
}
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
  console.log("  - " + a.ad + "  (" + a.araclar.length + " arac, " + a.tetik.length + " tetik)");
  console.log("      ozet : " + a.ozet);
  console.log("      sinir: " + (a.sinir || "—"));
}
