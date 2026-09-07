---
description: Kurulu Türkçe alt-ajanları ve her birinin ne işe yaradığını listeler. Hangi ajanın hangi işe çağrılacağını hatırlamak için.
---

## Görev

Kullanıcıya bu makinede kullanılabilir **Türkçe alt-ajanları** kısa bir tablo
olarak göster. Hiçbir şey çalıştırma, hiçbir dosya değiştirme — bu salt
okuma bir komuttur.

## Nasıl

1. Şu iki yerdeki `*.md` dosyalarını oku (biri yoksa atla):
   - Proje ajanları: `.claude/agents/`
   - Bu plugin'in ajanları: plugin kökündeki `agents/` klasörü
2. Her dosyanın frontmatter'ından `name` ve `description` alanlarını al.
   `description` içindeki tırnaklı ifadeler tetikleyici cümlelerdir
   (örn. "şu kodu incele") — bunları ayrı bir sütunda göster.
3. Aynı ad iki yerde varsa bir kez listele, "proje" olanı tercih et.

## Çıktı biçimi

| Ajan | Ne yapar | Şöyle çağır |
|---|---|---|
| `kod-gozden-gecirici` | Doğruluk/güvenlik/bakım incelemesi | "şu kodu incele", "review et" |
| … | … | … |

Tablonun altına tek satır: "Bir ajanı kullanmak için isteğini doğal dille
yaz; Claude açıklamadaki tetikleyicilere göre doğru ajanı seçer. Doğrudan
istemek için: `kod-gozden-gecirici ajanıyla src/ klasörünü incele`."

Ajan bulunamazsa: "Kurulu Türkçe ajan yok. Kurulum: `powershell -File kur.ps1`
(depo: https://github.com/Furkiozknn/turkce-ajanlar)."
