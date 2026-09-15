![turkce-ajanlar — Claude Code için Türkçe alt-ajan seti](assets/banner.svg)

<details>
<summary><strong>In English</strong> — what this is and why it is in Turkish</summary>

**turkce-ajanlar** is a small set of Claude Code sub-agents whose *output
language is Turkish*: code review, repository audit, file organization, data
reporting, task-file writing, Windows scripting, root-cause debugging and web
research. Eight agents plus three slash commands and two skills; the agents
install via `kur.ps1`, everything installs as a Claude Code plugin
(`.claude-plugin/`). The same source is exported to Cursor, OpenCode,
GitHub Copilot and Codex (`node arac/disari-aktar.js`).

It exists because none of the large agent collections ship a Turkish
localization, and a translated prompt is not the same as an agent that knows
the machine it runs on (PowerShell 5.1 quirks, cp1254 encoding, no Python on
PATH). Every agent also carries an *honesty discipline*: do not inflate
findings, verify before claiming, say "not checked" when it was not checked.

If you do not need Turkish output, this repository is probably not for you —
see `wshobson/agents` or `VoltAgent/awesome-claude-code-subagents` instead.
Everything below is in Turkish on purpose.

</details>

# turkce-ajanlar

[![Claude Code eklentisi](https://img.shields.io/badge/Claude%20Code-eklenti-b45309?style=flat-square)](#eklenti-olarak-önerilen)
[![11 ajan](https://img.shields.io/badge/ajan-11-4b5563?style=flat-square)](#ajanlar)
[![3 komut](https://img.shields.io/badge/komut-3-4b5563?style=flat-square)](#slash-komutları)
[![2 beceri](https://img.shields.io/badge/beceri-2-4b5563?style=flat-square)](#beceriler)
[![Dil: Türkçe](https://img.shields.io/badge/dil-T%C3%BCrk%C3%A7e-b91c1c?style=flat-square)](#neden-bu-var)
[![Bağımlılık: 0](https://img.shields.io/badge/ba%C4%9F%C4%B1ml%C4%B1l%C4%B1k-0-166534?style=flat-square)](#web-arayüzü)
[![Lisans: MIT](https://img.shields.io/badge/lisans-MIT-1f6feb?style=flat-square)](LICENSE)

**Claude Code için Türkçe alt-ajan seti.** Bir İngilizce koleksiyonun
çevirisi değil — az sayıda, gerçekten kullanılan, ve çalıştığı makinenin
tuzaklarını içine gömmüş ajanlar.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/ekran-goruntusu-koyu.png">
  <img alt="Web arayüzü: on bir ajan, arama kutusu, her kart için tetikleyici ifadeler ve ajanın sınırı" src="assets/ekran-goruntusu.png">
</picture>

<sub><code>web/index.html</code> — tek dosya, bağımlılık yok,
<code>file://</code> ile de açılır. Ajan verisi <code>agents/*.md</code>
içinden üretilip HTML'e gömülür.</sub>

## Neden bu var

Hazır alt-ajan koleksiyonları büyük ve iyi bilinen: `wshobson/agents`
39,5 bin yıldız ve 137 ayrı ajan, `VoltAgent/awesome-claude-code-subagents`
24,9 bin yıldız ve 157 ajan. İkisinde de "Türkçe" geçen tek bir dosya
yok. *(GitHub API ve kod araması, 7 Eylül 2026 — sayılar hatırdan değil,
ölçüldü.)*

Bu depo o koleksiyonların küçük bir kopyası değil; dört noktada bilerek
ters yönde duruyor.

**1. Türkçe çıktı — çeviri değil, kural.** Ajanlar Türkçe rapor yazar ve
Türkçe biçimlendirme kurallarına uyar: ondalık **virgül** (0,57), gün.ay.yıl
tarih düzeni, Türkçe büyük-küçük harf (`İ`/`ı`). Arayüzdeki arama da aynı
kurala uyar — `TÜRKÇE` yazınca `türkçe` bulunur, `turkce` yazınca da.

**2. On bir ajan, hepsi kullanılıyor.** Claude, kurulu **her** ajanın adını
ve `description`'ını her oturumda sisteme yükler; ajanın gövdesi ancak o
ajan çağrılınca okunur. Yani ajan sayısı bedava değil: 137 tanımlık bir
katalog, hiç çağırmayacağın ajanların her oturumda bağlamda durması ve
Claude'un seçim yaparken 137 aday elemesi demek. Buradaki on bir tanımın
tamamı **~3.900 karakter** — `agents/*.md` frontmatter'larındaki
`description` alanlarının toplamı, kabaca 1.250 token. Sayı için ajan
eklenmiyor; her ajanın bir gerekçesi var.

**3. Dürüstlük disiplini gövdeye gömülü.** Çoğu ajan promptu "kapsamlı ol"
der; bu da uydurma bulgu üretir — beş madde istendiği için dolguyla beşe
tamamlanan öneri listeleri, hatırdan yazılmış tarihler. Buradakiler tersini
söyler: **emin değilsen bak, bakamıyorsan işaretle, sorun yoksa "sorun yok"
de.** Her ajanda bir de açık sınır var — `arastirmaci` kod yazmaz,
`hata-avcisi` düzeltmeyi kendisi uygulamaz, `dosya-duzenleyici` kalıcı
silmez.

**4. Bu makinenin tuzakları içeride.** PowerShell 5.1'de `&&` yok, Python
`PATH`'te yok, heredoc ters bölüyü yiyor, Türkçe yerel ayarda
`[double]::TryParse("0,5")` başka sonuç verir. Bunlar burada gerçekten
yaşanmış hatalar; hepsi [BILINEN-TUZAKLAR.md](BILINEN-TUZAKLAR.md) içinde
ve ilgili ajanların gövdesinde. Genel bir "Windows uzmanı" promptunun
bilemeyeceği şeyler.

**Türkçe komşular.** "Türkçe geçen dosya yok" cümlesi yalnızca o iki büyük
koleksiyon için doğru; Türkçe odaklı küçük depolar var. 8 Eylül 2026'da
`gh api` ile ölçüldü (yıldız, son push, lisans):

| Depo | Ne | Bizimle ilişkisi |
|---|---|---|
| [`nexivionlabs/turkce-agent-skills`](https://github.com/nexivionlabs/turkce-agent-skills) | 48 kod odaklı Türkçe beceri (güvenlik, frontend, backend…), Claude/Codex/Gemini/Copilot kurulum betiği. MIT, 5 Eylül 2026'da açıldı, ★0. | **Tamamlayıcı** — onlar alan bilgisi becerisi, biz görev devralan ajan. Yan yana kurulabilir. |
| [`ahsenedakocaballi/pixel-agent-office`](https://github.com/ahsenedakocaballi/pixel-agent-office) | Claude Code eklentisi: on Türkçe alt-ajan, beş beceri, iki kanca ve ajanları canlı gösteren pixel-art ofis panosu. Lisans yok, 3 Eylül 2026'da açıldı, ★0. | **En yakın komşu.** Fark: bizde daha az ve doğrulanmış ajan, dürüstlük disiplini, Windows tuzakları, CI'da doğrulama ve dört araca dışa aktarım; onlarda görsel pano. |
| [`durmazoguzhan/turkish-humanify`](https://github.com/durmazoguzhan/turkish-humanify) | Yapay zekâ kokan Türkçeyi insan yazmış gibi yeniden yazan beceri. ★4, son push 4 Eylül 2026. | **Yanında kullan** — ajan raporunu son okumadan geçirmek için. |
| [`azizi2407/avaz`](https://github.com/azizi2407/avaz) | Türkçe metni anlamı koruyarak doğallaştıran beceri. ★2, son push 29 Ağustos 2026. | **Yanında kullan** — aynı iş, farklı yaklaşım. |

Hepsi bir haftalık ya da daha genç ve yıldızsız; canlılıklarını bir sonraki
araştırma turunda yeniden ölçeceğiz. Rakip değil harita: Türkçe isteyen
biri hangisini ne için kuracağını buradan görsün.

**Kimin işine yarar:** Windows'ta Claude Code kullanan, çıktıyı Türkçe
isteyen ve az sayıda güvenilir ajanı çok sayıda genel ajana tercih eden
biri. Türkçe çıktı istemiyorsan bu depo sana bir şey katmaz — yukarıdaki
iki büyük koleksiyon daha geniş.

## Ajanlar

| Ajan | Ne yapar |
|---|---|
| `kod-gozden-gecirici` | Doğruluk / güvenlik / bakım / performans incelemesi. 🔴 engelleyici, 🟡 öneri, 💭 not olarak önceliklendirir. Biçim tercihlerine karışmaz. |
| `repo-denetci` | Bir veya çok depoyu envanterler: canlılık, hijyen, bağımlılık, açık iş, sızmış gizli bilgi. Salt okuma. |
| `dosya-duzenleyici` | Klasör düzenler. Kalıcı silmez — `_eski/` altına taşır. Toplu işlemden önce planı log'a yazar, geri alınabilir. |
| `veri-raporcu` | CSV/Excel/JSON/Parquet'i DuckDB ile sorgular, Türkçe rapor üretir. Her rakamın arkasında gösterilen bir sorgu var. |
| `gorev-yazari` | Belirsiz bir isteği, kullanıcı yokken çalışacak eksiksiz görev dosyasına çevirir. Belirsizliği çalışma anına bırakmaz. |
| `betik-ustasi` | Windows'ta PowerShell 5.1 / Node betiği yazar ve tamir eder. Kodlama, kaçış, çıkış kodu ve zamanlayıcı tuzakları içine gömülü. Yazdığını çalıştırıp gösterir. |
| `hata-avcisi` | Başarısız bir çalıştırmanın kök nedenini log'dan kanıtla çıkarır. Kodu kendisi düzeltmez, en küçük düzeltmeyi önerir. |
| `arastirmaci` | Web araştırması yapar; yıldız, son commit, sürüm ve fiyatı `gh`/`npm`/`curl` ile doğrular. Uydurma bağlantı vermez. |
| `test-doktoru` | Test takımının bir şey kanıtlayıp kanıtlamadığını ölçer: sessizce koşmayan dosya, atlanan test, hiç test edilmeyen paketleme. Bir satırı bilerek bozup kırmızı yanıyor mu diye bakar. Test yazmaz. |
| `ci-doktoru` | GitHub Actions iş akışı kurar ve onarır; kapının gerçekten kapandığını kasıtlı bir ihlalle gösterir. Kırmızıyı `continue-on-error` ile yeşile çevirmez. |
| `turkce-metin-denetci` | Depodaki Türkçe metnin bütünlüğünü denetler: düşmüş şapkalı harf, kod sayfası hasarı, BOM, İ/ı dönüşümü, ek uyumu, terim tutarsızlığı. Salt okuma. |

## Kurulum

### Eklenti olarak (önerilen)

Depo aynı zamanda bir Claude Code eklentisidir. Kendi kopyandan kurmak
için depoyu bir pazar yeri olarak ekle, sonra kur:

```powershell
claude plugin marketplace add "D:\Repolar\turkce-ajanlar"
claude plugin install turkce-ajanlar@turkce-ajanlar
```

Depo GitHub'a çıktıktan sonra klonlamadan da olur:

```powershell
claude plugin marketplace add Furkiozknn/turkce-ajanlar
claude plugin install turkce-ajanlar@turkce-ajanlar
```

Kurulduktan sonra on bir ajan da her projede görünür. Kontrol:

```powershell
claude plugin details turkce-ajanlar
```

Kaldırmak için `claude plugin uninstall turkce-ajanlar@turkce-ajanlar`.

### Dosya kopyalayarak

Eklenti istemiyorsan `kur.ps1` ajan dosyalarını doğrudan
`.claude/agents/` altına kopyalar:

```powershell
# Bulundugun klasore (varsayilan: icinde bulunulan dizin)
powershell -ExecutionPolicy Bypass -File kur.ps1

# Baska bir projeye
powershell -ExecutionPolicy Bypass -File kur.ps1 -Proje "C:\yol\projen"

# Tum projelerde kullanilabilsin
powershell -ExecutionPolicy Bypass -File kur.ps1 -Kullanici

# Once ne yapacagini gor
powershell -ExecutionPolicy Bypass -File kur.ps1 -Deneme
```

Ajanlar `.claude/agents/` altına kopyalanır. Yeni bir Claude oturumunda
görünür olurlar.

## Kullanım

Claude'a doğal dille söylemen yeterli — ajan açıklamasındaki tetikleyici
ifadeler eşleştiğinde kendisi çağırır:

- *"şu değişikliği gözden geçir"* → `kod-gozden-gecirici`
- *"repolarımın envanterini çıkar"* → `repo-denetci`
- *"indirilenler klasörünü topla"* → `dosya-duzenleyici`
- *"bu CSV'den rapor çıkar"* → `veri-raporcu`
- *"buna gece için görev yaz"* → `gorev-yazari`
- *"bu ps1 zamanlayıcıda çalışmıyor"* → `betik-ustasi`
- *"gece çalıştırması patlamış, log'a bak"* → `hata-avcisi`
- *"bunun ücretsiz alternatifini araştır"* → `arastirmaci`

## Kendine uyarla

Ajanlar düz markdown. `agents/` altındaki dosyayı aç, kendi kurallarını
ekle, `kur.ps1` ile yeniden kur. Frontmatter alanları:

```yaml
---
name: ajan-adi           # kebab-case, cagirma adi
description: ...         # Claude bunu okuyup ne zaman cagiracagina karar verir
model: inherit           # veya sonnet / opus
color: purple
tools: ["Read", "Grep", "Glob", "Bash"]
skills: ["turkce-rapor"]          # baslangicta tam icerikle yuklenen beceriler (istege bagli)
disallowedTools: ["Write", "Edit"] # devralinan listeden dusulen araclar (istege bagli)
---
```

`description` alanı en önemlisi: Claude ajanı buna bakarak seçer.
Tetikleyici ifadeleri oraya yaz.

## Slash komutları

Plugin üç komut da taşır (`commands/`). Plugin komutları **ad-alanlıdır**:
`/turkce-ajanlar:<komut>` diye çağrılır; çıplak `/ajanlar` "Unknown command" verir.

| Komut | Ne yapar |
|---|---|
| `/turkce-ajanlar:ajanlar` | Kurulu Türkçe ajanları ve tetikleyici ifadelerini tablo olarak listeler. Salt okuma. |
| `/turkce-ajanlar:gorev <istek>` | İsteği `gorev-yazari` ile kuyruğa bırakılacak eksiksiz bir görev dosyasına çevirir; belirsizliği şimdi temizler, çalıştırmaz. |
| `/turkce-ajanlar:denetle [yol]` | Bulunduğun depoyu `repo-denetci` ile denetler; salt okuma, tek çıktı bir rapor dosyası. |

Komutlar plugin olarak kurulduğunda gelir (`claude plugin install turkce-ajanlar@turkce-ajanlar`);
tek oturumluk deneme için `claude --plugin-dir <bu depo>`. Doğrulandı: headless (`claude -p`)
çağrıda `/turkce-ajanlar:ajanlar` üç turda tabloyu üretti.

## Beceriler

İki beceri var (`skills/`). Ajan bir görevi devralıp ayrı bağlamda çalışır;
beceri ise Claude'un **kendi akışına** kural katar — konu açılınca
kendiliğinden yüklenir, elle de çağrılır (`/turkce-ajanlar:turkce-rapor`).

| Beceri | Ne zaman devreye girer | Ne katar |
|---|---|---|
| `turkce-rapor` | Türkçe rapor, özet veya denetim çıktısı yazılırken | Ondalık virgül, gün.ay.yıl, İ/ı eşlemesi, tablo ve kaynak düzeni, "bakılmadı" işareti, bulgu şişirmeme |
| `windows-tuzaklari` | Windows'ta betik ya da komut üretilirken | On üç yaşanmış tuzağın kural tablosu: `&&` yok, BOM, yerel ayar sayı okuması, cp1254, heredoc/ters bölü kaybı, git kimliği; sekiz adımlık yazma protokolü |

Neden bu ikisi: biçim kuralları ajanlardan yalnızca birinde gömülüydü
(`arastirmaci`), Windows tuzakları birkaçında; ana akış hiçbirini almıyordu.
Beceri ikisini de tek yerden herkese verir. Komut ve beceri dosyalarını
`node arac/eklenti-dogrula.js` doğrular (CI'da da koşar).

## Kanca: Türkçe biçim uyarısı

Plugin bir de kanca taşır (`hooks/hooks.json`, `PostToolUse` · `Write|Edit`).
Claude Türkçe bir `.md` dosyası yazdığında `arac/bicim-kontrol.js` dosyayı
`turkce-rapor` kurallarına göre tarar ve ihlali **uyarı** olarak Claude'a
iletir; engellemez, dosyaya dokunmaz, çıkış kodu hep 0.

| Kural | Yakalar | Önerir |
|---|---|---|
| R1 | `4.5 saat`, `0.57 oran`, `%96.5` | `4,5 saat`, `0,57 oran`, `%96,5` |
| R2 | `96%`, `% 96` | `%96` |
| R3 | `Sep 8, 2026`, `8 September 2026`, düzyazıda `2026-09-08'de` | `8 Eylül 2026` |
| R4 | `1,234,567` | `1.234.567` |

Kod blokları, satır içi kod, URL'ler, frontmatter, saatli zaman damgaları ve
dosya adları taranmaz; `agents/`, `skills/`, `commands/`, `web/` gibi tanım ve
üretim klasörleri atlanır; Türkçe harf içermeyen belgeye hiç bakılmaz.
Kesinlik geri çağırmadan önce: ilk sürümdeki "düzyazıda ISO tarih" kuralı
üç depoda 120'den fazla yanlış alarm verdi (yol haritası damgaları, "son push
2026-09-04" gibi veri alanları); kural cümle içi kullanıma ("…'de",
"tarihinde") daraltıldı ve aynı örneklemde kalan 24 bulgunun hepsi gerçek
çıktı. Test: `node arac/bicim-kontrol-test.js` (33 kontrol, CI'da koşar);
elle ölçüm: `node arac/bicim-kontrol.js --dosya <md dosyaları>`.

## Değerlendirme (eval)

`evals/` altında on bir ajanın altısı için `claude plugin eval` vakaları var
(erken erişim: `CLAUDE_CODE_WALNUT_SPIRE=1`); her vaka ajanın **sınır
cümlesini** test eder (uydurmaz, silmez, çalıştırmaz, Türkçe yazar). Kabuk
gerektiren iki vaka (`repo-denetci`, `betik-ustasi`) `evals-bash/` altında:
Windows'ta kum havuzu olmadığı için yalnızca Linux/macOS'ta koşar. Toplam
sekiz ajan kapsanıyor; en yeni üçünün (`test-doktoru`, `ci-doktoru`,
`turkce-metin-denetci`) vakası henüz yazılmadı.

Son tam koşu (8 Eylül 2026, sonnet yargıç, vaka başına 1 koşu): **6/6,
genel skor 1,00**, 842 sn, 2,65 USD. Plugin'li/plugin'siz karşılaştırması
(pilot): temiz koda "sorun yok" diyebilme 1,00 / 0,50 — plugin'siz kol temiz
koda uydurma bulgu yazdı; plugin kolu koşu başına 2–3 kat ucuz ve hızlı.

Beş turda eval'in bulup düzelttirdikleri: iki fixture hatası (para
yuvarlama, `[double]` cast kültürden bağımsız), iki rubrik hatası
(işaretlenmiş belirsizliği cezalandırma, `_eski/` literal beklentisi), bir
gerçek ajan zaafı (`gorev-yazari` bildiği ilk gece kuralını uygulamıyordu;
şablona zorunlu satır olarak indi) ve bir iyileştirme (`hata-avcisi` soruda
verilen kanıtı diskte aramasın). Ayrıntı: `raporlar/2026-09-08-eval-pilot.md`
(kullanıcı çalışma alanında). CI'a bağlı değil — koşu başına ~2,7 USD.

```powershell
$env:CLAUDE_CODE_WALNUT_SPIRE = "1"
claude plugin eval . --runs 1 --ablation none --judge-model sonnet --max-cost-usd 6 --no-publish --allow-tools WebFetch WebSearch
```

## Diğer araçlarda kullanım

Kaynak `agents/` tek; Cursor, OpenCode, GitHub Copilot ve Codex için
kopyalar `node arac/disari-aktar.js` ile üretilir ve depoda durur
(bayat kalırsa CI kırmızı yanar, `arac/disari-aktar-test.js` her dosyayı
kaynakla karşılaştırır):

| Araç | Üretilen yol | Ne değişir |
|---|---|---|
| Cursor | `.cursor/agents/<ad>.md` | `tools`/`color` düşer; `model: inherit` ve `readonly` eklenir. Cursor `.claude/agents/` klasörünü de doğrudan okur — `kur.ps1` ile kurulan ajanlar Cursor'da zaten görünür. |
| OpenCode | `.opencode/agents/<ad>.md` | Dosya adı = ajan adı; `mode: subagent`; `tools` listesi `permission` bloğuna çevrilir (`edit`, `write`, `bash`, `webfetch`, `websearch`). |
| GitHub Copilot | `.github/agents/<ad>.agent.md` | `tools` Copilot takma adlarına iner: `read`, `search`, `execute`, `edit`, `web`. Gövde sınırı 30.000 karakter; en uzun ajanımız 7 bin baytın altında. |
| Codex CLI | `.codex/agents/<ad>.toml` | TOML: `name`, `description`, `sandbox_mode`, `developer_instructions`. `model` yazılmaz, oturumdan miras alınır. |

Kendi projende kullanmak için ilgili klasörü projenin köküne kopyala
(örneğin `.cursor/agents/`); bu depoyu açtığında araç zaten görür.
Kum havuzu dürüstlüğü: on bir ajanın hepsi `Bash` taşıdığı için Cursor'da
`readonly: true`, Codex'te `read-only` **verilmez** — Bash dosya
yazabilir. Salt okuma vaadi ajan gövdesindeki kuralla, OpenCode'da ise
`edit: deny` / `write: deny` ile tutulur. Kök `AGENTS.md` bu depoda
çalışan her ajana aynı kuralları verir.

## Web arayüzü

`web/index.html` — tek dosya, bağımlılık yok, `file://` ile de açılır.
Ajan verisi `agents/*.md` frontmatter'ından üretilip HTML'e gömülür.

```powershell
node arac/web-uret.js          # ajanlardan sayfayı yeniden üret
node arac/sunucu.js 8787       # http://127.0.0.1:8787 (sadece yerel)
```

Arama ad, açıklama ve tam tanım içinde geçer ve Türkçe büyük-küçük harf
kurallarına uyar (`TÜRKÇE` yazınca `türkçe` bulunur). `/` tuşu aramaya
atlar, `Esc` aramayı temizler. Her ajanın detayında tam markdown ve
"kopyala" düğmesi var — pano engellenirse metni seçer, `Ctrl+C` yeter.

Tema sistem tercihine uyar, sağ üstten değiştirilebilir ve seçim
tarayıcıda hatırlanır.

Yukarıdaki ekran görüntüleri de üretilmiş dosyadır — arayüz değişince
yenilenir:

```powershell
node arac/sunucu.js 8789
node arac/ekran-goruntusu.js http://127.0.0.1:8789/   # assets/ekran-goruntusu*.png
```

## Doğrulama

`arac/dogrula.js` ajan dosyalarını kontrol eder: frontmatter geçerli mi,
`name` kebab-case mi, `description` dolu ve tetikleyici ifade içeriyor
mu, `tools` gerçek araç adları mı, gövde boş değil ve Türkçe mi.

```powershell
node arac/dogrula.js          # agents/ altındaki her şeyi doğrular
node arac/dogrula.js --kati   # uyarıları da hata sayar
node arac/dogrula.js agents/repo-denetci.md   # tek dosya
```

Çıktıda her dosya `OK` / `UYARI` / `HATA` ile işaretlenir. **Hata** çıkış
kodunu 1 yapar (betiği bir kancaya ya da CI adımına doğrudan
bağlayabilirsin); **uyarı** kod 0 bırakır, `--kati` ile o da hataya döner.
Sık görülen hata/uyarı mesajları ve anlamları:

| Mesaj | Ne demek | Ne yapılır |
|---|---|---|
| `dosya bos` | Dosyada frontmatter da gövde de yok | İçine `---` bloğu ve ajan talimatı yaz |
| `frontmatter bulunamadi` | Dosya `---` ile başlamıyor ya da kapanmıyor | Frontmatter'ı `---`/`---` çifti içine al |
| `dosya BOM ile basliyor` (uyarı) | Dosya UTF-8 BOM ile kaydedilmiş | Editörde "UTF-8" (BOM'suz) olarak yeniden kaydet |
| `gecersiz UTF-8 baytlari var` (uyarı) | Dosyada bozuk karakter (`�`) var, yanlış kodlamayla kaydedilmiş | UTF-8 olarak yeniden kaydet |
| `govde cok uzun` (uyarı) | Gövde 30.000 karakteri geçiyor, `disari-aktar.js` Copilot'a aktarırken keser | Ajanı bölmeyi ya da kısaltmayı düşün |
| `govde Turkce degil` / `gorunmuyor` | Türkçe'ye özgü harf hiç yok ya da İngilizce sözcük ağır bastı | Gövdeyi Türkçe yaz |

Doğrulayıcının kendi testi: `node arac/dogrula-test.js` (geçici klasörde
27 senaryo için bozuk/eksik/aşırı büyük örnekler üretir, her kuralın
gerçekten yakaladığını gösterir). Arayüzün kendi testi de var:
`node arac/web-test.js` (gerçek tarayıcıda 40 kontrol).

## Katkı

Yeni ajan yazmak, mevcut birini düzeltmek ya da araçlara dokunmak
istiyorsan: [KATKIDA-BULUNMA.md](KATKIDA-BULUNMA.md). Frontmatter
alanları, gövde iskeleti, dürüstlük disiplininin neden zorunlu olduğu
ve PR öncesi çalıştırman gereken doğrulamalar orada.

## Lisans

MIT. Al, değiştir, kullan.
