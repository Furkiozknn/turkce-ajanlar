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
      ilk: (await p.locator(".kart").count()) ? await p.locator(".kart h3").first().innerText() : "",
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
  // Canli sitede (Pages) gelen ziyaretcinin kurulumu tamamlayabilmesi icin:
  // yalniz "plugin install" yazmak yetmez, pazar yeri once eklenmeli; ve
  // sayfadan kaynaga donen bir baglanti olmali (eskiden hic yoktu).
  const eklerNot = await p.locator(".ekler-not").innerText();
  ol("plugin kurulumu pazar yeri ekleme adimiyla basliyor",
    /claude plugin marketplace add Furkiozknn\/turkce-ajanlar/.test(eklerNot) &&
      eklerNot.indexOf("marketplace add") < eklerNot.indexOf("plugin install"),
    eklerNot.replace(/\s+/g, " ").slice(0, 160));
  const depo = p.locator("footer a#depo-baglanti");
  ol("altbilgide kaynak depoya baglanti var",
    (await depo.count()) === 1 &&
      (await depo.getAttribute("href")) === "https://github.com/Furkiozknn/turkce-ajanlar");

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

  // ------------------------------------------------- yenileme (29 Eylul 2026)
  // Ilk 30 saniye, katalog suzgecleri, TR/EN kabugu, kontrast, sade hareket.
  const kok2 = path.resolve(__dirname, "..");
  const ajanDosyalari = fs.readdirSync(path.join(kok2, "agents")).filter((f) => f.endsWith(".md"));
  const yazanSayisi = ajanDosyalari.filter((f) => {
    const m = fs.readFileSync(path.join(kok2, "agents", f), "utf8").match(/^tools:\s*(.*)$/m);
    return m && /"(Write|Edit)"/.test(m[1]);
  }).length;

  // WCAG kontrast orani: sayfada hesaplanir (renk uzayi tarayicinin kendisinden).
  const kontrastOlc = (pg, secici) => pg.evaluate((sel) => {
    const yuk = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
      return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const zemin = (e) => {
      for (let n = e; n; n = n.parentElement) {
        const c = yuk(getComputedStyle(n).backgroundColor);
        if (c.a > 0.95) return c;
      }
      return { r: 14, g: 13, b: 11, a: 1 };
    };
    return [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null || e === document.body).slice(0, 6).map((e) => {
      const f = yuk(getComputedStyle(e).color), z = zemin(e);
      const a = lum(f), b = lum(z);
      return { sel, oran: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  }, secici);
  const KONTRAST_SECICILER = [
    "body", ".lead", ".marka", ".kur-etiket", ".kur-satir code", ".kur-not", ".kutu li", ".kutu.evet h2",
    ".sayac", "kbd", ".dil-notu", ".suz", ".suz[aria-pressed=true]", ".dil button", ".dil button[aria-pressed=true]",
    ".tema-dugme", "button.eylem", ".kart h3", ".kart p", ".kart .sinir", ".cip.soz", ".yaz-etiket", ".ekler-not", ".ek-aciklama",
    ".tur", "footer p", "footer a", "a",
  ];

  console.log("\n— Ilk 30 saniye (masaustu ve mobil) —");
  for (const [ad, vp, mob] of [["masaustu", { width: 1280, height: 800 }, false], ["mobil", { width: 390, height: 844 }, true]]) {
    const c = await tarayici.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, locale: "tr-TR" });
    const g = await c.newPage();
    await g.goto(ADRES, { waitUntil: "load" });
    const ilk = await g.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const h1 = r("h1"), kur = r("#kur-kopyala"), komut = r("#kur-komut");
      return {
        h1: document.querySelector("h1").innerText,
        h1Alt: h1.bottom, kurAlt: kur.bottom, komutAlt: komut.bottom, kurBoy: kur.height,
        vh: window.innerHeight,
        main: document.querySelectorAll("main").length,
        atla: !!document.querySelector("a.atla[href='#icerik']"),
        h1Sayisi: document.querySelectorAll("h1").length,
      };
    });
    const yazi = await g.evaluate(async () => { await document.fonts.ready; return [document.fonts.check('40px "League Gothic"'), document.fonts.check('13px "JetBrains Mono"'), getComputedStyle(document.querySelector("h1")).fontFamily]; });
    ol(ad + ": gomulu yazi tipleri (League Gothic, JetBrains Mono) gercekten yuklendi", yazi[0] && yazi[1], yazi.join(" | "));
    ol(ad + ": h1 tek ve tek cumlelik tanim var", ilk.h1Sayisi === 1 && /türkçe/i.test(ilk.h1) && /71 alt-ajan/.test(await g.locator(".lead").innerText()), ilk.h1);
    ol(ad + ": kurulum komutu ve kopyala dugmesi ilk ekranda", ilk.kurAlt <= ilk.vh && ilk.komutAlt <= ilk.vh, ilk.kurAlt + " <= " + ilk.vh);
    ol(ad + ": kopyala dugmesi dokunma icin yeterli", ilk.kurBoy >= 44, ilk.kurBoy + "px");
    ol(ad + ": tek main bolgesi ve icerige atla baglantisi", ilk.main === 1 && ilk.atla);
    const komut = await g.locator("#kur-komut").innerText();
    ol(ad + ": kurulum satiri iki gercek komutu iceriyor",
      /^claude plugin marketplace add Furkiozknn\/turkce-ajanlar; claude plugin install turkce-ajanlar@turkce-ajanlar$/.test(komut), komut);
    await c.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await g.click("#kur-kopyala");
    await g.waitForTimeout(150);
    const pano = await g.evaluate(() => navigator.clipboard.readText().catch(() => "?"));
    ol(ad + ": kopyala dugmesi kurulum satirini panoya koyuyor", pano === komut, pano.slice(0, 40));
    ol(ad + ": kopyalayinca dugme geri bildirim veriyor", /Kopyalandı/.test(await g.locator("#kur-kopyala").innerText()));
    const tasma = await g.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ol(ad + ": yatay tasma yok (yeni ilk ekran)", tasma <= 0, tasma + "px");
    await c.close();
  }

  console.log("\n— Katalog suzgecleri —");
  {
    const c = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" });
    const g = await c.newPage();
    await g.goto(ADRES, { waitUntil: "load" });
    const grupSayisi = await g.locator("#grup-suz .suz").count();
    ol("grup suzgeci: Tumu + 11 grup", grupSayisi === 12, grupSayisi + " dugme");
    const grupsuz = await g.evaluate(() => AJANLAR.filter((a) => !a.grup).map((a) => a.ad));
    ol("her ajan bir gruba ait (README'de eksik ajan yok)", grupsuz.length === 0, grupsuz.join(", "));
    await g.locator("#grup-suz .suz", { hasText: "Güvenlik" }).click();
    const gs = await g.evaluate(() => ({ n: document.querySelectorAll(".kart").length,
      hepsiAyni: AJANLAR.filter((a) => a.grup === "Güvenlik ve gizlilik").length }));
    ol("grup suzgeci yalniz o grubu gosteriyor", gs.n === gs.hepsiAyni && gs.n > 0 && gs.n < 71, gs.n + " kart");
    ol("basili grup dugmesi aria-pressed=true", (await g.locator("#grup-suz .suz[aria-pressed=true]").count()) === 1);
    await g.fill("#arama", "sir");
    await g.waitForTimeout(80);
    ol("arama grup suzgeciyle birlikte calisiyor", (await g.locator(".kart").count()) >= 1 && (await g.locator(".kart h3").first().innerText()).includes("sir-avcisi"));
    await g.fill("#arama", "");
    await g.locator("#grup-suz .suz").first().click();
    ol("Tumu suzgeci temizliyor", (await g.locator(".kart").count()) === 71);

    await g.locator("#yetki-suz .suz[data-yetki=oku]").click();
    const oku = await g.locator(".kart").count();
    await g.locator("#yetki-suz .suz[data-yetki=yaz]").click();
    const yaz = await g.locator(".kart").count();
    ol("yetki suzgeci: yazabilen ajan sayisi agents/ ile ayni", yaz === yazanSayisi && oku === 71 - yazanSayisi, "yaz=" + yaz + " oku=" + oku + " beklenen yaz=" + yazanSayisi);
    ol("yazabilen kartlarda 'yazabilir' etiketi var", (await g.locator(".kart .yaz-etiket").count()) === yaz);
    await g.locator("#yetki-suz .suz").first().click();
    ol("sayac suzgece gore guncelleniyor", /71 ajan/.test(await g.locator("#sayac").innerText()));
    await g.locator("#grup-suz .suz", { hasText: "Veri" }).first().click();
    ol("sayac 'k / n ajan' bicimine geciyor", /^\d+ \/ 71 ajan$/.test((await g.locator("#sayac").innerText()).trim()), await g.locator("#sayac").innerText());
    await c.close();
  }

  console.log("\n— Dil (TR / EN) —");
  {
    // Varsayilan: tarayici dili.
    const c = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
    const g = await c.newPage();
    const hata = [];
    g.on("pageerror", (e) => hata.push(e.message));
    await g.goto(ADRES, { waitUntil: "load" });
    ol("en-US tarayici: arayuz Ingilizce basliyor", (await g.evaluate(() => document.documentElement.lang)) === "en" && /Turkish agents/i.test(await g.locator("h1").innerText()));
    ol("EN: kurulum, arama ve suzgec metinleri Ingilizce",
      /install/i.test(await g.locator(".kur-etiket").innerText()) &&
      /Search/.test(await g.locator("#arama").getAttribute("placeholder")) &&
      /All/.test(await g.locator("#grup-suz .suz").first().innerText()) &&
      /Read-only/.test(await g.locator("#yetki-suz .suz[data-yetki=oku]").innerText()));
    ol("EN: 'Turkce aciklamalar' durust notu gorunuyor", await g.locator("#dil-notu").isVisible());
    ol("EN: grup adlari cevrilmis", /Security/.test(await g.locator("#grup-suz").innerText()));
    ol("EN: ajan aciklamasi Turkce kaliyor (uydurma ceviri yok)", /[ıüğşçö]|ajan|denetle|inceler|bulur/i.test(await g.locator(".kart p").first().innerText()));
    ol("EN: komut/beceri etiketleri cevrildi", /^(command|skill)$/i.test((await g.locator("#ekler-liste .tur").first().innerText()).trim()));
    await g.locator(".kart").first().click();
    await g.waitForTimeout(150);
    ol("EN: detay penceresi Ingilizce", /what it does/i.test(await g.locator(".detay-govde").innerText()) && /install and use/i.test(await g.locator(".detay-govde").innerText()));
    await g.keyboard.press("Escape");
    ol("EN: altbilgi Ingilizce", /Last updated/.test(await g.locator("footer").innerText()));
    // Elle degistirme ve hatirlama.
    await g.click("#dil-tr");
    ol("TR dugmesi arayuzu Turkceye ceviriyor", /türkçe ajanlar/i.test(await g.locator("h1").innerText()) && (await g.evaluate(() => document.documentElement.lang)) === "tr");
    ol("secim localStorage'a yaziliyor", (await g.evaluate(() => localStorage.getItem("dil"))) === "tr");
    ol("dil dugmesi aria-pressed durumunu tasiyor", (await g.locator("#dil-tr").getAttribute("aria-pressed")) === "true" && (await g.locator("#dil-en").getAttribute("aria-pressed")) === "false");
    await g.reload({ waitUntil: "load" });
    ol("secim yenilemeden sonra da geciyor (en-US tarayicida bile Turkce)", (await g.evaluate(() => document.documentElement.lang)) === "tr");
    await g.click("#dil-en");
    ol("EN dugmesi geri ceviriyor", /Turkish agents/i.test(await g.locator("h1").innerText()));
    ol("dil degisince konsol hatasi yok", hata.length === 0, hata.join("|"));
    await c.close();

    const ct = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" });
    const gt = await ct.newPage();
    await gt.goto(ADRES, { waitUntil: "load" });
    ol("tr-TR tarayici: arayuz Turkce basliyor", (await gt.evaluate(() => document.documentElement.lang)) === "tr");
    ol("TR: 'Turkce aciklamalar' notu gizli", await gt.locator("#dil-notu").isHidden());
    await ct.close();
  }

  console.log("\n— Kontrast (WCAG 2.1 AA, en az 4.5:1) —");
  for (const [tema, dil] of [["dark", "tr-TR"], ["light", "tr-TR"], ["dark", "en-US"], ["light", "en-US"]]) {
    const c = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: dil });
    const g = await c.newPage();
    await g.addInitScript((t) => { try { localStorage.setItem("tema", t); } catch {} }, tema);
    await g.goto(ADRES, { waitUntil: "load" });
    const dusuk = [];
    for (const s of KONTRAST_SECICILER) {
      for (const o of await kontrastOlc(g, s)) if (o.oran < 4.5) dusuk.push(s + "=" + o.oran.toFixed(2));
    }
    // acik detay penceresi de
    await g.locator(".kart").first().click();
    await g.waitForTimeout(650);
    for (const s of [".detay-govde h3", "#d-aciklama", ".meta", "ul.tetik li", ".adim-baslik", ".adim-alt", "pre", "ol.adimlar > li.etkin .adim-baslik", ".satir-kod code", ".detay-ust h2"]) {
      for (const o of await kontrastOlc(g, s)) if (o.oran < 4.5) dusuk.push(s + "=" + o.oran.toFixed(2));
    }
    ol("kontrast: " + tema + " tema, " + dil + " (tum metin >= 4.5:1)", dusuk.length === 0, dusuk.join(", "));
    await c.close();
  }

  console.log("\n— Sade hareket ve klavye —");
  {
    const c = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR", reducedMotion: "reduce" });
    const g = await c.newPage();
    await g.goto(ADRES, { waitUntil: "load" });
    await g.locator(".kart").first().click();
    await g.waitForTimeout(100);
    const an = await g.evaluate(() => getComputedStyle(document.querySelector("dialog")).animationName);
    ol("prefers-reduced-motion: detay penceresi animasyonsuz", an === "none", an);
    const gec = await g.evaluate(() => getComputedStyle(document.querySelector(".kart")).transitionDuration);
    ol("prefers-reduced-motion: kart gecisi kapali", /^0s(, 0s)*$/.test(gec), gec);
    await c.close();

    const c2 = await tarayici.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" });
    const g2 = await c2.newPage();
    await g2.goto(ADRES, { waitUntil: "load" });
    const an2 = await (async () => { await g2.locator(".kart").first().click(); await g2.waitForTimeout(80); return g2.evaluate(() => getComputedStyle(document.querySelector("dialog")).animationName); })();
    ol("normal modda detay penceresi iris animasyonu kullaniyor", an2 === "iris", an2);
    await g2.keyboard.press("Escape");
    // Klavye yolu: Tab ile atla baglantisi -> dil -> tema -> kur dugmesi.
    await g2.goto(ADRES, { waitUntil: "load" });
    await g2.keyboard.press("Tab");
    ol("ilk Tab 'icerige atla' baglantisina gidiyor", (await g2.evaluate(() => document.activeElement.className)) === "atla");
    const sira = [];
    for (let i = 0; i < 4; i++) { await g2.keyboard.press("Tab"); sira.push(await g2.evaluate(() => document.activeElement.id || document.activeElement.tagName)); }
    ol("Tab sirasi: TR, EN, tema, kurulum kopyala", sira.join(",") === "dil-tr,dil-en,tema,kur-kopyala", sira.join(","));
    const halka2 = await g2.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + " " + s.outlineWidth; });
    ol("odaktaki kopyala dugmesinin gorunur halkasi var", /solid/.test(halka2) && parseFloat(halka2.split(" ")[1]) >= 2, halka2);
    await c2.close();
  }

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
