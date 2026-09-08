#!/usr/bin/env node
/**
 * bicim-kontrol.js — Türkçe markdown'da turkce-rapor biçim kurallarının mekanik denetimi.
 *
 * İki kullanım:
 *   1) Plugin kancası (hooks/hooks.json, PostToolUse Write|Edit): stdin'den kanca JSON'u okur,
 *      yazılan dosya Türkçe bir .md ise tarar, bulgu varsa additionalContext ile Claude'a
 *      UYARI verir. Hiçbir zaman engellemez, her zaman çıkış 0.
 *   2) Elle / ölçüm:  node arac/bicim-kontrol.js --dosya <yol> [<yol> ...]
 *      Bulguları satır satır basar; bulgu varsa çıkış 1 (yanlış alarm oranını ölçmek için).
 *
 * Kurallar (kod blokları, satır içi kod, URL ve bağlantı hedefleri atlanır):
 *   R1 ondalık nokta        4.5 saat · 0.57 · %96.5      → 4,5 saat · 0,57 · %96,5
 *   R2 yüzde işareti sonda  96% · % 96                   → %96
 *   R3 İngilizce tarih      Sep 8, 2026 · 8 September    → 8 Eylül 2026
 *      ISO tarih düzyazıda  2026-09-08 (saat izlemiyorsa) → 8 Eylül 2026 (ISO dosya adına)
 *   R4 binlik virgül        1,234,567                    → 1.234.567
 * Kesinlik geri çağırmadan önce gelir: emin olunmayan kalıp (sürüm no, bölüm no, saatli
 * zaman damgası, dosya adı) bilerek atlanır. Yanlış alarm ölçümü: arac/bicim-kontrol-test.js.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const BIRIM = "(?:%|USD|TL|₺|€|\\$|saat|sn|dk|dakika|saniye|gün|hafta|ay|yıl|MB|KB|GB|TB|ms|kat|bin|milyon|milyar|puan|kez|oran|x)";
const AY_EN = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const AY_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const KURALLAR = [
  {
    id: "R1", ad: "ondalık nokta",
    // sayı.sayı; ardından birim/yüzde geliyorsa ya da önünde % varsa; sürüm (x.y.z) ve "v1.2" hariç
    re: new RegExp("(?<![\\w.\\-/v])(%?)(\\d{1,3})\\.(\\d{1,2})(?![\\d.])(?=\\s?" + BIRIM + "(?![\\wğüşıöçİ]))|(?<![\\w.\\-/v])%(\\d{1,3})\\.(\\d{1,2})(?![\\d.])", "g"),
    oner: (m) => m[0].replace(".", ","),
  },
  {
    id: "R2", ad: "yüzde işareti sonda",
    re: /(?<![\w%])(\d+(?:[.,]\d+)?)\s?%(?![\w%])|(?<![\w%])%\s+(\d+(?:[.,]\d+)?)\b/g,
    oner: (m) => "%" + (m[1] || m[2]),
  },
  {
    id: "R3", ad: "İngilizce ya da ISO tarih düzyazıda",
    // ISO tarih yalnizca cumlede tarih gibi kullanilinca ("2026-09-08 tarihinde", "2026-09-08'de"):
    // "son push 2026-09-04" gibi veri alanlari ve *(2026-09-07 — not)* damgalari mesru, olcumde
    // 105 bulgunun tamami bunlardi (8 Eylul 2026). Kesinlik geri cagirmadan once gelir.
    re: new RegExp("\\b(\\d{1,2})\\s+" + AY_EN + "\\.?,?\\s+(\\d{4})\\b|\\b" + AY_EN + "\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b|(?<![\\w/\\-])(\\d{4})-(\\d{2})-(\\d{2})(?=\\s*['’](?:de|da|te|ta|den|dan|ten|tan|ye|ya|e|a)\\b|\\s+(?:tarihinde|tarihli|tarihinden|günü|gününde|itibar[ıi]yla|itibariyle)\\b)", "g"),
    oner: (m) => {
      const iso = m[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return Number(iso[3]) + " " + (AY_TR[Number(iso[2]) - 1] || "?") + " " + iso[1];
      return "gün Ay yıl (örn. 8 Eylül 2026)";
    },
  },
  {
    id: "R4", ad: "binlik ayırıcı virgül",
    re: /\b\d{1,3}(?:,\d{3}){2,}\b/g,
    oner: (m) => m[0].replace(/,/g, "."),
  },
];
// Plugin tanimlari (ajan govdesi, beceri, komut) rapor degil talimattir; beceri dosyasi
// kuralin kendisini "yanlis ornek" olarak gosterir. Bunlar taranmaz.
const ATLANAN_KLASOR = /(^|[\\/])(node_modules|\.git|_eski|_test|web|dist|build|agents|skills|commands|\.claude)([\\/]|$)/;

const TURKCE_HARF = /[çğışöüİÇĞŞÖÜ]/g;

function turkceMi(metin) {
  return (metin.slice(0, 20000).match(TURKCE_HARF) || []).length >= 3;
}

/** Bir satırı denetime hazırlar: satır içi kod, URL, bağlantı hedefi ve HTML etiketi silinir. */
function temizle(satir) {
  return satir
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/<[^>]+>/g, " ");
}

/** Metni tarar; bulgu listesi döner: { satir, kural, ad, bulunan, oner }. */
function denetle(metin) {
  const bulgular = [];
  const satirlar = metin.replace(/\r\n/g, "\n").split("\n");
  let cit = false, onbilgi = false;
  for (let i = 0; i < satirlar.length; i++) {
    const ham = satirlar[i];
    if (i === 0 && ham.trim() === "---") { onbilgi = true; continue; }
    if (onbilgi) { if (ham.trim() === "---") onbilgi = false; continue; }
    if (/^\s*(```|~~~)/.test(ham)) { cit = !cit; continue; }
    if (cit) continue;
    if (/^\s*\|?\s*:?-{3,}/.test(ham)) continue;           // tablo ayıracı / yatay çizgi
    const s = temizle(ham);
    for (const k of KURALLAR) {
      k.re.lastIndex = 0;
      let m;
      while ((m = k.re.exec(s)) !== null) {
        bulgular.push({ satir: i + 1, kural: k.id, ad: k.ad, bulunan: m[0].trim(), oner: k.oner(m) });
        if (m[0].length === 0) k.re.lastIndex++;
      }
    }
  }
  return bulgular;
}

function atlanacakYol(p) {
  return ATLANAN_KLASOR.test(p);
}

function rapor(dosya, bulgular, sinir = 8) {
  const ad = path.basename(dosya);
  const satirlar = bulgular.slice(0, sinir).map((b) => `- satır ${b.satir}: "${b.bulunan}" → ${b.ad}; öneri: ${b.oner}`);
  if (bulgular.length > sinir) satirlar.push(`- … +${bulgular.length - sinir} bulgu daha`);
  return `turkce-rapor biçim uyarısı — ${ad}: ${bulgular.length} bulgu (engellemez, düzeltmek sana kalmış)\n${satirlar.join("\n")}`;
}

// --- elle / ölçüm modu ------------------------------------------------------
if (require.main === module && process.argv.includes("--dosya")) {
  const dosyalar = process.argv.slice(process.argv.indexOf("--dosya") + 1);
  let toplam = 0;
  for (const d of dosyalar) {
    let metin;
    try { metin = fs.readFileSync(d, "utf8"); } catch { console.error("okunamadı: " + d); continue; }
    if (!turkceMi(metin)) { console.log(d + ": Türkçe görünmüyor, atlandı"); continue; }
    const b = denetle(metin);
    toplam += b.length;
    for (const x of b) console.log(`${d}:${x.satir}: [${x.kural}] "${x.bulunan}" → ${x.oner}`);
  }
  console.log(dosyalar.length + " dosya, " + toplam + " bulgu.");
  process.exit(toplam ? 1 : 0);
}

// --- kanca modu --------------------------------------------------------------
if (require.main === module) {
  let ham = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => (ham += d));
  process.stdin.on("end", () => {
    try {
      const girdi = JSON.parse(ham || "{}");
      const arac = girdi.tool_name || "";
      const yol = girdi.tool_input && girdi.tool_input.file_path;
      if (!/^(Write|Edit|MultiEdit)$/.test(arac) || !yol || !/\.md$/i.test(yol) || atlanacakYol(yol)) return;
      if (!fs.existsSync(yol)) return;
      const metin = fs.readFileSync(yol, "utf8");
      if (!turkceMi(metin)) return;
      const bulgular = denetle(metin);
      if (!bulgular.length) return;
      const mesaj = rapor(yol, bulgular);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: mesaj },
        systemMessage: "turkce-rapor: " + path.basename(yol) + " içinde " + bulgular.length + " biçim uyarısı",
      }));
    } catch {
      // Kanca kullanıcının akışını asla bozmaz: hata sessizce yutulur, çıkış 0.
    }
  });
}

module.exports = { denetle, turkceMi, temizle, rapor, atlanacakYol };
