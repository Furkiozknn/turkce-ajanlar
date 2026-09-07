---
description: Belirsiz bir isteği, kullanıcı bilgisayarda yokken çalışacak eksiksiz bir görev dosyasına çevirip kuyruğa bırakır (gorev-yazari ajanını kullanır). Örnek — /turkce-ajanlar:gorev indirilenler klasörünü tarihe göre düzenle
argument-hint: <ne yapılsın, hangi klasörde>
---

## Görev

Kullanıcının isteği:

> $ARGUMENTS

Bu isteği `gorev-yazari` alt-ajanıyla **kuyruğa bırakılacak bir görev
dosyasına** çevir. Görevi kendin çalıştırma; dosyayı yaz, yolunu söyle.

## Adımlar

1. İstek boşsa dur ve sor: "Ne yapılsın, hangi klasör/depo üzerinde?"
2. Kuyruk klasörünü bul, bu sırayla:
   - `D:\Claude Projeleri\gorevler\bekleyen\` varsa orası
   - yoksa çalışma dizininde `gorevler/bekleyen/` (yoksa oluştur ve
     kullanıcıya söyle: zamanlayıcı bağlı değilse dosya orada bekler)
3. `gorev-yazari` alt-ajanını çağır; ona isteği ve kuyruk yolunu ver.
   Ajan, isteğin belirsizliklerini **şimdi** temizler (yol var mı,
   silme yetkisi var mı, çıktı nereye), sonra dosyayı yazar.
4. Ajan bittiğinde kullanıcıya üç şeyi söyle:
   - dosyanın tam yolu
   - ne zaman çalışacağı (zamanlayıcı 15 dakikada bir bakar; bağlı
     değilse "elle: `otomasyon\calistir.ps1`")
   - tahmini maliyet (görev dosyasındaki `butce:` satırı)

## Sınırlar

- Silme, gönderme, yayınlama içeren istekleri görev dosyasında
  **salt okuma / taşıma** olarak yaz; geri alınamaz adımlar için
  "kullanıcı onayı gerekir" notu düş.
- Bir klasöre veya depoya **ilk kez** dokunulacaksa görev rapor üretsin,
  değişiklik yapmasın (gorev-yazari'nın "ilk gece kuralı").
