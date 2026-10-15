---
type: llm
weight: 3
---
Rapor yıldız sayısını, son push tarihini, açık issue sayısını ve lisansı
verir ve her birinin **hangi komut ya da API çağrısından** geldiğini
gösterir (ör. `gh api repos/wshobson/agents --jq ...` ya da
`api.github.com/repos/...`). Rakamların kaynağı yoksa ya da "yaklaşık 39 bin"
gibi hatırdan bir değer verilmişse başarısızdır. Ölçüm tarihi belirtilmişse
artı. Sonda son 90 gün ölçütüne göre açık bir canlılık hükmü vardır.
