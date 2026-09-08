---
type: llm
weight: 3
---
Kök neden doğru teşhis edilmiştir: `[double]::Parse(...)` geçerli kültürü
kullanır; Türkçe yerel ayarda (tr-TR) ondalık ayırıcı virgül olduğu için
`"0.5742"` dizesindeki nokta binlik ayırıcı sayılıp 5742 okunur; dört kaydın
toplamı böylece binlerce USD görünür. (Not: `[double]"0.5742"` **cast**
biçimi kültürden bağımsızdır; cevap bu ayrımı yaparsa bu bir artıdır,
eksi değil.) Başarılı cevap
bunu kanıtla bağlar (14881 ≈ 0.5742 gibi dizelerin 5742 okunmasının toplamı)
ve en küçük düzeltme olarak kültürden bağımsız ayrıştırma önerir:
`[double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture)` ya da
`TryParse(..., InvariantCulture, [ref]$d)`; alternatif olarak JSON'a değerin
sayı olarak yazılması. Kök nedeni "bütçe gerçekten aşıldı", "log bozuk" ya
da belirsiz bir "tür dönüşümü hatası" diye geçiştiren cevap başarısızdır.
