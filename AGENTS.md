# turkce-ajanlar — bu depoda çalışan ajan için bağlam

Claude Code için **Türkçe çıktı veren** sekiz alt-ajan, üç slash komutu ve
iki beceri. Kaynak tek yerde: `agents/*.md`, `commands/*.md`,
`skills/*/SKILL.md`. Geri kalan her şey bunlardan türetilir.
Bu dosyayı Codex, Cursor, OpenCode ve Copilot doğrudan okur; Claude Code
aynı kuralları `KATKIDA-BULUNMA.md` üzerinden alır.

## Düzen

| Yol | Ne | Elle düzenlenir mi |
|---|---|---|
| `agents/` | Kaynak ajanlar (frontmatter: `name`, `description`, `model`, `color`, `tools`) | evet |
| `commands/`, `skills/` | Plugin komutları ve becerileri | evet |
| `.cursor/agents/`, `.opencode/agents/`, `.github/agents/`, `.codex/agents/` | Diğer araçlar için **üretilmiş** ajan kopyaları | **hayır** — `node arac/disari-aktar.js` |
| `web/index.html`, `assets/banner.svg`, `assets/social.*` | Üretilmiş arayüz ve görseller | **hayır** — `arac/web-uret.js`, `arac/banner-uret.js` |
| `arac/` | Üretici ve doğrulayıcılar | evet |
| `_eski/`, `_test/` | Git dışı çalışma alanı | — |

## Push'tan önce

```
node arac/dogrula.js            # ajanlar
node arac/eklenti-dogrula.js    # komutlar ve beceriler
node arac/web-uret.js           # arayüz
node arac/disari-aktar.js       # diğer araç biçimleri
git status                      # türetilmiş dosya bayat kalmasın; CI aynı kontrolü yapar
```

## Kurallar

- Ajan gövdeleri ve belgeler Türkçe; kod tanımlayıcıları İngilizce.
  Commit mesajı Türkçe, ilk satır kısa.
- Bulgu şişirme yok: her rakamın kaynağı yazılır, kontrol edilmeyen şey
  "bakılmadı" diye işaretlenir, "sorun yok" geçerli sonuçtur.
- Yeni ajan eklemeden önce `KATKIDA-BULUNMA.md` §1: gerçekten gerekli mi?
  Her ajan tanımı her oturumda bağlama girer.
- Kalıcı silme, `git push --force`, geçmiş yeniden yazma yapılmaz;
  atılacak dosya `_eski/` altına taşınır.
- Windows'ta betik yazmadan önce `BILINEN-TUZAKLAR.md`: heredoc ters bölüyü
  yer, PowerShell 5.1'de `&&` yok, Python çıktısı cp1254, Türkçe yerel
  ayar `0.5`'i 5 okur.
