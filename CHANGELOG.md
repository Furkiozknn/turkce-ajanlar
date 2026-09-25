# Değişiklik günlüğü

Sürüm numarası `.claude-plugin/plugin.json` ve `marketplace.json` içindeki
`version` alanıdır. Claude Code kurulu eklentiyi **bu numaraya bakarak**
günceller: numara aynı kalırsa `claude plugin update` "already at the latest
version" der ve yeni ajanlar kullanıcıya hiç ulaşmaz. Bu yüzden `agents/`,
`commands/`, `skills/` veya `hooks/` değişen her sürümde numara artar.

Biçim Keep a Changelog düzenine yakındır; sürümler SemVer izler (`0.x`
boyunca küçük sürüm uyumu bozabilir).

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
