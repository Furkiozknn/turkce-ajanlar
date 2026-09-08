#!/usr/bin/env node
/**
 * disari-aktar.js — agents/*.md tek kaynagindan diger araclarin ajan bicimlerini uretir.
 *
 *   node arac/disari-aktar.js              # dort hedefi de yazar
 *   node arac/disari-aktar.js cursor codex # sadece verilen hedefler
 *
 * Ciktilar depo kokunde, commit'lenir; CI yeniden uretip farki kontrol eder:
 *   .cursor/agents/<ad>.md         Cursor        name, description, model: inherit, readonly
 *   .opencode/agents/<ad>.md       OpenCode      description, mode: subagent, permission (edit/bash/webfetch)
 *   .github/agents/<ad>.agent.md   Copilot       name, description, tools (read/search/execute/edit/web)
 *   .codex/agents/<ad>.toml        Codex CLI     name, description, sandbox_mode, developer_instructions
 *
 * Govde her hedefte aynen kalir; yalnizca frontmatter cevrilir. Bu klasorlerde elle
 * duzenleme yapma — kaynak agents/, gerisi turetilir. Hedef klasorde artik kalan
 * (kaynagi silinmis) dosyalar temizlenir.
 *
 * Kum havuzu kurali: Bash de dosya yazabildigi icin "salt okunur" (Cursor readonly,
 * Codex read-only) yalnizca Bash/Write/Edit tasimayan ajanlara verilir. OpenCode'da
 * izin araca gore ayri oldugundan `edit` ve `webfetch` tam olarak kaynaktaki listeye gore kisilir.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..");
const KAYNAK = path.join(KOK, "agents");

const YAZAN = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const COPILOT_TAKMA = {
  Bash: "execute", Read: "read", NotebookRead: "read", Grep: "search", Glob: "search",
  Write: "edit", Edit: "edit", MultiEdit: "edit", NotebookEdit: "edit",
  WebSearch: "web", WebFetch: "web", Task: "agent", Agent: "agent", TodoWrite: "todo",
};

function ayristir(dosya) {
  const ham = fs.readFileSync(dosya, "utf8");
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(path.basename(dosya) + ": frontmatter yok");
  const fm = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const e = satir.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (e) fm[e[1]] = e[2].trim();
  }
  let tools = [];
  if (fm.tools) {
    try { tools = JSON.parse(fm.tools); }
    catch { tools = fm.tools.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean); }
  }
  const ad = fm.name || path.basename(dosya, ".md");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ad)) throw new Error(path.basename(dosya) + ": name kebab-case degil: " + ad);
  return { ad, aciklama: fm.description || "", tools, govde: m[2].replace(/\r\n/g, "\n").trim() + "\n" };
}

const bashVar = (a) => a.tools.includes("Bash");
const duzenler = (a) => a.tools.some((t) => YAZAN.has(t));
const saltOkur = (a) => !bashVar(a) && !duzenler(a);
// OpenCode izni: kaynak listede araclardan biri varsa allow, yoksa deny.
const izin = (a, ...araclar) => (araclar.some((t) => a.tools.includes(t)) ? "allow" : "deny");

// YAML cift tirnakli skaler: iki nokta, tirnak ve ters bolu icin guvenli.
const yaml = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const tomlBasic = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

const HEDEFLER = {
  cursor: {
    klasor: path.join(".cursor", "agents"),
    dosya: (a) => a.ad + ".md",
    icerik: (a) => [
      "---",
      "name: " + a.ad,
      "description: " + yaml(a.aciklama),
      "model: inherit",
      "readonly: " + (saltOkur(a) ? "true" : "false"),
      "---",
      "",
      a.govde,
    ].join("\n"),
  },
  opencode: {
    klasor: path.join(".opencode", "agents"),
    dosya: (a) => a.ad + ".md",
    icerik: (a) => [
      "---",
      "description: " + yaml(a.aciklama),
      "mode: subagent",
      "permission:",
      "  edit: " + izin(a, "Edit", "MultiEdit", "NotebookEdit"),
      "  write: " + izin(a, "Write"),
      "  bash: " + izin(a, "Bash"),
      "  webfetch: " + izin(a, "WebFetch"),
      "  websearch: " + izin(a, "WebSearch"),
      "---",
      "",
      a.govde,
    ].join("\n"),
  },
  copilot: {
    klasor: path.join(".github", "agents"),
    dosya: (a) => a.ad + ".agent.md",
    icerik: (a) => {
      const takma = [];
      for (const t of a.tools) {
        const k = COPILOT_TAKMA[t];
        if (!k) { uyarilar.push(a.ad + ": Copilot karsiligi olmayan arac atlandi: " + t); continue; }
        if (!takma.includes(k)) takma.push(k);
      }
      if (a.govde.length > 30000) uyarilar.push(a.ad + ": govde 30.000 karakteri asiyor, Copilot keser (" + a.govde.length + ")");
      return [
        "---",
        "name: " + a.ad,
        "description: " + yaml(a.aciklama),
        ...(takma.length ? ["tools: [" + takma.map((k) => '"' + k + '"').join(", ") + "]"] : []),
        "---",
        "",
        a.govde,
      ].join("\n");
    },
  },
  codex: {
    klasor: path.join(".codex", "agents"),
    dosya: (a) => a.ad + ".toml",
    icerik: (a) => {
      if (a.govde.includes("'''")) throw new Error(a.ad + ": govde ''' iceriyor, TOML literal dize yazilamaz");
      return [
        "name = " + tomlBasic(a.ad),
        "description = " + tomlBasic(a.aciklama),
        'sandbox_mode = "' + (saltOkur(a) ? "read-only" : "workspace-write") + '"',
        "developer_instructions = '''",
        a.govde.trimEnd(),
        "'''",
        "",
      ].join("\n");
    },
  },
};

const uyarilar = [];
const istenen = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(HEDEFLER);
for (const h of istenen) if (!HEDEFLER[h]) { console.error("Bilinmeyen hedef: " + h + " (secenekler: " + Object.keys(HEDEFLER).join(", ") + ")"); process.exit(2); }

const ajanlar = fs.readdirSync(KAYNAK).filter((f) => f.endsWith(".md")).sort().map((f) => ayristir(path.join(KAYNAK, f)));
if (!ajanlar.length) { console.error("agents/ altinda ajan yok."); process.exit(1); }

for (const h of istenen) {
  const hedef = HEDEFLER[h];
  const tam = path.join(KOK, hedef.klasor);
  fs.mkdirSync(tam, { recursive: true });
  const beklenen = new Set(ajanlar.map(hedef.dosya));
  let yazilan = 0, ayni = 0, silinen = 0;
  for (const a of ajanlar) {
    const yol = path.join(tam, hedef.dosya(a));
    const yeni = hedef.icerik(a);
    if (fs.existsSync(yol) && fs.readFileSync(yol, "utf8") === yeni) { ayni++; continue; }
    fs.writeFileSync(yol, yeni, "utf8");
    yazilan++;
  }
  for (const f of fs.readdirSync(tam)) {
    if (!beklenen.has(f) && /\.(md|toml)$/.test(f)) { fs.unlinkSync(path.join(tam, f)); silinen++; }
  }
  console.log(h.padEnd(9) + hedef.klasor.replace(/\\/g, "/").padEnd(18) + ajanlar.length + " ajan  (" + yazilan + " yazildi, " + ayni + " ayni, " + silinen + " artik silindi)");
}
for (const u of uyarilar) console.error("UYARI " + u);
