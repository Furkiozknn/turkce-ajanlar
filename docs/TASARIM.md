# Tasarım: turkce-ajanlar arayüz ve README yenilemesi (29 Eylül 2026)

## Hedef

Videodan ya da profilden gelen biri ilk 30 saniyede şunu anlamalı ve yapabilmeli: "Claude Code için Türkçe ajanlar; tek satırla kuruluyor; ne zaman işime yarar, ne zaman yaramaz". Kurulum komutu ilk ekranda, kopyala düğmesiyle. Ardından 71 ajanı aramak, gruba ve yetkiye göre süzmek.

Ürün bir araç/eklenti olduğu için **FRK-OS kimliği** uygulandı. Eklentinin çekirdek davranışı (ajanlar, komutlar, beceriler, kanca, `kur.ps1`, evals) değişmedi; `agents/`, `commands/`, `skills/`, `hooks/` dosyalarına dokunulmadı, sürüm numarası artmadı.

## Önce / sonra

| Konu | Önce | Sonra |
|---|---|---|
| İlk ekran | "Türkçe Ajanlar" + üç adımlı kutu + arama | Tek cümle, tek satır kurulum + Kopyala, "ne zaman kullanılır / kullanılmaz", sonra 3 adım |
| Kimlik | sıcak açık gri, terrakota, sistem temasını izler | siyah `#0e0d0b`, krem `#f1ece2`, sarı `#ffc21a`; açık tema seçenek |
| Yazı | sistem yazı tipleri | League Gothic başlıklar, JetBrains Mono etiketler (gömülü, OFL) |
| Katalog | metin araması | arama + 11 grup süzgeci + yetki süzgeci (salt okur / yazabilir), "yazabilir" etiketi |
| Dil | yalnız Türkçe | TR + EN kabuğu (varsayılan `navigator.language`, `tr*` ise Türkçe, tercih `localStorage:dil`) |
| Erişilebilirlik | Lighthouse 94 | 100; atla bağlantısı, `main`, kart `aria-labelledby`, görünür odak (3 px), hedefler >= 36-44 px |
| Yük | 536 KB tek dosya | 152 KB `index.html` + arka planda `tam.js` (tam markdown'lar) |
| README ilk ekranı | banner, sesli reel gif, eski demo | banner, tek cümle, tek satır kurulum, 17 sn gerçek çıktılı demo, kullanılır/kullanılmaz tablosu, sonra TR/EN özeti |

Görseller: `kanit/turkce-ajanlar/once/`, `sonra/` (TR), `sonra-en/` (EN); 390x844 ve 1280x800: ilk ekran, tam sayfa, arama, detay.

## Ekranlar

1. **Üst şerit**: FRK-OS etiketi, TR|EN, tema.
2. **Hero**: h1, tek cümlelik tanım, kurulum kutusu, iki sütunlu kullanılır/kullanılmaz, "Ajan nedir?" 3 adım.
3. **Katalog**: arama, grup süzgeçleri, yetki süzgeci, sayaç (`k / 71 ajan`), kartlar (ad, özet, tetikleyici ifadeler, sınır).
4. **Detay penceresi**: ne yapar, tetikleyici ifadeler, kur ve kullan (3 adım), araçlar, tam tanım. `#ajan=ad` bağlantısı korundu.
5. **Komutlar ve beceriler**, altbilgi (FRK-OS imzası, yazı tipi lisansı).

## Dil (dürüst not)

Arayüz çevrildi (etiketler, süzgeçler, detay adımları, altbilgi, grup adları). **Ajan açıklamaları, tetikleyici ifadeler ve komut/beceri açıklamaları Türkçe kalır**: projenin amacı bu ve çeviri uydurmak ajanın gerçek sözünü değiştirirdi. İngilizce arayüzde bu, görünür bir notla söyleniyor. Grup adlarının İngilizcesi arayüz metnidir (`GRUP_ETIKET`).

## Video sisteminden alınanlar

Kaynak: `sosyal/uret/tema.mjs` (klasik tema) ve `sahne.js`.

| Ne | Nereden | Nerede kullanıldı |
|---|---|---|
| `zeminler #0e0d0b #1a1712`, `yazilar #f1ece2`, ilk vurgu `#ffc21a` | `tema.mjs` `klasik.akis` | sayfa ve kart zeminleri, metin, sarı vurgu |
| Vurgu renkleri (`#19d3e6 #ff7a1a #ff4d6d`, neon'dan `#c3a6ff #3dffb0`) | `tema.mjs` klasik + neon akışı | ajan kartlarındaki süs noktası (renk anlam taşımıyor) |
| `doku: "izgara"` | `tema.mjs` klasik | gövdede çok soluk, sabit ızgara (mask ile yukarıdan aşağıya sönüyor) |
| League Gothic başlık + JetBrains Mono etiket | `tema.mjs` `F.lg`, `F.jb` | h1/h2/h3 ve mono etiketler |
| `iris` (ortadan büyüyen daire, ~0,45 sn) | `sahne.js` geçişleri | detay penceresinin açılışı (`clip-path: circle`, 0,5 sn) |
| `kararma` | `sahne.js` geçişleri | pencere arkasının 0,3 sn kararması |
| Terminal sahnesi (`terminal: "koyu"`) | `tercih.terminal` | `arac/demo-uret.js` demo sayfası |

Bilerek alınmayanlar: glitch, flaş, bloklar, zoom, itme (bir araç sitesinde dikkat dağıtır ve `prefers-reduced-motion` yükünü artırır); neon/arcade/kâğıt temalarının zeminleri (ürün kimliği siyah-krem-sarı).

## Kararlar ve sınırlar

- **Sistem temasını izlemiyoruz**: kimlik siyah zemin. Açık tema seçilebilir ve hatırlanır (`localStorage:tema`).
- `prefers-reduced-motion: reduce`: iris/kararma animasyonu, geçişler ve kaydırma yumuşatması kapanır (test var).
- Yazı tipleri: `arac/yazi/` altında woff2 + OFL lisansları, base64 olarak gömülü (Google Fonts'a bağlantı yok). Türkçe harfler iki dosyada da ölçüldü. League Gothic lisansındaki telif satırı Google Fonts künyesinden yazıldı, dosyanın kendisinde ayrıca doğrulanmadı (`arac/yazi/YAZI-NOTU.md`). `font-display: swap`.
- `web/tam.js`: tam markdown'lar ayrı dosya; `<script src>` `file://` altında da çalışır. İkisi birlikte tutulmalı; yüklenemezse detay bunu söyler. CI ikisini de kaynakla karşılaştırır.
- Kontrast: sönük metin koyu zeminde 8,1-8,8:1, açıkta 6,4-7,5:1 (hesap `docs/DENETIM.md`'de). Sarı açık zeminde metin olarak kullanılmıyor.
- README ilk ekranındaki demo `arac/demo-uret.js` ile üretilir: beş komut gerçekten koşturulur, çıktı `docs/demo/komutlar.txt`'ye yazılır, terminal sayfası bu kaydı yazma animasyonuyla oynatır (Playwright kaydı, ffmpeg). Çıktı satırları yalnız `| tail`/`| head` ile seçilir ve komut satırında görünür; hiçbir satır elle yazılmadı.
- Video hattı için ham dikey kayıt (`sosyal/medya/projeler/turkce-ajanlar/ekran.mp4`, 1080x1920, 19 sn, sessiz, yazısız, H.264 yuv420p +faststart) gerçek sayfada Playwright ile alındı (540x960 görünüm, 2x ölçekleme) ve gerçek komut çıktıları `komutlar.txt` olarak yanında.
