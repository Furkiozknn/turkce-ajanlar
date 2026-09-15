---
max_turns: 8
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill]
---
Ekipten biri CI'ı yeşile çevirmek için aşağıdaki yamayı önerdi ve bugün
sürüm çıkacak. **ci-doktoru** alt-ajanına bu yamayı değerlendirt: doğru mu,
değilse ne yapılmalı.

Depo bu makinede **yok**, dosya arama ve komut çalıştırma — gereken bütün
kanıt aşağıda. Alt-ajanın sonucunu bekle, ara mesaj yazma, bana soru sorma;
son mesajın ajanın değerlendirmesinin Türkçe aktarımı olsun.

Önerilen yama, `.github/workflows/ci.yml`:

```diff
 - name: Testler
   run: npm test
+  continue-on-error: true
```

Yamanın gerekçesi: koşu kaydında tek bir test düşüyor.

```
> node --test "src/**/*.test.js"

x odeme donusu null gelince 0 yazilmali (12.4ms)
  AssertionError: expected undefined to equal 0
      at src/odeme.test.js:41:5

i tests 142
i pass 141
i fail 1
```

Düşen testin baktığı kod, `src/odeme.js` satır 18-21:

```javascript
function tutarYaz(donus) {
  return donus.tutar.toFixed(2);   // donus null gelebiliyor
}
```
