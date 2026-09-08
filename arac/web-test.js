/*
 * web-test.js — web/index.html'i gercek bir tarayicida acip
 * kullanilabilirlik iddialarini tek tek dogrular.
 *
 *   node arac/sunucu.js 8788      # ayri bir pencerede
 *   node arac/web-test.js [http://127.0.0.1:8788/]
 *
 * Playwright bu depoya bagimlilik olarak eklenmedi; makinede zaten
 * kurulu olan kopya kullanilir. Yoksa test atlanir (cikis 0 degil, 2)
 * ki "gecti" sanilmasin.
 *
 * Cikis kodu: 0 hepsi gecti, 1 basarisiz test var, 2 calistirilamadi.
 */

const path = require("path");

const ADRES = process.argv[2] || "http://127.0.0.1:8788/";

// Makinedeki playwright ve chromium'u bul.
function playwrightYukle() {
  const denenecek = [
    "playwright",
    process.env.PLAYWRIGHT_YOL,
  ].filter(Boolean);
  for (const y of denenecek) {
    try { return require(y); } catch {}
  }
  return null;
}

const pw = playwrightYukle();
if (!pw) {
  console.error("playwright bulunamadi. NODE_PATH ile yolunu ver:");
  console.error('  NODE_PATH="<...>/node_modules" node arac/web-test.js');
  process.exit(2);
}

const CHROME = process.env.CHROME_YOL || undefined;

let gecen = 0, kalan = [];
function ol(ad, kosul, ek) {
  if (kosul) { gecen++; console.log("  ok   " + ad); }
  else { kalan.push(ad); console.log("  HATA " + ad + (ek ? "  -> " + ek : "")); }
}

(async () => {
  const tarayici = await pw.chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const hatalar = [];

  // ---------------------------------------------------------------- masaustu
  const ctx = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => hatalar.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon/i.test(m.text())) hatalar.push("console: " + m.text()); });
  await p.goto(ADRES, { waitUntil: "load" });

  console.log("\n— Liste ve tarama —");
  const kartSayisi = await p.locator(".kart").count();
  ol("butun ajanlar listeleniyor", kartSayisi > 0, kartSayisi + " kart");

  // Kartta gorunen metin, ajanin ne yaptigini anlatmali; Claude'a yazilmis
  // "Sen bir ..." talimati olmamali.
  const kartMetni = await p.locator(".kart").first().innerText();
  ol("kart ozeti kullaniciya donuk (Sen bir ... degil)", !/^\s*\S+\s*\n\s*Sen bir /m.test(kartMetni), kartMetni.split("\n")[1]);
  ol("kartta tetikleyici ifade var", (await p.locator(".kart").first().locator(".cip.soz").count()) > 0);
  ol("kartta sinir/garanti satiri var", (await p.locator(".kart").first().locator(".sinir").count()) === 1);

  console.log("\n— Arama —");
  async function ara(q) {
    await p.fill("#arama", "");
    await p.fill("#arama", q);
    await p.waitForTimeout(60);
    return {
      n: await p.locator(".kart").count(),
      ilk: (await p.locator(".kart").count()) ? await p.locator(".kart h2").first().innerText() : "",
      derin: !(await p.locator("#derin-not").isHidden()),
    };
  }
  // Turkce harfli / harfsiz yazim ayni sonucu vermeli.
  for (const [a, b] of [["görev", "gorev"], ["düzenle", "duzenle"], ["gözden", "gozden"], ["ÇALIŞ", "calis"]]) {
    const x = await ara(a), y = await ara(b);
    ol('"' + a + '" ve "' + b + '" ayni sonucu veriyor', x.n === y.n && x.ilk === y.ilk, x.n + " / " + y.n);
  }
  const tam = await ara("veri-raporcu");
  ol("tam ad aramasi ilk sirada", tam.ilk.includes("veri-raporcu"), tam.ilk);
  const sozle = await ara("yinelenenleri bul");
  ol("tetikleyici cumleyle aranabiliyor", sozle.n >= 1 && sozle.ilk.includes("dosya-duzenleyici"), sozle.ilk);
  const derin = await ara("DuckDB");
  ol("govde metnine dusunce not gosteriliyor", derin.n >= 1 && derin.derin, "n=" + derin.n + " derin=" + derin.derin);
  const yok = await ara("qwertzxc");
  ol("sonuc yoksa bos durum cikiyor", yok.n === 0 && !(await p.locator("#bos").isHidden()));

  console.log("\n— Komutlar ve beceriler —");
  const fs = require("fs");
  const kok = path.resolve(__dirname, "..");
  const beklenenEk =
    fs.readdirSync(path.join(kok, "commands")).filter((f) => f.endsWith(".md")).length +
    fs.readdirSync(path.join(kok, "skills")).filter((d) => fs.existsSync(path.join(kok, "skills", d, "SKILL.md"))).length;
  const ekSayisi = await p.locator("#ekler-liste li").count();
  ol("komut ve beceri listesi kaynakla ayni sayida", ekSayisi === beklenenEk && ekSayisi > 0, ekSayisi + " / " + beklenenEk);
  await ara("denetle");
  const ekGorunen = p.locator("#ekler-liste li:not([hidden])");
  ol("arama komut/beceri listesini de suzuyor",
    (await ekGorunen.count()) === 1 && /denetle/.test(await ekGorunen.first().innerText()),
    (await ekGorunen.count()) + " gorunur");
  await ara("qwertzxc");
  ol("eslesme yoksa komut/beceri bos durumu cikiyor", !(await p.locator("#ekler-bos").isHidden()));
  await ara("");

  console.log("\n— Klavye —");
  await p.fill("#arama", "");
  await p.keyboard.press("Escape");
  await p.click("body", { position: { x: 5, y: 5 } });
  await p.keyboard.press("/");
  ol("'/' aramaya atliyor", (await p.evaluate(() => document.activeElement.id)) === "arama");
  await p.keyboard.press("ArrowDown");
  ol("ArrowDown listeye geciyor", (await p.evaluate(() => document.activeElement.className)) === "kart");
  // Odaklanan kartta gorunur bir odak halkasi olmali.
  const halka = await p.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return s.outlineStyle + " " + s.outlineWidth;
  });
  ol("odaklanan kartin gorunur halkasi var", /solid/.test(halka) && parseFloat(halka.split(" ")[1]) >= 2, halka);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(150);
  ol("Enter ile detay aciliyor", await p.evaluate(() => document.querySelector("dialog").open));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
  ol("Escape detayi kapatiyor", !(await p.evaluate(() => document.querySelector("dialog").open)));

  await p.focus("#arama");
  await p.fill("#arama", "rapor");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(150);
  ol("aramada Enter ilk sonucu aciyor", await p.evaluate(() => document.querySelector("dialog").open));
  await p.keyboard.press("Escape");
  await p.fill("#arama", "");

  console.log("\n— Detay: kopyaladiktan sonra ne yapacagim —");
  await p.locator(".kart").first().click();
  await p.waitForTimeout(200);
  const adimSayisi = await p.locator("#d-adimlar > li").count();
  ol("kur-ve-kullan adimlari var", adimSayisi === 3, adimSayisi + " adim");
  const yol = await p.locator("#d-yol").innerText();
  ol("kaydedilecek dosya yolu gosteriliyor", /^\.claude\/agents\/.+\.md$/.test(yol), yol);
  ol("3. adim yeni oturum acmayi soyluyor", /oturum/i.test(await p.locator("#ad3").innerText()));
  // Bolumler birbirine girmemeli (h3:first-child hatasi).
  const bosluk = await p.evaluate(() => {
    const a = document.querySelector("#d-aciklama");
    const h = document.querySelector("#d-tetik-blok h3");
    return h.getBoundingClientRect().top - a.getBoundingClientRect().bottom;
  });
  ol("bolum basliklari onceki metne yapismiyor", bosluk > 12, bosluk.toFixed(1) + "px");

  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await p.click("#d-kopyala");
  await p.waitForTimeout(200);
  ol("kopyalayinca 1. adim tamamlaniyor", (await p.locator("#ad1").getAttribute("class")) === "tamam");
  ol("kopyalayinca 2. adim vurgulaniyor", (await p.locator("#ad2").getAttribute("class")) === "etkin");
  const pano = await p.evaluate(() => navigator.clipboard.readText());
  ol("panoya tam markdown gitti", pano.startsWith("---") && pano.includes("name:"), pano.slice(0, 20));

  console.log("\n— Baglanti paylasimi —");
  const hash = await p.evaluate(() => location.hash);
  ol("acik ajan adres cubuguna yansiyor", /^#ajan=/.test(hash), hash);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
  ol("kapaninca adres temizleniyor", (await p.evaluate(() => location.hash)) === "");
  // Sadece hash degisirse tarayici sayfayi yeniden yuklemez; acilis
  // kodunun gercekten kostugunu gormek icin once bosa git.
  await p.goto("about:blank");
  await p.goto(ADRES + "#ajan=repo-denetci", { waitUntil: "load" });
  await p.waitForTimeout(250);
  ol("adresle dogrudan ajan aciliyor",
    (await p.evaluate(() => document.querySelector("dialog").open)) &&
    (await p.locator("#d-ad").innerText()) === "repo-denetci");
  await p.keyboard.press("Escape");

  const cikti = path.resolve(__dirname, "..", "web");
  await p.goto(ADRES, { waitUntil: "load" });
  await p.screenshot({ path: path.join(cikti, "..", "_test-masaustu.png"), fullPage: true });

  await ctx.close();

  // ------------------------------------------------------------------- mobil
  console.log("\n— Mobil (390x844) —");
  const mctx = await tarayici.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: "tr-TR",
  });
  const m = await mctx.newPage();
  m.on("pageerror", (e) => hatalar.push("mobil pageerror: " + e.message));
  await m.goto(ADRES, { waitUntil: "load" });

  const tasma = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ol("yatay tasma yok (liste)", tasma <= 0, tasma + "px");

  const dokunma = await m.evaluate(() => {
    const k = document.querySelector(".kart").getBoundingClientRect();
    const t = document.querySelector("#tema").getBoundingClientRect();
    return { kart: k.height, tema: Math.min(t.height, t.width) };
  });
  ol("kart dokunma alani yeterli", dokunma.kart >= 44, dokunma.kart + "px");
  ol("tema dugmesi dokunma alani yeterli", dokunma.tema >= 30, dokunma.tema + "px");

  await m.locator(".kart").first().click();
  await m.waitForTimeout(250);
  const olcum = await m.evaluate(() => {
    const d = document.querySelector("dialog").getBoundingClientRect();
    const g = document.querySelector(".detay-govde");
    const gr = g.getBoundingClientRect();
    const dg = document.querySelector("#d-kopyala").getBoundingClientRect();
    return {
      dTasma: document.documentElement.scrollWidth - window.innerWidth,
      govdeAlt: Math.round(gr.bottom), dialogAlt: Math.round(d.bottom),
      dialogUst: Math.round(d.top), winH: window.innerHeight,
      dugmeSag: Math.round(dg.right), dialogSag: Math.round(d.right),
      dugmeAlt: Math.round(dg.bottom),
      kaydirilabilir: g.scrollHeight > g.clientHeight,
    };
  });
  ol("yatay tasma yok (detay)", olcum.dTasma <= 0, olcum.dTasma + "px");
  ol("detay pencere icinde kaliyor", olcum.dialogAlt <= olcum.winH + 1, JSON.stringify(olcum));
  ol("govde pencereden tasmiyor", olcum.govdeAlt <= olcum.dialogAlt + 1, olcum.govdeAlt + " <= " + olcum.dialogAlt);
  ol("kopyala dugmesi ilk ekranda gorunuyor", olcum.dugmeAlt <= olcum.dialogAlt, olcum.dugmeAlt + " <= " + olcum.dialogAlt);
  ol("dugme yatayda kirpilmiyor", olcum.dugmeSag <= olcum.dialogSag, olcum.dugmeSag + " <= " + olcum.dialogSag);
  ol("detay govdesi kaydirilabilir", olcum.kaydirilabilir);

  await m.screenshot({ path: path.join(cikti, "..", "_test-mobil-detay.png") });
  await m.keyboard.press("Escape");
  await m.waitForTimeout(150);
  await m.screenshot({ path: path.join(cikti, "..", "_test-mobil-liste.png"), fullPage: true });
  await mctx.close();

  // ------------------------------------------------------------------- koyu
  console.log("\n— Koyu tema —");
  const kctx = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark", locale: "tr-TR" });
  const k = await kctx.newPage();
  k.on("pageerror", (e) => hatalar.push("koyu pageerror: " + e.message));
  await k.goto(ADRES, { waitUntil: "load" });
  const kt = await k.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { zemin: s.backgroundColor, metin: s.color, dugme: document.querySelector("#tema").textContent };
  });
  ol("koyu temada koyu zemin", /rgb\((\d+), (\d+), (\d+)\)/.test(kt.zemin) &&
    kt.zemin.match(/\d+/g).map(Number).reduce((a, b) => a + b, 0) < 200, kt.zemin);
  ol("tema dugmesi durumu yaziyor", /Açık tema/.test(kt.dugme), kt.dugme);
  await kctx.close();

  await tarayici.close();

  console.log("\n— Konsol —");
  ol("konsolda hata yok", hatalar.length === 0, hatalar.join(" | "));

  console.log("\n" + "-".repeat(52));
  console.log(gecen + " gecti, " + kalan.length + " kaldi");
  if (kalan.length) { kalan.forEach((x) => console.log("  x " + x)); process.exit(1); }
  console.log("Hepsi gecti.");
})().catch((e) => {
  console.error("test calistirilamadi: " + e.message);
  process.exit(2);
});
