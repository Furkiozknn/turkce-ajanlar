# Yol haritası

Bu dosya gece çalışan geliştirme döngüsünün yakıtıdır.
`otomasyon\gelistirme-uret.ps1` buradaki **ilk işaretsiz** maddeyi alır,
görev dosyasına çevirir, kuyruğa bırakır. Görev bitince kutucuk
işaretlenir ve sıradakine geçilir.

Sen de elle madde ekleyebilirsin — en üste koyduğun önce yapılır.

**Kural:** Her madde tek oturumda bitebilecek büyüklükte olmalı ve
bitince "bitti" denebilecek kadar net olmalı.

---

## Sırada

- [ ] **Yayına alma: web arayüzü** — `web/` klasörünü herkese açık bir
      adrese taşı ki depo linkiyle birlikte paylaşılabilsin. Vercel MCP
      bağlı; statik dağıtım yeterli. **Yayınlamadan önce
      `raporlar\ONAY-BEKLEYENLER.md` dosyasına yaz ve kullanıcının
      onayını bekle** — dışarı açılan bir işlem, kendi başına yapma.

- [ ] **Araştırma turu ve yol haritası yenileme** — bu maddeye
      gelindiğinde: rakipleri ve Claude Code'un yeni özelliklerini
      tara, eksik gördüğün özellikleri **bu dosyanın "Sırada"
      bölümünün sonuna** yeni maddeler olarak ekle, sonra bu maddeyi
      işaretle ve yenisini en sona tekrar ekle. Döngü böyle sürer.

---

## Bitti

<!-- Tamamlanan maddeler tarihiyle buraya taşınır -->

- [x] **Çoklu araç desteği** — En büyük rakip `wshobson/agents`
      (39k★) ajanlarını Claude Code dışında Cursor, Codex, OpenCode ve
      Copilot'ta da çalıştırıyor (`.cursor-plugin/`, `.agents/`,
      kök `AGENTS.md`). Bizim ajanlarımız sadece Claude Code'da
      çalışıyor. Önce **araştır**: `AGENTS.md` standardı ne, hangi
      araçlar okuyor, frontmatter farkları neler. Sonra
      `arac/disari-aktar.js` yaz: `agents/*.md`'den her hedef için
      uygun biçimi üret. Tek kaynak `agents/` kalsın, gerisi türetilsin.
      *(2026-09-08 — arac/disari-aktar.js agents/ tek kaynağından .cursor/agents, .opencode/agents, .github/agents, .codex/agents üretir; test + CI bayatlık kontrolü; kök AGENTS.md)*

- [x] **Türkçe beceri (skill) seti** — Ajanlar bir görevi devralır;
      beceriler ise Claude'un kendi akışına bilgi katar. Bizde hiç beceri
      yok. Araştır: hangi tekrar eden iş beceri olmalı (Türkçe rapor
      biçimlendirme, Windows/PowerShell tuzakları, Türkçe metin
      denetimi). En fazla iki tane yaz, `skills/` altına koy.
      *(2026-09-08 — skills/turkce-rapor ve skills/windows-tuzaklari; headless testte ikisi de yüklendi ve kuralı uyguladı; doğrulayıcı arac/eklenti-dogrula.js CI'da koşuyor; plugin 0.3.0)*

- [x] **İngilizce tanıtım bölümü** — Ajanların kendisi Türkçe kalacak,
      bu setin varlık sebebi bu. Ama README'nin başına kısa bir İngilizce
      bölüm ekle: bunun ne olduğu, kimin işine yarayacağı, neden Türkçe.
      Uluslararası bir geliştirici ne olduğunu anlayabilsin, yanlışlıkla
      kurup hayal kırıklığına uğramasın.
      *(2026-09-07 — README başında katlanabilir In English bloğu; ajanlar ve geri kalan her şey Türkçe kaldı)*

- [x] **Türkçe slash komutları** — Plugin sadece ajan değil komut da
      taşıyabiliyor. `commands/` altına en çok işe yarayacak üç tanesini
      ekle: örneğin `/ajanlar` (kurulu ajanları ve ne işe yaradıklarını
      listeler), `/gorev` (gorev-yazari'yı çağırıp kuyruğa görev bırakır),
      `/denetle` (repo-denetci'yi mevcut depoda çalıştırır). Biçimi
      kurulu bir plugin'in `commands/` klasöründen doğrula.
      *(2026-09-07 — commands/ajanlar.md, gorev.md, denetle.md; ad-alanlı çağrı /turkce-ajanlar:<komut>, headless testte üç turda doğrulandı)*

- [x] **GitHub sosyal kartı ve CI** — `assets/banner.svg`'yi 1280x640
      PNG'ye çevir (`assets/social.png`; GitHub sosyal önizleme SVG
      kabul etmiyor). Ayrıca `.github/workflows/dogrula.yml`: her
      push ve PR'da `node arac/dogrula.js` + `node arac/web-uret.js`
      çalıştır, üretilen `web/index.html` commit'lenenden farklıysa
      başarısız ol (bayat arayüz sorununu kalıcı çöz).
      *(2026-09-07 — social.svg+png 1280x640 Chromium ile; CI: dogrula + web yeniden uretim diff'i; web-uret tarihi git commit'inden (deterministik) — hepsi yerelde test edildi)*

- [x] **Paylaşıma hazırlık** — README'ye web arayüzünden ekran
      görüntüsü, rozetler, "neden bu var" bölümünü keskinleştir.
      GitHub'a push için hazır hâle getir (push'u kullanıcı onaylar).
      *(2026-09-07 — README başına beş rozet (eklenti / 8 ajan / Türkçe /
      0 bağımlılık / MIT), hepsi shields.io'dan 200 dönüyor ve bağlandığı
      başlık mevcut. Arayüzden açık + koyu tema ekran görüntüsü çekildi
      (`arac/ekran-goruntusu.js`, 1280x960 2x), README'de `<picture>` ile
      sistem temasına göre değişiyor. "Neden bu var" baştan yazıldı:
      rakip sayıları GitHub API ile ölçüldü (wshobson/agents 39.465★ /
      137 benzersiz ajan, VoltAgent 24.899★ / 157 ajan, ikisinde de
      "Türkçe" geçen dosya sayısı 0), kaynağı bulunamayan "172 ajan"
      iddiası kaldırıldı, dört fark ve "kimin işine yaramaz" eklendi.
      Kök klasördeki test dosyaları `_eski/` altına taşındı, `.gitignore`
      yinelenenleri temizlendi. Doğrulama: dogrula.js --kati 8/8,
      dogrula-test.js 22/22, web-test.js 40/40 (gerçek Chromium),
      web-uret/banner-uret farksız, kur.ps1 -Deneme temiz, README
      `gh api markdown` ile render edilip picture/rozet/çapa kontrol
      edildi. Commit `a26ceab`. **Push edilmedi** — depo GitHub'da henüz
      yok, komutlarıyla `raporlar\ONAY-BEKLEYENLER.md` içine yazıldı.)*

- [x] **Katkı rehberi** — Türkçe `KATKIDA-BULUNMA.md`: yeni ajan nasıl
      yazılır, frontmatter alanları, dürüstlük disiplini neden var,
      PR göndermeden önce `dogrula.js` çalıştır.
      *(2026-09-07 — 11 bölümlük rehber yazıldı: ajan gerekli mi
      elemesi, frontmatter alan tablosu, `description` yazım kuralı,
      gövde iskeleti, `tools` geçerli ad listesi, dürüstlük disiplininin
      gerekçesi (depoda gerçekten yaşanmış üç örnekle), türetilmiş
      dosyaları yenileme, PR öncesi doğrulama tablosu, commit/PR biçimi,
      araç katkısı kuralları, dil. README'ye "## Katkı" bağlantısı
      eklendi. Doğrulama: `dogrula.js --kati` 8/8 (0 hata, 0 uyarı),
      `dogrula-test.js` 22/22; rehberdeki iskeletle geçici bir örnek
      ajan üretilip `--kati` ile geçirildi, sonra silindi. Doğrulayıcı
      kuralları `arac/dogrula.js` kaynağından okunarak yazıldı.)*

- [x] **Yeni ajan araştırması** — rakip koleksiyonları tara
      (wshobson/agents 39k★, VoltAgent 25k★), bizde olmayan ama bu
      kullanıcının işine yarayacak **en fazla üç** rol belirle,
      Türkçe olarak yaz. Sayı için ajan ekleme; her yeni ajanın
      gerekçesi olsun.
      *(2026-09-07 — wshobson/agents'ta 137, VoltAgent'ta 158 benzersiz
      rol tarandı; üçü seçilip yazıldı: `betik-ustasi`, `hata-avcisi`,
      `arastirmaci`. wshobson'da PowerShell ajanı hiç yok, VoltAgent'ınki
      kurumsal AD/GPO odaklı — bu makinenin tuzakları canlı ölçülüp
      `betik-ustasi`ye gömüldü. `dogrula.js` 8/8, web testi 40/40 geçti.
      Rapor: `raporlar/2026-09-07-yeni-ajan-arastirmasi.md`)*

- [x] **Web arayüzü v1** — `web/index.html`: tek dosya, bağımlılıksız,
      dosyadan açılınca da çalışan bir ajan tarayıcısı. Ajan verisi
      `ajanlar/*.md` frontmatter'ından bir üretici script ile gömülür.
      Arama, etiketle filtreleme, her ajan için "markdown'ı kopyala"
      düğmesi, kurulum komutu. Açık/koyu tema sistem tercihine uysun.
      Türkçe.
      *(2026-09-06 — canlı test edildi: arama, Türkçe büyük-küçük harf, boş sonuç, detay penceresi, konsol hatası yok)*

- [x] **Plugin paketleme** — `.claude-plugin/plugin.json` ve
      `.claude-plugin/marketplace.json` ekle ki
      `claude plugin install turkce-ajanlar@<marketplace>` ile
      kurulabilsin. Biçimi kurulu bir plugin'den doğrula, uydurma.
      Kurulumu gerçekten test et.
      *(2026-09-06 — `claude plugin validate --strict` iki manifestte de
      geçti; yerel pazar yerinden kurulup 5 ajanın da yüklendiği
      `claude plugin details` ve canlı oturumla doğrulandı, sonra
      ortam eski hâline döndürüldü)*

- [x] **Doğrulama script'i** — `otomasyon\dogrula.js`: her ajan
      dosyasının frontmatter'ı geçerli mi (name kebab-case, description
      dolu ve tetikleyici ifade içeriyor, tools geçerli araç adları),
      gövde boş değil mi, Türkçe mi. Bozuksa sıfırdan farklı çıkış kodu.
      *(2026-09-06 — depodaki araç klasörü `arac/` olduğu için
      `arac/dogrula.js` olarak yazıldı; `otomasyon/` adı
      `D:\Claude Projeleri\otomasyon` zamanlayıcısıyla çakışıyordu.
      Geçerli araç adları kurulu `claude` ikilisinden çıkarıldı,
      uydurulmadı. 22 senaryoluk `arac/dogrula-test.js` ile her kuralın
      gerçekten yakaladığı gösterildi; beş gerçek ajan hatasız geçiyor)*

- [x] **Ajan kalite turu** — mevcut beş ajanın her birini gerçek bir
      işle çalıştır (kod-gozden-gecirici'yi `D:\Repolar\mcp-vet`
      üzerinde, repo-denetci'yi iki depoda, vb.). Çıktı zayıfsa ajan
      dosyasını düzelt. Ne değiştirdiğini rapora yaz.
      *(2026-09-07 — beşi de gerçek işle koşturuldu. kod-gozden-gecirici
      ve veri-raporcu düzeltme gerektirmedi; ikisinin bulguları kaynakta
      doğrulandı. gorev-yazari otomatik çalıştırmada soru sorup boş
      döndü — "Soru soramadığında ne yaparsın" bölümü eklendi.
      repo-denetci öneri listesini dolguyla beşe tamamlıyordu,
      dosya-duzenleyici bir tarihi hatırdan uydurmuştu; ikisi de
      düzeltildi. `dogrula.js` 5/5 geçiyor. Rapor:
      `raporlar/2026-09-07-ajan-kalite-turu.md`)*

- [x] **UI/UX gözden geçirme** — web arayüzünü gerçek kullanım akışına
      göre incele: bir kullanıcı aradığı ajanı kaç saniyede bulur,
      kopyaladıktan sonra ne yapacağını biliyor mu, mobilde okunuyor
      mu, klavyeyle gezinilebiliyor mu. Bulguları uygula.
      *(2026-09-07 — arayüz gerçek Chromium'da masaüstü/mobil/koyu temada
      denendi. Sekiz bulgu düzeltildi: kartlar artık Claude'a yazılmış
      "Sen bir…" cümlesi yerine ajanın ne yaptığını + tetikleyici
      cümleleri + sınırını gösteriyor; arama Türkçe harfsiz yazımı da
      buluyor ve sonuçları puanlıyor; klavye odak halkası geri geldi,
      `↓` ve `Enter` eklendi; detayda "Kur ve kullan" 3 adımı kopyaladan
      sonra ne yapılacağını söylüyor; `h3:first-child` yüzünden birbirine
      giren bölümler ayrıldı; mobilde pencere sabit yükseklik hesabı
      yerine flex; `#ajan=` derin bağlantısı; favicon 404'ü giderildi.
      40 testlik `arac/web-test.js` yazıldı, hepsi geçiyor)*
