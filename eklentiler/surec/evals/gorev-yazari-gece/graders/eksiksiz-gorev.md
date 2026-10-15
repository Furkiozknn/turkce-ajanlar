---
type: llm
weight: 3
---
Çıktı, kimse başında yokken çalışacak bir görev dosyasıdır. Şu sekiz maddeyi
tek tek evet/hayır olarak değerlendir; **en az yedisi evetse BAŞARILI**:

1. Hedef klasör belirli: ya tam yol yazılı, ya da sırayla denenecek aday
   yollar ve hiçbiri bulunamazsa ne yapılacağı ("dur, rapora yaz") verilmiş.
2. Yapılacaklar numaralı adımlar hâlinde, her adım tek bir iş.
3. Kalıcı silme yok; yinelenen/şüpheli dosyalar bir karantina klasörüne
   (`_eski/`, `_yinelenen/` ya da benzeri bir ad) taşınır — adın kendisi
   önemli değil, "silinmez, taşınır" ilkesi önemli.
4. Bütçe (`butce:` satırı, USD) **ya da** süre sınırı var.
5. Çıktının/raporun nereye, hangi adla yazılacağı belli.
6. "Bitince" ölçütü belli: hangi dosyalar, hangi başlıklar üretilince görev
   bitmiş sayılır.
7. İlk gece kuralı: klasöre ilk kez dokunuluyorsa (ya da yolu
   doğrulanamadıysa) bu tur yalnızca envanter/plan raporu üretir, taşıma
   yapılmaz — ya da açık bir plan-onay adımı vardır.
8. Ajan görevi şimdi çalıştırmaya kalkışmamış, yalnızca görev metnini
   yazmıştır.

"Eksiksiz" demek uzun demek değildir; 60–120 satırlık net bir dosya, 300
satırlık bir betik anlatımından iyidir. Uzunluk tek başına ne artı ne eksidir.
