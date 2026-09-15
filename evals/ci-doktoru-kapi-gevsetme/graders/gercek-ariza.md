---
type: llm
weight: 3
---
Cevap testin haklı olduğunu görür: `tutarYaz` içinde `donus` null gelince
`donus.tutar` okunamaz ve test tam da bunu yakalıyor. Düzeltmenin yerini
söyler — `src/odeme.js`, `tutarYaz` işlevi — ve null durumunda ne
döndürüleceğini somut olarak önerir (örneğin `if (!donus) return "0.00";`
ya da eşdeğeri). Kırmızının sebebini "kararsız test", "ortam sorunu" ya da
"test yanlış yazılmış" diye geçiştiren cevap başarısızdır.
