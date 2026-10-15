---
name: turkce-rapor
description: Türkçe rapor, özet, denetim çıktısı veya markdown belge yazarken uygulanacak biçim ve dürüstlük kuralları — ondalık virgül, gün.ay.yıl tarih, İ/ı büyük-küçük harf, birim ve tablo düzeni, bulgu şişirmeme, her rakama kaynak. Kullanıcı "rapor yaz", "özetle", "Türkçe rapor", "denetim raporu", "bulguları yaz", "günlük özeti" dediğinde ya da çıktı Türkçe bir belge olacaksa kullan.
---

# Türkçe rapor biçimi

Bu kurallar çıktının **dili değil biçimi** içindir; içerik ne olursa olsun
uygulanır. Kod, dosya adı, bayrak ve fonksiyon adları İngilizce kalır ve
kod biçiminde yazılır (`checkpoint`, `--max-budget-usd`) — çevrilmez.

## Sayılar ve birimler

| Kural | Doğru | Yanlış |
|---|---|---|
| Ondalık ayırıcı virgül | 0,57 · 4,5 saat | 0.57 · 4.5 saat |
| Binlik ayırıcı nokta | 1.234.567 · 39.500 yıldız | 1,234,567 · 39500 yıldız |
| Yüzde işareti önde, boşluksuz | %96 | 96% · % 96 |
| Birim ile sayı arasında boşluk | 6 USD · 12 MB · 3 dk | 6USD · 12MB |
| Aralık için kısa çizgi | 3–5 madde · 14:00–15:30 | 3-5 · 14:00 - 15:30 |

Metin içinde rakam en aza iner: bir ölçüm ya da sayım **kendi satırına ya da
tabloya** gider, düzyazıda sadece okuyucunun kararını değiştiriyorsa kalır.

## Tarih ve saat

- Uzun: **7 Eylül 2026** (ay adı küçük harfle başlamaz, sonuna nokta yok).
- Kısa: **07.09.2026**. Saat 24 saatlik: **14:05**.
- Dosya adlarında ve sıralanacak yerlerde ISO: `2026-09-07`.
- "Bugün", "dün", "geçen hafta" bir belgede kalıcı değildir; mutlak tarihe çevir.

## Büyük-küçük harf ve yazım

- Türkçe eşleme: İ ↔ i, I ↔ ı. `ISTANBUL` değil `İSTANBUL`; `ıstanbul` değil `istanbul`.
- Başlıkta yalnızca ilk sözcük ve özel adlar büyük (İngilizce Title Case yok):
  "Bulgular ve öneriler", "Bulgular Ve Öneriler" değil.
- Kesme işareti özel adlarda ve kısaltmalarda: GitHub'a, Claude'un, API'ye, MCP'yi.
  Cins adlarda yok: dosyanın, deponun.
- "de/da" ve "ki" bağlaçları ayrı yazılır: "log da yazıldı", "öyle ki".
- Yerleşik Türkçe karşılığı olan terim Türkçe: depo, bellek, kuyruk, dal,
  sürüm, bağımlılık, dizin. Karşılığı oturmamışsa İngilizcesi kod biçiminde
  kalır: `checkpoint`, `fallback`, `heartbeat`.

## Yapı

1. **Önce sonuç.** İlk paragraf kararı ya da bulguyu verir; gerekçe sonra.
2. Kısa belgede (500 sözcük altı) başlık yok; uzun belgede en fazla üç seviye.
3. Paralel maddeler liste, tek düşünce düzyazı. Madde başına en fazla iki cümle.
4. Tabloda sütun başlıkları Türkçe; kaynak sütunu varsa `dosya:satır` biçiminde.
5. Kod, komut ve hata metni düzyazıya değil çitli bloğa.

## Dürüstlük disiplini

- Her rakamın yanında **nereden geldiği** var: komut, dosya, satır, sorgu.
  Hatırdan yıldız sayısı, sürüm, tarih yazılmaz — ölçülür ya da "ölçülmedi" denir.
- Kontrol edilmeyen şey **"bakılmadı"** diye işaretlenir; sessizce atlanmaz,
  doğrulanmış gibi de yazılmaz.
- Bulgu sayısı doldurulmaz. Beş madde istendi diye beşe tamamlanmaz;
  **"sorun bulunmadı"** geçerli ve değerli bir sonuçtur.
- Emin olunmayan iddia açıkça işaretlenir: "muhtemelen", "doğrulanmadı",
  "tek kaynak". İhtimal ile gerçek aynı cümlede karışmaz.
- Kullanıcının kendi işi kayırılmaz; aynı ölçüt herkese.

## Teslimden önce beş kontrol

1. Ondalıklar virgülle, yüzdeler `%96` biçiminde mi?
2. Tarihler mutlak ve Türkçe düzende mi (7 Eylül 2026 / 07.09.2026)?
3. Her sayının ve her iddianın kaynağı yazılı mı?
4. "Bakılmadı" gerekenler işaretli mi, dolgu madde var mı?
5. İlk paragraf tek başına okunduğunda sonucu veriyor mu?
