#!/usr/bin/env node
/*
 * sinir-denetle.js — her ajanin SINIR SOZLESMESINI denetler.
 *
 *   node arac/sinir-denetle.js            # hepsi
 *   node arac/sinir-denetle.js --kati     # uyarilar da hata sayilir
 *   node arac/sinir-denetle.js agents/git-ustasi.md
 *
 * NEDEN AYRI BIR ARAC
 * -------------------
 * `dogrula.js` frontmatter mekanigine ve dile bakar: ad kebab-case mi,
 * arac adlari gecerli mi, metin Turkce mi. Bir ajanin en kolay bozulan
 * yani ise bunlarin hicbiri degil: **verdigi sozun yetkisiyle uyusmasi.**
 * Salt okur olarak tanimlanmis bir ajanin govdesinde "duzeltmeyi ben
 * yaparim" yazmasi dogrulayicidan sorunsuz gecer.
 *
 * Eval vakalari bu sozu kilitler ama pahalidir ve 70 ajanin yalnizca
 * 12'sinde var. Bu arac ucuz, deterministik ve 70/70 kapsar: her push'ta
 * kosar, API'ye cikmaz, para harcamaz. Ikisi birbirinin yerine gecmez —
 * eval davranisi olcer, bu arac sozlesmeyi olcer.
 *
 * BAKTIKLARI
 * ----------
 *   1. description'in son cumlesi bir sinir cumlesi mi
 *   2. govde kapanis cumlesiyle bitiyor mu (kod blogu ile bitmemeli)
 *   3. ## Mutlak kurallar var mi
 *   4. ## Çıktı var mi
 *   5. ## Dürüstlük disiplini var mi
 *   6. YETKI-SOZ UYUMU: disallowedTools ile Write/Edit dusulmusse
 *      '## Mutlak kurallar' acikca yazma/degistirme reddi icermeli
 *
 * Cikis kodu: hata varsa 1, yoksa 0. (--kati ile uyari da 1 yapar.)
 *
 * Not: konsol ciktisi ASCII'dir — Windows'ta cp1254 konsolunda Turkce
 * harfler bozulmasin diye. Depodaki diger arac script'leri de boyle.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const VARSAYILAN_KLASOR = path.join(KOK, "agents");

/*
 * Sinir kalibi. Turkce'de "yapmam" sozu bes ayri bicimde kuruluyor ve
 * hepsi kadroda gecti; kalip bu bicimlerden cikarildi, uydurulmadi:
 *   olumsuz genis zaman  : degistirmez, yazmaz, kendisi duzeltmez
 *   olumsuz emir         : duzeltme, yapma, cevirme, silme
 *   olumsuz sifat        : bu ajanin isi degil
 *   daraltma             : sadece rapor yazar, yalnizca tarif eder
 *   devretme             : ... ajanina birak, kullanicinin ustlenmesi
 */
const SINIR = new RegExp(
  [
    "m[ae]z\\b", // degistirmez, yazmaz
    "m[ae]zsin\\b",
    /*
     * Olumsuz emir: "duzeltme;" "yapma:" "yazma -" "cizme." — noktalama
     * ya da bir baglacla devam eder. Tek basina "yazma" ismi de
     * olabildigi icin devami sartli arandi.
     *
     * DIKKAT: burada \\w KULLANILMAZ. JavaScript'te \\w yalnizca
     * [A-Za-z0-9_] demektir; Turkce harfler disinda kalir. Ilk yazimda
     * kalip \\b\\w{3,}m[ae] idi ve "cizme" hic eslesmedi, cunku "ciz"
     * icindeki "c" \\w degil. Harf sinifi bu yuzden acik yaziliyor.
     */
    "(?:^|[\\s(\"'])[A-Za-zçğıöşüÇĞİÖŞÜ]{2,}m[ae](?=\\s*[;,.:\\u2014-]|\\s+(?:ama|ancak|yerine|hangi|ne|kullan|onun|önce|komutu|işini|sen|bunu|bırak))",
    "\\bdeğil(?:sin|dir|ler|se)?\\b",
    "\\basla\\b",
    "\\bsadece\\b",
    "\\byalnızca\\b",
    "\\bbırak(?:ır|arak|)\\b",
    "\\büstlen",
    "\\bonay\\s+iste",
  ].join("|"),
  "i"
);

// Yazma reddi — salt okur ajanlarin description'inda aranan soz.
const YAZMA_REDDI = new RegExp(
  [
    "değiştirmez",
    "düzeltmez",
    "yazmaz",
    "silmez",
    "taşımaz",
    "dokunmaz",
    "uygulamaz",
    "kendisi\\s+\\w+m[ae]z",
    "sadece\\s+(rapor|bulgu|liste|tarif|öner)",
    "yalnızca\\s+(rapor|bulgu|liste|tarif|öner)",
    "rapor\\s+yazar",
    "işi\\s+değil",
    /*
     * Mutlak kurallar bolumu EMIR KIPIYLE yazilir — kadrodaki yerlesik
     * bicim bu: "Dosya degistirme.", "Kodu degistirme, birlestirme yapma."
     * Genis zaman ("degistirmez") daha cok description'da geciyor.
     * Ikisi de kabul ediliyor.
     */
    "değiştirme\\b",
    "düzeltme\\b",
    "yazma\\b",
    "silme\\b",
    "dokunma\\b",
    "uygulama\\b",
    "değiştirmezsin",
    "yazmazsın",
    "düzeltmezsin",
    "salt\\s+okur",
    "sadece\\s+okur",
  ].join("|"),
  "i"
);

const YAZAN_ARAC = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

function frontmatterAyir(ham) {
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const k = satir.match(/^([A-Za-z]+):\s*(.*)$/);
    if (k) fm[k[1]] = k[2].trim();
  }
  return { fm, govde: m[2].trim() };
}

function listeAyristir(deger) {
  if (!deger) return [];
  return deger
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

// Son cumle: kod parcalarindaki noktalar cumle sonu sanilmasin diye
// once `...` icindekiler temizlenir.
function sonCumle(metin) {
  const temiz = metin.replace(/`[^`]*`/g, "KOD");
  const cumleler = temiz.split(/(?<=[.!?])\s+/).map((c) => c.trim()).filter(Boolean);
  return cumleler.length ? cumleler[cumleler.length - 1] : "";
}

/*
 * Govdenin kapanis paragrafi. Kod bloklari (``` ... ```) atlanir; amac
 * ajanin son SOZUNU bulmak, son ornegini degil. Kapanis bir kod blogunun
 * icindeyse ya da govde kod blogu ile bitiyorsa kapanis yok demektir.
 */
function kapanisParagrafi(govde) {
  const satirlar = govde.split(/\r?\n/);
  let blokta = false;
  const disarda = [];
  for (const s of satirlar) {
    if (/^\s*```/.test(s)) {
      blokta = !blokta;
      disarda.push(""); // blok bir paragraf siniri sayilir
      continue;
    }
    disarda.push(blokta ? "" : s);
  }
  const paragraflar = disarda
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^#{1,6}\s/.test(p)); // baslik kapanis sayilmaz
  return paragraflar.length ? paragraflar[paragraflar.length - 1] : "";
}

function govdeKodlaBitiyor(govde) {
  const satirlar = govde.split(/\r?\n/).map((s) => s.trimEnd()).filter(Boolean);
  const son = satirlar[satirlar.length - 1] || "";
  return /^\s*```\s*$/.test(son) || /^\s{4,}\S/.test(son);
}

function dosyaDenetle(tamYol) {
  const ad = path.basename(tamYol);
  const hatalar = [];
  const uyarilar = [];
  const hata = (m) => hatalar.push(m);
  const uyar = (m) => uyarilar.push(m);

  const ham = fs.readFileSync(tamYol, "utf8");
  const ayrik = frontmatterAyir(ham);
  if (!ayrik) {
    hata("frontmatter ayristirilamadi (dogrula.js da bunu yakalar)");
    return { ad, hatalar, uyarilar };
  }
  const { fm, govde } = ayrik;
  const aciklama = fm.description || "";
  const araclar = listeAyristir(fm.tools);
  const yasak = listeAyristir(fm.disallowedTools);

  // 1. description sinir cumlesiyle bitiyor mu
  const dSon = sonCumle(aciklama);
  if (!aciklama) {
    hata("description yok");
  } else if (!SINIR.test(dSon)) {
    hata(
      "description sinir cumlesiyle bitmiyor; son cumle: \"" +
        dSon.slice(0, 90) +
        '"'
    );
  }

  // 2. govde kapanis cumlesi
  if (govdeKodlaBitiyor(govde)) {
    hata("govde kod blogu ile bitiyor; ajanin son sozu kapanis cumlesi olmali");
  } else {
    const kap = kapanisParagrafi(govde);
    if (!kap) hata("govdede kapanis paragrafi bulunamadi");
    else if (!SINIR.test(kap))
      hata('govde kapanisi sinir tekrarlamiyor: "' + kap.replace(/\s+/g, " ").slice(0, 90) + '"');
  }

  // 3-5. ev uslubu bolumleri
  /*
   * Baslik "## Mutlak kurallar" ya da tek bir kurali adiyla anan
   * "## Mutlak kural: deger yazdirilmaz" bicimindedir. Ikincisi daha iyi
   * bir yazim ve kadroda uc ornegi var; kural bolumun VARLIGINI arar,
   * basligin bayt bayt aynisini degil.
   */
  if (!/^## Mutlak kural(lar)?\b/m.test(govde))
    hata("## Mutlak kural(lar) bolumu yok");
  if (!/^## Çıktı\s*$/m.test(govde)) hata("## Çıktı bolumu yok");
  if (!/^## Dürüstlük disiplini\s*$/m.test(govde))
    hata("## Dürüstlük disiplini bolumu yok");

  // 6. yetki-soz uyumu
  const yazabilir = araclar.some((t) => YAZAN_ARAC.has(t));
  const yazmasiDusuldu = yasak.some((t) => YAZAN_ARAC.has(t));
  if (yazmasiDusuldu && yazabilir)
    hata("hem tools'da yazma araci var hem disallowedTools'ta dusulmus");
  /*
   * Salt okur ajanin yazma reddi `## Mutlak kurallar` icinde olmali,
   * description'da degil. Sebep: description'daki red bir tanitim
   * cumlesidir, Mutlak kurallar ise ajanin kendi baglayici listesi —
   * modelin calisma aninda okudugu yer orasi. Kadronun 55 salt okur
   * ajanindan 50'si bunu zaten boyle yapiyordu; kural o olculmus
   * uygulamadan cikarildi.
   */
  if (yazmasiDusuldu) {
    const bolum = govde.match(/^## Mutlak kurallar\s*$([\s\S]*?)(?=^## |$(?![\s\S]))/m);
    if (bolum && !YAZMA_REDDI.test(bolum[1]))
      hata(
        "salt okur (disallowedTools: " +
          yasak.join(", ") +
          ") ama '## Mutlak kurallar' yazma reddini soylemiyor"
      );
  }
  /*
   * Ters yon: yazma yetkisi olan ajan "hicbir sey yazmam" diyorsa biri
   * yanlis. Ama "kodu degistirmez" (belge yazar), "uretime dagitmaz"
   * (plan yazar), "goc dosyasi yazmaz" (sema yazar) gibi DARALTILMIS
   * redler tutarlidir — kadroda bes ornegi var. Bu yuzden burada yalnizca
   * mutlak red araniyor.
   */
  const MUTLAK_RED = /dosya\s+yazmaz|hiçbir\s+dosyayı\s+(değiştirmez|yazmaz)|sadece\s+rapor\s+yazar|yalnızca\s+rapor\s+(yazar|üretir)/i;
  if (yazabilir && MUTLAK_RED.test(aciklama))
    uyar(
      "yazma yetkisi var ama description hicbir sey yazmayacagini soyluyor — biri yanlis"
    );

  return { ad, hatalar, uyarilar };
}

function dosyalariTopla(argumanlar) {
  const yollar = argumanlar.filter((a) => !a.startsWith("--"));
  if (yollar.length) return yollar.map((y) => path.resolve(y));
  return fs
    .readdirSync(VARSAYILAN_KLASOR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => path.join(VARSAYILAN_KLASOR, f));
}

function ana() {
  const argv = process.argv.slice(2);
  const kati = argv.includes("--kati");
  const dosyalar = dosyalariTopla(argv);

  console.log("sinir denetimi — " + dosyalar.length + " dosya\n");
  let hataSay = 0;
  let uyariSay = 0;
  let temiz = 0;

  for (const d of dosyalar) {
    const s = dosyaDenetle(d);
    hataSay += s.hatalar.length;
    uyariSay += s.uyarilar.length;
    if (!s.hatalar.length && !s.uyarilar.length) {
      temiz++;
      continue;
    }
    console.log("  " + (s.hatalar.length ? "HATA" : "UYAR") + "  agents/" + s.ad);
    for (const h of s.hatalar) console.log("        - " + h);
    for (const u of s.uyarilar) console.log("        ~ " + u);
  }

  console.log(
    "\nSonuc: " +
      temiz +
      "/" +
      dosyalar.length +
      " dosya temiz, " +
      hataSay +
      " hata, " +
      uyariSay +
      " uyari"
  );
  process.exit(hataSay || (kati && uyariSay) ? 1 : 0);
}

if (require.main === module) ana();
module.exports = { dosyaDenetle, SINIR, YAZMA_REDDI, kapanisParagrafi, sonCumle };
