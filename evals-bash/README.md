# Kabuk gerektiren eval vakaları

Bu iki vaka ajanın **komut çalıştırmasını** ölçer (`repo-denetci` git ile
envanter çıkarır, `betik-ustasi` yazdığı betiği çalıştırıp gösterir). Eval
koşucusu kabuk izni verilen vakaları yalnızca kum havuzu olan ortamlarda
çalıştırır; **Windows'ta kum havuzu arka ucu yok** ("A shell tool was granted
but this machine cannot confine it", 8 Eylül 2026, Claude Code 2.1.263).
Bu yüzden `evals/` dışında tutuluyorlar ki ana takım Windows'ta koşabilsin.

Linux/macOS'ta:

```bash
CLAUDE_CODE_WALNUT_SPIRE=1 claude plugin eval . --eval-dir evals-bash \
  --allow-tools Bash Write Edit --runs 1 --ablation none --no-publish
```

Fixture iddiaları makinede doğrulandı (tuzak #16): tr-TR altında
`[double]::Parse("0.5742")` 5742, `InvariantCulture` ile 0,5742 verir.
