/*
 * sosyal-kart.js — assets/social.svg dosyasini 1280x640 PNG'ye cevirir.
 *
 *   node arac/banner-uret.js      # once: social.svg'yi uretir
 *   node arac/sosyal-kart.js      # sonra: assets/social.png
 *
 * GitHub "social preview" SVG kabul etmez; PNG'yi repo Settings > Social
 * preview alanina elle yuklemek gerekir (API yok). Ayrica web/index.html
 * og:image olarak kullanabilir.
 *
 * Playwright bu depoya bagimlilik olarak EKLENMEDI (ekran-goruntusu.js ile
 * ayni ilke). Aranan yerler sirayla:
 *   - PLAYWRIGHT_YOL ortam degiskeni
 *   - require("playwright") / require("playwright-core")  (NODE_PATH)
 *   - %LOCALAPPDATA%\npm-cache\_npx\*\node_modules\playwright(-core)  (npx onbellegi)
 * Tarayici: CHROME_YOL veya %LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win*\chrome.exe
 * Bulunamazsa cikis kodu 2 — "gecti" sanilmasin.
 */

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const SVG = path.join(KOK, "assets", "social.svg");
const PNG = path.join(KOK, "assets", "social.png");

if (!fs.existsSync(SVG)) {
  console.error("assets/social.svg yok. Once: node arac/banner-uret.js");
  process.exit(2);
}

function playwrightBul() {
  const adaylar = [process.env.PLAYWRIGHT_YOL, "playwright", "playwright-core"].filter(Boolean);
  for (const a of adaylar) { try { return { pw: require(a), kaynak: a }; } catch {} }
  const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) {
      for (const ad of ["playwright", "playwright-core"]) {
        const p = path.join(npx, d, "node_modules", ad);
        if (fs.existsSync(path.join(p, "package.json"))) { try { return { pw: require(p), kaynak: p }; } catch {} }
      }
    }
  }
  return null;
}

function chromeBul() {
  if (process.env.CHROME_YOL && fs.existsSync(process.env.CHROME_YOL)) return process.env.CHROME_YOL;
  const kok = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(kok)) return undefined;
  const surumler = fs.readdirSync(kok).filter((d) => d.startsWith("chromium-")).sort().reverse();
  for (const s of surumler) {
    for (const alt of ["chrome-win64", "chrome-win"]) {
      const exe = path.join(kok, s, alt, "chrome.exe");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined;
}

const bulunan = playwrightBul();
if (!bulunan) {
  console.error("playwright bulunamadi. PLAYWRIGHT_YOL=<...>/node_modules/playwright ver.");
  process.exit(2);
}
const CHROME = chromeBul();

(async () => {
  const tarayici = await bulunan.pw.chromium.launch({ executablePath: CHROME });
  try {
    const sayfa = await tarayici.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
    const svg = fs.readFileSync(SVG, "utf8");
    // SVG'yi sayfaya gomerek font gomulu kalir; harici istek yok.
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:1280px;height:640px;overflow:hidden;background:#16150f}svg{display:block;width:1280px;height:640px}</style></head><body>${svg}</body></html>`;
    await sayfa.setContent(html, { waitUntil: "load" });
    await sayfa.evaluate(() => document.fonts ? document.fonts.ready : null);
    await sayfa.waitForTimeout(150);
    await sayfa.screenshot({ path: PNG, type: "png", clip: { x: 0, y: 0, width: 1280, height: 640 } });
  } finally {
    await tarayici.close();
  }
  const boyut = fs.statSync(PNG).size;
  // PNG basligindan gercek boyutu oku (IHDR: 16. bayttan itibaren genislik/yukseklik)
  const b = fs.readFileSync(PNG);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  console.log("Uretildi: " + PNG);
  console.log("  boyut     : " + w + "x" + h + " px, " + (boyut / 1024).toFixed(0) + " KB");
  console.log("  playwright: " + bulunan.kaynak);
  console.log("  chromium  : " + (CHROME || "(playwright varsayilani)"));
  if (w !== 1280 || h !== 640) { console.error("HATA: beklenen 1280x640"); process.exit(1); }
})().catch((e) => { console.error("HATA: " + e.message); process.exit(1); });
