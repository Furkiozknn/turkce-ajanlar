/*
 * dogrula-test.js — dogrula.js'in gercekten yakaladigini gosterir.
 *
 *   node arac/dogrula-test.js
 *
 * Her senaryo icin gecici bir klasore bozuk (veya saglam) bir ajan
 * dosyasi yazar, dogrula.js'i alt surec olarak calistirir, cikis kodunu
 * ve ciktidaki mesaji bekleneni ile karsilastirir. Gecici klasor
 * sonunda silinir — depoya dosya birakmaz.
 *
 * Cikis kodu: bir senaryo bile duserse 1.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const DOGRULA = path.join(__dirname, "dogrula.js");

// Fixture'lar bilerek gercek Turkce harflerle yazildi: dogrula.js bir
// ajan dosyasinin Turkce olmasini sart kosuyor ve bunu Turkce'ye ozgu
// harflerden anliyor.
const SAGLAM_GOVDE = `
Sen bir örnek ajansın. Türkçe yazarsın ve işini bitirmeden önce
doğrularsın. Bu gövde, uzunluk eşiğini geçmek için yeterince uzun
tutuldu; aşağıda da birkaç kural var.

## Kurallar

1. Emin değilsen bak, bakamıyorsan işaretle. Bu yüzden her bulguyu
   nereden geldiğiyle birlikte yazarsın.
2. Kalıcı silme yok; gereksiz gördüğünü bir kenara taşırsın.
3. Kullanıcının sorusuna göre kısa ya da ayrıntılı cevap verirsin.
`.trim();

const ACIKLAMA =
  'description: Örnek bir işi yapar ve Türkçe rapor üretir. Kullanıcı "şunu yap", "buna bak" dediğinde kullan. Başka bir şey yapmaz.';

const SAGLAM = [
  "---",
  "name: ornek-ajan",
  ACIKLAMA,
  "model: inherit",
  "color: blue",
  'tools: ["Read", "Grep", "Glob", "Bash"]',
  "---",
  "",
  SAGLAM_GOVDE,
  "",
].join("\n");

/** Saglam dosyanin bir satirini degistirip/silip bozuk surum uretir. */
function degistir(eskiParca, yeniParca) {
  if (!SAGLAM.includes(eskiParca)) {
    throw new Error("test fixture bozuk, bulunamadi: " + eskiParca);
  }
  return SAGLAM.replace(eskiParca, yeniParca);
}

const SENARYOLAR = [
  {
    ad: "saglam dosya gecer",
    icerik: SAGLAM,
    kod: 0,
    bekle: /OK\b/,
  },
  {
    ad: "frontmatter yok",
    icerik: SAGLAM_GOVDE,
    kod: 1,
    bekle: /frontmatter bulunamadi/,
  },
  {
    ad: "name bos",
    icerik: degistir("name: ornek-ajan", "name:"),
    kod: 1,
    bekle: /name: bos veya yok/,
  },
  {
    ad: "name kebab-case degil",
    icerik: degistir("name: ornek-ajan", "name: Ornek_Ajan"),
    kod: 1,
    bekle: /kebab-case degil/,
  },
  {
    ad: "name tire ile bitiyor",
    icerik: degistir("name: ornek-ajan", "name: ornek-"),
    kod: 1,
    bekle: /kebab-case degil/,
  },
  {
    ad: "description yok",
    icerik: SAGLAM.split("\n").filter((s) => !s.startsWith("description:")).join("\n"),
    kod: 1,
    bekle: /description: bos veya yok/,
  },
  {
    ad: "description cok kisa",
    icerik: degistir(ACIKLAMA, "description: Bir şey yapar."),
    kod: 1,
    bekle: /cok kisa/,
  },
  {
    ad: "description tetikleyici ifade icermiyor",
    icerik: degistir(
      ACIKLAMA,
      "description: Bu ajan bir şeyler yapar, ne zaman çağrılacağı belirsizdir ve hiçbir örnek ifade içermez."
    ),
    kod: 1,
    bekle: /tetikleyici ifade yok/,
  },
  {
    ad: "description Turkce degilse hata",
    icerik: degistir(
      ACIKLAMA,
      'description: Reviews a change for correctness and security. Use when the user says "review this", "check my code" or asks for a pre-commit look.'
    ),
    kod: 1,
    bekle: /description: Turkce degil/,
  },
  {
    ad: "gecersiz arac adi",
    icerik: degistir('tools: ["Read", "Grep", "Glob", "Bash"]', 'tools: ["Read", "Terminal"]'),
    kod: 1,
    bekle: /gecersiz arac adi 'Terminal'/,
  },
  {
    ad: "yanlis buyuk-kucuk harf onerisi verir",
    icerik: degistir('tools: ["Read", "Grep", "Glob", "Bash"]', 'tools: ["read", "Grep"]'),
    kod: 1,
    bekle: /bunu mu demek istedin: 'Read'/,
  },
  {
    ad: "tools bos liste",
    icerik: degistir('tools: ["Read", "Grep", "Glob", "Bash"]', "tools: []"),
    kod: 1,
    bekle: /bos liste/,
  },
  {
    ad: "govde bos",
    icerik: SAGLAM.replace(SAGLAM_GOVDE, "").trimEnd() + "\n",
    kod: 1,
    bekle: /govde bos/,
  },
  {
    ad: "govde Ingilizce",
    icerik: SAGLAM.replace(
      SAGLAM_GOVDE,
      [
        "You are an example agent. You should always review the code that you",
        "are given and then report what you have found, so that the user can",
        "decide what they want to do with each of the findings that you list.",
        "",
        "## Rules",
        "",
        "1. Do not delete any files, because that would not be reversible.",
        "2. When you are not sure about something, then you should say so.",
        "3. If there are more findings than the user can read, then group them.",
      ].join("\n")
    ),
    kod: 1,
    bekle: /govde Turkce degil/,
  },
  {
    ad: "govde agirlikli Ingilizce ise (birkac Turkce harf olsa da) hata",
    icerik: SAGLAM.replace(
      SAGLAM_GOVDE,
      [
        "You are an example agent (Türkçe destekli). You should always review",
        "the code that you are given and then report what you have found, so",
        "that the user can decide what they want to do with each finding.",
        "",
        "## Rules",
        "",
        "1. Do not delete any files, because that would not be reversible.",
        "2. When you are not sure about something, then you should say so.",
        "3. If there are more findings than the user can read, then group them.",
      ].join("\n")
    ),
    kod: 1,
    bekle: /govde Turkce gorunmuyor/,
  },
  {
    ad: "ASCII'ye duzlestirilmis Turkce kabul edilmez",
    icerik: SAGLAM.replace(
      SAGLAM_GOVDE,
      [
        "Sen bir ornek ajansin. Turkce yazarsin ve isini bitirmeden once",
        "dogrularsin. Bu govde yeterince uzun ama Turkce harf icermiyor;",
        "ajan dosyalarinda duzgun Turkce bekleniyor.",
        "",
        "## Kurallar",
        "",
        "1. Emin degilsen bak, bakamiyorsan isaretle.",
        "2. Kalici silme yok; gereksiz gordugunu bir kenara tasirsin.",
        "3. Kullanicinin sorusuna gore kisa ya da ayrintili cevap verirsin.",
      ].join("\n")
    ),
    kod: 1,
    bekle: /govde Turkce degil/,
  },
  {
    ad: "blok liste bicimindeki tools da okunur",
    icerik: degistir(
      'tools: ["Read", "Grep", "Glob", "Bash"]',
      "tools:\n  - Read\n  - Grep\n  - Bash"
    ),
    kod: 0,
    bekle: /OK\b/,
  },
  {
    ad: "virgullu string bicimindeki tools da okunur",
    icerik: degistir('tools: ["Read", "Grep", "Glob", "Bash"]', "tools: Read, Grep, Bash"),
    kod: 0,
    bekle: /OK\b/,
  },
  {
    ad: "mcp araci gecerli sayilir",
    icerik: degistir('tools: ["Read", "Grep", "Glob", "Bash"]', 'tools: ["Read", "mcp__duckdb__query"]'),
    kod: 0,
    bekle: /OK\b/,
  },
  {
    ad: "bilinmeyen alan uyari uretir, hata degil",
    icerik: degistir("color: blue", "color: blue\nrenk: mavi"),
    kod: 0,
    bekle: /bilinmeyen frontmatter alani: renk/,
  },
  {
    ad: "--kati uyariyi hataya cevirir",
    icerik: degistir("color: blue", "color: blue\nrenk: mavi"),
    ek: ["--kati"],
    kod: 1,
    bekle: /uyarilar hata sayildi/,
  },
  {
    ad: "dosya adi ile name farkiysa uyari",
    icerik: degistir("name: ornek-ajan", "name: baska-ad"),
    kod: 0,
    bekle: /dosya adiyla .* ayni degil/,
  },
  {
    ad: "dosya tamamen bos",
    icerik: "",
    kod: 1,
    bekle: /dosya bos/,
  },
  {
    ad: "dosya sadece bosluk",
    icerik: "   \n\t\n",
    kod: 1,
    bekle: /dosya bos/,
  },
  {
    ad: "UTF-8 BOM ile baslayan dosya uyari uretir ama gecer",
    icerik: "﻿" + SAGLAM,
    kod: 0,
    bekle: /dosya BOM ile basliyor/,
  },
  {
    ad: "bozuk UTF-8 karakteri uyari uretir",
    icerik: degistir(SAGLAM_GOVDE, SAGLAM_GOVDE + "\n\nBozuk bayt: �"),
    kod: 0,
    bekle: /gecersiz UTF-8 baytlari/,
  },
  {
    ad: "cok buyuk govde uyari uretir",
    icerik: degistir(SAGLAM_GOVDE, SAGLAM_GOVDE + "\n\n" + "x".repeat(30001)),
    kod: 0,
    bekle: /govde cok uzun/,
  },
];

// --- kosum ------------------------------------------------------------------

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "ajan-dogrula-"));
let dusen = 0;

try {
  SENARYOLAR.forEach((s, i) => {
    const dosya = path.join(gecici, "ornek-ajan.md");
    fs.writeFileSync(dosya, s.icerik, "utf8");

    const c = spawnSync(process.execPath, [DOGRULA, dosya, ...(s.ek || [])], {
      encoding: "utf8",
    });
    const cikti = (c.stdout || "") + (c.stderr || "");

    const kodTamam = c.status === s.kod;
    const mesajTamam = s.bekle.test(cikti);

    if (kodTamam && mesajTamam) {
      console.log("  OK    " + s.ad);
    } else {
      dusen++;
      console.log("  DUSTU " + s.ad);
      if (!kodTamam) console.log("        cikis kodu: beklenen " + s.kod + ", gelen " + c.status);
      if (!mesajTamam) console.log("        cikti " + s.bekle + " kalibini icermiyor");
      console.log(
        cikti
          .trimEnd()
          .split("\n")
          .map((x) => "        | " + x)
          .join("\n")
      );
    }
    void i;
  });
} finally {
  fs.rmSync(gecici, { recursive: true, force: true });
}

console.log(
  "\nSonuc: " + (SENARYOLAR.length - dusen) + "/" + SENARYOLAR.length + " senaryo gecti"
);
process.exit(dusen > 0 ? 1 : 0);
