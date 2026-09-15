#!/usr/bin/env node
/*
 * ekip-kos.js — ekibi bassiz (headless) kipte, bekleyerek kosturur.
 *
 *   node arac/ekip-kos.js --proje ../ajans-os --dalga kod-haritacisi,test-doktoru
 *   node arac/ekip-kos.js --proje . --dalga-dosya dalga1.txt --cikti rapor/ --butce 5
 *   node arac/ekip-kos.js --proje . --dalga repo-denetci --kuru   # para harcamaz
 *
 * NEDEN VAR
 * ---------
 * `claude -p` icinde `Agent` araci bazi surumlerde alt-ajani ASENKRON
 * baslatir: arac "Async agent launched successfully" doner, ana oturum
 * beklemeden kapanir ve raporlar kaybolur. Olculmus ornek: `ajans-os`
 * uzerinde koordinator alti uzman dagitti, oturum 60,6 saniyede kapandi,
 * alti gorevden besinin cikti dosyasi 0 bayt kaldi.
 *
 * Ayni ikili, bu deponun bulut kabinde (2.1.272) Agent'i SENKRON calistirdi
 * ve raporu dondurdu. Yani davranis surume ve ortama gore degisiyor. Bu
 * betik o belirsizligi tamamen atlar: `Agent` kullanmaz. Her uzmani kendi
 * `claude -p` surecinde baslatir ve **surecin bitmesini bekler**. Isletim
 * sisteminin surec bekleyisi, bir dil modelinin "bekle" talimatindan daha
 * guvenilirdir.
 *
 * NASIL CALISIR
 * -------------
 * Her uzman icin agents/<ad>.md okunur; govde --append-system-prompt ile
 * verilir, frontmatter'daki tools/disallowedTools bayraklara cevrilir.
 * Bir dalga icindeki uzmanlar es zamanli kosar (varsayilan 4), dalga
 * bitmeden sonrakine gecilmez. Her rapor <cikti>/<ad>.md olarak yazilir,
 * maliyet ve sure <cikti>/OZET.md icinde toplanir.
 *
 * Butce: --butce ile toplam ust sinir konur. Her surece --max-budget-usd
 * olarak kalan butcenin uzman basina payi gecilir; sinir asilirsa kalan
 * uzmanlar hic baslatilmaz ve OZET.md'de "butce" diye isaretlenir.
 *
 * Cikis kodu: bir uzman bile dustuyse ya da butce yuzunden atlandiysa 1.
 *
 * Not: konsol ciktisi ASCII'dir — Windows'ta cp1254 konsolunda Turkce
 * harfler bozulmasin diye. Depodaki diger arac script'leri de boyle.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const KOK = path.resolve(__dirname, "..");
const AJANLAR = path.join(KOK, "agents");

// ---------------------------------------------------------------- yardimcilar

function ayristir(dosya) {
  const ham = fs.readFileSync(dosya, "utf8");
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(path.basename(dosya) + ": frontmatter yok");
  const fm = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const k = satir.match(/^([A-Za-z]+):\s*(.*)$/);
    if (k) fm[k[1]] = k[2].trim();
  }
  return { fm, govde: m[2].trim() };
}

// tools: ["Read", "Grep"] -> ["Read","Grep"].  Tirnaksiz liste de kabul edilir.
function listeAyristir(deger) {
  if (!deger) return [];
  const ic = deger.replace(/^\[/, "").replace(/\]$/, "");
  return ic
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function ajanYukle(ad) {
  const dosya = path.join(AJANLAR, ad + ".md");
  if (!fs.existsSync(dosya)) throw new Error("ajan bulunamadi: " + ad);
  const { fm, govde } = ayristir(dosya);
  return {
    ad,
    govde,
    araclar: listeAyristir(fm.tools),
    yasak: listeAyristir(fm.disallowedTools),
  };
}

/*
 * Gorev fisi — koordinatorun uzmana verdigi baglamin betik karsiligi.
 * proje-koordinatoru.md icindeki alanlarla ayni; boylece iki yol da
 * uzmana ayni sekli veriyor.
 */
function gorevFisi(ajan, se) {
  return [
    "Proje    : " + se.proje + (se.ozet ? " - " + se.ozet : ""),
    "Kapsam   : " + (se.kapsam || "depo koku; .git ve bagimlilik klasorleri disinda"),
    "Baglam   : " + (se.baglam || "onceki dalga yok"),
    "Istenen  : " + ajan.ad + " icin tanimli raporu yaz.",
    "Sinir    : " + (ajan.yasak.length ? "yazma yok (" + ajan.yasak.join(", ") + ")" : "yazma yetkin var, dikkatli kullan"),
    "",
    "Raporu dogrudan yaz; dosyaya kaydetme, ozet gecme.",
  ].join("\n");
}

function argumanlar(ajan, se, butceUsd) {
  const a = [
    "-p",
    gorevFisi(ajan, se),
    "--append-system-prompt",
    ajan.govde,
    "--output-format",
    "json",
    "--no-session-persistence",
  ];
  if (ajan.araclar.length) a.push("--allowedTools", ajan.araclar.join(","));
  if (ajan.yasak.length) a.push("--disallowedTools", ajan.yasak.join(","));
  if (butceUsd > 0) a.push("--max-budget-usd", String(butceUsd));
  if (se.model) a.push("--model", se.model);
  return a;
}

/*
 * --komut TEK bir ikili yolu; boslukla parcalanmaz. Onek argumani
 * gerekiyorsa (`node sarmalayici.js`, `npx claude`) --komut-arg ile
 * ayri ayri verilir.
 *
 * Ilk yazimda --komut boslukten bolunuyordu ve Windows'ta dustu:
 * `process.execPath` orada `C:\Program Files\nodejs\node.exe` oluyor,
 * bolunce ikili `C:\Program` sanildi ve spawn ENOENT verdi. Yol
 * icinde bosluk Windows'ta kural disi degil, kuraldir.
 */

// Tek uzman: sureci baslat ve BITMESINI BEKLE. Betigin butun mesele bu satirda.
function uzmanKos(ajan, se, butceUsd) {
  return new Promise((coz) => {
    const basla = Date.now();
    const args = se.komutArg.concat(argumanlar(ajan, se, butceUsd));
    const cocuk = spawn(se.komut, args, {
      cwd: se.proje,
      env: Object.assign({}, process.env, {
        // Asenkron ajan baslatma bir arka plan gorevidir; bu betik zaten
        // Agent kullanmiyor ama alt oturum kendi basina denemesin.
        CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1",
      }),
      shell: false,
    });
    let cikti = "";
    let hata = "";
    cocuk.stdout.on("data", (d) => (cikti += d));
    cocuk.stderr.on("data", (d) => (hata += d));
    cocuk.on("error", (e) =>
      coz({ ad: ajan.ad, durum: "hata", mesaj: e.message, sure: Date.now() - basla, usd: 0 })
    );
    cocuk.on("close", (kod) => {
      const sure = Date.now() - basla;
      let j = null;
      try {
        j = JSON.parse(cikti);
      } catch (_) {
        /* asagida ele aliniyor */
      }
      if (kod !== 0 || !j) {
        return coz({
          ad: ajan.ad,
          durum: "hata",
          mesaj: (hata || cikti || "cikti yok").slice(0, 400),
          sure,
          usd: j && j.total_cost_usd ? j.total_cost_usd : 0,
        });
      }
      coz({
        ad: ajan.ad,
        durum: j.subtype === "success" ? "tamam" : "yarim:" + j.subtype,
        rapor: typeof j.result === "string" ? j.result : "",
        sure,
        usd: j.total_cost_usd || 0,
      });
    });
  });
}

// Es zamanlilik sinirli havuz. Dalga icinde paralel, dalgalar arasi degil.
async function havuz(isler, sinir) {
  const sonuc = [];
  let i = 0;
  const isci = async () => {
    while (i < isler.length) {
      const k = i++;
      sonuc[k] = await isler[k]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(sinir, isler.length) }, isci));
  return sonuc;
}

// ---------------------------------------------------------------- arayuz

function secenekler(argv) {
  const se = {
    proje: process.cwd(),
    dalgalar: [],
    cikti: "rapor",
    esZaman: 4,
    butce: 0,
    komut: process.env.CLAUDE_IKILI || "claude",
    komutArg: [],
    kuru: false,
    model: "",
    ozet: "",
    kapsam: "",
    baglam: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const d = () => argv[++i];
    if (a === "--proje") se.proje = path.resolve(d());
    else if (a === "--dalga") se.dalgalar.push(d().split(",").map((s) => s.trim()).filter(Boolean));
    else if (a === "--dalga-dosya") {
      const satirlar = fs.readFileSync(d(), "utf8").split(/\r?\n/);
      for (const s of satirlar) {
        const t = s.replace(/#.*$/, "").trim();
        if (t) se.dalgalar.push(t.split(",").map((x) => x.trim()).filter(Boolean));
      }
    } else if (a === "--cikti") se.cikti = d();
    else if (a === "--es-zaman") se.esZaman = Math.max(1, parseInt(d(), 10) || 1);
    else if (a === "--butce") se.butce = parseFloat(d()) || 0;
    else if (a === "--komut") se.komut = d();
    else if (a === "--komut-arg") se.komutArg.push(d());
    else if (a === "--model") se.model = d();
    else if (a === "--ozet") se.ozet = d();
    else if (a === "--kapsam") se.kapsam = d();
    else if (a === "--baglam") se.baglam = d();
    else if (a === "--kuru") se.kuru = true;
    else if (a === "--yardim" || a === "-h") se.yardim = true;
    else throw new Error("bilinmeyen secenek: " + a);
  }
  return se;
}

const YARDIM = `
ekip-kos.js — ekibi bassiz kipte, bekleyerek kosturur

  --proje <yol>          incelenecek depo (varsayilan: bulundugun klasor)
  --dalga a,b,c          bir dalga; birden cok kez verilebilir, sirayla kosar
  --dalga-dosya <yol>    her satiri bir dalga olan dosya (# yorum)
  --cikti <klasor>       raporlarin yazilacagi klasor (varsayilan: rapor)
  --es-zaman <n>         dalga icinde es zamanli uzman (varsayilan: 4)
  --butce <usd>          toplam ust sinir; asilirsa kalanlar baslatilmaz
  --model <ad>           alt oturumlarin modeli (orn. sonnet)
  --ozet/--kapsam/--baglam   gorev fisine gecen metinler
  --komut <yol>          claude ikilisi (varsayilan: claude, CLAUDE_IKILI)
                         Tek yol; boslukla parcalanmaz.
  --komut-arg <deger>    ikiliden once eklenecek arguman; tekrarlanabilir
  --kuru                 hicbir sey calistirma, ne kosacagini yaz
`.trim();

async function ana() {
  let se;
  try {
    se = secenekler(process.argv);
  } catch (e) {
    console.error("HATA: " + e.message + "\n\n" + YARDIM);
    process.exit(2);
  }
  if (se.yardim || !se.dalgalar.length) {
    console.log(YARDIM);
    process.exit(se.yardim ? 0 : 2);
  }

  let ajanlar;
  try {
    ajanlar = se.dalgalar.map((d) => d.map(ajanYukle));
  } catch (e) {
    console.error("HATA: " + e.message);
    process.exit(2);
  }

  const toplam = ajanlar.reduce((n, d) => n + d.length, 0);
  console.log("ekip-kos — " + se.dalgalar.length + " dalga, " + toplam + " uzman");
  console.log("proje : " + se.proje);
  console.log("cikti : " + path.resolve(se.cikti));
  if (se.butce) console.log("butce : " + se.butce.toFixed(2) + " USD");
  console.log("");

  if (se.kuru) {
    ajanlar.forEach((dalga, di) => {
      console.log("[dalga " + (di + 1) + "]");
      for (const aj of dalga) {
        const args = se.komutArg.concat(
          argumanlar(aj, se, se.butce ? se.butce / toplam : 0)
        );
        const kisa = args.map((x) => (x.length > 60 ? x.slice(0, 57) + "..." : x));
        console.log("  " + se.komut + " " + kisa.map((x) => JSON.stringify(x)).join(" "));
      }
    });
    console.log("\n(kuru kosu - hicbir surec baslatilmadi)");
    process.exit(0);
  }

  fs.mkdirSync(se.cikti, { recursive: true });
  const hepsi = [];
  let harcanan = 0;
  let butceAsildi = false;

  for (let di = 0; di < ajanlar.length; di++) {
    const dalga = ajanlar[di];
    console.log("[dalga " + (di + 1) + "] " + dalga.map((a) => a.ad).join(", "));
    const isler = dalga.map((aj) => async () => {
      if (butceAsildi) return { ad: aj.ad, durum: "butce", sure: 0, usd: 0 };
      const kalan = se.butce ? Math.max(0, se.butce - harcanan) : 0;
      if (se.butce && kalan <= 0.01) {
        butceAsildi = true;
        return { ad: aj.ad, durum: "butce", sure: 0, usd: 0 };
      }
      const pay = se.butce ? Math.max(0.05, kalan / dalga.length) : 0;
      const s = await uzmanKos(aj, se, pay);
      harcanan += s.usd;
      if (se.butce && harcanan >= se.butce) butceAsildi = true;
      const sn = (s.sure / 1000).toFixed(1);
      console.log(
        "  " + (s.durum === "tamam" ? "OK  " : "DUS ") + aj.ad +
        "  " + sn + "s  " + s.usd.toFixed(4) + " USD" +
        (s.mesaj ? "  <- " + s.mesaj.split("\n")[0].slice(0, 120) : "")
      );
      if (s.rapor) {
        fs.writeFileSync(path.join(se.cikti, aj.ad + ".md"), s.rapor, "utf8");
      }
      return s;
    });
    const sonuc = await havuz(isler, se.esZaman);
    hepsi.push(...sonuc);
    console.log("");
  }

  const dusen = hepsi.filter((s) => s.durum !== "tamam");
  const toplamUsd = hepsi.reduce((n, s) => n + s.usd, 0);
  const toplamSn = hepsi.reduce((n, s) => n + s.sure, 0) / 1000;

  const ozet = [
    "# Ekip kosusu",
    "",
    "Proje: `" + se.proje + "`",
    "",
    "| Uzman | Durum | Sure | Maliyet |",
    "| --- | --- | ---: | ---: |",
    ...hepsi.map(
      (s) =>
        "| `" + s.ad + "` | " + s.durum + " | " + (s.sure / 1000).toFixed(1) + " s | " +
        s.usd.toFixed(4) + " USD |"
    ),
    "",
    "Toplam: " + hepsi.length + " uzman, " + toplamSn.toFixed(1) + " s, " +
      toplamUsd.toFixed(4) + " USD.",
    dusen.length ? "Dusen ya da atlanan: " + dusen.map((s) => s.ad).join(", ") + "." : "Hepsi tamamlandi.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(se.cikti, "OZET.md"), ozet, "utf8");

  console.log("toplam: " + toplamSn.toFixed(1) + " s, " + toplamUsd.toFixed(4) + " USD");
  console.log("ozet  : " + path.join(se.cikti, "OZET.md"));
  process.exit(dusen.length ? 1 : 0);
}

ana();
