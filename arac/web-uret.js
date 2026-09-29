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
const DEPO = "https://github.com/Furkiozknn/turkce-ajanlar";

// --- frontmatter ayristirma ------------------------------------------------
// YAML tirnakli skaler -> metin (dogrula.js ile ayni kural): "..." icinde
// yalnizca \" ve \\ kacisi (JSON ile ayni), '...' icinde '' -> '.
const skaler = (s) =>
  /^".*"$/.test(s) ? JSON.parse(s) : /^'.*'$/.test(s) ? s.slice(1, -1).replace(/''/g, "'") : s;

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
      deger = skaler(deger);
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

// --- gruplar: README'deki "## Ajanlar" bolumunden --------------------------
// Katalogdaki grup suzgeci README'nin kendi gruplarini kullanir; boylece iki
// yerde ayri liste tutulmaz. README'de gecmeyen ajan grupsuz kalir ve web-test
// bunu hata sayar.
const GRUPLAR = new Map();
{
  const readme = path.join(KOK, "README.md");
  if (fs.existsSync(readme)) {
    const satirlar = fs.readFileSync(readme, "utf8").split(/\r?\n/);
    let icinde = false, grup = "";
    for (const satir of satirlar) {
      if (/^## /.test(satir)) { icinde = /^## Ajanlar\s*$/.test(satir); grup = ""; continue; }
      if (!icinde) continue;
      const b = satir.match(/^### (.+?)\s*$/);
      if (b) { grup = b[1].split(" — ")[0].trim(); continue; }
      const a = satir.match(/^\| `([a-z0-9-]+)`/);
      if (a && grup) GRUPLAR.set(a[1], grup);
    }
  }
}
// Arayuz dilleri icin grup adlari (ajan icerigi degil, arayuz metni).
const GRUP_ETIKET = {
  "Koordinasyon": { tr: "Koordinasyon", en: "Coordination" },
  "Keşif": { tr: "Keşif", en: "Discovery" },
  "Doğruluk": { tr: "Doğruluk", en: "Correctness" },
  "Güvenlik ve gizlilik": { tr: "Güvenlik ve gizlilik", en: "Security & privacy" },
  "Başarım": { tr: "Başarım", en: "Performance" },
  "Arayüz ve ürün": { tr: "Arayüz ve ürün", en: "UI & product" },
  "Veri": { tr: "Veri", en: "Data" },
  "API ve dayanıklılık": { tr: "API ve dayanıklılık", en: "API & resilience" },
  "Teslim ve işletme": { tr: "Teslim ve işletme", en: "Delivery & operations" },
  "Belge ve dil": { tr: "Belge ve dil", en: "Docs & language" },
  "Süreç ve ortam": { tr: "Süreç ve ortam", en: "Process & environment" },
};

// --- ajanlari oku ----------------------------------------------------------
if (!fs.existsSync(KAYNAK)) {
  console.error("agents klasoru yok: " + KAYNAK);
  process.exit(1);
}

const ajanlar = [];
for (const ad of fs.readdirSync(KAYNAK).sort()) {
  if (!ad.endsWith(".md")) continue;
  // Depo LF tutuyor; Windows'ta (core.autocrlf=true) calisma kopyasi CRLF.
  // Normallestirilmezse sayfaya gomulen metin "\r\n" tasir ve CI "bayat" der.
  const ham = fs.readFileSync(path.join(KAYNAK, ad), "utf8").replace(/\r\n/g, "\n");
  const { alanlar } = ayristir(ham, ad);
  const aciklama = alanlar.description || "";
  const { ozet, sinir } = bolumle(aciklama);
  const araclar = Array.isArray(alanlar.tools) ? alanlar.tools : [];
  ajanlar.push({
    ad: alanlar.name || ad.replace(/\.md$/, ""),
    dosya: ad,
    // description'in kendisi gomulmez: ham (tam markdown) zaten icerir;
    // ayni metni iki kez tasimak sayfayi ~27 KB sisiriyordu.
    grup: GRUPLAR.get(alanlar.name || ad.replace(/\.md$/, "")) || "",
    yaz: araclar.some((x) => x === "Write" || x === "Edit"),
    // Kartta gorunen metin: ajanin NE YAPTIGI. Gövdenin ilk paragrafi
    // ("Sen bir dosya duzenleyicisin...") Claude'a yazilmis bir talimat,
    // ajani secmeye calisan kullaniciya bir sey anlatmaz.
    ozet,
    sinir,
    renk: alanlar.color || "gray",
    araclar,
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
// Tam markdown (ham) ilk yuklemeye girmez: web/tam.js ayri dosya, sayfa
// yuklendikten sonra arka planda cekilir (yaklasik 400 KB; ilk boyamayi
// yavaslatiyordu). <script src> file:// altinda da calisir.
const TAM = {};
for (const a of ajanlar) TAM[a.ad] = a.ham;
const VERI = JSON.stringify(ajanlar.map(({ ham, ...geri }) => geri))
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
const sonTarih = sonGuncellemeTarihi();
const tarihBicim = (yerel) => sonTarih.toLocaleString(yerel, { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
const damgaTr = tarihBicim("tr-TR");
const damgaEn = tarihBicim("en-GB");

// Yazi tipleri base64 olarak gomulur: tek dosya, Google Fonts'a baglanti yok,
// file:// ile de ayni gorunur. Lisans: arac/yazi/OFL-*.txt (SIL OFL 1.1).
const yaziB64 = (ad) => fs.readFileSync(path.join(__dirname, "yazi", ad)).toString("base64");
const YAZI_BASLIK = yaziB64("league-gothic-latin.woff2");
const YAZI_MONO = yaziB64("jetbrains-mono-latin.woff2");

const KUR_SATIRI = "claude plugin marketplace add Furkiozknn/turkce-ajanlar; claude plugin install turkce-ajanlar@turkce-ajanlar";
const yazSayisi = ajanlar.filter((a) => a.yaz).length;
const okurSayisi = ajanlar.length - yazSayisi;

// Arayuz metinleri. Ajan aciklamalari ve tetikleyici ifadeler Turkce kalir
// (urunun amaci bu); yalniz cevresindeki arayuz cevrilir.
const METIN = {
  tr: {
    atla: "İçeriğe geç",
    marka: "claude code · eklenti · MIT",
    h1: "Claude Code için Türkçe ajanlar",
    lead: "{n} alt-ajan: Türkçe rapor yazar, Windows'un tuzaklarını (PowerShell 5.1, cp1254) bilir ve sınırında durur — neyi yapmayacağını baştan söyler.",
    kur_baslik: "Kurulum — tek satır",
    kopyala: "Kopyala",
    kopyalandi: "Kopyalandı ✓",
    secildi: "Seçildi — Ctrl+C",
    kur_sonra: "Sonra yeni bir Claude Code oturumu aç ve işini normal cümleyle iste: “şu değişikliği gözden geçir” → kod-gozden-gecirici çağrılır.",
    kur_alt: "Eklenti yerine tek tek ajan da alabilirsin: her ajan tek bir markdown dosyasıdır (aşağıda “Kur ve kullan”).",
    kaynak: "GitHub'da kaynak",
    ne_zaman: "Ne zaman kullanılır",
    ne_zaman_yok: "Ne zaman kullanılmaz",
    kul1: "Claude Code'dan Türkçe rapor ve Türkçe biçim istiyorsan (ondalık virgül, gün.ay.yıl).",
    kul2: "Windows/PowerShell 5.1 makinesinde çalışıyorsan: cp1254, && yok, heredoc ters bölüyü yutar.",
    kul3: "Bir ajanın neyi yapmayacağını baştan bilmek istiyorsan: {oku} ajan salt okurdur, {yaz} tanesi dosya yazabilir.",
    yok1: "Çıktı dili önemli değilse: İngilizce büyük koleksiyonlar (ör. wshobson/agents) daha geniştir.",
    yok2: "Yalnız iki üç ajana ihtiyacın varsa eklentinin tamamını kurma: her ajanın açıklaması her oturuma yüklenir. İstediklerini .claude/agents/ altına kopyala.",
    yok3: "Kodu senin yerine değiştirmesini bekliyorsan: ajanların çoğu bilerek yalnızca okur ve rapor yazar.",
    nasil_baslik: "Ajan nedir, nasıl çalışır?",
    nasil0: "Her ajan tek bir markdown dosyasıdır.",
    nasil1: "Dosyayı projendeki .claude/agents/ klasörüne koy (ya da kur.ps1 hepsini birden koysun).",
    nasil2: "Yeni bir Claude Code oturumu aç — /agents listesinde görünür.",
    nasil3: "Bir şey yazma; sadece işini normal cümleyle iste. Claude uygun ajanı kendi seçer. Israr etmek istersen ajanın adını cümlede geçir.",
    katalog: "Ajan kataloğu",
    ara_et: "Ajan, komut ve becerilerde ara",
    ara_ph: "Ara — ajan, komut, beceri, tetikleyici ifade…",
    ip1: "aramaya atla",
    ip2: "listeye geç",
    ip3: "ilk sonucu aç",
    ip4: "aramayı temizle",
    grup_et: "Gruba göre süz",
    hepsi: "Tümü",
    yetki_et: "Yetkiye göre süz",
    yetki_hepsi: "Her yetki",
    yetki_oku: "Yalnız okur",
    yetki_yaz: "Yazabilir",
    say_hepsi: "{n} ajan",
    say_kismi: "{k} / {n} ajan",
    dil_notu: "Ajan açıklamaları ve tetikleyici ifadeler Türkçedir — projenin amacı bu. Çevrilen yalnız çevresindeki arayüz.",
    derin: "Ad ve özetlerde bulunamadı — bu {k} ajanın tam tanımının içinde geçiyor.",
    bos: "Eşleşen ajan yok. Başka bir kelime dene.",
    yaz_etiket: "yazabilir",
    ekler_baslik: "Komutlar ve beceriler",
    ekler_not1: "Plugin olarak kurulunca gelir — önce depoyu pazar yeri olarak ekle, sonra kur:",
    ekler_not2: "Komutu sen çağırırsın; beceri konu açılınca kendiliğinden yüklenir, istersen aynı adla elle de çağrılır.",
    ekler_bos: "Eşleşen komut veya beceri yok.",
    tur_komut: "komut",
    tur_beceri: "beceri",
    tema_koyu: "☾ Koyu tema",
    tema_acik: "☀ Açık tema",
    dil_grup: "Dil",
    kapat: "Kapat",
    d_yapar: "Ne yapar",
    d_tetik: "Bunları dediğinde çağrılır",
    d_kur: "Kur ve kullan",
    d_ad1: "Ajanın markdown'ını kopyala",
    d_kopyala: "Markdown'ı kopyala",
    d_indir: "Dosya olarak indir",
    d_ad2: "Projende şu dosyaya kaydet",
    d_yol_kopyala: "Yolu kopyala",
    d_hepsi: "Hepsini birden kurmak istersen bunun yerine:",
    d_ad3: "Yeni bir Claude Code oturumu aç",
    d_ad3_alt1: "/agents listesinde",
    d_ad3_alt2: "görünmeli. Sonra sadece yukarıdaki cümlelerden birini söyle — ajan kendiliğinden devreye girer.",
    d_kopyalandi2: "Kopyalandı ✓ — şimdi 2. adım",
    d_araclar: "Araçlar",
    d_model: "model: {m}",
    d_tam: "Tam tanım",
    yukleniyor: "Yükleniyor…",
    tam_yok: "Tam tanım yüklenemedi (tam.js, index.html ile aynı klasörde olmalı).",
    ayrinti: "ayrıntı",
    alt_sonrasi: "ajan · {komut} komut · {beceri} beceri · Son güncelleme {tarih} · MIT lisansı · ",
    alt_kaynak: "Kaynak ve kurulum: ",
    alt_yazi: "Yazı tipleri: League Gothic, JetBrains Mono (SIL OFL)",
    alt_imza: "FRK-OS",
  },
  en: {
    atla: "Skip to content",
    marka: "claude code · plugin · MIT",
    h1: "Turkish agents for Claude Code",
    lead: "{n} sub-agents that write their reports in Turkish, know the Windows traps (PowerShell 5.1, cp1254) and say up front what they will not do.",
    kur_baslik: "Install — one line",
    kopyala: "Copy",
    kopyalandi: "Copied ✓",
    secildi: "Selected — Ctrl+C",
    kur_sonra: "Then open a new Claude Code session and ask in plain words, in Turkish: “şu değişikliği gözden geçir” (review this change) → kod-gozden-gecirici is called.",
    kur_alt: "Instead of the plugin you can take single agents: each agent is one markdown file (see “Install and use” below).",
    kaynak: "Source on GitHub",
    ne_zaman: "When to use it",
    ne_zaman_yok: "When not to",
    kul1: "You want Claude Code to answer in Turkish, with Turkish formatting (decimal comma, day.month.year).",
    kul2: "You work on a Windows/PowerShell 5.1 machine: cp1254, no &&, heredocs eat backslashes.",
    kul3: "You want to know up front what an agent will not do: {oku} agents are read-only, {yaz} can write files.",
    yok1: "Output language does not matter to you: the big English collections (e.g. wshobson/agents) are broader.",
    yok2: "You only need two or three agents: do not install the whole plugin, every agent description is loaded into each session. Copy the ones you want into .claude/agents/.",
    yok3: "You expect it to change your code for you: most agents deliberately only read and report.",
    nasil_baslik: "What is an agent, how does it work?",
    nasil0: "Each agent is a single markdown file.",
    nasil1: "Put the file into .claude/agents/ in your project (or let kur.ps1 put them all).",
    nasil2: "Open a new Claude Code session — it shows up in the /agents list.",
    nasil3: "Type nothing special; just ask for the job in plain words. Claude picks the agent. To insist, name the agent in the sentence.",
    katalog: "Agent catalogue",
    ara_et: "Search agents, commands and skills",
    ara_ph: "Search — agent, command, skill, trigger phrase…",
    ip1: "jump to search",
    ip2: "go to list",
    ip3: "open first result",
    ip4: "clear search",
    grup_et: "Filter by group",
    hepsi: "All",
    yetki_et: "Filter by access",
    yetki_hepsi: "Any access",
    yetki_oku: "Read-only",
    yetki_yaz: "Can write",
    say_hepsi: "{n} agents",
    say_kismi: "{k} / {n} agents",
    dil_notu: "Agent descriptions and trigger phrases are in Turkish — that is the point of the project. Only the interface around them is translated.",
    derin: "Not found in names or summaries — it appears in the full definition of these {k} agents.",
    bos: "No matching agent. Try another word.",
    yaz_etiket: "can write",
    ekler_baslik: "Commands and skills",
    ekler_not1: "They come with the plugin — add the repository as a marketplace first, then install:",
    ekler_not2: "You call a command yourself; a skill loads on its own when its topic comes up, and can be called by hand under the same name.",
    ekler_bos: "No matching command or skill.",
    tur_komut: "command",
    tur_beceri: "skill",
    tema_koyu: "☾ Dark theme",
    tema_acik: "☀ Light theme",
    dil_grup: "Language",
    kapat: "Close",
    d_yapar: "What it does",
    d_tetik: "Called when you say things like",
    d_kur: "Install and use",
    d_ad1: "Copy the agent's markdown",
    d_kopyala: "Copy markdown",
    d_indir: "Download as file",
    d_ad2: "Save it in your project as",
    d_yol_kopyala: "Copy path",
    d_hepsi: "To install everything at once, run this instead:",
    d_ad3: "Open a new Claude Code session",
    d_ad3_alt1: "It should appear in the /agents list as",
    d_ad3_alt2: ". Then just say one of the phrases above — the agent kicks in on its own.",
    d_kopyalandi2: "Copied ✓ — now step 2",
    d_araclar: "Tools",
    d_model: "model: {m}",
    d_tam: "Full definition",
    yukleniyor: "Loading…",
    tam_yok: "Could not load the full definition (tam.js must sit next to index.html).",
    ayrinti: "details",
    alt_sonrasi: "agents · {komut} commands · {beceri} skills · Last updated {tarih} · MIT license · ",
    alt_kaynak: "Source and install: ",
    alt_yazi: "Typefaces: League Gothic, JetBrains Mono (SIL OFL)",
    alt_imza: "FRK-OS",
  },
};
const METIN_JSON = JSON.stringify(METIN);
const grupEtiketleri = JSON.stringify(GRUP_ETIKET);
const tr = METIN.tr;
const doldur = (s) => s.replace("{n}", ajanlar.length).replace("{oku}", okurSayisi).replace("{yaz}", yazSayisi);
const H = Object.fromEntries(Object.entries(tr).map(([a, b]) => [a, kacirHtml(doldur(b))]));

const html = `<!doctype html>
<html lang="tr" data-dil="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0e0d0b">
<meta name="description" content="Claude Code için Türkçe alt-ajan seti: ${ajanlar.length} ajan, ${komutSayisi} komut, ${beceriSayisi} beceri. Turkish sub-agents for Claude Code. Kaynak: ${DEPO}">
<title>Türkçe Ajanlar — Claude Code alt-ajan seti</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%230e0d0b'/%3E%3Ctext x='16' y='24' font-size='21' font-family='sans-serif' font-weight='700' fill='%23ffc21a' text-anchor='middle'%3ETA%3C/text%3E%3C/svg%3E">
<style>
@font-face { font-family: "League Gothic"; font-weight: 400; font-style: normal; font-display: swap;
  src: url(data:font/woff2;base64,${YAZI_BASLIK}) format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 100 800; font-style: normal; font-display: swap;
  src: url(data:font/woff2;base64,${YAZI_MONO}) format("woff2"); }

/* FRK-OS: siyah zemin, krem yazi, sari vurgu (sosyal/uret/tema.mjs "klasik"). */
:root {
  color-scheme: dark;
  --zemin: #0e0d0b;
  --kart: #1a1712;
  --kart-ustu: #221f18;
  --kenar: #3a352b;
  --metin: #f1ece2;
  --sonuk: #b6ae9d;
  --vurgu: #ffc21a;
  --vurgu-metin: #ffc21a;
  --vurgu-uzeri: #0e0d0b;
  --halka: #ffc21a;
  --izgara: rgba(241,236,226,.045);
  --golge: 0 1px 2px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.28);
  --r: 8px;
  --baslik: "League Gothic", "Arial Narrow", Impact, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
}
:root[data-tema="light"] {
  color-scheme: light;
  --zemin: #f1ece2;
  --kart: #fbf8f1;
  --kart-ustu: #ebe5d8;
  --kenar: #c9c0ad;
  --metin: #0e0d0b;
  --sonuk: #57503f;
  --vurgu: #ffc21a;
  --vurgu-metin: #7a4d00;
  --vurgu-uzeri: #0e0d0b;
  --halka: #0e0d0b;
  --izgara: rgba(14,13,11,.05);
  --golge: 0 1px 2px rgba(0,0,0,.06), 0 6px 16px rgba(0,0,0,.06);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--zemin); color: var(--metin);
  font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
/* "izgara" dokusu (video sisteminin klasik temasi): sabit, cok soluk. */
body::before {
  content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background-image:
    linear-gradient(var(--izgara) 1px, transparent 1px),
    linear-gradient(90deg, var(--izgara) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: linear-gradient(#000, transparent 70%); mask-image: linear-gradient(#000, transparent 70%);
}
.sarmal { max-width: 1120px; margin: 0 auto; padding: 20px 20px 72px; }

:focus-visible { outline: 3px solid var(--halka); outline-offset: 2px; }
.atla {
  position: absolute; left: 12px; top: -60px; z-index: 10; padding: 10px 14px;
  background: var(--vurgu); color: var(--vurgu-uzeri); border-radius: var(--r);
  font: 600 13px var(--mono); text-decoration: none;
}
.atla:focus { top: 12px; }

/* --- ust serit --- */
.serit { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.marka { font: 500 12px var(--mono); letter-spacing: .04em; color: var(--sonuk); }
.marka b { color: var(--vurgu-metin); font-weight: 700; }
.araclar { display: flex; gap: 8px; align-items: center; }
.dil { display: inline-flex; border: 1px solid var(--kenar); border-radius: var(--r); overflow: hidden; }
.dil button {
  font: 600 12px var(--mono); background: transparent; color: var(--sonuk); border: 0;
  padding: 0 12px; min-height: 36px; cursor: pointer;
}
.dil button[aria-pressed="true"] { background: var(--vurgu); color: var(--vurgu-uzeri); }
.dil button:not([aria-pressed="true"]):hover { color: var(--metin); }
.tema-dugme {
  background: transparent; border: 1px solid var(--kenar); color: var(--sonuk);
  border-radius: var(--r); padding: 0 12px; min-height: 36px; cursor: pointer;
  font: 600 12px var(--mono); white-space: nowrap;
}
.tema-dugme:hover { color: var(--metin); border-color: var(--sonuk); }

/* --- hero --- */
.hero { padding: 44px 0 30px; }
h1 {
  margin: 0 0 14px; font: 400 clamp(44px, 9vw, 92px)/.95 var(--baslik);
  text-transform: uppercase; letter-spacing: .005em; max-width: 9em;
}
h1 span { color: var(--vurgu-metin); }
.lead { margin: 0 0 24px; max-width: 60ch; color: var(--sonuk); font-size: 17px; }
.kur-kutu {
  max-width: 820px; background: var(--kart); border: 1px solid var(--kenar);
  border-left: 4px solid var(--vurgu); border-radius: var(--r); padding: 14px 16px;
  box-shadow: var(--golge);
}
.kur-etiket { font: 600 11px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--vurgu-metin); margin: 0 0 8px; }
.kur-satir { display: flex; gap: 10px; align-items: stretch; }
.kur-satir code {
  flex: 1; min-width: 0; font: 13px/1.5 var(--mono); color: var(--metin);
  background: var(--zemin); border: 1px solid var(--kenar); border-radius: 6px;
  padding: 10px 12px; overflow-wrap: anywhere; user-select: all;
}
.kur-satir code::before { content: "$ "; color: var(--vurgu-metin); }
button.eylem {
  background: var(--vurgu); color: var(--vurgu-uzeri); border: 0; border-radius: 6px;
  padding: 0 18px; min-height: 44px; font: 700 13px var(--mono); cursor: pointer;
  transition: background-color .12s, transform .12s;
}
button.eylem:hover { filter: brightness(1.08); }
button.eylem:active { transform: translateY(1px); }
button.ikincil { background: transparent; color: var(--sonuk); border: 1px solid var(--kenar); }
button.ikincil:hover { color: var(--metin); border-color: var(--sonuk); filter: none; }
button.kucuk { font-size: 12.5px; padding: 0 12px; min-height: 36px; }
.kur-not { margin: 10px 0 0; font-size: 13.5px; color: var(--sonuk); }
.kur-baglanti { margin: 6px 0 0; font-size: 13px; color: var(--sonuk); }
a { color: var(--vurgu-metin); }
a:hover { text-decoration-thickness: 2px; }

/* --- ne zaman --- */
.iki { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 30px 0 0; }
.kutu { background: var(--kart); border: 1px solid var(--kenar); border-radius: var(--r); padding: 16px 18px; }
.kutu h2 { margin: 0 0 8px; font: 400 26px/1 var(--baslik); text-transform: uppercase; letter-spacing: .01em; }
.kutu.evet h2 { color: var(--vurgu-metin); }
.kutu ul { margin: 0; padding-left: 18px; color: var(--sonuk); font-size: 14px; }
.kutu li { margin-bottom: 6px; }
.kutu code, .nasil code, .ekler code, .satir-kod code, .kur-not code, .adim-alt code {
  font: 12.5px var(--mono); background: var(--zemin); border: 1px solid var(--kenar);
  border-radius: 4px; padding: 1px 5px; color: var(--metin);
}
.nasil { margin: 14px 0 0; padding: 14px 18px; border: 1px solid var(--kenar); border-radius: var(--r); background: var(--kart); color: var(--sonuk); font-size: 14px; }
.nasil h2 { margin: 0 0 6px; font: 400 22px/1 var(--baslik); text-transform: uppercase; color: var(--metin); }
.nasil ol { margin: 6px 0 0; padding-left: 20px; }

/* --- katalog --- */
.katalog { margin-top: 44px; }
.katalog > h2, .ekler > h2 { margin: 0 0 14px; font: 400 44px/1 var(--baslik); text-transform: uppercase; }
.arama-satir { display: flex; gap: 10px; align-items: center; margin: 0 0 12px; }
#arama {
  flex: 1; min-height: 48px; padding: 0 14px; font: inherit; min-width: 0;
  background: var(--kart); color: var(--metin);
  border: 1px solid var(--kenar); border-radius: var(--r);
}
#arama:focus { outline: 3px solid var(--halka); outline-offset: 1px; }
#arama::placeholder { color: var(--sonuk); opacity: 1; }
.suzgec { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; align-items: center; }
.suzgec .ayrac { width: 1px; height: 22px; background: var(--kenar); margin: 0 6px; }
.suz {
  font: 600 12px var(--mono); background: transparent; color: var(--sonuk);
  border: 1px solid var(--kenar); border-radius: 999px; padding: 0 12px; min-height: 36px; cursor: pointer;
}
.suz:hover { color: var(--metin); border-color: var(--sonuk); }
.suz[aria-pressed="true"] { background: var(--vurgu); color: var(--vurgu-uzeri); border-color: var(--vurgu); }
.sayac { color: var(--sonuk); font-size: 13px; margin: 8px 0 4px; }
.ipucu { opacity: .95; }
kbd {
  font: 11px var(--mono); background: var(--kart-ustu); border: 1px solid var(--kenar);
  border-radius: 4px; padding: 1px 5px; color: var(--metin);
}
.dil-notu { margin: 0 0 16px; font-size: 12.5px; color: var(--sonuk); }
.derin-not {
  margin: 0 0 16px; font-size: 13px; color: var(--sonuk);
  background: var(--kart); border: 1px solid var(--kenar);
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
.kart h3 {
  margin: 0; font: 600 14.5px var(--mono);
  display: flex; align-items: center; gap: 8px; letter-spacing: -.01em; flex-wrap: wrap;
}
.nokta { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.yaz-etiket {
  font: 600 10.5px var(--mono); text-transform: uppercase; letter-spacing: .05em;
  color: var(--vurgu-uzeri); background: var(--vurgu); border-radius: 4px; padding: 1px 6px; margin-left: auto;
}
.kart p { margin: 0; color: var(--sonuk); font-size: 13.5px; }
.kart .sinir {
  margin: 0; color: var(--sonuk); font-size: 12.5px;
  border-left: 2px solid var(--kenar); padding-left: 8px;
}
.cipler { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.cip {
  font: 11px var(--mono); background: var(--kart-ustu);
  color: var(--sonuk); border-radius: 5px; padding: 2px 7px;
  border: 1px solid var(--kenar);
}
/* Kartta arac adlari yerine tetikleyici ifadeler duruyor: ajanlarin
   araclari benzer, ama soyledigin cumle farkli — ayirt eden bu. */
.cip.soz { font-family: inherit; font-size: 12px; background: transparent; border-style: dashed; }

/* Komutlar ve beceriler: ajan gibi kart degil, kisa liste. */
.ekler { margin: 44px 0 0; }
.ekler-not { margin: 0 0 12px; color: var(--sonuk); font-size: 13.5px; max-width: 76ch; }
.ekler-not code { display: inline-block; margin: 2px 0; }
.ekler ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.ekler li {
  display: grid; grid-template-columns: auto auto 1fr; gap: 10px; align-items: baseline;
  background: var(--kart); border: 1px solid var(--kenar); border-radius: var(--r);
  padding: 10px 14px; font-size: 13.5px;
}
.ekler li[hidden] { display: none; }
.ek-aciklama { color: var(--sonuk); }
.tur {
  font: 600 11px var(--mono); text-transform: uppercase; letter-spacing: .05em;
  border-radius: 5px; padding: 2px 7px; border: 1px solid var(--kenar); color: var(--sonuk);
}
.tur-komut { background: var(--kart-ustu); }
.tur-beceri { background: transparent; border-style: dashed; }
@media (max-width: 640px) {
  .ekler li { grid-template-columns: auto 1fr; }
  .ek-aciklama { grid-column: 1 / -1; }
}
.bos { color: var(--sonuk); padding: 48px 0; text-align: center; }

/* --- detay --- */
dialog {
  border: 1px solid var(--kenar); border-radius: 12px; padding: 0;
  background: var(--kart); color: var(--metin);
  max-width: 780px; width: calc(100% - 32px); max-height: 86vh;
  box-shadow: 0 12px 48px rgba(0,0,0,.5);
}
/* Sabit yukseklik hesabi yerine flex: baslik iki satira tasarsa da
   govde tasmaz, dugmeler kirpilmaz. */
dialog[open] { display: flex; flex-direction: column; animation: iris .5s cubic-bezier(.65,0,.35,1); }
dialog::backdrop { background: rgba(0,0,0,.62); }
dialog[open]::backdrop { animation: kararma .3s ease-out; }
/* iris (sosyal/uret/sahne.js): ortadan buyuyen daire. */
@keyframes iris { from { clip-path: circle(0% at 50% 30%); } to { clip-path: circle(140% at 50% 30%); } }
@keyframes kararma { from { opacity: 0; } to { opacity: 1; } }
.detay-ust {
  flex: none; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 16px 22px; border-bottom: 1px solid var(--kenar); background: var(--kart);
  border-radius: 12px 12px 0 0;
}
.detay-ust h2 { margin: 0; font: 600 16px var(--mono); overflow-wrap: anywhere; }
.detay-govde { flex: 1; min-height: 0; padding: 20px 22px; overflow-y: auto; overscroll-behavior: contain; }
.detay-govde h3 { font: 400 20px/1 var(--baslik); text-transform: uppercase; letter-spacing: .02em;
  color: var(--vurgu-metin); margin: 24px 0 8px; }
/* Yalniz govdenin ilk basligi ustten bosluksuz olsun. */
.detay-govde > h3:first-child { margin-top: 0; }
pre {
  background: var(--zemin); border: 1px solid var(--kenar); border-radius: 8px;
  padding: 13px 15px; overflow-x: auto; font: 12.5px/1.55 var(--mono);
  margin: 0; white-space: pre-wrap; word-break: break-word;
}
.dugmeler { display: flex; gap: 8px; flex-wrap: wrap; }
.kapat {
  background: none; border: 1px solid var(--kenar); border-radius: var(--r); color: var(--sonuk);
  font-size: 22px; cursor: pointer; line-height: 1; width: 40px; height: 40px; flex: none;
}
.kapat:hover { color: var(--metin); border-color: var(--sonuk); }
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
  font: 700 11px/20px var(--mono); text-align: center;
}
ol.adimlar > li.tamam::before { content: "✓"; background: var(--vurgu); border-color: var(--vurgu); color: var(--vurgu-uzeri); }
ol.adimlar > li.etkin::before { border-color: var(--vurgu); color: var(--vurgu-metin); }
ol.adimlar > li.etkin { background: var(--kart-ustu); border-radius: 0 8px 8px 0; }
.adim-baslik { font-size: 13.5px; margin: 1px 0 7px; }
.adim-alt { color: var(--sonuk); font-size: 12.5px; margin: 7px 0 0; }
.satir-kod { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.satir-kod code { flex: 1; min-width: 200px; padding: 7px 10px; word-break: break-all; }

footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--kenar); color: var(--sonuk); font-size: 13px; }
footer p { margin: 0 0 6px; }
footer .imza { font: 600 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--sonuk); }
footer .imza b { color: var(--vurgu-metin); }

@media (max-width: 720px) {
  .iki { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .sarmal { padding: 16px 16px 56px; }
  .hero { padding: 28px 0 22px; }
  .lead { font-size: 15.5px; }
  .kur-satir { flex-direction: column; }
  .izgara { grid-template-columns: 1fr; }
  .ipucu { display: none; }
  /* Dar ekranda pencere neredeyse tam ekran olsun. */
  dialog { width: calc(100% - 16px); max-height: 92vh; }
  .detay-ust { padding: 14px 16px; }
  .detay-govde { padding: 16px; }
  .satir-kod code { min-width: 0; width: 100%; flex: none; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  * { transition: none !important; animation: none !important; }
  .kart:hover { transform: none; }
}
</style>
</head>
<body>
<a class="atla" href="#icerik" data-i="atla">${H.atla}</a>
<div class="sarmal">

<header>
  <div class="serit">
    <div class="marka"><b>FRK-OS</b> · <span data-i="marka">${H.marka}</span></div>
    <div class="araclar">
      <div class="dil" role="group" aria-label="Dil / Language" data-i-aria="dil_grup">
        <button type="button" id="dil-tr" lang="tr" aria-pressed="true">TR</button>
        <button type="button" id="dil-en" lang="en" aria-pressed="false">EN</button>
      </div>
      <button class="tema-dugme" id="tema" type="button">Tema</button>
    </div>
  </div>
</header>

<main id="icerik">
<section class="hero" aria-labelledby="baslik">
  <h1 id="baslik" data-i="h1">${H.h1}</h1>
  <p class="lead" data-i="lead">${H.lead}</p>

  <div class="kur-kutu">
    <p class="kur-etiket" data-i="kur_baslik">${H.kur_baslik}</p>
    <div class="kur-satir">
      <code id="kur-komut">${KUR_SATIRI}</code>
      <button class="eylem" id="kur-kopyala" type="button" data-i="kopyala">${H.kopyala}</button>
    </div>
    <p class="kur-not" data-i="kur_sonra">${H.kur_sonra}</p>
    <p class="kur-baglanti"><span data-i="kur_alt">${H.kur_alt}</span>
      <a href="${DEPO}" id="depo-ust" data-i="kaynak">${H.kaynak}</a></p>
  </div>

  <div class="iki">
    <section class="kutu evet" aria-labelledby="nz1">
      <h2 id="nz1" data-i="ne_zaman">${H.ne_zaman}</h2>
      <ul>
        <li data-i="kul1">${H.kul1}</li>
        <li data-i="kul2">${H.kul2}</li>
        <li data-i="kul3">${H.kul3}</li>
      </ul>
    </section>
    <section class="kutu" aria-labelledby="nz2">
      <h2 id="nz2" data-i="ne_zaman_yok">${H.ne_zaman_yok}</h2>
      <ul>
        <li data-i="yok1">${H.yok1}</li>
        <li data-i="yok2">${H.yok2}</li>
        <li data-i="yok3">${H.yok3}</li>
      </ul>
    </section>
  </div>

  <div class="nasil">
    <h2 data-i="nasil_baslik">${H.nasil_baslik}</h2>
    <span data-i="nasil0">${H.nasil0}</span>
    <ol>
      <li data-i="nasil1">${H.nasil1}</li>
      <li data-i="nasil2">${H.nasil2}</li>
      <li data-i="nasil3">${H.nasil3}</li>
    </ol>
  </div>
</section>

<section class="katalog" aria-labelledby="katalog-baslik">
  <h2 id="katalog-baslik" data-i="katalog">${H.katalog}</h2>
  <div class="arama-satir">
    <input id="arama" type="search" data-i-aria="ara_et" data-i-ph="ara_ph"
           aria-label="${H.ara_et}" placeholder="${H.ara_ph}"
           autocomplete="off" spellcheck="false">
  </div>
  <div class="suzgec" id="grup-suz" role="group" aria-label="${H.grup_et}" data-i-aria="grup_et"></div>
  <div class="suzgec" id="yetki-suz" role="group" aria-label="${H.yetki_et}" data-i-aria="yetki_et">
    <button type="button" class="suz" data-yetki="" aria-pressed="true" data-i="yetki_hepsi">${H.yetki_hepsi}</button>
    <button type="button" class="suz" data-yetki="oku" aria-pressed="false" data-i="yetki_oku">${H.yetki_oku}</button>
    <button type="button" class="suz" data-yetki="yaz" aria-pressed="false" data-i="yetki_yaz">${H.yetki_yaz}</button>
  </div>
  <div class="sayac">
    <span id="sayac" role="status" aria-live="polite"></span>
    <span class="ipucu"> · <kbd>/</kbd> <span data-i="ip1">${H.ip1}</span> ·
      <kbd>↓</kbd> <span data-i="ip2">${H.ip2}</span> ·
      <kbd>Enter</kbd> <span data-i="ip3">${H.ip3}</span> ·
      <kbd>Esc</kbd> <span data-i="ip4">${H.ip4}</span></span>
  </div>
  <p class="dil-notu" id="dil-notu" data-i="dil_notu" hidden>${H.dil_notu}</p>

  <div class="derin-not" id="derin-not" hidden></div>
  <div class="izgara" id="izgara"></div>
  <div class="bos" id="bos" hidden data-i="bos">${H.bos}</div>
</section>

<section class="ekler" id="ekler" aria-labelledby="ekler-baslik">
  <h2 id="ekler-baslik" data-i="ekler_baslik">${H.ekler_baslik}</h2>
  <p class="ekler-not"><span data-i="ekler_not1">${H.ekler_not1}</span>
     <code>claude plugin marketplace add Furkiozknn/turkce-ajanlar</code>
     <code>claude plugin install turkce-ajanlar@turkce-ajanlar</code>.
     <span data-i="ekler_not2">${H.ekler_not2}</span></p>
  <ul id="ekler-liste">
${eklerHtml}
  </ul>
  <div class="bos" id="ekler-bos" hidden data-i="ekler_bos">${H.ekler_bos}</div>
</section>
</main>

<footer>
  <p><strong id="toplam"></strong> <span id="alt-sayilar"></span><span data-i="alt_kaynak">${H.alt_kaynak}</span><a href="${DEPO}" id="depo-baglanti">${DEPO.replace("https://", "")}</a></p>
  <p><a href="${DEPO}/tree/master/arac/yazi" data-i="alt_yazi">${H.alt_yazi}</a></p>
  <p class="imza"><b>FRK-OS</b> · furkiozknn</p>
</footer>

</div>

<dialog id="detay" aria-labelledby="d-ad">
  <div class="detay-ust">
    <h2 id="d-ad"></h2>
    <button class="kapat" id="d-kapat" type="button" data-i-aria="kapat" aria-label="${H.kapat}">&times;</button>
  </div>
  <div class="detay-govde">
    <h3 data-i="d_yapar">${H.d_yapar}</h3>
    <p id="d-aciklama" style="margin:0;color:var(--sonuk);font-size:13.5px"></p>
    <p class="meta" id="d-sinir"></p>

    <div id="d-tetik-blok">
      <h3 data-i="d_tetik">${H.d_tetik}</h3>
      <ul class="tetik" id="d-tetik"></ul>
    </div>

    <h3 data-i="d_kur">${H.d_kur}</h3>
    <ol class="adimlar" id="d-adimlar">
      <li id="ad1" class="etkin">
        <div class="adim-baslik" data-i="d_ad1">${H.d_ad1}</div>
        <div class="dugmeler">
          <button class="eylem kucuk" id="d-kopyala" type="button">${H.d_kopyala}</button>
          <button class="eylem ikincil kucuk" id="d-indir" type="button" data-i="d_indir">${H.d_indir}</button>
        </div>
      </li>
      <li id="ad2">
        <div class="adim-baslik" data-i="d_ad2">${H.d_ad2}</div>
        <div class="satir-kod">
          <code id="d-yol"></code>
          <button class="eylem ikincil kucuk" id="d-yol-kopyala" type="button">${H.d_yol_kopyala}</button>
        </div>
        <div class="adim-alt"><span data-i="d_hepsi">${H.d_hepsi}</span>
          <code id="d-kur"></code></div>
      </li>
      <li id="ad3">
        <div class="adim-baslik" data-i="d_ad3">${H.d_ad3}</div>
        <div class="adim-alt"><span data-i="d_ad3_alt1">${H.d_ad3_alt1}</span> <b id="d-ad2"></b> <span data-i="d_ad3_alt2">${H.d_ad3_alt2}</span></div>
      </li>
    </ol>

    <h3 data-i="d_araclar">${H.d_araclar}</h3>
    <div class="cipler" id="d-araclar"></div>
    <p class="meta" id="d-model"></p>

    <h3 data-i="d_tam">${H.d_tam}</h3>
    <pre id="d-ham"></pre>
  </div>
</dialog>

<script type="application/json" id="veri">${VERI}</script>
<script>
const AJANLAR = JSON.parse(document.getElementById("veri").textContent);
const METIN = ${METIN_JSON};
const GRUP = ${grupEtiketleri};
const TOPLAM = { komut: ${komutSayisi}, beceri: ${beceriSayisi}, tarih: { tr: ${JSON.stringify(damgaTr)}, en: ${JSON.stringify(damgaEn)} } };
const SAYI = { n: ${ajanlar.length}, oku: ${okurSayisi}, yaz: ${yazSayisi} };

// Video sisteminin klasik FRK-OS renk akisi; nokta tamamen suslu (anlam tasimaz).
const RENK = {
  purple: "#c3a6ff", blue: "#6aa8ff", green: "#3dffb0",
  cyan: "#19d3e6", orange: "#ff7a1a", yellow: "#ffc21a",
  red: "#ff4d6d", pink: "#ff2e88", gray: "#a9a294"
};

const $ = (s) => document.querySelector(s);
const izgara = $("#izgara"), bos = $("#bos"), arama = $("#arama");
const detay = $("#detay"), derinNot = $("#derin-not");

// --- dil -------------------------------------------------------------------
// Varsayilan: tarayici dili "tr" ile basliyorsa Turkce, degilse Ingilizce.
// Kullanicinin secimi localStorage'da ("dil") kalir.
function kayitOku(k) { try { return localStorage.getItem(k); } catch { return null; } }
function kayitYaz(k, v) { try { localStorage.setItem(k, v); } catch {} }
let dil = kayitOku("dil");
if (dil !== "tr" && dil !== "en") dil = /^tr/i.test(navigator.language || "") ? "tr" : "en";

function t(k, d) {
  let s = (METIN[dil] && METIN[dil][k]) || METIN.tr[k] || k;
  if (d) for (const a in d) s = s.split("{" + a + "}").join(d[a]);
  return s;
}

function dilUygula() {
  document.documentElement.lang = dil;
  document.documentElement.dataset.dil = dil;
  document.querySelectorAll("[data-i]").forEach((e) => {
    // Ayni metni yeniden yazma: ilk boyama zaten dogru dilde geldiyse DOM'a dokunma
    // (yeni metin dugumu Lighthouse'ta LCP'yi ~1,4 sn geciktiriyordu).
    const yeni = t(e.dataset.i, SAYI);
    if (e.textContent !== yeni) e.textContent = yeni;
  });
  document.querySelectorAll("[data-i-aria]").forEach((e) => e.setAttribute("aria-label", t(e.dataset.iAria)));
  document.querySelectorAll("[data-i-ph]").forEach((e) => e.setAttribute("placeholder", t(e.dataset.iPh)));
  $("#dil-tr").setAttribute("aria-pressed", String(dil === "tr"));
  $("#dil-en").setAttribute("aria-pressed", String(dil === "en"));
  // "Turkce aciklamalar" notu yalniz Ingilizce arayuzde gerekli.
  $("#dil-notu").hidden = dil !== "en";
  $("#alt-sayilar").textContent = t("alt_sonrasi", { komut: TOPLAM.komut, beceri: TOPLAM.beceri, tarih: TOPLAM.tarih[dil] });
  document.querySelectorAll("#ekler-liste .tur").forEach((e) => { e.textContent = t("tur_" + e.dataset.tur); });
  temaYaz();
  grupSuzgecleri();
  ciz(ara(arama.value));
  // Acik detay varsa metinleri yenile.
  if (detay.open && acik) doldurDetay(acik, false);
}

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
  a.ham = ""; a._derin = null;
});

// Tam markdown ayri dosyada (tam.js): sayfa yuklenince arka planda gelir.
// Gelene kadar detay "yukleniyor" der, govde aramasi bekler.
let tamDurum = 0;            // 0 baslamadi, 1 yukleniyor, 2 hazir, 3 yuklenemedi
const tamBekleyen = [];
function tamYukle() {
  return new Promise((coz) => {
    if (tamDurum >= 2) return coz();
    tamBekleyen.push(coz);
    if (tamDurum === 1) return;
    tamDurum = 1;
    const s = document.createElement("script");
    s.src = "tam.js";
    s.onload = () => {
      AJANLAR.forEach((a) => { a.ham = (window.TAM && window.TAM[a.ad]) || ""; a._derin = sade(a.ham); });
      tamDurum = 2; bitir();
    };
    s.onerror = () => { tamDurum = 3; AJANLAR.forEach((a) => { a._derin = ""; }); bitir(); };
    document.head.appendChild(s);
  });
}
function bitir() {
  tamBekleyen.splice(0).forEach((f) => f());
  if (detay.open && acik) doldurDetay(acik, false);
  ciz(ara(arama.value));
}
addEventListener("load", () => tamYukle());

const suz = { grup: "", yetki: "" };
function suzgeceUyar(a) {
  if (suz.grup && a.grup !== suz.grup) return false;
  if (suz.yetki === "yaz" && !a.yaz) return false;
  if (suz.yetki === "oku" && a.yaz) return false;
  return true;
}

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
  const havuz = AJANLAR.filter(suzgeceUyar);
  if (!q) return { liste: havuz, derin: false };
  const puanli = havuz.map((a, i) => ({ a, i, p: puan(a, q) })).filter((x) => x.p > 0);
  if (puanli.length) {
    puanli.sort((x, y) => y.p - x.p || x.i - y.i);
    return { liste: puanli.map((x) => x.a), derin: false };
  }
  if (tamDurum < 2) { tamYukle(); return { liste: [], derin: true, bekliyor: tamDurum !== 3 }; }
  return { liste: havuz.filter((a) => a._derin.includes(q)), derin: true };
}

// --- kartlar ---------------------------------------------------------------
let kartNo = 0;
function kartYap(a) {
  const b = document.createElement("button");
  b.className = "kart";
  b.type = "button";
  const id = "k" + (kartNo++);

  const h = document.createElement("h3");
  h.id = id;
  const nokta = document.createElement("span");
  nokta.className = "nokta";
  nokta.style.background = RENK[a.renk] || RENK.gray;
  nokta.setAttribute("aria-hidden", "true");
  h.append(nokta, document.createTextNode(a.ad));
  if (a.yaz) {
    const y = document.createElement("span");
    y.className = "yaz-etiket";
    y.textContent = t("yaz_etiket");
    h.appendChild(y);
  }

  const p = document.createElement("p");
  p.id = id + "p";
  p.textContent = a.ozet.length > 170 ? a.ozet.slice(0, 167) + "…" : a.ozet;
  // Erisilebilir ad ajanin adi (gorunen metinle ayni), ozet aciklama olarak.
  b.setAttribute("aria-labelledby", id);
  b.setAttribute("aria-describedby", id + "p");

  b.append(h, p);

  if (a.tetik.length) {
    const c = document.createElement("div");
    c.className = "cipler";
    for (const x of a.tetik.slice(0, 3)) {
      const s = document.createElement("span");
      s.className = "cip soz";
      s.textContent = "“" + x + "”";
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
  kartNo = 0;
  const parca = document.createDocumentFragment();
  for (const a of gorunen) parca.appendChild(kartYap(a));
  izgara.replaceChildren(parca);
  bos.hidden = gorunen.length > 0 || !!sonuc.bekliyor;

  derinNot.hidden = !sonuc.derin || gorunen.length === 0;
  if (!derinNot.hidden) derinNot.textContent = t("derin", { k: gorunen.length });

  $("#sayac").textContent = gorunen.length === AJANLAR.length
    ? t("say_hepsi", { n: AJANLAR.length })
    : t("say_kismi", { k: gorunen.length, n: AJANLAR.length });

  // Komut ve beceri listesi ayni sorguyla suzulur (grup/yetki suzgeci ajanlara ozgu).
  const q = sade(arama.value.trim());
  let ekGorunen = 0;
  for (const li of document.querySelectorAll("#ekler-liste li")) {
    const goster = !q || sade(li.textContent).includes(q);
    li.hidden = !goster;
    if (goster) ekGorunen++;
  }
  $("#ekler-bos").hidden = ekGorunen > 0;
}

// --- grup suzgecleri -------------------------------------------------------
const grupSirasi = [];
AJANLAR.forEach((a) => { if (a.grup && !grupSirasi.includes(a.grup)) grupSirasi.push(a.grup); });

function grupSuzgecleri() {
  const kap = $("#grup-suz");
  kap.replaceChildren();
  const yap = (deger, etiket) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "suz"; b.dataset.grup = deger;
    b.setAttribute("aria-pressed", String(suz.grup === deger));
    b.textContent = etiket;
    b.addEventListener("click", () => { suz.grup = suz.grup === deger ? "" : deger; grupSuzgecleri(); ciz(ara(arama.value)); });
    return b;
  };
  const hepsi = yap("", t("hepsi"));
  hepsi.setAttribute("aria-pressed", String(suz.grup === ""));
  hepsi.addEventListener("click", () => { suz.grup = ""; grupSuzgecleri(); ciz(ara(arama.value)); });
  kap.appendChild(hepsi);
  for (const g of grupSirasi) kap.appendChild(yap(g, (GRUP[g] && GRUP[g][dil]) || g));
}

document.querySelectorAll("#yetki-suz .suz").forEach((b) => {
  b.addEventListener("click", () => {
    suz.yetki = b.dataset.yetki;
    document.querySelectorAll("#yetki-suz .suz").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    ciz(ara(arama.value));
  });
});

// --- detay -----------------------------------------------------------------
let acik = null;
function adimSifirla() {
  $("#ad1").className = "etkin";
  $("#ad2").className = "";
  $("#ad3").className = "";
}

function doldurDetay(a, sifirla) {
  $("#d-ad").textContent = a.ad;
  $("#d-ad2").textContent = a.ad;
  $("#d-aciklama").textContent = a.ozet;
  $("#d-sinir").textContent = a.sinir;
  $("#d-sinir").hidden = !a.sinir;

  const tb = $("#d-tetik");
  tb.replaceChildren();
  if (a.tetik.length) {
    for (const x of a.tetik) {
      const li = document.createElement("li");
      li.textContent = "“" + x + "”";
      tb.appendChild(li);
    }
    $("#d-tetik-blok").hidden = false;
  } else {
    $("#d-tetik-blok").hidden = true;
  }

  const ar = $("#d-araclar");
  ar.replaceChildren();
  for (const x of a.araclar) {
    const s = document.createElement("span");
    s.className = "cip";
    s.textContent = x;
    ar.appendChild(s);
  }
  $("#d-model").textContent = t("d_model", { m: a.model });

  $("#d-yol").textContent = ".claude/agents/" + a.dosya;
  $("#d-kur").textContent = "powershell -ExecutionPolicy Bypass -File kur.ps1";
  $("#d-ham").textContent = a.ham || (tamDurum === 3 ? t("tam_yok") : t("yukleniyor"));

  if (sifirla) adimSifirla();
  if (sifirla) {
    $("#d-kopyala").textContent = t("d_kopyala");
    $("#d-yol-kopyala").textContent = t("d_yol_kopyala");
  }
}

function ac(a) {
  acik = a;
  doldurDetay(a, true);
  try { history.replaceState(null, "", "#ajan=" + encodeURIComponent(a.ad)); } catch {}
  detay.showModal();
  detay.querySelector(".detay-govde").scrollTop = 0;
}

function kapat() { detay.close(); }

detay.addEventListener("close", () => {
  acik = null;
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
  dugme.textContent = ok ? basarili : t("secildi");
  return ok;
}

$("#d-kopyala").addEventListener("click", async (e) => {
  const d = e.currentTarget;
  await tamYukle();
  await panoya($("#d-ham").textContent, d, t("d_kopyalandi2"), $("#d-ham"));
  $("#ad1").className = "tamam";
  $("#ad2").className = "etkin";
  setTimeout(() => (d.textContent = t("d_kopyala")), 3000);
});

$("#d-yol-kopyala").addEventListener("click", async (e) => {
  const d = e.currentTarget;
  await panoya($("#d-yol").textContent, d, t("kopyalandi"), $("#d-yol"));
  $("#ad2").className = "tamam";
  $("#ad3").className = "etkin";
  setTimeout(() => (d.textContent = t("d_yol_kopyala")), 3000);
});

$("#d-indir").addEventListener("click", async () => {
  await tamYukle();
  const ad = $("#d-ad").textContent + ".md";
  const b = new Blob([$("#d-ham").textContent], { type: "text/markdown" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
  $("#ad1").className = "tamam";
  $("#ad2").className = "etkin";
});

// Ust kurulum satiri.
$("#kur-kopyala").addEventListener("click", async (e) => {
  const d = e.currentTarget;
  await panoya($("#kur-komut").textContent, d, t("kopyalandi"), $("#kur-komut"));
  setTimeout(() => (d.textContent = t("kopyala")), 2500);
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
// FRK-OS siyah varsayilan; acik tema isteyen secer ve secim hatirlanir.
// Sistem tercihi bilerek izlenmiyor: kimlik siyah zemin.
function temaYaz() {
  const acikTema = document.documentElement.dataset.tema === "light";
  $("#tema").textContent = acikTema ? t("tema_koyu") : t("tema_acik");
}
const temaKayit = kayitOku("tema");
if (temaKayit === "light") document.documentElement.dataset.tema = "light";
$("#tema").addEventListener("click", () => {
  const yeni = document.documentElement.dataset.tema === "light" ? "dark" : "light";
  document.documentElement.dataset.tema = yeni;
  kayitYaz("tema", yeni);
  temaYaz();
});

$("#dil-tr").addEventListener("click", () => { dil = "tr"; kayitYaz("dil", dil); dilUygula(); });
$("#dil-en").addEventListener("click", () => { dil = "en"; kayitYaz("dil", dil); dilUygula(); });

// --- baslangic -------------------------------------------------------------
$("#toplam").textContent = AJANLAR.length;
document.querySelectorAll("#ekler-liste .tur").forEach((e) => { e.dataset.tur = e.classList.contains("tur-komut") ? "komut" : "beceri"; });
dilUygula();

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
fs.writeFileSync(path.join(CIKTI_KLASOR, "tam.js"), "window.TAM=" + JSON.stringify(TAM).split("<").join(String.fromCharCode(92) + "u003c") + ";" + String.fromCharCode(10), "utf8");

console.log("Uretildi: " + CIKTI);
console.log("  ajan sayisi : " + ajanlar.length + " (yazabilen " + yazSayisi + ", salt okur " + okurSayisi + ")");
console.log("  gruplar     : " + [...new Set(ajanlar.map((a) => a.grup || "(grupsuz)"))].join(" | "));
console.log("  boyut       : " + (Buffer.byteLength(html, "utf8") / 1024).toFixed(1) + " KB");
for (const a of ajanlar) {
  console.log("  - " + a.ad + "  (" + a.araclar.length + " arac, " + a.tetik.length + " tetik, " + (a.grup || "grupsuz") + ")");
  console.log("      ozet : " + a.ozet);
  console.log("      sinir: " + (a.sinir || "—"));
}
