// arac/ altindaki CLI'lar HER YERDE CommonJS olarak calisir mi?
//
//   node arac/modul-turu-test.js
//
// NEDEN VAR. Bu depoda hic package.json yoktu ve arac/ altindaki 17 CLI'nin
// hepsi require() kullaniyor. Node bir dosyanin modul turunu ararken dizin
// agacinda YUKARI yuruyor; depo bir ESM paketinin ("type": "module") altina
// yerlestirilince araclar ESM sanilip su hatayla duser:
//
//   ReferenceError: require is not defined in ES module scope
//
// 21 Eylul 2026'da tam bu oldu: ajans-os'un U15 kapisi dogrula.js'i CI'da
// kendi calisma alaninin altina checkout edince patladi. Gelistirme
// makinesinde iki depo YAN YANA durdugu icin hic gorulmemisti -- yani hata
// yalnizca baskasi bu depoyu kullanmaya calisinca ortaya cikiyordu.
//
// Test bunu gercekten kurar: gecici bir ESM paketi yapar, deponun bir
// kopyasini ALTINA koyar ve dogrulayiciyi oradan calistirir.

"use strict";

const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const KOK = path.resolve(__dirname, "..");

// 1) package.json var ve CommonJS diyor. Yukari yuruyusu burada durduran sey bu.
const pkg = JSON.parse(fs.readFileSync(path.join(KOK, "package.json"), "utf8"));
assert.strictEqual(
  pkg.type,
  "commonjs",
  'package.json "type" alani "commonjs" olmali: arac/ altindaki CLI\'lar require() kullaniyor',
);

// 2) arac/ altinda ESM sozdizimi sizmasin -- sizarsa 1. madde onu bozar.
for (const ad of fs.readdirSync(__dirname).filter((f) => f.endsWith(".js"))) {
  const metin = fs.readFileSync(path.join(__dirname, ad), "utf8");
  assert.ok(
    !/^\s*(import\s.+\sfrom\s|export\s)/m.test(metin),
    `${ad}: ESM sozdizimi var ama paket commonjs. Ya require()'a cevir ya .mjs yap.`,
  );
}

// 3) ASIL SINAMA: depo bir ESM paketinin altindayken dogrulayici kosuyor mu?
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "turkce-ajanlar-esm-"));
try {
  // Disarida, "type": "module" diyen bir paket.
  fs.writeFileSync(
    path.join(gecici, "package.json"),
    JSON.stringify({ name: "esm-kabuk", type: "module", private: true }),
  );

  // Deponun ALTINA konmus hali. Dogrulayici yalnizca agents/ okumuyor
  // (sema, beceri ve komut dosyalarina da bakiyor), o yuzden secmeli kopya
  // degil TAM kopya -- .git ve node_modules haric.
  const ic = path.join(gecici, "komsu");
  fs.cpSync(KOK, ic, {
    recursive: true,
    filter: (kaynak) => {
      const ad = path.basename(kaynak);
      return ad !== ".git" && ad !== "node_modules";
    },
  });

  const cikti = execFileSync(
    process.execPath,
    [path.join(ic, "arac", "dogrula.js")],
    { encoding: "utf8" },
  );
  assert.match(
    cikti,
    /0 hata, 0 uyari/,
    `ESM paketi altinda dogrulayici temiz demedi:\n${cikti}`,
  );

  // 4) package.json OLMADAN gercekten bozuluyor mu? Testin bir seyi
  //    gercekten kanitladigindan emin olmanin tek yolu: korumayi kaldirip
  //    hatanin geri geldigini gormek. Yoksa 3. madde hep yesil olabilirdi.
  fs.rmSync(path.join(ic, "package.json"));
  let bozuldu = false;
  try {
    execFileSync(process.execPath, [path.join(ic, "arac", "dogrula.js")], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    bozuldu = /require is not defined in ES module scope/.test(
      String(e.stderr || e.message),
    );
  }
  assert.ok(
    bozuldu,
    "package.json silinince beklenen ESM hatasi CIKMADI -- bu test artik bir sey kanitlamiyor, kurulumu gozden gecir",
  );
} finally {
  fs.rmSync(gecici, { recursive: true, force: true });
}

console.log("Sonuc: modul turu 4/4 sinama gecti (araclar ESM paketi altinda da CommonJS)");
