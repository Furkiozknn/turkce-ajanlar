/*
 * ekip-kos-test.js — ekip-kos.js'in gercekten BEKLEDIGINI gosterir.
 *
 *   node arac/ekip-kos-test.js
 *
 * Betigin varlik sebebi tek bir iddia: alt surec bitmeden sonraki adima
 * gecilmiyor. Bu testin merkezinde de o var — sahte bir `claude` ikilisi
 * bilerek gecikiyor, test gecen sureyi olcuyor. Gecikme gozlenmezse
 * senaryo duser.
 *
 * Hicbir senaryo gercek `claude` cagirmaz; API'ye cikmaz, para harcamaz.
 * Sahte ikili --komut (yol) ve --komut-arg (betik) ile veriliyor.
 *
 * Cikis kodu: bir senaryo bile duserse 1.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const KOSUCU = path.join(__dirname, "ekip-kos.js");
const KOK = path.resolve(__dirname, "..");

let gecen = 0;
let dusen = 0;

function bekle(ad, kosul, ipucu) {
  if (kosul) {
    gecen++;
    console.log("  OK   " + ad);
  } else {
    dusen++;
    console.log("  DUS  " + ad + (ipucu ? "\n       " + ipucu : ""));
  }
}

function gecici() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ekip-kos-test-"));
}

/*
 * Sahte claude: gecikir, sonra gercek ikilinin --output-format json
 * bicimini taklit eden bir satir basar. Davranisi ortam degiskenleriyle
 * ayarlanir ki tek dosya butun senaryolara yetsin.
 *   SAHTE_GECIKME_MS  basmadan once beklenecek sure
 *   SAHTE_USD         total_cost_usd
 *   SAHTE_KOD         cikis kodu (0 disi ise JSON basilmaz)
 *   SAHTE_KAYIT       her cagrinin argv'sinin eklenecegi dosya
 */
const SAHTE = `
const fs = require("fs");
const kayit = process.env.SAHTE_KAYIT;
if (kayit) fs.appendFileSync(kayit, JSON.stringify(process.argv.slice(2)) + "\\n");
const kod = parseInt(process.env.SAHTE_KOD || "0", 10);
const gecikme = parseInt(process.env.SAHTE_GECIKME_MS || "0", 10);
setTimeout(() => {
  if (kod !== 0) { process.stderr.write("sahte hata\\n"); process.exit(kod); }
  const fis = process.argv[3] || "";
  const ad = (fis.match(/Istenen  : ([a-z0-9-]+)/) || [,"bilinmeyen"])[1];
  process.stdout.write(JSON.stringify({
    type: "result",
    subtype: "success",
    total_cost_usd: parseFloat(process.env.SAHTE_USD || "0.01"),
    result: "## Taranan\\n" + ad + " raporu (sahte)\\n",
  }));
  process.exit(0);
}, gecikme);
`;

function sahteYaz(klasor) {
  const p = path.join(klasor, "sahte-claude.js");
  fs.writeFileSync(p, SAHTE, "utf8");
  return p;
}

function kos(args, env) {
  return spawnSync(process.execPath, [KOSUCU, ...args], {
    cwd: KOK,
    encoding: "utf8",
    env: Object.assign({}, process.env, env || {}),
  });
}

// --------------------------------------------------------------- senaryolar

console.log("ekip-kos-test\n");

// 1. Kuru kosu: hicbir surec baslatmaz, komutu dogru kurar.
{
  console.log("[1] kuru kosu komutu dogru kuruyor");
  const t = gecici();
  const kayit = path.join(t, "cagrilar.txt");
  const r = kos(
    ["--proje", KOK, "--dalga", "repo-denetci", "--kuru", "--komut", process.execPath],
    { SAHTE_KAYIT: kayit }
  );
  bekle("cikis kodu 0", r.status === 0, "status=" + r.status + " " + r.stderr);
  bekle("--append-system-prompt gecti", /--append-system-prompt/.test(r.stdout));
  bekle("--allowedTools gecti", /--allowedTools/.test(r.stdout));
  bekle(
    "salt okur ajanda --disallowedTools var",
    /--disallowedTools/.test(r.stdout),
    r.stdout.slice(0, 300)
  );
  bekle("hicbir surec baslamadi", !fs.existsSync(kayit));
  fs.rmSync(t, { recursive: true, force: true });
}

// 2. Asil iddia: alt surec bitmeden donmuyor.
{
  console.log("[2] alt surecin bitmesini bekliyor");
  const t = gecici();
  const sahte = sahteYaz(t);
  const cikti = path.join(t, "rapor");
  const basla = Date.now();
  const r = kos(
    [
      "--proje", KOK,
      "--dalga", "repo-denetci,kod-haritacisi",
      "--cikti", cikti,
      "--es-zaman", "2",
      "--komut", process.execPath, "--komut-arg", sahte,
    ],
    { SAHTE_GECIKME_MS: "1200" }
  );
  const sure = Date.now() - basla;
  bekle("gecikme gozlendi (>=1.2 s)", sure >= 1200, "olculen: " + sure + " ms");
  bekle("cikis kodu 0", r.status === 0, r.stdout + r.stderr);
  bekle(
    "iki rapor da diske yazildi",
    fs.existsSync(path.join(cikti, "repo-denetci.md")) &&
      fs.existsSync(path.join(cikti, "kod-haritacisi.md")),
    fs.existsSync(cikti) ? fs.readdirSync(cikti).join(",") : "klasor yok"
  );
  bekle("OZET.md maliyet tablosu iceriyor", /USD/.test(fs.readFileSync(path.join(cikti, "OZET.md"), "utf8")));
  fs.rmSync(t, { recursive: true, force: true });
}

// 3. Dusen uzman gizlenmiyor.
{
  console.log("[3] dusen uzman cikis kodunu 1 yapiyor");
  const t = gecici();
  const sahte = sahteYaz(t);
  const r = kos(
    [
      "--proje", KOK,
      "--dalga", "repo-denetci",
      "--cikti", path.join(t, "rapor"),
      "--komut", process.execPath, "--komut-arg", sahte,
    ],
    { SAHTE_KOD: "3" }
  );
  bekle("cikis kodu 1", r.status === 1, "status=" + r.status);
  bekle("ciktida DUS satiri var", /DUS /.test(r.stdout), r.stdout.slice(0, 300));
  fs.rmSync(t, { recursive: true, force: true });
}

// 4. Butce asilinca kalan uzmanlar hic baslatilmiyor.
{
  console.log("[4] butce asilinca kalanlar baslatilmiyor");
  const t = gecici();
  const sahte = sahteYaz(t);
  const kayit = path.join(t, "cagrilar.txt");
  const r = kos(
    [
      "--proje", KOK,
      "--dalga", "repo-denetci",
      "--dalga", "kod-haritacisi",
      "--dalga", "test-doktoru",
      "--cikti", path.join(t, "rapor"),
      "--butce", "0.30",
      "--es-zaman", "1",
      "--komut", process.execPath, "--komut-arg", sahte,
    ],
    { SAHTE_USD: "0.50", SAHTE_KAYIT: kayit }
  );
  const cagri = fs.existsSync(kayit)
    ? fs.readFileSync(kayit, "utf8").trim().split("\n").filter(Boolean).length
    : 0;
  bekle("yalnizca bir surec baslatildi", cagri === 1, "baslatilan: " + cagri);
  bekle("ozet 'butce' diye isaretliyor", /butce/.test(fs.readFileSync(path.join(t, "rapor", "OZET.md"), "utf8")));
  bekle("cikis kodu 1", r.status === 1, "status=" + r.status);
  fs.rmSync(t, { recursive: true, force: true });
}

// 5. Olmayan ajan sessizce atlanmiyor.
{
  console.log("[5] olmayan ajan hata veriyor");
  const r = kos(["--proje", KOK, "--dalga", "boyle-bir-ajan-yok", "--kuru"]);
  bekle("cikis kodu 2", r.status === 2, "status=" + r.status);
  bekle("adi soyleniyor", /boyle-bir-ajan-yok/.test(r.stderr + r.stdout));
}

// 6. Dalgalar arasi sira korunuyor (dalga 2, dalga 1 bitmeden baslamaz).
{
  console.log("[6] dalgalar sirayla kosuyor");
  const t = gecici();
  const sahte = sahteYaz(t);
  const kayit = path.join(t, "cagrilar.txt");
  const basla = Date.now();
  kos(
    [
      "--proje", KOK,
      "--dalga", "repo-denetci",
      "--dalga", "kod-haritacisi",
      "--cikti", path.join(t, "rapor"),
      "--komut", process.execPath, "--komut-arg", sahte,
    ],
    { SAHTE_GECIKME_MS: "700", SAHTE_KAYIT: kayit }
  );
  const sure = Date.now() - basla;
  bekle("iki dalga ard arda (>=1.4 s)", sure >= 1400, "olculen: " + sure + " ms");
  fs.rmSync(t, { recursive: true, force: true });
}

/*
 * 7. Regresyon: --komut BOSLUKLA PARCALANMAZ.
 *
 * Ilk yazimda --komut boslukten bolunuyordu. Linux'ta fark edilmedi,
 * Windows'ta dustu: orada `process.execPath` "C:\\Program Files\\nodejs\\
 * node.exe" oluyor ve bolununce ikili "C:\\Program" sanildi
 * ("spawn C:\\Program ENOENT"). Bu senaryo olmayan ama BOSLUKLU bir yol
 * verir ve hata mesajinin yolun TAMAMINI andigini olcer; parcalama geri
 * gelirse mesaj yalnizca ilk parcayi yazar ve test duser.
 */
{
  console.log("[7] --komut boslukla parcalanmiyor");
  const t = gecici();
  const bosluklu = path.join(t, "olmayan klasor", "claude-taklidi");
  const r = kos([
    "--proje", KOK,
    "--dalga", "repo-denetci",
    "--cikti", path.join(t, "rapor"),
    "--komut", bosluklu,
  ]);
  const ilkParca = bosluklu.split(/\s+/)[0];
  bekle(
    "hata mesaji yolun tamamini aniyor",
    r.stdout.includes(bosluklu),
    "beklenen: " + bosluklu + "\nciktida: " + r.stdout.trim().slice(0, 300)
  );
  // Parcalama geri gelseydi mesaj "spawn <ilk parca> ENOENT" olurdu.
  bekle(
    "ilk parcayla spawn denenmemis",
    !r.stdout.includes("spawn " + ilkParca + " ENOENT"),
    r.stdout.slice(0, 300)
  );
  bekle("cikis kodu 1", r.status === 1, "status=" + r.status);
  fs.rmSync(t, { recursive: true, force: true });
}

console.log("\nSonuc: " + gecen + " gecti, " + dusen + " dustu.");
process.exit(dusen ? 1 : 0);
