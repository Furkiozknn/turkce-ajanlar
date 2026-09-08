#!/usr/bin/env node
/**
 * eklenti-dogrula.js — commands/*.md ve skills/<ad>/SKILL.md dosyalarini dogrular.
 *   node arac/eklenti-dogrula.js
 * Kurallar: frontmatter var ve kapaniyor; description dolu (>= 40 karakter);
 * beceri adi klasor adiyla ayni ve kebab-case; govde bos degil ve Turkce.
 * Hata varsa cikis kodu 1. (Ajan dosyalari icin: arac/dogrula.js)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const hatalar = [];
let sayilan = 0;

function frontmatter(ham) {
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const alanlar = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const e = satir.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (e) alanlar[e[1]] = e[2].trim();
  }
  return { alanlar, govde: m[2] };
}

function dogrula(dosya, beklenenAd) {
  sayilan++;
  const gorece = path.relative(KOK, dosya).replace(/\\/g, "/");
  const fm = frontmatter(fs.readFileSync(dosya, "utf8"));
  if (!fm) { hatalar.push(gorece + ": frontmatter yok ya da kapanmiyor"); return; }
  const { alanlar, govde } = fm;
  if (!alanlar.description || alanlar.description.length < 40)
    hatalar.push(gorece + ": description bos ya da 40 karakterden kisa");
  if (beklenenAd !== null) {
    if (alanlar.name !== beklenenAd)
      hatalar.push(gorece + ": name '" + alanlar.name + "' klasor adiyla ('" + beklenenAd + "') ayni degil");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(alanlar.name || ""))
      hatalar.push(gorece + ": name kebab-case degil");
  }
  if (govde.trim().length < 200) hatalar.push(gorece + ": govde 200 karakterden kisa");
  if (!/[çğıöşüÇĞİÖŞÜ]/.test(govde)) hatalar.push(gorece + ": govde Turkce gorunmuyor (hic Turkce karakter yok)");
}

const komutlar = path.join(KOK, "commands");
if (fs.existsSync(komutlar))
  for (const f of fs.readdirSync(komutlar).filter((x) => x.endsWith(".md")).sort())
    dogrula(path.join(komutlar, f), null);

const beceriler = path.join(KOK, "skills");
if (fs.existsSync(beceriler))
  for (const ad of fs.readdirSync(beceriler).sort()) {
    const skill = path.join(beceriler, ad, "SKILL.md");
    if (fs.existsSync(skill)) dogrula(skill, ad);
    else hatalar.push("skills/" + ad + ": SKILL.md yok");
  }

if (sayilan === 0) { console.error("Dogrulanacak komut/beceri bulunamadi."); process.exit(1); }
for (const h of hatalar) console.error("HATA " + h);
console.log(sayilan + " dosya, " + hatalar.length + " hata.");
process.exit(hatalar.length ? 1 : 0);
