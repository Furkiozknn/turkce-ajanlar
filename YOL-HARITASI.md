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

- [ ] **Ajan kalite turu** — mevcut beş ajanın her birini gerçek bir
      işle çalıştır (kod-gozden-gecirici'yi `D:\Repolar\mcp-vet`
      üzerinde, repo-denetci'yi iki depoda, vb.). Çıktı zayıfsa ajan
      dosyasını düzelt. Ne değiştirdiğini rapora yaz.

- [ ] **UI/UX gözden geçirme** — web arayüzünü gerçek kullanım akışına
      göre incele: bir kullanıcı aradığı ajanı kaç saniyede bulur,
      kopyaladıktan sonra ne yapacağını biliyor mu, mobilde okunuyor
      mu, klavyeyle gezinilebiliyor mu. Bulguları uygula.

- [ ] **Yeni ajan araştırması** — rakip koleksiyonları tara
      (wshobson/agents 39k★, VoltAgent 25k★), bizde olmayan ama bu
      kullanıcının işine yarayacak **en fazla üç** rol belirle,
      Türkçe olarak yaz. Sayı için ajan ekleme; her yeni ajanın
      gerekçesi olsun.

- [ ] **Katkı rehberi** — Türkçe `KATKIDA-BULUNMA.md`: yeni ajan nasıl
      yazılır, frontmatter alanları, dürüstlük disiplini neden var,
      PR göndermeden önce `dogrula.js` çalıştır.

- [ ] **Paylaşıma hazırlık** — README'ye web arayüzünden ekran
      görüntüsü, rozetler, "neden bu var" bölümünü keskinleştir.
      GitHub'a push için hazır hâle getir (push'u kullanıcı onaylar).

- [ ] **Araştırma turu ve yol haritası yenileme** — bu maddeye
      gelindiğinde: rakipleri ve Claude Code'un yeni özelliklerini
      tara, eksik gördüğün özellikleri **bu dosyanın "Sırada"
      bölümünün sonuna** yeni maddeler olarak ekle, sonra bu maddeyi
      işaretle ve yenisini en sona tekrar ekle. Döngü böyle sürer.

---

## Bitti

<!-- Tamamlanan maddeler tarihiyle buraya taşınır -->

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
