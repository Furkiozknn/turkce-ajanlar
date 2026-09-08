---
name: windows-tuzaklari
description: Windows'ta PowerShell 5.1, cmd, Node veya Python betiği ya da komutu yazmadan ve çalıştırmadan önce uygulanacak tuzak kontrol listesi — && yok, UTF-8 BOM, Türkçe yerel ayarın sayıyı yanlış okuması, cp1254 çıktı, heredoc ve node -e içinde ters bölü kaybı, iç içe kaçış katmanları, git kimliğini ezme. Kullanıcı ".ps1 yaz", "betik yaz", "zamanlanmış görev kur", "Türkçe karakterler bozuk", "elde çalışıyor ama zamanlayıcıda çalışmıyor" dediğinde ya da Windows'ta komut üretilecekse kullan.
---

# Windows tuzakları — betik yazmadan önce

Bunlar varsayım değil, bu makinede **yaşanmış** hatalar. Ayrıntılı hikâyeler
ve kanıt plugin kökündeki `BILINEN-TUZAKLAR.md` dosyasında; burada sadece
kural var. Yeni bir tuzak yaşanırsa önce oraya yazılır, sonra buraya kural
olarak iner.

## Kontrol listesi

| # | Tuzak | Belirti | Kural |
|---|---|---|---|
| 1 | Heredoc ve `node -e` ters bölüyü yutar; `\v` `\b` `\f` kontrol baytına döner | "dosya bozuk", regex çalışmıyor, garip karakterler | Ters bölü içeren her şeyi **dosyaya yaz**, sonra çalıştır. Satır içi kod yok. |
| 2 | PowerShell 5.1 BOM'suz UTF-8'i ANSI okur | Türkçe karakterli `.ps1` ayrıştırma hatası veriyor, em-dash bile patlatır | `.ps1` dosyaları **UTF-8 BOM** ile kaydedilir. `Set-Content -Encoding utf8` BOM yazar. |
| 3 | PS 5.1'de `&&`, `\|\|`, üçlü `?:`, `??`, `?.` yok | "The token '&&' is not valid" | `A; if ($?) { B }` ya da `try/catch`. Sürüm belli değilse 5.1 varsay. |
| 4 | Türkçe yerel ayar `"0.5742"` → 5742 okur | bütçe/oran hesabı bin kat şaşıyor | `[double]::TryParse($s, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$d)` |
| 5 | Python stdout cp1254; Unicode basan araç hiç başlamaz | `UnicodeEncodeError`, banner'da çöken CLI | `$env:PYTHONIOENCODING = "utf-8"; $env:PYTHONUTF8 = "1"` sonra çalıştır. |
| 6 | Python `PATH`'te yok | "python bulunamadı" ama makinede kurulu | `py -3` başlatıcıyı dene; yoksa mutlak yol; hiçbiri yoksa Node ile yaz. |
| 7 | İç içe kaçış katmanları (JS şablon dizesi + PowerShell ters tırnak, bash tek tırnak + Türkçe kesme işareti) | "BBB is not a function", tırnak kapanmıyor | Katman sayısı ikiyi geçiyorsa **dur, dosyaya yaz**. Yer tutucu kullan (`¤` → backtick), en sonda değiştir. |
| 8 | Yama "temiz ayrıştı" ≠ "uygulandı" | betik hata vermedi ama değişiklik yok | Her yamadan sonra `grep -n` ile **hedef satırı göster**. |
| 9 | Git kimliğini `-c user.email=...` ile ezmek | GitHub push "email privacy restrictions" ile reddedilir, geçmiş kirlenir | Kimlik bayrağı **asla**; global ayar (noreply adresi) kullanılır. |
| 10 | `Read()` deny kuralı ters bölülü yolu ve joker karakteri tanımıyor | kural yazıldı ama dosya okunuyor | Tam yol, düz bölü: `Read(C:/Users/ad/Desktop/dosya.txt)`. Kuralı **yem dosyayla test et**. |
| 11 | Zamanlayıcıda çalışma dizini ve ortam farklı | elde çalışan betik görevde sessizce ölüyor | Mutlak yollar; `-ExecutionPolicy Bypass -File`; `Set-Location $PSScriptRoot`; çıkış kodunu açıkça `exit 1/0` ver; log dosyasına yaz. |
| 12 | `2>&1` PS 5.1'de yerel exe'nin stderr'ini hataya çevirir | exit code 0 ama `$?` false | Yerel komutlarda `2>&1` kullanma; stderr zaten yakalanıyor. |
| 13 | `Remove-Item`, `Stop-Process` onay bekler; stdin kapalı | betik askıda kalır, zaman aşımı | `-Confirm:$false`; yine de silme yerine `_eski/` altına taşı. |

## Betik yazma protokolü

1. Betiği **dosyaya yaz** (Write ile), satır içi `node -e` / heredoc'a Türkçe
   metin ve ters bölü koyma. Dosya adı ASCII, yol düz bölülü.
2. `.ps1` ise BOM'lu UTF-8; ilk satırda `$ErrorActionPreference = "Stop"`.
3. Zincir yok: `&&` yerine `if ($?)` ya da `try/catch`.
4. Sayı ayrıştırma ve biçimleme InvariantCulture; Türkçe çıktı istenen yerde
   biçimi kendin yaz (`"{0:N2}" -f` yerel ayara bağlıdır, bilerek kullan).
5. Python çağrısı varsa kodlama değişkenlerini ayarla, `py -3` ile başlat.
6. **Çalıştır ve çıktıyı göster.** "Muhtemelen çalışır" teslim değildir.
   Çalıştıramıyorsan bunu açıkça yaz.
7. Zamanlanmış görevse: mutlak yol, log dosyası, çıkış kodu; kurduktan sonra
   `schtasks /Run` ile bir kez elle tetikle ve log'u oku.
8. Yamadan sonra `grep -n` ile satırı göster; doğrulanmamış yama yok sayılır.

## Ne zaman durup sormalı

- Kalıcı silme, `git push --force`, geçmiş yeniden yazma, sistem/güvenlik
  ayarı: betik bunları **yapmaz**, kullanıcıya bırakır.
- Aynı hata ikinci kez oluyorsa yaratıcı çözüm aramadan önce
  `BILINEN-TUZAKLAR.md`'ye bak; üçüncü kez oluyorsa oraya yeni madde yaz.
