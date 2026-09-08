---
max_turns: 8
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill]
---
Aşağıdaki JavaScript fonksiyonunu **kod-gozden-gecirici** alt-ajanıyla incelet.
Alt-ajanın sonucunu bekle; ara mesaj yazma, son mesajın ajanın raporunun
Türkçe aktarımı olsun. Dosya yok; kod bu:

```js
// Sepet toplamını kuruş cinsinden hesaplar.
// kalemler: { adet: tam sayı, birimFiyatKurus: tam sayı } nesneleri.
// Kayan nokta yok: para her zaman kuruş tam sayısı olarak taşınır.
function toplamKurus(kalemler) {
  if (!Array.isArray(kalemler)) throw new TypeError("kalemler bir dizi olmalı");
  let toplam = 0;
  for (const k of kalemler) {
    if (!Number.isInteger(k.adet) || !Number.isInteger(k.birimFiyatKurus)) {
      throw new TypeError("adet ve birimFiyatKurus tam sayı olmalı");
    }
    if (k.adet < 0 || k.birimFiyatKurus < 0) {
      throw new RangeError("adet ve birimFiyatKurus negatif olamaz");
    }
    toplam += k.adet * k.birimFiyatKurus;
    if (!Number.isSafeInteger(toplam)) throw new RangeError("toplam güvenli tam sayı sınırını aştı");
  }
  return toplam;
}
module.exports = { toplamKurus };
```
