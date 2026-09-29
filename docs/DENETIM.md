# Denetim: turkce-ajanlar (29 Eylül 2026)

Yenilemeden önce `master` (0.4.1, `72937a5`) üzerinde, bu makinede (Windows 11, Node 24.19, Claude Code 2.1.268) ölçüldü. Ölçülmeyen bir şey yazılmadı. Ham çıktılar ve ekran görüntüleri depo dışında: `kanit/turkce-ajanlar/{once,sonra,sonra-en}/`.

## README komutları

| Komut | Sonuç |
|---|---|
| `claude plugin marketplace add Furkiozknn/turkce-ajanlar; claude plugin install turkce-ajanlar@turkce-ajanlar` | Yalıtılmış `CLAUDE_CONFIG_DIR` altında çalıştı: 71 ajan, 5 beceri/komut, 1 kanca, sürüm 0.4.1. `;` ile tek satır bash ve PowerShell 5.1'de çalışır (`&&` PowerShell 5.1'de yok). |
| `claude plugin validate .` | Geçti |
| `powershell -File kur.ps1 -Proje <temiz klasör>` | 71 ajan `.claude/agents/` altına kuruldu |
| `npm test` | 0 çıkış; 27+14+19+33+4+23+11+22 = 153 kapı testi + 45 tarayıcı testi = **198** (proje-meta ile aynı) |
| `npm run test:web` (Playwright 1.63) | 45/45 geçti |
| Frontmatter kapısı (CI'daki `yaml.safe_load` adımı) | Bu makinede PyYAML yok; aynı kural js-yaml ile koşturuldu: 289 dosya, 0 hata (`kanit/.../once/yamlkapi.js`) |
| `claude plugin eval` (1 vaka: `kod-gozden-gecirici-temiz`, sonnet yargıç, `CLAUDE_CODE_WALNUT_SPIRE=1`, PATH'ten systemprofile çıkarıldı) | 1/1, skor 1,00, 165 sn, 0,73 USD. Sekiz vakanın tamamı koşulmadı (~2,7 USD); yalnız bu bir vaka ölçüldü. |

## Bulgular (README / araç)

- **README ajan tablosunda `zaman-denetci` yoktu** (71 ajan yazıyor, tabloda 70). Düzeltildi. Katalogdaki grup süzgeci README'nin gruplarını okuduğu için bu artık `web-test`te bir kapı: grupsuz ajan varsa test düşer.
- `disari-aktar-test.js` koşunca `.cursor`, `.opencode`, `.github/agents`, `.codex` dosyalarını LF ile yeniden yazıyor; Windows'ta `core.autocrlf` yüzünden 280 dosya "değişmiş" görünüyor (içerik aynı). CI'yı etkilemez, yerelde `git checkout -- .cursor .opencode .github/agents .codex` ile temizlenir. Değiştirilmedi.
- README'deki "eklentinin her oturuma eklediği bağlam ~16.320 token" ölçümü Claude Code 2.1.282'ye ait (25 Eylül). Bu makinedeki 2.1.268 `claude plugin details` için "~7.533 tok always-on" gösteriyor. İki sürümün ölçümü farklı; README'deki sayı sürüm etiketiyle duruyor, yeniden ölçülmedi, sitede token sayısı kullanılmadı.
- Eski sesli reel (`docs/reel/reel.mp4|gif`) ve `assets/demo.gif` depoda kaynağı olmayan üretimlerdi; yeniden üretilemedi. README'den ve depodan çıkarıldı (Git geçmişinde duruyor). Yerine kaynağı depoda olan `arac/demo-uret.js` ve `docs/demo/` geldi.
- Günlük "Ekosistem denetimi" (#19, 28 Eylül): bu depoya ait iki bulgu açık: (1) yayımlanan test sayısı (`project-meta.json` 198, profil deposundaki `meta-source.json` 160) ve (2) `summary` ile GitHub depo `description`'ı ayrışmış. İkisi de profil deposundaki meta-source ayrışmasının parçası; `/meta` koşturmak birleşmiş içeriği geri aldığı için (Furki'nin kararı bekleniyor) bu görevde kapatılmadı. Bu dalda test sayısı 252'ye çıktı, `meta-source.json` güncellenmediği için ayrışma büyüyor; yayında birlikte çözülmeli.

## Site (eski sürüm, yerelde `node arac/sunucu.js`)

Masaüstü 1280x800 ve mobil 390x844 ekran görüntüleri: `once/`. Konsol hatası yok, yatay taşma yok.

Lighthouse 13 (mobil, Chrome headless, simüle 4G): performans 78, erişilebilirlik **94**, en iyi uygulamalar 100, SEO 100; masaüstü 99 / 94.

Erişilebilirlik bulguları (Lighthouse):
- `color-contrast`: `<kbd>` ipucu etiketleri (4.5:1 altı).
- `label-content-name-mismatch`: kartların ve tema düğmesinin `aria-label`'ı görünen metni içermiyordu.
- `landmark-one-main`: sayfada `main` bölgesi yoktu.

Kullanım bulguları (yenilemenin gerekçesi):
- İlk ekranda kurulum komutu yok; "ajan nedir" kutusu, arama ve 71 kart var. Kurulum ancak bir ajanın detayında (dosya kopyalama) ya da sayfanın en altında.
- Katalog yalnız metinle aranıyor; grup ya da yetki (salt okur / yazabilir) süzgeci yok, oysa README bu ayrımı öne çıkarıyor.
- Yalnız Türkçe arayüz; sistem temasını izliyor (kimlik siyah-krem-sarı değil, sıcak açık gri/terrakota).
- 536 KB tek dosya: tam markdown'ların hepsi ilk yüklemede geliyor.

## Yenileme sonrası (aynı yöntem)

| Ölçü | Önce | Sonra |
|---|---|---|
| Lighthouse mobil performans (3 koşu, aynı yerel sunucu) | 49 (aykırı), 78, 79 | 81, 82, 81 |
| Lighthouse mobil FCP / LCP | 3,9 s / 3,9 s | 2,0 s / 4,5 s |
| Lighthouse masaüstü performans | 99 | 99 |
| Erişilebilirlik (mobil ve masaüstü) | 94 | **100** |
| CLS | 0 | 0,002 |
| İlk yükleme (`index.html`) | 536 KB | 152 KB (+ arka planda 434 KB `tam.js`) |
| `npm test` toplamı | 198 | 252 |
| Tarayıcı testi (`web-test.js`) | 45 | 99 |

LCP 0,6 sn kötüleşti: LCP öğesi artık gömülü League Gothic ile boyanan `h1` (`font-display: swap`); FCP yarıya indi. `optional` LCP'yi 3,9 sn'ye çekiyordu ama ekran kaydında yazı tipi hiç yüklenmedi (kimlik bozuldu), bu yüzden `swap` seçildi. Ölçümler yerel sunucudan (sıkıştırmasız); GitHub Pages gzip'ler, mutlak değerler orada daha iyi olur.

Yeni testler (54): ilk 30 sn (h1, kurulum satırı ilk ekranda, kopyala düğmesi panoya yazıyor, 44 px dokunma alanı, tek `main`, atla bağlantısı, gömülü yazı tipleri yüklendi), grup ve yetki süzgeçleri (yazabilen ajan sayısı `agents/*.md`'den hesaplanıp karşılaştırılıyor), TR/EN kabuğu (tarayıcı dili, elle geçiş, `localStorage`, ajan açıklamasının Türkçe kalması), kontrast (koyu/açık x TR/EN, 27+10 seçici, en az 4.5:1), `prefers-reduced-motion`, Tab sırası.

## Kontrast (WCAG 2.1 AA, hesaplanmış)

Koyu: metin/zemin 16,50; metin/kart 15,18; sönük/zemin 8,82; sönük/kart 8,11; sarı/zemin 12,01; koyu yazı/sarı düğme 12,01.
Açık: metin/zemin 16,50; sönük/zemin 6,80; sönük/kart 7,54; koyu-amber bağlantı/zemin 6,17 (sarı `#ffc21a` açık zeminde metin olarak kullanılmıyor, yalnız dolgu).
Tarayıcıda her iki temada ve dilde tüm metin öğeleri >= 4,5:1 ölçülüp `web-test.js`'e kapı olarak konuldu.

## Çözülemeyenler / açık

- Yalnız bir eval vakası koşuldu; kalan yedisi ve `evals-bash` (Windows'ta kum havuzu yok) ölçülmedi.
- Ekran okuyucuyla (NVDA/VoiceOver) elle deneme yapılmadı; erişilebilirlik Lighthouse, kontrast ve klavye testleriyle sınırlı. Kartlar `aria-labelledby` (ajan adı) + `aria-describedby` (özet) kullanıyor.
- GitHub Pages yayını yapılmadı (onay Furki'de). `yayinla.yml` yalnız `web/tam.js`'i tetikleyici yola ekledi.
