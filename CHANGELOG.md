# Değişiklik günlüğü

Sürüm numarası `.claude-plugin/plugin.json` ve `marketplace.json` içindeki
`version` alanıdır. Claude Code kurulu eklentiyi **bu numaraya bakarak**
günceller: numara aynı kalırsa `claude plugin update` "already at the latest
version" der ve yeni ajanlar kullanıcıya hiç ulaşmaz. Bu yüzden `agents/`,
`commands/`, `skills/` veya `hooks/` değişen her sürümde numara artar.

Biçim Keep a Changelog düzenine yakındır; sürümler SemVer izler (`0.x`
boyunca küçük sürüm uyumu bozabilir).

## [Yayınlanmamış]

Web arayüzü ve README ilk ekranı yenilendi; ajan, komut, beceri ve kanca
davranışı değişmedi (sürüm numarası artmadı).

### Değişti
- Site FRK-OS kimliğinde: siyah zemin, krem yazı, sarı vurgu, League Gothic
  başlık, JetBrains Mono etiket (ikisi de gömülü, OFL: `arac/yazi/`).
- Arayüz Türkçe ve İngilizce (tarayıcı diline göre, seçim hatırlanır).
- Katalog gruba ve yetkiye göre süzülüyor; ilk ekranda tek satır kurulum
  ve kopyala düğmesi, "ne zaman kullanılır / kullanılmaz".
- Ajanların tam markdown'ı `web/tam.js` içinde, sayfa yüklendikten sonra geliyor.
- README ilk ekranı: tek cümle, tek satır kurulum, gerçek çıktılı demo
  (`docs/demo/`, `node arac/demo-uret.js`), kullanılır/kullanılmaz tablosu.

### Düzeltildi
- README'nin ajan tablosunda `zaman-denetci` eksikti (71 ajandan 70'i listeliydi).
- Erişilebilirlik: Lighthouse 94 → 100 (kontrast, ad uyumsuzluğu, `main` bölgesi).

### Kaldırıldı
- `docs/reel/` (sesli tanıtım) ve eski `assets/demo.gif`: kaynakları depoda yoktu, yeniden üretilemiyordu.

## [0.4.1] — 29 Eylül 2026

Güvenlik düzeltmesi. 0.4.0'daki 41 ajan dosyasında tırnaksız `description:`
değeri `: ` içeriyordu ve YAML bu satırda bozuluyordu. Claude Code bu
ajanları yalnızca dosya adıyla yüklüyor, frontmatter'ın geri kalanını sessizce
düşürüyordu: `description`, `skills`, `tools` ve `disallowedTools`. Bu yüzden
salt okur olması gereken 34 ajan da Write ve Edit dahil bütün araçları
devralıyordu. 0.4.0'ı kuranlar düzeltmeyi `claude plugin update` ile alır.

### Düzeltildi
- 41 ajanın `description` satırı çift tırnağa alındı. Metin birebir aynı kaldı.
- `arac/` altındaki ayrıştırıcılar artık tırnaklı değeri çözüyor. Katalog ve
  dışa aktarılan kopyalarda içerik değişmedi.
- `arac/web-uret.js` satır sonlarını CRLF'den LF'ye çeviriyor. Windows'ta
  üretilen katalog artık CI'dakiyle aynı çıkıyor.

### Eklendi
- CI'ya "Frontmatter gerçek YAML mi" kapısı eklendi. `yaml.safe_load` ile
  agents, commands ve skills klasörlerini ve dışa aktarılan kopyaları okuyor;
  bozuk bir dosya bulursa kırmızı yanıyor.
- `KATKIDA-BULUNMA.md`'ye `: ` içeren açıklamanın nasıl yazılacağını anlatan
  bir not eklendi.

### Doğrulandı
- `claude plugin validate .claude-plugin/plugin.json --strict`: 0.4.0'da 41 hata, bu sürümde 0.
- 71 ajanın 71'inin frontmatter'ı ayrışıyor. `tools` 71 ajanda,
  `disallowedTools` 56 ajanda liste olarak okunuyor.

## [0.4.0] — 25 Eylül 2026

0.3.0'dan bu yana kadro sekiz ajandan 71'e çıktı ama sürüm numarası
0.3.0'da kalmıştı; 0.3.0'ı kuran biri `claude plugin update` ile sekiz
ajanda kalıyordu. Bu sürüm o birikimi yayımlar.

### Eklendi
- Kadro 8 → 71 ajan: `proje-koordinatoru` ile dalga dalga çalışan ekip,
  güvenlik, veri, API, teslim, belge ve süreç grupları (`agents/`).
- Frontmatter'da `skills` ön yükleme ve `disallowedTools`; salt okur 56
  ajanın yazması kapalı.
- Aynı kaynaktan Cursor, OpenCode, GitHub Copilot ve Codex kopyaları
  (`arac/disari-aktar.js`); bayat kalırsa CI kırmızı.
- Türkçe biçim kancası (`hooks/hooks.json` → `arac/bicim-kontrol.js`).
- Sınır sözleşmesi kapısı (`arac/sinir-denetle.js`), tetikleyici ifade
  çakışma kapısı (`arac/tetik-cakisma.js`), başsız ekip koşucusu
  (`arac/ekip-kos.js`) ve on ajan için eval vakaları (`evals/`,
  `evals-bash/`).
- Web kataloğu GitHub Pages'te:
  https://furkiozknn.github.io/turkce-ajanlar/ — `web/index.html`
  değişince `master`'dan otomatik yeniden yayınlanır.
- `npm test`: model çağırmayan bütün kapılar tek komutta.

### Düzeltildi
- `arac/sunucu.js`: bozuk yüzde kodlamalı tek bir istek (`/%E0`) sunucuyu
  düşürüyordu; artık 400 döner. İstenen yol dosya sistemine hiç
  verilmiyor: yalnızca `web/` altında listelenen düz dosyalar servis
  ediliyor, `web/` dışına işaret eden sembolik bağ artık okunmuyor
  (`arac/sunucu-test.js`).
- `arac/ekip-kos.js`: ajan adı kebab-case olmak zorunda; `../commands/ajanlar`
  gibi bir ad `agents/` dışından dosya yükleyip raporu çıktı klasörünün
  dışına yazabiliyordu.
- `arac/banner-uret.js`: banner ve sosyal kartta "N ajan" etiketi tuvalin
  dışına (x=1900 / x=2932) düşüyor, hiç görünmüyordu
  (`arac/banner-uret-test.js`).
- Web kataloğu yalnızca `claude plugin install` gösteriyordu; önce gereken
  `claude plugin marketplace add Furkiozknn/turkce-ajanlar` adımı ve kaynak
  depoya bağlantı eklendi.
- `dogrula.js`: boş dosya, bozuk UTF-8 ve aşırı büyük gövde kenar durumları.
- `kur.ps1`: varsayılan hedef, betiğin yazarının diskindeki sabit yol
  yerine bulunulan dizin.

### Değişti
- CI ve Pages iş akışları Node 24 ve Node 24 tabanlı action sürümlerine
  geçti (`checkout@v7`, `setup-node@v7`, `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`).

## [0.3.0] — 8 Eylül 2026

- İki beceri: `turkce-rapor`, `windows-tuzaklari`; komut ve beceri
  doğrulayıcısı `arac/eklenti-dogrula.js`. Sekiz ajan.

## [0.2.0] — 7 Eylül 2026

- `arastirmaci`, `betik-ustasi`, `hata-avcisi` eklendi (sekiz ajan); banner,
  web arayüzü ve tarayıcı testi.

## [0.1.0] — 6 Eylül 2026

- İlk eklenti paketi: `plugin.json`, `marketplace.json`, beş ajan ve
  `kur.ps1`.

[0.4.0]: https://github.com/Furkiozknn/turkce-ajanlar/compare/4587191...HEAD
[0.3.0]: https://github.com/Furkiozknn/turkce-ajanlar/commit/4587191
[0.2.0]: https://github.com/Furkiozknn/turkce-ajanlar/commit/9207c56
[0.1.0]: https://github.com/Furkiozknn/turkce-ajanlar/commit/5ae39c9
