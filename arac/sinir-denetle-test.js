/*
 * sinir-denetle-test.js — sinir-denetle.js'in gercekten yakaladigini gosterir.
 *
 *   node arac/sinir-denetle-test.js
 *
 * Her senaryo gecici bir klasore bir ajan dosyasi yazar, denetciyi alt
 * surec olarak kosturur, cikis kodunu ve mesaji bekleneniyle karsilastirir.
 * Bir kapi, ihlali gorunce kirmizi yandigi GOSTERILMEDEN kapi sayilmaz;
 * bu dosyanin varlik sebebi o.
 *
 * Ayrica son senaryo gercek kadroyu kosturur: 70 ajanin tamami temiz
 * gecmeli. Boylece denetci gevsetilirse ya da bir ajan bozulursa test
 * duser.
 *
 * Cikis kodu: bir senaryo bile duserse 1.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const DENETCI = path.join(__dirname, "sinir-denetle.js");
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

/*
 * Saglam bir taban ajan. Her senaryo bunun TEK bir yanini bozar ki
 * dusen kontrolun hangisi oldugu kesin olsun.
 */
function taban(uzer) {
  const v = Object.assign(
    {
      name: "ornek-denetci",
      description:
        'Örnek bir denetim yapar ve bulguları Türkçe raporlar. Kullanıcı "şunu denetle", ' +
        '"bu yapı sağlam mı" dediğinde kullan. Dosyaları değiştirmez, sadece rapor yazar.',
      tools: '["Read", "Grep", "Glob", "Bash"]',
      disallowed: '["Write", "Edit"]',
      mutlak: "## Mutlak kurallar\n\n- Dosya değiştirme. Bulguyu satırıyla yaz, uygulamayı devret.\n- Ölçmediğin sayıyı yazma.",
      durustluk: "## Dürüstlük disiplini\n\n- Bakamadığın dosyayı yazarsın.\n- Emin olmadığını ayrı başlıkta verirsin.",
      cikti: "## Çıktı\n\n```\n## Taranan\n<ne bakildi>\n\n## Bulgular\n<dosya ve satir ile>\n```",
      kapanis: "Düzeltme istenirse yapma; hangi dosyada ne değişmeli onu yaz.",
    },
    uzer || {}
  );
  const fmSatir = v.disallowed ? "disallowedTools: " + v.disallowed + "\n" : "";
  return (
    "---\n" +
    "name: " + v.name + "\n" +
    "description: " + v.description + "\n" +
    "model: inherit\n" +
    "color: blue\n" +
    "tools: " + v.tools + "\n" +
    "skills: [\"turkce-rapor\"]\n" +
    fmSatir +
    "---\n\n" +
    "Sen bir örnek denetçisin. Tek ölçüt şu: ölçtüğün şey gerçekten\n" +
    "kanıtlanmış mı?\n\n" +
    v.mutlak + "\n\n" +
    "## 1. Ölç\n\nÖnce sayarsın, sonra yorumlarsın.\n\n" +
    "```bash\ngit ls-files | wc -l\n```\n\n" +
    v.durustluk + "\n\n" +
    v.cikti +
    (v.kapanis ? "\n\n" + v.kapanis + "\n" : "\n")
  );
}

function senaryo(ad, uzer, beklenen) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "sinir-test-"));
  const dosya = path.join(t, "ornek-denetci.md");
  fs.writeFileSync(dosya, taban(uzer), "utf8");
  const r = spawnSync(process.execPath, [DENETCI, dosya], { encoding: "utf8" });
  const cikti = r.stdout + r.stderr;
  if (beklenen === null) {
    bekle(ad, r.status === 0, "beklenmedik hata:\n" + cikti);
  } else {
    bekle(
      ad,
      r.status === 1 && beklenen.test(cikti),
      "status=" + r.status + "\n" + cikti.trim()
    );
  }
  fs.rmSync(t, { recursive: true, force: true });
}

console.log("sinir-denetle-test\n");

console.log("[saglam taban]");
senaryo("bozulmamis ajan temiz geciyor", {}, null);

console.log("\n[1] description sinir cumlesi");
senaryo(
  "sinir cumlesi olmayan description yakalaniyor",
  {
    description:
      'Örnek bir denetim yapar ve bulguları Türkçe raporlar. Kullanıcı "şunu denetle", ' +
      '"bu yapı sağlam mı" dediğinde kullan. Raporu hızlıca üretir ve size sunar.',
  },
  /sinir cumlesiyle bitmiyor/
);

console.log("\n[2] govde kapanisi");
senaryo("kod blogu ile biten govde yakalaniyor", { kapanis: "" }, /kod blogu ile bitiyor/);
senaryo(
  "sinir tekrarlamayan kapanis yakalaniyor",
  { kapanis: "Raporu okuduktan sonra ekibinle paylaşabilirsin." },
  /kapanisi sinir tekrarlamiyor/
);

console.log("\n[3-5] ev uslubu bolumleri");
senaryo("## Mutlak kurallar yoklugu yakalaniyor", { mutlak: "## Nasıl çalışırsın\n\nÖnce ölçersin." }, /Mutlak kural/);
senaryo("## Çıktı yoklugu yakalaniyor", { cikti: "## Rapor\n\nBir rapor yazarsın." }, /Çıktı bolumu yok/);
senaryo(
  "## Dürüstlük disiplini yoklugu yakalaniyor",
  { durustluk: "## Notlar\n\nBazı notlar." },
  /Dürüstlük disiplini bolumu yok/
);

console.log("\n[Mutlak kural tekil bicimi]");
senaryo(
  "adlandirilmis tekil kural kabul ediliyor",
  { mutlak: "## Mutlak kural: değer yazdırılmaz\n\n- Dosya değiştirme. Bulguyu satırıyla yaz." },
  null
);

console.log("\n[6] yetki-soz uyumu");
senaryo(
  "salt okur ama Mutlak kurallar yazma reddi demiyor",
  { mutlak: "## Mutlak kurallar\n\n- Ölçmediğin sayıyı rapora koyma diye bir kural var.\n- Kaynak göster." },
  /Mutlak kurallar' yazma reddini soylemiyor/
);
senaryo(
  "hem tools'da yazma hem disallowedTools'ta dusme",
  { tools: '["Read", "Grep", "Write"]' },
  /hem tools'da yazma araci var/
);
senaryo(
  "yazan ajan mutlak red soylerse uyariyor",
  {
    tools: '["Read", "Grep", "Glob", "Bash", "Write"]',
    disallowed: "",
    description:
      'Örnek bir denetim yapar ve bulguları Türkçe raporlar. Kullanıcı "şunu denetle", ' +
      '"bu yapı sağlam mı" dediğinde kullan. Sadece rapor yazar, başka hiçbir şey yapmaz.',
  },
  null // uyari; --kati olmadan cikis 0
);

// Ayni senaryo --kati ile 1 donmeli.
{
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "sinir-test-"));
  const dosya = path.join(t, "ornek-denetci.md");
  fs.writeFileSync(
    dosya,
    taban({
      tools: '["Read", "Grep", "Glob", "Bash", "Write"]',
      disallowed: "",
      description:
        'Örnek bir denetim yapar ve bulguları Türkçe raporlar. Kullanıcı "şunu denetle", ' +
        '"bu yapı sağlam mı" dediğinde kullan. Sadece rapor yazar, başka hiçbir şey yapmaz.',
    }),
    "utf8"
  );
  const r = spawnSync(process.execPath, [DENETCI, "--kati", dosya], { encoding: "utf8" });
  bekle(
    "--kati uyariyi hata sayiyor",
    r.status === 1 && /hicbir sey yazmayacagini/.test(r.stdout),
    "status=" + r.status + "\n" + r.stdout
  );
  fs.rmSync(t, { recursive: true, force: true });
}

console.log("\n[Turkce harf tuzagi]");
/*
 * Gercek bir hata icin regresyon: ilk yazimda olumsuz emir kalibi
 * \w kullaniyordu ve JavaScript'te \w = [A-Za-z0-9_] oldugu icin
 * "cizme." hic eslesmedi. Bu senaryo o kaliba geri donulmesini engeller.
 */
senaryo(
  "Turkce harfle biten olumsuz emir kabul ediliyor",
  { kapanis: "Grafik istenirse veriyi tablo olarak ver; kendin ASCII grafik çizme." },
  null
);

console.log("\n[gercek kadro]");
{
  const r = spawnSync(process.execPath, [DENETCI, "--kati"], {
    cwd: KOK,
    encoding: "utf8",
  });
  const m = r.stdout.match(/Sonuc: (\d+)\/(\d+) dosya temiz/);
  bekle(
    "kadronun tamami temiz",
    r.status === 0 && m && m[1] === m[2],
    (m ? m[0] : "sonuc satiri okunamadi") + "\n" + r.stdout.slice(0, 800)
  );
}

console.log("\nSonuc: " + gecen + " gecti, " + dusen + " dustu.");
process.exit(dusen ? 1 : 0);
