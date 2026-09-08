# Bilinen tuzaklar

Bu makinede **gerçekten yaşanmış** ve her biri en az bir görevi bozmuş
hatalar. Her otonom göreve otomatik eklenir. Yeni bir tuzak yaşarsan
buraya ekle — bir daha kimse aynı deliğe düşmesin.

Kural: bir şeyi düzeltmekle yetinme, **neden olduğunu buraya yaz.**

---

## 1. Ters bölü ve kontrol karakterleri (3 kez yaşandı)

Bash heredoc ve `node -e` içinde ters bölü ya kayboluyor ya da kaçış
dizisine dönüşüyor: `\v` → 0x0B, `\b` → 0x08, `\f` → 0x0C.
`otomasyon\bildir.ps1` yazdın, dosyada `otomasyonildir.ps1` + görünmez
bayt var. **`grep` bulamaz**, çünkü görünen metin ile bayt farklı.

- Windows yolu içeren içeriği heredoc ile yazma; Write aracıyla dosya yaz.
- Ters bölü gerekiyorsa `String.fromCharCode(92)`.
- Tuhaf bir eşleşmeme görürsen `od -c` ile bayta bak.
- Temizlik: `/[\x08\x0B\x0C]/g`.

## 2. PowerShell 5.1 ve BOM

BOM'suz `.ps1` dosyası **cp1254** (Türkçe ANSI) olarak okunur. İçindeki
em-dash (—) veya Türkçe karakter parse hatası verir ve script hiç
çalışmaz. Tüm `.ps1` dosyaları UTF-8 **BOM ile** kaydedilir.
Doğrulama: `[System.Management.Automation.PSParser]::Tokenize`.

## 3. PowerShell 5.1 sözdizimi

`&&`, `||`, ternary `?:`, `??`, `?.` **yok**. Görürsen hata.
`A; if ($?) { B }` kullan.

## 4. Türkçe yerel ayar sayıları yanlış okutur

`[double]::TryParse("0.5742")` Türkçe kültürde noktayı **binlik
ayırıcı** sayar → 5742. Bütçe sayacı 14.881 USD hesapladı, döngü kendini
durdurdu. Sayı parse ederken **her zaman**
`[Globalization.CultureInfo]::InvariantCulture` ver.

## 5. Python çıktısı cp1254

Türkçe Windows'ta Python stdout cp1254. Unicode basan araç
(`litellm`, `rich` kullanan her şey) `UnicodeEncodeError` ile **hiç
başlamaz** ve hata mesajı aracın kendisini suçlar gibi görünür.
Başlatmadan önce: `$env:PYTHONIOENCODING = "utf-8"; $env:PYTHONUTF8 = "1"`.

## 6. Python PATH'te yok

`python script.py` çalışmaz. `uv run` / `uvx` var, onları kullan.

## 7. Bütçe duvarı (5 görev yarıda kesildi)

`--max-budget-usd` dolunca süreç **anında** ölür; toparlanma şansı yok.
Görev "bitti" işaretini koyup doğrulamayı yapamadan kesilebilir.

- **Sıra:** önce doğrula, **en son** işaretle. Tersini yapma.
- Büyük bir işe girmeden önce kendine sor: bütçenin yarısı gitti mi?
  Gittiyse kalan işi günlüğe yaz, kutucuğu **boş bırak**, dur.
- Paralel alt-ajan açarken `sonnet` kullan; beş paralel `opus` bir turda
  2,56 USD yaktı ve hiç çıktı bırakmadı.

## 8. Deny kuralı sözdizimi

Windows'ta `Read()` deny sadece şu biçimde tutar:
`Read(C:/Users/furki/Desktop/dosya.txt)` — düz bölü, önek yok, tam yol.
Ters bölü, `//` öneki, `**/` ve joker **sessizce geçer**. Yazdığın
kuralı yem dosyayla test etmeden güvenme.

## 9. Bayat türetilmiş dosyalar

`web/index.html`, `assets/banner.svg` ve `.claude/agents/` **türetilmiş**
dosyalardır; kaynak `agents/*.md`. Bir ajan eklediysen üçünü de yenile:
`node arac/web-uret.js && node arac/banner-uret.js && powershell -File kur.ps1`.
Gece koşusunda 3 ajan eklendi, arayüz 5'te kaldı.

## 10. `--disable-slash-commands` ucuzlatmaz, pahalılaştırır

Skill listesini kaldırır ama prompt cache önekini bozar; maliyet **üçe**
katlandı (13.889 → 51.709 token). Token tasarrufu için kullanma.

## 11. İç içe kaçış katmanları (yama script'i çöktü)

JS template literal içinde PowerShell here-string üretirken içindeki
markdown çift backtick'leri template literal'ı kapattı; script
"X is not a function" ile çöktü ve **dosya hiç değişmedi** — parse
kontrolü "temiz" dedi çünkü eski hâline bakıyordu.

- Bir dilin kaynak kodunu başka bir dilin string'i içinde üretmek
  zorundaysan, çakışan karakter için **yer tutucu** kullan (ör. `¤`),
  en sonda tek seferde çevir. İki kaçış sistemi hiç yan yana gelmesin.
- Yama uyguladıktan sonra "parse temiz" yetmez; **değişikliğin gerçekten
  dosyaya girdiğini** kontrol et (`grep` ile yeni bir satırı ara).

## 12. Satır içi `node -e '...'` ve kesme işareti (3. kez)

Bash tek tırnak içindeki `node -e` gövdesinde bir kesme işareti
(`script'i`) shell string'ini kapatır; bash **hiçbir şeyi çalıştırmadan**
parse hatasıyla düşer. Türkçe metinde kesme işareti kaçınılmazdır.

Kural mutlaktır, "küçük düzenleme" istisnası yoktur: içinde Türkçe
metin, tırnak, backtick veya ters bölü olan her içerik önce Write ile
`.js` dosyasına yazılır, sonra `node dosya.js` ile çalıştırılır.

## 13. Git kimliğini `-c user.email` ile ezme — push reddedilir

Makinede global kimlik zaten hesabın **noreply** adresi
(`121863222+Furkiozknn@users.noreply.github.com`). Commit atarken
`-c user.name=... -c user.email=furkiozkann@gmail.com` vermek o commit'i
hesabın **gizli** e-postasıyla imzalar; GitHub'ın "e-postamı açığa çıkaran
push'ları engelle" ayarı push'u reddeder:
`! [remote rejected] HEAD -> master (push declined due to email privacy restrictions)`.
7 Eylül'de `ajans-os`'un ilk push'u böyle düştü; 8 commit gizli e-postayla
atılmıştı.

- `git commit` çağrısına **hiçbir zaman** `-c user.*` ekleme; global config
  doğru. Emin değilsen önce `git config --global user.email` bak.
- Reddedilen commit'ler yalnızca yeniden yazarak (yazar e-postası) ya da
  GitHub ayarını geçici kapatarak push edilebilir — ikisi de kullanıcının
  kararı.

## 14. Türetilmiş dosyanın damgası commit tarihine bağlıysa yerel üretim CI'dan farklı çıkar

`web-uret.js` sayfaya "son güncelleme" olarak `agents/` klasörünün son commit
tarihini yazıyordu. Ajan dosyalarını değiştirip sayfayı **commit'ten önce**
üretince damga bir önceki günü aldı; CI aynı commit'i bugünün tarihiyle
yeniden üretti, iki satır fark buldu ve "bayat" dedi (8 Eylül 2026, 3e1aecc).

**Kural:** damga girdisi commit'te değişecekse üretici bunu öngörmeli.
Şimdi `agents/` altında commit'lenmemiş değişiklik varsa damga **bugün**
oluyor; temizse son commit tarihi. Genel ders: türetilmiş dosyayı üretip
commit'e koymadan önce "CI bunu aynı girdilerle üretir mi?" diye sor.

## 15. Gece döngüsü ile canlı oturum aynı ağaçta yarışır — "bozukluk" zaten kapanmış olabilir

Gece döngüsünün değerlendirme adımı her turda depoyu tarar; canlı bir
oturum o sırada commit atmamış dosyalarla çalışıyorsa bunu "yarım kalmış
gece işi" sanıp bir düzeltme görevi üretir. 8 Eylül 2026 04:07'de üretilen
`duzeltme-turkce-ajanlar.md` görevi tam bu oldu: canlı oturumun sürmekte
olan eval pilotu dosyaları taranmıştı, ama görev çalışana kadar canlı
oturum kendi commit'ini zaten atmıştı (`8ca63b1`, aynı dakika: 04:07:16).
Düzeltme görevi başladığında `git status` zaten tertemizdi.

**Kural:** düzeltme görevine girer girmez önce `git status` / `git diff`
çalıştır. Ağaç temizse "bozukluk kendiliğinden kapanmış" demektir —
zorla bir şey commit'leme, geri alma; sadece doğrulama komutlarını
(`node arac/dogrula.js` vb.) tekrar çalıştırıp sonucu günlüğe yaz ve
görevi kapat. Kanıt olmayan bir şeyi düzeltmeye çalışmak yeni bir
bozukluk yaratma riski taşır.

## 16. PowerShell'de cast kültürden bağımsız, Parse/TryParse kültüre bağlı

Tuzak #4 "Türkçe yerel ayar `0.5742`'yi 5742 okur" der; bu **`[double]::TryParse($s, [ref]$d)`**
ve `[double]::Parse($s)` için doğrudur (geçerli kültür). `[double]"0.5742"` **cast**
biçimi ise InvariantCulture kullanır ve 0,5742 verir. Eval pilotunda (8 Eylül
2026) fixture cast biçimiyle yazılınca `hata-avcisi` öncülü haklı olarak
sorguladı; yanılan ajan değil, fixture'dı.

**Kural:** kültür tuzağını anlatırken ya da test ederken `Parse`/`TryParse`/`-as`
yolunu örnek ver; cast'i "güvenli" say. Eval fixture'ı yazarken iddiayı önce
gerçek makinede çalıştırıp doğrula.
