---
description: Bulunduğun depoyu (veya verilen yolu) repo-denetci ajanıyla denetler — canlılık, hijyen (README/LICENSE/test/.gitignore), bağımlılıklar, açık işler, sızmış gizli bilgi. Salt okuma; tek çıktı bir rapor dosyası.
argument-hint: [depo yolu — boşsa çalışma dizini]
---

## Görev

Denetlenecek hedef:

> $ARGUMENTS

Boşsa hedef **çalışma dizini**dir. Hedef bir git deposu değilse dur ve
söyle: "Burası bir git deposu değil; yol ver veya depo kökünde çalıştır."

## Adımlar

1. `repo-denetci` alt-ajanını çağır; hedef yolu ve şu çıktı yolunu ver:
   - `D:\Claude Projeleri\raporlar\` varsa → `raporlar\<YYYY-AA-GG>-denetim-<depo-adı>.md`
   - yoksa → hedef depo kökünde `denetim-<YYYY-AA-GG>.md`
2. Ajan salt okuma çalışır: `git status`, `git log`, dosya sayımı,
   `grep`. **Hiçbir dosya değiştirilmez**, `git pull/push/commit` yok.
3. Ajan bittiğinde kullanıcıya:
   - rapor dosyasının yolu
   - "Dikkat edilmesi gerekenler" bölümünden en fazla 3 madde (varsa)
   - sızmış gizli bilgi bulunduysa **içeriğini yazmadan** hangi dosya

## Dürüstlük

- Bulgu şişirme: bir profil deposunda test olmaması eksiklik değildir.
- Doğrulanmamış bir şeyi ("bu paket yok galiba") doğrulanmış gibi yazma;
  `curl -s https://pypi.org/pypi/<ad>/json` veya `npm view <ad>` ile bak.
- Kullanıcının kendi deposunu kayırma; aynı rubrik.
