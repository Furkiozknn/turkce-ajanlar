/*
 * sunucu-test.js — arac/sunucu.js'in kotu isteklere dayandigini gosterir.
 *
 *   node arac/sunucu-test.js
 *
 * Sunucuyu bos bir portta alt surec olarak baslatir, gercek HTTP istekleri
 * atar ve her istekten SONRA surecin hala ayakta oldugunu olcer.
 *
 * Neden: bozuk yuzde kodlamasi ("/%E0") decodeURIComponent'i firlatiyordu;
 * hata istek isleyicisinin icinde yakalanmadigi icin tek bir istek butun
 * sunucuyu dusuruyordu (web-test.js ve ekran goruntusu adimlari onunla
 * birlikte). Kok disina cikma denemeleri de burada sinanir.
 *
 * Cikis kodu: bir kontrol bile duserse 1.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const SUNUCU = path.join(__dirname, "sunucu.js");

let gecen = 0;
let kalan = 0;
function bekle(ad, kosul, ipucu) {
  if (kosul) { gecen++; console.log("  ok   " + ad); }
  else { kalan++; console.log("  DUS  " + ad + (ipucu ? "\n       " + ipucu : "")); }
}

function bosPort() {
  return new Promise((coz, reddet) => {
    const s = net.createServer();
    s.once("error", reddet);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => coz(p)); });
  });
}

// Ham yol gonderir: http.get yolu normalize etmez, "/../" oldugu gibi gider.
function iste(port, yol) {
  return new Promise((coz) => {
    const istek = http.get({ host: "127.0.0.1", port, path: yol, timeout: 3000 }, (y) => {
      let govde = "";
      y.setEncoding("utf8");
      y.on("data", (p) => { govde += p; });
      y.on("end", () => coz({ durum: y.statusCode, govde }));
    });
    istek.on("timeout", () => { istek.destroy(); coz({ durum: 0, govde: "zaman asimi" }); });
    istek.on("error", (e) => coz({ durum: 0, govde: e.code || e.message }));
  });
}

async function ana() {
  const port = await bosPort();
  const surec = spawn(process.execPath, [SUNUCU, String(port)], { stdio: ["ignore", "pipe", "pipe"] });
  let hataCiktisi = "";
  surec.stderr.on("data", (p) => { hataCiktisi += p; });
  let cikti = false;
  surec.on("exit", () => { cikti = true; });

  // Hazir olana kadar bekle (en fazla ~5 sn).
  let hazir = false;
  for (let i = 0; i < 50 && !hazir && !cikti; i++) {
    hazir = (await iste(port, "/")).durum === 200;
    if (!hazir) await new Promise((c) => setTimeout(c, 100));
  }
  bekle("sunucu basladi ve / 200 dondu", hazir, hataCiktisi.slice(0, 300));
  if (!hazir) { surec.kill(); return; }

  const kok = await iste(port, "/index.html");
  bekle("/index.html 200 ve HTML", kok.durum === 200 && /<!doctype html>/i.test(kok.govde), "durum=" + kok.durum);

  for (const yol of ["/../package.json", "/..%2fpackage.json", "/..%5cpackage.json", "/%2e%2e/%2e%2e/package.json"]) {
    const r = await iste(port, yol);
    bekle("kok disi okunmuyor: " + yol, r.durum !== 200 && !r.govde.includes('"name"'), "durum=" + r.durum);
  }

  // web/ icinden disari isaret eden sembolik bag da okunmamali. Ad
  // .gitignore'daki "web/_onizleme-*" kalibina uyar; test sonunda silinir.
  // Windows'ta yetkisiz kullanici sembolik bag kuramaz; o zaman atlanir.
  const bag = path.join(__dirname, "..", "web", "_onizleme-sunucu-test-bag");
  let bagKuruldu = false;
  try { fs.symlinkSync(path.join(__dirname, "..", "package.json"), bag); bagKuruldu = true; } catch {}
  if (bagKuruldu) {
    try {
      const r = await iste(port, "/_onizleme-sunucu-test-bag");
      bekle("web/ disina isaret eden sembolik bag okunmuyor", r.durum === 404 && !r.govde.includes('"name"'), "durum=" + r.durum);
    } finally {
      try { fs.unlinkSync(bag); } catch {}
    }
  } else {
    console.log("  --   sembolik bag kurulamadi, bu kontrol atlandi");
  }

  const bozuk = await iste(port, "/%E0%A4%A");
  bekle("bozuk yuzde kodlamasi 400 dondu", bozuk.durum === 400, "durum=" + bozuk.durum + " govde=" + bozuk.govde.slice(0, 120));
  const sonra = await iste(port, "/");
  bekle("bozuk istekten sonra sunucu hala ayakta", sonra.durum === 200 && !cikti, "durum=" + sonra.durum + " stderr=" + hataCiktisi.slice(0, 300));

  const yok = await iste(port, "/olmayan-dosya.html");
  bekle("olmayan dosya 404", yok.durum === 404, "durum=" + yok.durum);

  await new Promise((c) => setTimeout(c, 200)); // "exit" olayi islensin
  bekle("sinama boyunca surec hic dusmedi", !cikti, hataCiktisi.slice(0, 300));
  surec.kill();
}

ana()
  .catch((e) => { kalan++; console.log("  DUS  beklenmeyen hata: " + e.message); })
  .finally(() => {
    console.log("\n" + gecen + " gecti, " + kalan + " kaldi");
    process.exit(kalan ? 1 : 0);
  });
