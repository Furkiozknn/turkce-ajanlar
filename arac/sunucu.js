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

    const tam = path.join(KOK, path.normalize(yol).replace(/^([/\\])+/, ""));
    // Ayiriciyla karsilastir: "web" onekiyle baslayan kardes klasor
    // ("web-eski") da startsWith(KOK) testini gecerdi.
    if (tam !== KOK && !tam.startsWith(KOK + path.sep)) {
      yanit.writeHead(403).end("yasak");
      return;
    }
    fs.readFile(tam, (hata, veri) => {
      if (hata) {
        yanit.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        yanit.end("bulunamadi: " + yol);
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
