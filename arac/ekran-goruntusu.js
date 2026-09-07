/*
 * ekran-goruntusu.js — README'deki arayuz gorselini uretir.
 *
 *   node arac/sunucu.js 8789        # ayri bir pencerede
 *   node arac/ekran-goruntusu.js [http://127.0.0.1:8789/]
 *
 * Uretilen dosyalar:
 *   assets/ekran-goruntusu.png        acik tema, 1280x960, 2x
 *   assets/ekran-goruntusu-koyu.png   koyu tema, ayni cerceve
 *
 * Playwright bu depoya bagimlilik olarak eklenmedi; makinede zaten
 * kurulu olan kopya kullanilir (NODE_PATH veya PLAYWRIGHT_YOL).
 * Bulunamazsa cikis kodu 2 — "gecti" sanilmasin.
 */

const path = require("path");
const fs = require("fs");

const ADRES = process.argv[2] || "http://127.0.0.1:8789/";
const CIKIS = path.join(__dirname, "..", "assets");

function playwrightYukle() {
  const denenecek = ["playwright", "playwright-core", process.env.PLAYWRIGHT_YOL].filter(Boolean);
  for (const y of denenecek) {
    try { return require(y); } catch {}
  }
  return null;
}

const pw = playwrightYukle();
if (!pw) {
  console.error("playwright bulunamadi. NODE_PATH ile yolunu ver:");
  console.error('  NODE_PATH="<...>/node_modules" node arac/ekran-goruntusu.js');
  process.exit(2);
}

const CHROME = process.env.CHROME_YOL || undefined;

(async () => {
  const tarayici = await pw.chromium.launch({ executablePath: CHROME });
  const cekimler = [
    { tema: "light", dosya: "ekran-goruntusu.png" },
    { tema: "dark", dosya: "ekran-goruntusu-koyu.png" },
  ];

  for (const c of cekimler) {
    const baglam = await tarayici.newContext({
      viewport: { width: 1280, height: 960 },
      deviceScaleFactor: 2,
      colorScheme: c.tema,
      locale: "tr-TR",
    });
    const sayfa = await baglam.newPage();
    const hatalar = [];
    sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
    sayfa.on("pageerror", (e) => hatalar.push(String(e)));

    await sayfa.goto(ADRES, { waitUntil: "networkidle" });
    // Tema secimi localStorage'da hatirlaniyor; her cekim temiz baslasin.
    await sayfa.evaluate(() => { try { localStorage.clear(); } catch {} });
    await sayfa.reload({ waitUntil: "networkidle" });
    await sayfa.waitForTimeout(400);

    const hedef = path.join(CIKIS, c.dosya);
    await sayfa.screenshot({ path: hedef, type: "png" });
    const boyut = fs.statSync(hedef).size;
    console.log(`${c.dosya} — ${c.tema}, ${(boyut / 1024).toFixed(0)} KB` +
      (hatalar.length ? `  KONSOL HATASI: ${hatalar.join(" | ")}` : ""));
    if (hatalar.length) { await tarayici.close(); process.exit(1); }
    await baglam.close();
  }

  await tarayici.close();
})().catch((e) => { console.error(e); process.exit(1); });
