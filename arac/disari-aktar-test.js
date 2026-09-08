#!/usr/bin/env node
/**
 * disari-aktar-test.js — ureticiyi calistirir, uretilen her dosyayi kaynakla karsilastirir.
 *   node arac/disari-aktar-test.js
 * Kontroller: dort hedefte dosya var; aciklama ve govde kaynakla birebir ayni;
 * Copilot araclari yalnizca bilinen takma adlar; Codex TOML zorunlu alanlari tasiyor.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const KOK = path.resolve(__dirname, "..");
cp.execFileSync(process.execPath, [path.join(__dirname, "disari-aktar.js")], { stdio: "inherit" });

const oku = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
function fm(metin) {
  const m = metin.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const alan = {};
  for (const s of m[1].split("\n")) { const e = s.match(/^([a-z_-]+):\s*(.*)$/); if (e) alan[e[1]] = e[2]; }
  // Frontmatter'dan sonraki tek bos satir bicim geregi; karsilastirmaya girmez.
  return { alan, govde: m[2].replace(/^\n/, "") };
}
// Uretici aciklamayi YAML cift tirnakli skaler yazar; sadece \\ ve \" kacisi kullanir -> JSON ile cozulur.
const yamlCoz = (s) => (s && s.startsWith('"') ? JSON.parse(s) : s);
const COPILOT = new Set(["read", "search", "execute", "edit", "web", "agent", "todo"]);

const hatalar = [];
const hata = (m) => hatalar.push(m);
const kaynaklar = fs.readdirSync(path.join(KOK, "agents")).filter((f) => f.endsWith(".md")).sort();

for (const f of kaynaklar) {
  const src = fm(oku(path.join(KOK, "agents", f)));
  const ad = src.alan.name;
  const govde = src.govde.trim() + "\n";
  const aciklama = src.alan.description;

  const c = fm(oku(path.join(KOK, ".cursor", "agents", ad + ".md")));
  if (!c) hata(ad + " cursor: frontmatter yok");
  else {
    if (c.alan.name !== ad) hata(ad + " cursor: name farkli");
    if (yamlCoz(c.alan.description) !== aciklama) hata(ad + " cursor: description farkli");
    if (!["true", "false"].includes(c.alan.readonly)) hata(ad + " cursor: readonly true/false degil");
    if (c.govde !== govde) hata(ad + " cursor: govde farkli");
  }

  const o = fm(oku(path.join(KOK, ".opencode", "agents", ad + ".md")));
  if (!o) hata(ad + " opencode: frontmatter yok");
  else {
    if (yamlCoz(o.alan.description) !== aciklama) hata(ad + " opencode: description farkli");
    if (o.alan.mode !== "subagent") hata(ad + " opencode: mode subagent degil");
    const ham = oku(path.join(KOK, ".opencode", "agents", ad + ".md"));
    if (!/\npermission:\n  edit: (allow|deny)\n  write: (allow|deny)\n  bash: (allow|deny)\n  webfetch: (allow|deny)\n  websearch: (allow|deny)\n---\n/.test(ham)) hata(ad + " opencode: permission blogu eksik ya da bozuk");
    if (o.govde !== govde) hata(ad + " opencode: govde farkli");
  }

  const g = fm(oku(path.join(KOK, ".github", "agents", ad + ".agent.md")));
  if (!g) hata(ad + " copilot: frontmatter yok");
  else {
    if (g.alan.name !== ad) hata(ad + " copilot: name farkli");
    if (yamlCoz(g.alan.description) !== aciklama) hata(ad + " copilot: description farkli");
    if (g.alan.tools) {
      let liste; try { liste = JSON.parse(g.alan.tools); } catch { liste = null; }
      if (!Array.isArray(liste) || !liste.every((t) => COPILOT.has(t))) hata(ad + " copilot: tools bilinmeyen takma ad iceriyor: " + g.alan.tools);
    }
    if (g.govde !== govde) hata(ad + " copilot: govde farkli");
    if (g.govde.length > 30000) hata(ad + " copilot: govde 30.000 karakteri asiyor");
  }

  const t = oku(path.join(KOK, ".codex", "agents", ad + ".toml"));
  if (!t.startsWith('name = "' + ad + '"\n')) hata(ad + " codex: name satiri yok");
  if (!/\ndescription = "/.test(t)) hata(ad + " codex: description yok");
  if (!/\nsandbox_mode = "(read-only|workspace-write)"\n/.test(t)) hata(ad + " codex: sandbox_mode gecersiz");
  const m = t.match(/\ndeveloper_instructions = '''\n([\s\S]*?)\n'''\n$/);
  if (!m) hata(ad + " codex: developer_instructions literal dizesi kapanmiyor");
  else if (m[1] !== govde.trimEnd()) hata(ad + " codex: developer_instructions govdeden farkli");
}

for (const h of hatalar) console.error("HATA " + h);
console.log(kaynaklar.length + " ajan x 4 hedef kontrol edildi, " + hatalar.length + " hata.");
process.exit(hatalar.length ? 1 : 0);
