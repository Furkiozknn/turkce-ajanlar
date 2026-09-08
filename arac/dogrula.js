/*
 * dogrula.js — agents/*.md ajan dosyalarini dogrular.
 *
 *   node arac/dogrula.js                  # agents/ altindaki her seyi dogrular
 *   node arac/dogrula.js agents/foo.md    # belirli dosyalari dogrular
 *   node arac/dogrula.js --kati           # uyarilar da hata sayilir
 *
 * Baktiklari:
 *   - frontmatter var mi, ayristirilabiliyor mu
 *   - name: dolu, kebab-case
 *   - description: dolu ve tetikleyici ifade iceriyor
 *   - tools: gecerli arac adlari
 *   - govde bos degil
 *   - metin Turkce
 *
 * Cikis kodu: hata varsa 1, yoksa 0. (--kati ile uyari da 1 yapar.)
 *
 * Not: konsol ciktisi ASCII'dir — Windows'ta cp1254 konsolunda Turkce
 * harfler bozulmasin diye. Depodaki diger arac script'leri de boyle.
 */

const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const VARSAYILAN_KLASOR = path.join(KOK, "agents");

// Claude Code'un yerlesik arac adlari. Kurulu claude ikilisinden
// dogrulandi (2026-09-06) — uydurulmadi.
const GECERLI_ARACLAR = new Set([
  "Task",
  "Agent",
  "Bash",
  "BashOutput",
  "KillShell",
  "Glob",
  "Grep",
  "Read",
  "Edit",
  "MultiEdit",
  "Write",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  "ExitPlanMode",
  "Skill",
  "AskUserQuestion",
  "ListMcpResources",
  "ReadMcpResource",
]);

// Artik onerilmeyenler: gecerli sayilir ama uyari uretir.
const ESKI_ARACLAR = new Set(["MultiEdit", "KillBash"]);

const BILINEN_ALANLAR = new Set([
  "name",
  "description",
  "model",
  "color",
  "tools",
  // Plugin ajanlarinda da desteklenen alanlar (code.claude.com/docs/en/sub-agents, 8 Eylul 2026).
  "skills",
  "disallowedTools",
  "maxTurns",
  "memory",
  "effort",
  "background",
  "isolation",
]);

const GECERLI_MODELLER = new Set([
  "inherit",
  "opus",
  "sonnet",
  "haiku",
  "fable",
]);

// description icinde "ne zaman cagrilir" sinyali arayan sozcukler
const TETIK_SOZCUKLERI = [
  "kullan",
  "dediginde",
  "dediğinde",
  "istediginde",
  "istediğinde",
  "sordugunda",
  "sorduğunda",
  "cagir",
  "çağır",
];

const TURKCE_HARFLER = /[çğıöşüÇĞİÖŞÜ]/;

// Ingilizce'de olmayan, Turkce'de sik gecen islev sozcukleri
const TR_SOZCUKLER = new Set([
  "bir", "ve", "bu", "şu", "için", "ile", "olarak", "değil", "gibi",
  "daha", "sonra", "önce", "ama", "veya", "her", "çok", "kadar",
  "göre", "sadece", "yani", "hangi", "nasıl", "neden", "eğer",
  "zaman", "üzerinde", "altında", "arasında", "yoksa", "varsa",
  "olan", "olur", "yaz", "yazar", "sen", "senin", "işin", "gerek",
  "ise", "hem", "bile", "kendi", "diye", "ayrıca", "çünkü",
]);

// Turkce'de karsiligi olmayan, en az uc harfli Ingilizce islev sozcukleri
const EN_SOZCUKLER = new Set([
  "the", "and", "you", "your", "are", "with", "that", "this", "from",
  "not", "but", "have", "has", "will", "would", "should", "when",
  "which", "there", "their", "them", "was", "were", "been", "for",
  "can", "all", "any", "each", "into", "more", "than", "then",
  "they", "what", "where", "who", "why", "how", "must", "does",
]);

// --- kucuk yardimcilar -----------------------------------------------------

function turkceKucult(s) {
  return s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/** Kod bloklari, satir ici kod, baglantilar ve yollar dil sayimini bozar. */
function dilIcinTemizle(metin) {
  return metin
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[A-Za-z]:\\\S+/g, " ")
    .replace(/\S+\/\S+/g, " ");
}

function sozcukSay(metin, kume) {
  let n = 0;
  const sozcukler = turkceKucult(metin).match(/[a-zçğıöşü]+/g) || [];
  for (const s of sozcukler) if (kume.has(s)) n++;
  return n;
}

// --- frontmatter ayristirma ------------------------------------------------

/**
 * Frontmatter'i ayristirir. Hata durumunda { hata } doner.
 * Blok liste (`- Read`) ve satir ici liste (`["Read"]`) destekli.
 */
function frontmatterAyristir(ham) {
  const m = ham.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!m) return { hata: "frontmatter bulunamadi (dosya `---` ile baslamali)" };

  const alanlar = {};
  const yinelenen = [];
  const satirlar = m[1].split(/\r?\n/);
  let sonAnahtar = null;

  for (const ham2 of satirlar) {
    const satir = ham2.replace(/\s+$/, "");
    if (!satir.trim() || satir.trim().startsWith("#")) continue;

    // blok liste ogesi: "  - Read"
    const oge = satir.match(/^\s*-\s+(.*)$/);
    if (oge && sonAnahtar) {
      const deger = oge[1].trim().replace(/^["']|["']$/g, "");
      if (!Array.isArray(alanlar[sonAnahtar])) alanlar[sonAnahtar] = [];
      if (deger) alanlar[sonAnahtar].push(deger);
      continue;
    }

    const k = satir.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!k) return { hata: "frontmatter satiri ayristirilamadi: " + satir.trim() };

    const anahtar = k[1];
    if (anahtar in alanlar) yinelenen.push(anahtar);
    let deger = k[2].trim();

    if (deger.startsWith("[") && deger.endsWith("]")) {
      deger = deger
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (deger === "") {
      deger = ""; // blok liste gelebilir
    } else {
      deger = deger.replace(/^["']|["']$/g, "");
    }

    alanlar[anahtar] = deger;
    sonAnahtar = anahtar;
  }

  return { alanlar, yinelenen, govde: (m[2] || "").trim() };
}

/** tools alanini her yazim bicimi icin diziye cevirir. */
function araclariDizile(deger) {
  if (deger === undefined) return undefined;
  if (Array.isArray(deger)) return deger;
  const s = String(deger).trim();
  if (s === "") return [];
  return s.split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

// --- tek dosya dogrulama ---------------------------------------------------

function dosyaDogrula(tamYol) {
  const hatalar = [];
  const uyarilar = [];
  const ad = path.basename(tamYol);
  const hata = (m) => hatalar.push(m);
  const uyar = (m) => uyarilar.push(m);

  let ham;
  try {
    ham = fs.readFileSync(tamYol, "utf8");
  } catch (e) {
    return { ad, hatalar: ["okunamadi: " + e.message], uyarilar: [] };
  }
  if (ham.charCodeAt(0) === 0xfeff) {
    uyar("dosya BOM ile basliyor; UTF-8 (BOM'suz) tercih edilir");
    ham = ham.slice(1);
  }

  const c = frontmatterAyristir(ham);
  if (c.hata) return { ad, hatalar: [c.hata], uyarilar };

  const { alanlar, govde, yinelenen } = c;
  for (const y of yinelenen) uyar("frontmatter'da yinelenen alan: " + y);
  for (const anahtar of Object.keys(alanlar)) {
    if (!BILINEN_ALANLAR.has(anahtar)) uyar("bilinmeyen frontmatter alani: " + anahtar);
  }

  // --- name ---
  const isim = typeof alanlar.name === "string" ? alanlar.name.trim() : "";
  if (!isim) {
    hata("name: bos veya yok");
  } else {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(isim)) {
      hata("name: kebab-case degil -> '" + isim + "' (sadece a-z, 0-9 ve tek tire)");
    }
    const govdesiz = ad.replace(/\.md$/i, "");
    if (isim !== govdesiz) {
      uyar("name ('" + isim + "') dosya adiyla ('" + govdesiz + "') ayni degil");
    }
  }

  // --- description ---
  const aciklama = typeof alanlar.description === "string" ? alanlar.description.trim() : "";
  if (!aciklama) {
    hata("description: bos veya yok");
  } else {
    if (aciklama.length < 40) {
      hata("description: cok kisa (" + aciklama.length + " karakter, en az 40 olmali)");
    }
    const tirnakli = aciklama.match(/"([^"]{3,80})"/g) || [];
    const kelime = TETIK_SOZCUKLERI.some((t) => turkceKucult(aciklama).includes(turkceKucult(t)));
    if (tirnakli.length === 0 && !kelime) {
      hata(
        'description: tetikleyici ifade yok — kullanicinin diyecegi bir cumleyi tirnak icinde yaz ("su klasoru duzenle" gibi) veya "... dediginde kullan" kalibini kullan'
      );
    } else if (tirnakli.length === 0) {
      uyar('description: tirnak icinde ornek ifade yok; Claude ajani secerken tirnakli kaliplar daha iyi eslesiyor');
    }
    if (!TURKCE_HARFLER.test(aciklama)) {
      hata("description: Turkce degil (Turkce'ye ozgu harf hic gecmiyor)");
    }
  }

  // --- tools ---
  const araclar = araclariDizile(alanlar.tools);
  if (araclar === undefined) {
    uyar("tools: yok — ajan tum araclari devralir; bilerek yapildiysa sorun degil");
  } else if (araclar.length === 0) {
    hata("tools: bos liste — ya gecerli arac yaz ya da alani tamamen kaldir");
  } else {
    for (const t of araclar) {
      if (t === "*") continue;
      if (/^mcp__[A-Za-z0-9_.-]+(__[A-Za-z0-9_.-]+)?$/.test(t)) continue;
      if (!GECERLI_ARACLAR.has(t)) {
        const yakin = [...GECERLI_ARACLAR].find(
          (g) => g.toLowerCase() === t.toLowerCase().trim()
        );
        hata(
          "tools: gecersiz arac adi '" + t + "'" + (yakin ? " (bunu mu demek istedin: '" + yakin + "')" : "")
        );
      } else if (ESKI_ARACLAR.has(t)) {
        uyar("tools: '" + t + "' artik onerilmiyor");
      }
    }
    const tekil = new Set(araclar);
    if (tekil.size !== araclar.length) uyar("tools: yinelenen arac adi var");
  }

  // --- disallowedTools: gecerli arac adi olmali; tools ile celismemeli ---
  const yasakli = araclariDizile(alanlar.disallowedTools);
  if (yasakli !== undefined) {
    if (yasakli.length === 0) hata("disallowedTools: bos liste — ya arac yaz ya da alani kaldir");
    for (const t of yasakli) {
      if (!GECERLI_ARACLAR.has(t)) hata("disallowedTools: gecersiz arac adi '" + t + "'");
      else if (araclar && araclar.includes(t)) uyar("disallowedTools: '" + t + "' tools listesinde de var — biri fazla");
    }
  }

  // --- skills: on yuklenen her beceri bu depoda olmali ---
  const beceriler = araclariDizile(alanlar.skills);
  if (beceriler !== undefined) {
    if (beceriler.length === 0) hata("skills: bos liste — ya beceri yaz ya da alani kaldir");
    for (const b of beceriler) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b)) hata("skills: '" + b + "' kebab-case degil");
      else if (!fs.existsSync(path.join(KOK, "skills", b, "SKILL.md"))) hata("skills: '" + b + "' icin skills/" + b + "/SKILL.md yok");
    }
  }

  // --- model / color (bilgi amacli) ---
  if (typeof alanlar.model === "string" && alanlar.model.trim()) {
    const md = alanlar.model.trim();
    if (!GECERLI_MODELLER.has(md) && !/^claude-/.test(md)) {
      uyar("model: taninmayan deger '" + md + "' (inherit / opus / sonnet / haiku bekleniyor)");
    }
  }

  // --- govde ---
  if (!govde) {
    hata("govde bos — frontmatter'dan sonra ajanin talimatlari yok");
  } else if (govde.length < 200) {
    uyar("govde cok kisa (" + govde.length + " karakter); ajan talimati genelde daha ayrintili olur");
  }

  // --- dil ---
  if (govde) {
    const temiz = dilIcinTemizle(govde);
    const tr = sozcukSay(temiz, TR_SOZCUKLER);
    const en = sozcukSay(temiz, EN_SOZCUKLER);
    if (!TURKCE_HARFLER.test(temiz)) {
      hata("govde Turkce degil (Turkce'ye ozgu harf hic gecmiyor)");
    } else if (en > tr) {
      hata(
        "govde Turkce gorunmuyor (Ingilizce islev sozcugu " + en + ", Turkce " + tr + ")"
      );
    } else if (tr < 5) {
      uyar("govde cok az Turkce islev sozcugu iceriyor (" + tr + "); dil kontrolu zayif kaldi");
    }
  }

  return { ad, hatalar, uyarilar };
}

// --- dosyalari topla -------------------------------------------------------

function dosyalariTopla(argumanlar) {
  if (argumanlar.length === 0) {
    if (!fs.existsSync(VARSAYILAN_KLASOR)) {
      console.error("agents klasoru yok: " + VARSAYILAN_KLASOR);
      process.exit(2);
    }
    return fs
      .readdirSync(VARSAYILAN_KLASOR)
      .filter((a) => a.endsWith(".md"))
      .sort()
      .map((a) => path.join(VARSAYILAN_KLASOR, a));
  }

  const bulunan = [];
  for (const arg of argumanlar) {
    const tam = path.resolve(arg);
    if (!fs.existsSync(tam)) {
      console.error("bulunamadi: " + arg);
      process.exit(2);
    }
    if (fs.statSync(tam).isDirectory()) {
      for (const a of fs.readdirSync(tam).filter((x) => x.endsWith(".md")).sort()) {
        bulunan.push(path.join(tam, a));
      }
    } else {
      bulunan.push(tam);
    }
  }
  return bulunan;
}

// --- calistir --------------------------------------------------------------

const argumanlar = process.argv.slice(2);
const kati = argumanlar.includes("--kati");
const yollar = dosyalariTopla(argumanlar.filter((a) => !a.startsWith("--")));

if (yollar.length === 0) {
  console.error("dogrulanacak .md dosyasi yok");
  process.exit(2);
}

console.log("turkce-ajanlar dogrulama — " + yollar.length + " dosya\n");

let hataliDosya = 0;
let toplamHata = 0;
let toplamUyari = 0;

for (const yol of yollar) {
  const sonuc = dosyaDogrula(yol);
  const goster = path.relative(KOK, yol).replace(/\\/g, "/");
  toplamHata += sonuc.hatalar.length;
  toplamUyari += sonuc.uyarilar.length;

  if (sonuc.hatalar.length === 0 && sonuc.uyarilar.length === 0) {
    console.log("  OK    " + goster);
    continue;
  }
  if (sonuc.hatalar.length > 0) hataliDosya++;
  console.log((sonuc.hatalar.length ? "  HATA  " : "  UYARI ") + goster);
  for (const h of sonuc.hatalar) console.log("        [hata]  " + h);
  for (const u of sonuc.uyarilar) console.log("        [uyari] " + u);
}

console.log(
  "\nSonuc: " +
    (yollar.length - hataliDosya) +
    "/" +
    yollar.length +
    " dosya gecti, " +
    toplamHata +
    " hata, " +
    toplamUyari +
    " uyari"
);

if (toplamHata > 0) {
  process.exit(1);
}
if (kati && toplamUyari > 0) {
  console.log("--kati: uyarilar hata sayildi.");
  process.exit(1);
}
process.exit(0);
