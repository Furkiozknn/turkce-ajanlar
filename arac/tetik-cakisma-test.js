#!/usr/bin/env node
/*
 * tetik-cakisma-test.js — cakisma denetcisinin kendi testi.
 *
 *   node arac/tetik-cakisma-test.js
 *
 * Bir kapi, kendisini sinayan test kosmadan kapi sayilmaz. Bu arac bozulursa
 * tum ajanlar sessizce gecer ve yonlendirme belirsizligi geri gelir; ustelik
 * kimse fark etmez, cunku "0 cakisma" ciktisi bozuk bir araciyla da ayni
 * gorunur.
 *
 * Testler uydurma ajan dosyasi bile kurmuyor: cakisma hesabi saf bir
 * fonksiyon, dogrudan cagriliyor. Yalnizca son iki vaka gercek kadroyu
 * okuyor, cunku asil is orada.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const { cakismalar, sadelestir, tetikleyiciler, turkceKucult } = require("./tetik-cakisma.js");

const KOK = path.resolve(__dirname, "..");
let gecen = 0;
let kalan = 0;

function ol(ad, kosul, ek) {
  if (kosul) {
    gecen++;
    console.log("  ok   " + ad);
  } else {
    kalan++;
    console.log("  HATA " + ad + (ek ? "  -> " + ek : ""));
  }
}

function k(ad, ...ifadeler) {
  return { ad, ifadeler };
}

// --- sadelestirme ----------------------------------------------------------

console.log("sadelestirme");
ol("noktalama atiliyor", sadelestir('su kodu incele!') === "su kodu incele");
ol("fazla bosluk tekile iniyor", sadelestir("su   kodu  incele") === "su kodu incele");
ol(
  "Turkce buyuk I kucuk i oluyor, Ingilizce kurali degil",
  turkceKucult("Incele") === "ıncele" && turkceKucult("İncele") === "incele",
  turkceKucult("Incele") + " / " + turkceKucult("İncele")
);
ol(
  "ayni cumlenin iki yazimi ayni sadelesmeye iniyor",
  sadelestir('Şu kodu incele.') === sadelestir('şu kodu incele'),
);

// --- cikarim ---------------------------------------------------------------

console.log("tetikleyici cikarimi");
ol(
  "tirnak icindekiler cikiyor",
  JSON.stringify(tetikleyiciler('Kullanici "bir" , "iki" dediginde kullan.')) ===
    JSON.stringify(["bir", "iki"])
);
ol("cok kisa parca alinmiyor", tetikleyiciler('boyle "ab" bir sey').length === 0);
ol("tirnaksiz aciklamadan hicbir sey cikmiyor", tetikleyiciler("hic tirnak yok").length === 0);

// --- tam cakisma -----------------------------------------------------------

console.log("tam cakisma");
{
  const r = cakismalar([k("a", "su kodu incele"), k("b", "su kodu incele")]);
  ol("ayni ifade iki ajanda hata veriyor", r.tam.length === 1);
  ol(
    "hata iki ajani da adiyla sayiyor",
    r.tam[0] && r.tam[0].ajanlar.join(",") === "a,b",
    r.tam[0] && r.tam[0].ajanlar.join(",")
  );
}
{
  const r = cakismalar([k("a", "Şu kodu incele."), k("b", "şu kodu incele")]);
  ol("yazim farki cakismayi gizlemiyor", r.tam.length === 1);
}
{
  const r = cakismalar([k("a", "su kodu incele", "su kodu incele")]);
  ol("ayni ajanin kendini tekrar etmesi cakisma degil", r.tam.length === 0);
}
{
  const r = cakismalar([k("a", "su kodu incele"), k("b", "su testi yaz")]);
  ol("ayri ifadeler temiz geciyor", r.tam.length === 0);
}

// --- icerme ----------------------------------------------------------------

console.log("icerme");
{
  const r = cakismalar([k("a", "kodu incele"), k("b", "su kodu incele")]);
  ol("dar ifade genis ifadenin icinde bulunuyor", r.icerme.length === 1);
  ol("icerme hata degil uyari", r.tam.length === 0);
}
{
  const r = cakismalar([k("a", "test"), k("b", "testleri guncelle")]);
  ol(
    "kelime sinirina saygi: 'test' ile 'testleri' icerme sayilmiyor",
    r.icerme.length === 0
  );
}
{
  const r = cakismalar([k("a", "kodu incele", "su kodu incele")]);
  ol("ayni ajanin genis ve dar bicimi icerme sayilmiyor", r.icerme.length === 0);
}

// --- ifadesiz --------------------------------------------------------------

console.log("ifadesiz ajan");
{
  const r = cakismalar([k("a"), k("b", "bir sey yap")]);
  ol("tirnakli ornegi olmayan ajan bildiriliyor", r.ifadesiz.join(",") === "a");
}

// --- gercek kadro ----------------------------------------------------------

console.log("gercek kadro");
{
  const agents = path.join(KOK, "agents");
  const sayi = fs.readdirSync(agents).filter((f) => f.endsWith(".md")).length;
  ol("kadro okunabiliyor", sayi > 0, String(sayi));

  let kod = 0;
  try {
    execFileSync(process.execPath, [path.join(KOK, "arac", "tetik-cakisma.js")], {
      stdio: "pipe",
    });
  } catch (e) {
    kod = e.status === undefined ? 2 : e.status;
  }
  ol("kadroda tam cakisma yok (cikis kodu 0)", kod === 0, "cikis " + kod);
}

console.log("");
console.log(gecen + " gecti, " + kalan + " kaldi");
process.exit(kalan ? 1 : 0);
