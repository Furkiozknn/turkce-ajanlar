# turkce-ajanlar

**Claude Code için Türkçe alt-ajan seti.** Bir İngilizce koleksiyonun
çevirisi değil — az sayıda, gerçekten kullanılan, ve çalıştığı makinenin
tuzaklarını içine gömmüş ajanlar.

## Neden bir tane daha

Hazır ajan koleksiyonları var; en büyüğünde 172 ajan bulunuyor. İki
sorun: hiçbirinde Türkçe yok, ve 172 tanım her oturumda bağlama giriyor.

Buradaki yaklaşım tersi: **beş ajan, hepsi Türkçe, hepsi kullanılıyor.**
Her biri şunları içeriyor:

- Türkçe çıktı ve Türkçe biçimlendirme kuralları (ondalık virgül,
  tarih düzeni)
- Bu makinenin bilinen tuzakları — PowerShell 5.1'de `&&` yok, Python
  PATH'te yok, heredoc ters bölüyü yiyor
- **Dürüstlük disiplini**: bulgu şişirmemek, doğrulanmamışı doğrulanmış
  gibi sunmamak, "bu sorun değil" diyebilmek

Son madde asıl fark. Çoğu ajan promptu "kapsamlı ol" der; bu da uydurma
bulgu üretir. Buradakiler "emin değilsen bak, bakamıyorsan işaretle"
der.

## Ajanlar

| Ajan | Ne yapar |
|---|---|
| `kod-gozden-gecirici` | Doğruluk / güvenlik / bakım / performans incelemesi. 🔴 engelleyici, 🟡 öneri, 💭 not olarak önceliklendirir. Biçim tercihlerine karışmaz. |
| `repo-denetci` | Bir veya çok depoyu envanterler: canlılık, hijyen, bağımlılık, açık iş, sızmış gizli bilgi. Salt okuma. |
| `dosya-duzenleyici` | Klasör düzenler. Kalıcı silmez — `_eski/` altına taşır. Toplu işlemden önce planı log'a yazar, geri alınabilir. |
| `veri-raporcu` | CSV/Excel/JSON/Parquet'i DuckDB ile sorgular, Türkçe rapor üretir. Her rakamın arkasında gösterilen bir sorgu var. |
| `gorev-yazari` | Belirsiz bir isteği, kullanıcı yokken çalışacak eksiksiz görev dosyasına çevirir. Belirsizliği çalışma anına bırakmaz. |

## Kurulum

```powershell
# Varsayilan projeye (D:\Claude Projeleri)
powershell -ExecutionPolicy Bypass -File kur.ps1

# Baska bir projeye
powershell -ExecutionPolicy Bypass -File kur.ps1 -Proje "D:\Repolar\buradane"

# Tum projelerde kullanilabilsin
powershell -ExecutionPolicy Bypass -File kur.ps1 -Kullanici

# Once ne yapacagini gor
powershell -ExecutionPolicy Bypass -File kur.ps1 -Deneme
```

Ajanlar `.claude/agents/` altına kopyalanır. Yeni bir Claude oturumunda
görünür olurlar.

## Kullanım

Claude'a doğal dille söylemen yeterli — ajan açıklamasındaki tetikleyici
ifadeler eşleştiğinde kendisi çağırır:

- *"şu değişikliği gözden geçir"* → `kod-gozden-gecirici`
- *"repolarımın envanterini çıkar"* → `repo-denetci`
- *"indirilenler klasörünü topla"* → `dosya-duzenleyici`
- *"bu CSV'den rapor çıkar"* → `veri-raporcu`
- *"buna gece için görev yaz"* → `gorev-yazari`

## Kendine uyarla

Ajanlar düz markdown. `ajanlar/` altındaki dosyayı aç, kendi kurallarını
ekle, `kur.ps1` ile yeniden kur. Frontmatter alanları:

```yaml
---
name: ajan-adi           # kebab-case, cagirma adi
description: ...         # Claude bunu okuyup ne zaman cagiracagina karar verir
model: inherit           # veya sonnet / opus
color: purple
tools: ["Read", "Grep", "Glob", "Bash"]
---
```

`description` alanı en önemlisi: Claude ajanı buna bakarak seçer.
Tetikleyici ifadeleri oraya yaz.

## Lisans

MIT. Al, değiştir, kullan.
