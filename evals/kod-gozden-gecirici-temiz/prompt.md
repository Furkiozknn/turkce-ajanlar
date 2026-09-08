---
max_turns: 8
allowed_tools: [Read, Glob, Grep, Agent, Skill]
---
Aşağıdaki JavaScript fonksiyonunu **kod-gozden-gecirici** alt-ajanıyla incelet ve
ajanın raporunu bana Türkçe aktar. Dosya yok; kod bu:

```js
// Sepet toplamını hesaplar. kalemler: {adet, birimFiyat} nesneleri.
function toplamTutar(kalemler) {
  if (!Array.isArray(kalemler)) throw new TypeError("kalemler bir dizi olmalı");
  let toplam = 0;
  for (const k of kalemler) {
    if (!Number.isFinite(k.adet) || !Number.isFinite(k.birimFiyat)) {
      throw new TypeError("adet ve birimFiyat sonlu sayı olmalı");
    }
    if (k.adet < 0 || k.birimFiyat < 0) throw new RangeError("adet ve birimFiyat negatif olamaz");
    toplam += k.adet * k.birimFiyat;
  }
  return Math.round(toplam * 100) / 100;
}
module.exports = { toplamTutar };
```
