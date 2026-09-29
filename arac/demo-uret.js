/*
 * demo-uret.js — README'nin ilk ekranindaki ~20 sn terminal demosunu uretir.
 *
 *   node arac/demo-uret.js [cikti-klasoru]     (varsayilan: docs/demo)
 *
 * Uydurma cikti YOK: asagidaki komutlar bu depoda GERCEKTEN calistirilir,
 * cikti (kirpilmadan, yalniz gosterilen satirlar |tail/|head ile secilir ve
 * komut satirinda yazar) kaydedilir; sayfa o kaydi yazma animasyonuyla oynatir.
 * Ciktilar:
 *   komutlar.txt   gercek komutlar + cikislari (video hattina da gider)
 *   demo.html      oynatilan terminal sayfasi (FRK-OS: siyah/krem/sari)
 *   demo.mp4/gif   Playwright kaydi -> ffmpeg (PATH'te ffmpeg ve playwright gerekir)
 *
 * Gorunum: sosyal/uret/tema.mjs "klasik" (siyah #0e0d0b, krem #f1ece2, sari
 * #ffc21a), JetBrains Mono (arac/yazi/, OFL).
 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const KOK = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(KOK, "docs", "demo"));
fs.mkdirSync(OUT, { recursive: true });

const KOMUTLAR = [
  "claude plugin validate .",
  "node arac/dogrula.js | tail -n 3",
  "node arac/sinir-denetle.js --kati | tail -n 3",
  "node arac/tetik-cakisma.js | tail -n 3",
  "node arac/web-uret.js | head -n 3",
];

const kayit = [];
for (const k of KOMUTLAR) {
  const r = cp.spawnSync("bash", ["-c", k], { cwd: KOK, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  const cikti = ((r.stdout || "") + (r.stderr || "")).replace(/\r/g, "").replace(/\u001b\[[0-9;]*m/g, "").replace(/\s+$/, "");
  // web-uret yol yazar: kullanici klasorunu gosterme.
  kayit.push({ k, cikti: cikti.split(KOK).join("."), kod: r.status });
}
// web-uret.js web/ dosyalarini yeniden yazdi; degistiyse haber ver (elle geri alma gerekmez: ayni kaynak).
fs.writeFileSync(path.join(OUT, "komutlar.txt"),
  kayit.map((x) => "$ " + x.k + "\n" + x.cikti + "\n[cikis kodu " + x.kod + "]\n").join("\n"), "utf8");

// --- oynatma cizelgesi: toplam ~20 sn --------------------------------------
const yazi = fs.readFileSync(path.join(__dirname, "yazi", "jetbrains-mono-latin.woff2")).toString("base64");
const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><title>turkce-ajanlar demo</title>
<style>
@font-face{font-family:JB;font-weight:100 800;src:url(data:font/woff2;base64,${yazi}) format("woff2")}
html,body{margin:0;height:100%;background:#0e0d0b}
body{display:flex;align-items:center;justify-content:center;background-image:linear-gradient(rgba(241,236,226,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(241,236,226,.045) 1px,transparent 1px);background-size:48px 48px}
.p{width:1120px;height:600px;box-sizing:border-box;background:#14120e;border:1px solid #3a352b;border-left:6px solid #ffc21a;border-radius:8px;padding:22px 28px;font:600 21px/1.5 JB,monospace;color:#f1ece2;overflow:hidden;position:relative}
.b{font:700 13px JB,monospace;letter-spacing:.12em;color:#ffc21a;margin:0 0 14px;text-transform:uppercase}
.y{color:#ffc21a}.d{color:#b6ae9d;font-weight:400}
pre{margin:0;white-space:pre-wrap;word-break:break-all;font:inherit}
.c{display:inline-block;width:11px;height:22px;background:#ffc21a;vertical-align:-4px;margin-left:2px}
</style><div class="p"><div class="b">turkce-ajanlar · gercek komutlar, gercek cikti</div><pre id="t"></pre></div>
<script>
const K=${JSON.stringify(kayit.map((x) => ({ k: x.k, c: x.cikti })))};
const TOPLAM=21500; // ms
// zaman butcesi: her komut yazilirken 32ms/harf, cikti satir satir; kalan sure bekleme.
let olay=[],t=600;
for(const x of K){
  olay.push({t,tip:"komut",k:x.k}); t+=x.k.length*32+250;
  const s=x.c.split("\\n");
  const adim=Math.max(60,Math.min(240,Math.floor((TOPLAM/K.length-x.k.length*32-250-700)/Math.max(1,s.length))));
  for(const l of s){olay.push({t,tip:"satir",l});t+=adim}
  t+=700;
}
const el=document.getElementById("t");let g="";const t0=performance.now();
function ciz(){
  const now=performance.now()-t0;g="";let son=null;
  for(const o of olay){
    if(o.t>now)break;
    if(o.tip==="komut"){const n=Math.min(o.k.length,Math.floor((now-o.t)/32));g+='<span class="y">$ </span>'+esc(o.k.slice(0,n))+(n<o.k.length?'<span class="c"></span>':"")+"\\n";son=o}
    else g+='<span class="d">'+esc(o.l)+"</span>\\n";
  }
  if(now>olay[olay.length-1].t+300)g+='<span class="y">$ </span><span class="c"></span>';
  el.innerHTML=g;
  // uzun cikti tasarsa ustten kaydir
  el.style.marginTop=Math.min(0,560-el.getBoundingClientRect().height-20)+"px";
  requestAnimationFrame(ciz);
}
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
window.__bitis=olay[olay.length-1].t+1500;
ciz();
</script></html>`;
fs.writeFileSync(path.join(OUT, "demo.html"), html, "utf8");

(async () => {
  let pw;
  try { pw = require("playwright"); } catch { console.log("playwright yok: yalniz komutlar.txt ve demo.html uretildi"); return; }
  const b = await pw.chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  const p = await c.newPage();
  await p.goto("file:///" + path.join(OUT, "demo.html").replace(/\\/g, "/"));
  const bitis = await p.evaluate(() => window.__bitis);
  await p.waitForTimeout(bitis + 800);
  const v = p.video();
  await c.close();
  const webm = await v.path();
  await b.close();
  const mp4 = path.join(OUT, "demo.mp4"), gif = path.join(OUT, "demo.gif");
  const ff = (a) => { const r = cp.spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...a], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr); };
  ff(["-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  ff(["-i", webm, "-vf", "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", gif]);
  fs.unlinkSync(webm);
  console.log("demo: " + mp4 + " (" + (fs.statSync(mp4).size / 1024).toFixed(0) + " KB), " + gif + " (" + (fs.statSync(gif).size / 1024).toFixed(0) + " KB)");
})();
