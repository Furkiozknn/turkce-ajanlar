---
max_turns: 8
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill]
---
Şu gece çalıştırması neden patladı? **hata-avcisi** alt-ajanıyla kök nedeni
buldur; kodu düzelttirme, sadece kanıtıyla neden olduğunu ve en küçük
düzeltmeyi bana Türkçe aktar. Bütün kanıt bu mesajda; diskte dosya arama.
Alt-ajanın sonucunu bekle, ara mesaj yazma; son mesajın ajanın bulgusunun
Türkçe aktarımı olsun.

Log (`otomasyon/butce.ps1`, 03:01):

```
[03:01:02] Bugunku harcama: 14881 USD
[03:01:02] Tavan 100 USD asildi, dongu durduruldu.
```

Kod (`butce.ps1`, satır 12-15):

```powershell
$toplam = 0
foreach ($j in Get-Content $log | ConvertFrom-Json) { $toplam += [double]::Parse($j.total_cost_usd) }
"Bugunku harcama: $toplam USD"
```

Log dosyasındaki kayıtlardan biri: `{"total_cost_usd":"0.5742"}` (değer dize
olarak yazılmış). O gün dört görev koştu, hiçbirinin maliyeti 6 USD'yi
geçmedi. Makine Windows 11, PowerShell 5.1, Türkçe yerel ayar (tr-TR).
