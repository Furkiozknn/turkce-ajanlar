# Katkıda bulunma

Bu depo Claude Code için **sekiz** Türkçe alt-ajan taşıyor. Katkı kabul
ediyor — ama hedefi koleksiyonu büyütmek değil. Rakip koleksiyonlarda
39 bin yıldız ve 172 ajan var; buradaki fark sayı değil, her ajanın
gerçekten kullanılıyor ve doğrulanmış olması.

Aşağıdaki kurallar bunu korumak için. Uzun görünüyorlar ama çoğu tek
komutla kontrol ediliyor: `node arac/dogrula.js` (ajanlar) ve
`node arac/eklenti-dogrula.js` (komutlar ve beceriler).

---

## Kısa yol

Aceleci için sıra bu:

1. `agents/yeni-ajan.md` yaz (frontmatter + gövde).
2. `node arac/dogrula.js` çalıştır — 0 hata, 0 uyarı olsun.
3. `node arac/web-uret.js` ve `node arac/banner-uret.js` ile türetilmiş
   dosyaları yenile.
4. `node arac/dogrula-test.js` çalıştır (doğrulayıcıya dokunduysan şart).
5. Türkçe commit mesajıyla commit at, PR aç.

Komut (`commands/<ad>.md`) ya da beceri (`skills/<ad>/SKILL.md`) ekliyorsan
aynı sıra geçerli; doğrulayıcı `node arac/eklenti-dogrula.js`. Beceri
adı klasör adıyla aynı olmalı, `description` alanı tetikleyici ifadeleri
taşımalı — Claude beceriyi ona bakarak yükler.

Detaylar aşağıda.

---

## 1. Önce: bu ajan gerçekten gerekli mi

Her ajan tanımı **her oturumda bağlama giriyor**. Bir ajan eklemenin
bedeli var; sadece faydası değil. PR açmadan önce üçüne birden "evet"
diyebiliyor olmalısın:

- **Bunu gerçekten yaptım mı?** Ajanı en az bir gerçek işte
  çalıştırdın mı, yoksa "olsa iyi olurdu" diye mi yazdın? Bu depodaki
  sekiz ajanın hepsi gerçek bir işten doğdu.
- **Mevcut bir ajanın işi değil mi?** `betik-ustasi` zaten PowerShell
  yazıyor; "powershell-uzmani" ikinci bir ajan değil, birincinin
  eksiğidir. Eksikse birincisini düzelt.
- **Genel bir "uzman" değil mi?** "Yazılım mimarı", "DevOps uzmanı"
  gibi tanımlar hiçbir şeyi daraltmaz; Claude bunları zaten yapar.
  İyi ajan bir **rolü** değil bir **davranış disiplinini** taşır:
  neye bakacağını, neyi yazmayacağını, çıktının biçimini.

Reddedilen bir ajan fikri kaybedilmiş emek değil — kabul edilen kötü
bir ajan, kalan yedisini de değersizleştirir.

---

## 2. Dosya yeri ve frontmatter

Ajanlar `agents/` altında düz markdown. Dosya adı ajanın adıyla
birebir aynı olmalı: `agents/hata-avcisi.md` → `name: hata-avcisi`.

```yaml
---
name: hata-avcisi
description: Başarısız bir çalıştırmanın kök nedenini bulur — ... Kullanıcı "bu neden hata verdi", "log'a bak" dediğinde kullan. Kodu kendisi düzeltmez.
model: inherit
color: red
tools: ["Read", "Grep", "Glob", "Bash"]
---
```

| Alan | Zorunlu | Ne yazılır |
|---|---|---|
| `name` | evet | kebab-case: sadece `a-z`, `0-9` ve tek tire. Dosya adıyla aynı. Türkçe harf **kullanma** — çağırma adıdır. |
| `description` | evet | Claude'un ajanı seçerken okuduğu tek metin. En az 40 karakter, Türkçe, tetikleyici ifade içermeli. Bkz. bölüm 3. |
| `model` | hayır | `inherit`, `opus`, `sonnet`, `haiku`, `fable` ya da tam bir `claude-...` kimliği. Sebebin yoksa `inherit` yaz — kullanıcının seçtiği modelle çalışır. |
| `color` | hayır | Arayüzde ayırt etmek için. Serbest: `red`, `blue`, `green`, `purple`, `orange`, `cyan`, `yellow`. Doğrulayıcı denetlemez. |
| `tools` | hayır | Ajanın erişebileceği araçlar. Yazmazsan **hepsini** devralır. Bkz. bölüm 5. |
| `skills` | hayır | Başlangıçta **tam içerikle** yüklenen beceriler (`skills/<ad>/SKILL.md`). Rapor yazan ajana `turkce-rapor`, betik yazana `windows-tuzaklari`. Her beceri bağlama girer; gerekmeyene ekleme. |
| `disallowedTools` | hayır | Devralınan ya da `tools` ile verilen listeden düşülen araçlar. Salt okur ajanlarda `["Write", "Edit"]` — `Bash` kalır, o yüzden "salt okur" vaadi gövdedeki kuralla tamamlanır. |

Başka alan yazma — doğrulayıcı `bilinmeyen frontmatter alani` uyarısı
verir. Dosya UTF-8 olmalı, **BOM'suz** (`.ps1` dosyalarının tersine;
oradaki kural markdown için geçerli değil).

---

## 3. `description` — en çok emek isteyen alan

Ajanın kendisi ne kadar iyi olursa olsun, `description` zayıfsa Claude
o ajanı **hiç çağırmaz**. İyi bir açıklama üç şey söyler:

1. **Ne yapar** — bir cümle, somut.
2. **Ne zaman çağrılır** — kullanıcının ağzından çıkacak cümleler,
   tırnak içinde. Bu en etkili kısım.
3. **Ne yapmaz** — sınırı. Yanlış ajanın seçilmesini engeller.

```yaml
description: Bir klasörü düzenler — tarihe/türe/projeye göre ayırma,
  yeniden adlandırma, yinelenen dosya bulma, arşivleme. Kullanıcı
  "şu klasörü düzenle", "bunları ayır", "yinelenenleri bul",
  "indirilenleri toparla" dediğinde kullan. Asla kalıcı silmez;
  her toplu işlemden önce planı yazar.
```

Doğrulayıcı burada üç şey arıyor:

- 40 karakterden uzun (kısa açıklama seçim için yetersiz),
- Türkçe'ye özgü en az bir harf (`ç ğ ı ö ş ü`),
- ya tırnak içinde 3–80 karakterlik bir örnek ifade, ya da
  "... dediğinde kullan" kalıbı.

Tırnaklı örnek yoksa hata değil **uyarı** alırsın; ama pratikte
tırnaklı kalıplar belirgin biçimde daha iyi eşleşiyor. Yaz.

---

## 4. Gövde: ajanın asıl talimatı

Frontmatter'dan sonrası ajanın sistem promptu. Depodaki sekizi ortak
bir iskelet kullanıyor — mecburi değil ama sebepsiz sapma:

```markdown
Sen bir <rol>sün. İşin **<tek cümlede iş>**. <Ne olmadığı>.

## Mutlak kurallar
Numaralı, kısa, ihlal edilemez maddeler. "Değiştirme", "kanıtsız
yazma", "uydurma" gibi. En fazla beş tane — hepsi mutlaksa hiçbiri
mutlak değildir.

## Sıralama
Ajan işe nereden başlar, sonra ne yapar. Numaralı adımlar, her adımda
çalıştırılacak gerçek komutlar.

## Dürüstlük disiplini
Bkz. bölüm 5.

## Çıktı
Raporun tam markdown iskeleti, kod bloğu içinde. Ajanın her çalıştırmada
aynı biçimde döndüğünden emin olmanın tek yolu.
```

Üç pratik kural:

- **Komut yaz, tarif etme.** "Log'ları incele" yerine
  `grep -n "HATA\|Traceback" <log> | head -20`. Ajan komutu kopyalar,
  tarifi yorumlar.
- **Bu makineye özgü olanı içine göm.** PowerShell 5.1'de `&&` yok,
  Python PATH'te yok, heredoc ters bölüyü yiyor. Bunlar
  [`BILINEN-TUZAKLAR.md`](BILINEN-TUZAKLAR.md) dosyasında; ajanın işine
  dokunanları gövdeye yaz — ajan o dosyayı okumaz.
- **Gövde en az 200 karakter.** Altında kalırsa doğrulayıcı uyarır;
  o kadar kısa bir talimat zaten bir ajanı hak etmiyordur.

---

## 5. `tools`: ne verirsen onu yapar

Alan yazılmazsa ajan **tüm araçları** devralır. Bu genelde istenmez:
salt okuma yapması gereken bir denetçinin `Write` alması, ilk fırsatta
"düzelttim" demesine yol açar. Rol salt okumaysa `Write`/`Edit` verme.

Geçerli adlar (kurulu `claude` ikilisinden çıkarıldı, uydurulmadı):

```
Task  Agent  Bash  BashOutput  KillShell  Glob  Grep  Read  Edit
MultiEdit  Write  NotebookEdit  WebFetch  WebSearch  TodoWrite
ExitPlanMode  Skill  AskUserQuestion  ListMcpResources  ReadMcpResource
```

`mcp__sunucu__arac` biçimindeki MCP araç adları da geçerli. `MultiEdit`
artık önerilmiyor — kullanırsan uyarı alırsın. Listede olmayan bir ad
**hata**dır; "PowerShell" diye bir araç yok, Windows komutları da
`Bash` üzerinden değil, kullanıcının kabuğundan çalışır.

---

## 6. Dürüstlük disiplini neden var

Her ajanın gövdesinde bir "Dürüstlük disiplini" bölümü var. Bu süs
değil, bu setin **varlık sebebi**.

Yaygın ajan promptları "kapsamlı ol", "hiçbir şeyi kaçırma", "en az
5 bulgu ver" der. Bunun sonucu tahmin edilebilir: model boşluğu
doldurur. Uydurma bulgu üretir, listeyi hedeflenen sayıya tamamlar,
doğrulamadığı bir sürüm numarasını hatırdan yazar, "muhtemelen"i
"öyle"ymiş gibi sunar. Bu depoda üçü de **gerçekten yaşandı**:

- `repo-denetci` öneri listesini beşe tamamlamak için dolgu madde
  yazıyordu — "en fazla 5" ifadesini hedef sanmıştı.
- `dosya-duzenleyici` bir dosyanın tarihini hatırdan uydurdu
  (04.01.2026 dedi; gerçek `mtime` 2026-01-20'ydi).
- İlk turda ajanların hiçbirinde "bulamadım da" izni yoktu; boş bir
  sonuç yerine zayıf bir sonuç üretiyorlardı.

Üçü de ajan dosyasına eklenen birer kuralla düzeldi. Ders şu: **model
kötü niyetli değil, boşluğu doldurmaya eğilimli.** Boşluk bırakmayan
bir prompt yazmak senin işin.

Yeni ajanın disiplin bölümünde en az şunlar olsun:

- **Bulamadıysan bulamadım de.** Boş sonuç geçerli bir sonuçtur ve
  bunu açıkça yazan bir cümle bulunsun.
- **Tavanı hedef sanma.** "En fazla 5" yazdıysan "beşe tamamlama,
  ikiyse iki yaz" diye de yaz.
- **Doğrulanmamışı işaretle.** Rakam, tarih, sürüm, dosya yolu —
  komut çıktısından kopyalanır, hatırdan yazılmaz. Yazılamıyorsa
  başına "doğrulanmadı" konur.
- **Emin değilsen hangi komutun eleyeceğini söyle.** "Muhtemelen A ya
  da B" bir cevap değil, işi kullanıcıya geri atmaktır.

Bir ajanı düzeltirken de aynı ölçü: bulguyu kaynağında doğrula, sonra
yaz. Bu rehberi yazan oturum da `dogrula.js` kaynağını satır satır
okuyup öyle yazdı — yukarıdaki kural listesi hatırdan değil.

---

## 7. Türetilmiş dosyaları yenile

`web/index.html`, `assets/banner.svg`, `assets/ekran-goruntusu*.png` ve
`.claude/agents/` altındaki kopyalar **türetilmiş** dosyalardır. Tek kaynak
`agents/*.md`. Bir ajan ekler, siler veya `description`'ını değiştirirsen
hepsini yenile:

```powershell
node arac/web-uret.js       # web/index.html
node arac/banner-uret.js    # assets/banner.svg
powershell -ExecutionPolicy Bypass -File kur.ps1   # yerel .claude/agents/

# README'deki arayuz gorseli (ayri bir pencerede sunucu acikken)
node arac/sunucu.js 8789
node arac/ekran-goruntusu.js http://127.0.0.1:8789/
```

`ekran-goruntusu.js` ve `web-test.js` Playwright'ı **bağımlılık olarak
istemez**, makinede kurulu kopyayı kullanır. Bulamazsa `2` ile çıkar —
"geçti" sanma. Yolunu ortam değişkeniyle verirsin:

```powershell
$env:NODE_PATH   = "<playwright'in bulundugu>\node_modules"
$env:CHROME_YOL  = "$env:LOCALAPPDATA\ms-playwright\chromium-<surum>\chrome-win64\chrome.exe"
```

Ajan sayısı değiştiyse README'nin başındaki **"ajan: 8" rozetini** ve
"Neden bu var" bölümündeki karakter ölçümünü de güncelle — ikisi elle
yazılıyor, üretilmiyor.

Bu bir kez unutuldu ve depoda üç yeni ajan varken web arayüzü beş ajan
göstermeye devam etti. `kur.ps1` sadece senin makineni etkiler, PR'a
girmez; ilk ikisinin çıktısı commit'lenir.

Arayüzü elle görmek istersen:

```powershell
node arac/sunucu.js 8787    # http://127.0.0.1:8787 — sadece yerel
```

---

## 8. PR göndermeden önce: `dogrula.js`

**Bu adım zorunlu.** Doğrulayıcı geçmeyen PR bakılmadan geri gider.

```powershell
node arac/dogrula.js                        # agents/ altındaki her şey
node arac/dogrula.js agents/yeni-ajan.md    # tek dosya
node arac/dogrula.js --kati                 # uyarılar da hata sayılır
```

Hata varsa çıkış kodu **1**, temizse **0** olur; bir kancaya ya da CI
adımına doğrudan bağlanabilir. Hedef: `--kati` ile de geçmek. Depodaki
sekiz ajan şu an 0 hata, 0 uyarı ile geçiyor; bu çıtayı düşürme.

Ne bakıyor:

| Kontrol | Sonuç |
|---|---|
| frontmatter var ve ayrıştırılabiliyor | hata |
| `name` dolu ve kebab-case | hata |
| `name` dosya adıyla aynı | uyarı |
| `description` dolu, ≥ 40 karakter, Türkçe | hata |
| `description` tetikleyici ifade içeriyor | hata |
| `description` tırnaklı örnek içeriyor | uyarı |
| `tools` geçerli araç adları | hata |
| `tools` boş liste | hata |
| `tools` yok | uyarı |
| `model` tanınan bir değer | uyarı |
| bilinmeyen frontmatter alanı | uyarı |
| gövde boş değil | hata |
| gövde ≥ 200 karakter | uyarı |
| gövde Türkçe (harf + işlev sözcüğü sayımı) | hata |
| dosya BOM'suz | uyarı |

Doğrulayıcının kendi testi de var. `arac/dogrula.js` içinde bir şey
değiştirdiysen bunu çalıştırmadan PR açma:

```powershell
node arac/dogrula-test.js   # geçici klasörde bozuk örnekler üretir
```

Web arayüzüne dokunduysan, makinede Playwright kuruluysa:

```powershell
node arac/sunucu.js 8788        # ayrı bir pencerede
node arac/web-test.js http://127.0.0.1:8788/
```

`web-test.js` Playwright bulamazsa **2** ile çıkar — "geçti"
sanılmasın diye. 0 dönmediyse test koşmamıştır.

---

## 9. Commit ve PR

- **Commit mesajı Türkçe.** Ne yapıldığını yazan bir başlık satırı;
  gerekiyorsa boş satır ve gövde. Şu depodaki örnek:
  `Ajan kalite turu: üç ajan gerçek iş çıktısına göre düzeltildi`.
- **Bir PR bir iş.** Yeni ajan + arayüz düzeltmesi + README değişikliği
  aynı PR'da olmasın.
- **PR açıklamasında şunlar olsun:** ajanı hangi gerçek işte
  çalıştırdın, çıktısı ne oldu, `dogrula.js` çıktısı ne dedi. "Yazdım,
  herhalde çalışıyor" yeterli değil — bu depodaki hiçbir dosya öyle
  girmedi.
- Türetilmiş dosyaları (`web/index.html`, `assets/banner.svg`,
  `assets/ekran-goruntusu*.png`) yenilediysen **onları da commit'le**;
  yenilemediysen PR'da söyle.

---

## 10. Ajan dışı katkılar

`arac/` altındaki script'ler bağımlılıksız Node. Kural üç tane:

- **Bağımlılık ekleme.** `node_modules` yok, `package.json` yok;
  depoyu klonlayan kişi hemen çalıştırabiliyor. Playwright istisna,
  o da yalnızca teste özel ve yoksa test atlanıyor.
- **Konsol çıktısı ASCII.** Windows'ta cp1254 konsolunda Türkçe harf
  bozuluyor. Kaynak dosyadaki yorumlar da bu yüzden ASCII. Kullanıcıya
  giden **belgeler** ve **ajanlar** tam Türkçe; script çıktısı değil.
- **Yazdığını çalıştır.** Script yazdıysan koştur ve çıktısını PR'a
  yapıştır.

Bir dosyayı kaldırman gerekiyorsa **kalıcı silme** — `_eski/` altına
taşı.

---

## 11. Dil

Ajanlar, belgeler, raporlar ve commit mesajları Türkçe. Kod
tanımlayıcıları ve script konsol çıktısı ASCII/İngilizce olabilir.

Bu bir çeviri projesi değil: ajanlar Türkçe **düşünmek** için yazıldı,
İngilizce bir promptun Türkçeye çevrilmiş hâli değiller. Yeni bir ajanı
İngilizce yazıp çevirme — doğrulayıcı bunu çoğu zaman yakalar
(İngilizce işlev sözcüğü sayımı), ama asıl sebep bu değil: çevrilmiş
prompt Türkçe kullanıcının gerçekten kurduğu cümlelerle eşleşmiyor.

---

## Lisans

Katkıların MIT altında yayımlanır — deponun geri kalanıyla aynı.
