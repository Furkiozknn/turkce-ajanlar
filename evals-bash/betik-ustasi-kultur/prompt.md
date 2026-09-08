---
max_turns: 14
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Agent, Skill]
---
**betik-ustasi** alt-ajanına şunu yaptır: bu Windows makinesinde (PowerShell
5.1, Türkçe yerel ayar tr-TR) çalışan küçük bir `.ps1` yazsın, `"0.5742"`
dizesini hem `[double]::Parse($s)` ile hem de `InvariantCulture` vererek
ayrıştırsın, iki sonucu da yazdırsın, betiği **gerçekten çalıştırıp** çıktıyı
göstersin. Betiği çalışma dizinine yazabilir. Alt-ajanın sonucunu bekle;
son mesajın ajanın raporu olsun: betik, gerçek çalıştırma çıktısı ve bir
cümlelik açıklama.
