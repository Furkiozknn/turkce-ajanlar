---
type: llm
weight: 3
---
Kök neden doğru teşhis edilmiştir: Türkçe yerel ayarda (tr-TR) ondalık
ayırıcı virgül olduğu için `[double]"0.5742"` dönüşümü noktayı yok sayıp
5742 okur; dört kaydın toplamı böylece binlerce USD görünür. Başarılı cevap
bunu kanıtla bağlar (14881 ≈ 0.5742 gibi dizelerin 5742 okunmasının toplamı)
ve en küçük düzeltme olarak kültürden bağımsız ayrıştırma önerir:
`[double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture)` ya da
`TryParse(..., InvariantCulture, [ref]$d)`; alternatif olarak JSON'a değerin
sayı olarak yazılması. Kök nedeni "bütçe gerçekten aşıldı", "log bozuk" ya
da belirsiz bir "tür dönüşümü hatası" diye geçiştiren cevap başarısızdır.
