---
max_turns: 12
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Write, Agent, Skill]
---
Aşağıdaki satış verisini **veri-raporcu** alt-ajanıyla raporlat. Alt-ajanın
sonucunu bekle; son mesajın ajanın raporunun Türkçe aktarımı olsun. Veriyi
geçici bir dosyaya yazıp sorgulayabilirsin; veri dosyasını değiştirme.

İstenen: toplam ciro, aya göre kırılım, şubeye göre kırılım, en yüksek ay,
dikkat çeken bir şey varsa tek cümle. Her rakamın nasıl hesaplandığı belli olsun.

```csv
tarih,sube,urun,adet,birim_fiyat
2026-01-05,Kadikoy,Kahve,120,85.50
2026-01-12,Besiktas,Kahve,95,85.50
2026-01-20,Kadikoy,Cay,300,25.00
2026-02-03,Kadikoy,Kahve,140,85.50
2026-02-11,Besiktas,Cay,210,25.00
2026-02-25,Uskudar,Kahve,60,85.50
2026-03-02,Kadikoy,Kahve,160,89.00
2026-03-09,Besiktas,Kahve,110,89.00
2026-03-15,Uskudar,Cay,180,25.00
2026-03-28,Kadikoy,Cay,260,25.00
```
