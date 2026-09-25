/*
 * sunucu.js — web/ klasorunu yerelde servis eder.
 *   node arac/sunucu.js [port]
 * Varsayilan: http://127.0.0.1:8787
 * Sadece 127.0.0.1'e baglanir.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..", "web");
const PORT = parseInt(process.argv[2] || "8787", 10);

const TIP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

// web/ altindaki duz dosyalar: "alt/yol.ext" -> mutlak yol. Her istekte
// yeniden okunur (klasor kucuk), sunucu yeniden baslatilmadan yeni dosya
// gorunur.
function webDosyalari() {
  const harita = new Map();
  (function gez(klasor, onek) {
    let girdiler;
    try { girdiler = fs.readdirSync(klasor, { withFileTypes: true }); } catch { return; }
    for (const g of girdiler) {
      if (g.isDirectory()) gez(path.join(klasor, g.name), onek + g.name + "/");
      else if (g.isFile()) harita.set(onek + g.name, path.join(klasor, g.name));
    }
  })(KOK, "");
  return harita;
}

http
  .createServer((istek, yanit) => {
    // Bozuk yuzde kodlamasi ("/%E0") decodeURIComponent'i firlatir; burada
    // yakalanmazsa tek bir istek butun sunucuyu dusurur (sunucu-test.js).
    let yol;
    try {
      yol = decodeURIComponent(istek.url.split("?")[0]);
    } catch {
      yanit.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      yanit.end("gecersiz adres");
      return;
    }
    if (yol === "/") yol = "/index.html";

    // Istenen yol dosya sistemine hic verilmez. web/ altindaki gercek
    // dosyalarin listesi cikarilir; istek bu listede bir anahtarla
    // eslesirse okunan yol LISTEDEN gelir. Boylece "../", kodlanmis
    // ayiricilar, "web-eski" gibi kardes klasorler ve web/ icinden disari
    // isaret eden sembolik baglar (Dirent.isFile() onlar icin false)
    // ayni kuralla kapanir.
    const anahtar = path.posix.normalize(yol.replace(/\\/g, "/")).replace(/^\/+/, "");
    const tam = webDosyalari().get(anahtar);
    if (!tam) {
      yanit.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      yanit.end("bulunamadi");
      return;
    }
    fs.readFile(tam, (hata, veri) => {
      if (hata) {
        yanit.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        yanit.end("bulunamadi");
        return;
      }
      yanit.writeHead(200, {
        "Content-Type": TIP[path.extname(tam)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      yanit.end(veri);
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log("Sunucu: http://127.0.0.1:" + PORT);
    console.log("Kok   : " + KOK);
    console.log("Durdurmak icin Ctrl+C.");
  });
