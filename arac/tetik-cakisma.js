#!/usr/bin/env node
/*
 * tetik-cakisma.js — iki ajan ayni cumleyi sahipleniyor mu?
 *
 *   node arac/tetik-cakisma.js            # hepsi
 *   node arac/tetik-cakisma.js --kati     # uyarilar da hata sayilir
 *   node arac/tetik-cakisma.js --liste    # her ifadeyi ve sahibini yazdirir
 *
 * NEDEN AYRI BIR ARAC
 * -------------------
 * Yonlendirme `description` uzerinden yapiliyor. Kullanici "su kodu incele"
 * dediginde hangi ajanin kosacagini o cumle belirliyor. `dogrula.js` her
 * ajanda BIR tetikleyici ifade bulunmasini sart kosuyor -- ama ayni ifadeyi
 * iki ajanin sahiplenmesini kimse engellemiyordu.
 *
 * 70 ajanda bunun sonucu somut: kullanici dogru cumleyi kuruyor, yanlis ajan
 * kosuyor, ve hicbir kapi kirmizi yanmiyor cunku iki dosya da tek basina
 * kusursuz. Kadro buyudukce olasiligi artan, buyurken fark edilmeyen bir
 * bozulma. Bu arac onu deterministik olarak yakaliyor: API'ye cikmiyor, para
 * harcamiyor, 70/70 kapsiyor.
 *
 * BAKTIKLARI
 * ----------
 *   1. TAM CAKISMA (hata)   : ayni ifade, iki ayri ajanda
 *   2. ICERME    (uyari)    : bir ifade digerini tamamen iceriyor
 *                             ("kodu incele" ile "su kodu incele" gibi)
 *   3. IFADESIZ  (uyari)    : tirnak icinde hic ornek cumle yok
 *
 * Icerme neden hata degil: bazen dogrudur. "test yaz" ile "eksik testleri
 * yaz" farkli ajanlara gidebilir ve genis olan dar olani kapsayabilir.
 * Karar insanin; arac yalnizca gormesini sagliyor.
 *
 * Not: konsol ciktisi ASCII'dir — Windows'ta cp1254 konsolunda Turkce
 * harfler bozulmasin diye. Depodaki diger arac script'leri de boyle.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const VARSAYILAN_KLASOR = path.join(KOK, "agents");

/* Turkce'de I/i ozel: "I".toLowerCase() Ingilizce'de "i" verir, oysa
 * Turkce'de "ı" olmali. Kadro Turkce yazildigi icin karsilastirma da
 * Turkce kurallariyla yapilmali; yoksa "Incele" ile "incele" ayri iki
 * ifade sayilir ve cakisma gorunmez kalir. */
function turkceKucult(s) {
  return s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/* Karsilastirma icin sadelestir: tirnak, noktalama ve fazla bosluk
 * atilir. "su kodu incele!" ile "Şu kodu incele" ayni ifadedir. */
function sadelestir(s) {
  return turkceKucult(s)
    .replace(/[.,!?;:'"`()\[\]…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* web-uret.js ile AYNI cikarim: description icindeki tirnakli parcalar.
 * Ikisi ayrismasin diye kural burada da bire bir yazili: 3-60 karakter
 * arasi, cift tirnak icinde. */
function tetikleyiciler(aciklama) {
  const bulunan = [];
  const re = /"([^"]{3,60})"/g;
  let m;
  while ((m = re.exec(aciklama)) !== null) bulunan.push(m[1]);
  return bulunan;
}

function frontmatterAciklama(ham) {
  const m = ham.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*/);
  if (!m) return null;
  const satirlar = m[1].split(/\r?\n/);
  for (const satir of satirlar) {
    const k = satir.match(/^description:\s*(.*)$/);
    if (k) return k[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function dosyalar(hedef) {
  const st = fs.statSync(hedef);
  if (st.isFile()) return [hedef];
  return fs
    .readdirSync(hedef)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => path.join(hedef, f));
}

/**
 * Cakismalari hesaplar. Saf fonksiyon: dosya okumaz, yazdirmaz -- testten
 * dogrudan cagrilabilsin diye.
 *
 * @param {{ad: string, ifadeler: string[]}[]} kayitlar
 * @returns {{tam: object[], icerme: object[], ifadesiz: string[]}}
 */
function cakismalar(kayitlar) {
  const sahip = new Map();   // sade ifade -> [ajan adlari]
  const ifadesiz = [];

  for (const k of kayitlar) {
    if (!k.ifadeler.length) {
      ifadesiz.push(k.ad);
      continue;
    }
    for (const ham of k.ifadeler) {
      const sade = sadelestir(ham);
      if (!sade) continue;
      if (!sahip.has(sade)) sahip.set(sade, []);
      const liste = sahip.get(sade);
      if (!liste.some((x) => x.ad === k.ad)) liste.push({ ad: k.ad, ham });
    }
  }

  const tam = [];
  for (const [sade, sahipler] of sahip) {
    if (sahipler.length > 1) {
      tam.push({ ifade: sade, ajanlar: sahipler.map((s) => s.ad).sort() });
    }
  }

  const icerme = [];
  const anahtarlar = [...sahip.keys()];
  for (const a of anahtarlar) {
    for (const b of anahtarlar) {
      if (a === b || a.length >= b.length) continue;
      // Kelime siniri onemli: "test" ile "testler" farkli sey, ama
      // "test yaz" ile "eksik test yaz" ayni istegin iki bicimi.
      if (!new RegExp("(^| )" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)").test(b)) continue;
      const aAjan = sahip.get(a).map((s) => s.ad);
      const bAjan = sahip.get(b).map((s) => s.ad);
      const ayri = bAjan.filter((x) => !aAjan.includes(x));
      if (ayri.length) {
        icerme.push({ dar: a, genis: b, darAjan: aAjan.sort(), genisAjan: bAjan.sort() });
      }
    }
  }

  return { tam, icerme, ifadesiz: ifadesiz.sort() };
}

function oku(hedef) {
  return dosyalar(hedef).map((yol) => {
    const ham = fs.readFileSync(yol, "utf8");
    const aciklama = frontmatterAciklama(ham) || "";
    return { ad: path.basename(yol, ".md"), ifadeler: tetikleyiciler(aciklama) };
  });
}

function main(argv) {
  const kati = argv.includes("--kati");
  const liste = argv.includes("--liste");
  const hedef = argv.find((a) => !a.startsWith("--")) || VARSAYILAN_KLASOR;

  let kayitlar;
  try {
    kayitlar = oku(hedef);
  } catch (e) {
    console.error("okunamadi: " + hedef + " (" + e.message + ")");
    return 2;
  }

  const { tam, icerme, ifadesiz } = cakismalar(kayitlar);
  const toplamIfade = kayitlar.reduce((n, k) => n + k.ifadeler.length, 0);

  if (liste) {
    for (const k of kayitlar) {
      for (const i of k.ifadeler) console.log(k.ad + "  <-  " + sadelestir(i));
    }
    console.log("");
  }

  for (const c of tam) {
    console.log('HATA  ayni tetikleyici ifade iki ajanda: "' + c.ifade + '"');
    console.log("        " + c.ajanlar.join(", "));
    console.log("        kullanici bu cumleyi kurunca hangisinin kosacagi belirsiz;");
    console.log("        birini daraltin ya da birlestirin.");
  }
  for (const c of icerme) {
    console.log('UYARI icerme: "' + c.dar + '" ifadesi "' + c.genis + '" icinde gecyor');
    console.log("        dar: " + c.darAjan.join(", ") + "  |  genis: " + c.genisAjan.join(", "));
  }
  for (const ad of ifadesiz) {
    console.log("UYARI " + ad + ": description'da tirnakli ornek cumle yok");
  }

  console.log("");
  console.log(
    kayitlar.length + " ajan, " + toplamIfade + " tetikleyici ifade, " +
    tam.length + " tam cakisma, " + icerme.length + " icerme, " +
    ifadesiz.length + " ifadesiz ajan"
  );

  if (tam.length) return 1;
  if (kati && (icerme.length || ifadesiz.length)) return 1;
  return 0;
}

module.exports = { cakismalar, sadelestir, tetikleyiciler, turkceKucult };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
