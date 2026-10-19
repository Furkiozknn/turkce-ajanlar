#!/usr/bin/env node
/**
 * grup-eklentileri.js — one Claude Code plugin per agent group in the README.
 *
 *   node arac/grup-eklentileri.js            # write eklentiler/<group>/ and marketplace.json
 *   node arac/grup-eklentileri.js --check    # change nothing; exit 1 if anything is stale
 *   node arac/grup-eklentileri.js --report   # per-plugin agent count and context estimate
 *
 * WHY. Claude Code loads the name and `description` of every installed agent
 * into every session, so the full set's cost is paid whichever agents a user
 * needs. `claude plugin details` (Claude Code 2.1.292, 15 October 2026) puts
 * the full plugin at ~7,533 always-on tokens and the group plugins at ~210 to
 * ~1,241 (README, "Grup eklentileri"). A user who needs the security
 * reviewers should not pay for the UI and data teams too.
 *
 * WHAT. The groups are the `### ...` headings under `## Ajanlar` in README.md,
 * the same source arac/web-uret.js reads, so the list is kept in one place.
 * Each group becomes eklentiler/<slug>/ with:
 *   .claude-plugin/plugin.json   name turkce-ajanlar-<slug>, version of the full plugin
 *   agents/<agent>.md            byte-identical copies of agents/<agent>.md
 *   skills/<skill>/SKILL.md      only the skills those agents name in `skills:`
 * Eval cases are not copied: they stay in evals/ and run against the full
 * plugin, so the generated tree holds only what a session actually loads.
 * Copies, not references: a plugin's component paths must resolve inside its
 * own root (plugins-reference, "Containment"), and an `agents` list in the
 * root marketplace entry cannot narrow the root plugin, whose plugin.json
 * keeps the default agents/ scan.
 *
 * The full plugin `turkce-ajanlar` (repository root) is unchanged and stays the
 * first marketplace entry. Do not edit eklentiler/ by hand: the source is
 * agents/, skills/ and README.md (.gitattributes marks the tree as generated), and arac/eklenti-dogrula.js runs
 * `--check` in CI.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DEFAULT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = "eklentiler";
const PREFIX = "turkce-ajanlar-";

// A group may carry at most this share of the full set's description text.
// Every group is far below it today (the largest is 14%); the bound exists so
// a later reshuffle that piles most agents into one group fails the test
// instead of quietly undoing the split.
const MAX_GROUP_SHARE = 0.25;

const FOLD = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
const slugOf = (title) =>
  title.split(/\s+/)[0].replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => FOLD[c]).toLowerCase().replace(/[^a-z0-9-]/g, "");

/** Groups in README order: [{ title, slug, agents: [name, ...] }]. */
function readGroups(root) {
  const lines = fs.readFileSync(path.join(root, "README.md"), "utf8").split(/\r?\n/);
  const groups = [];
  let inside = false;
  for (const line of lines) {
    if (/^## /.test(line)) { inside = /^## Ajanlar\s*$/.test(line); continue; }
    if (!inside) continue;
    const heading = line.match(/^### (.+?)\s*$/);
    if (heading) {
      const title = heading[1].split(" — ")[0].trim();
      groups.push({ title, slug: slugOf(title), agents: [] });
      continue;
    }
    const agent = line.match(/^\| `([a-z0-9-]+)`/);
    if (agent && groups.length) groups[groups.length - 1].agents.push(agent[1]);
  }
  return groups;
}

/** `description` and `skills` from an agent's frontmatter (the two fields used here). */
function readAgent(root, name) {
  const raw = fs.readFileSync(path.join(root, "agents", name + ".md"), "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const field = (key) => {
    const m = fm && fm[1].match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
    return m ? m[1].trim() : "";
  };
  let description = field("description");
  if (/^".*"$/.test(description)) description = JSON.parse(description);
  let skills = [];
  const s = field("skills");
  if (s) {
    try { skills = JSON.parse(s); } catch { skills = s.replace(/^\[|\]$/g, "").split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean); }
  }
  return { raw, description, skills };
}

/** Every file under `dir`, as paths relative to `dir` with forward slashes. */
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else out.push(r);
    }
  };
  walk(dir, "");
  return out;
}

/**
 * Everything the generator would write, without writing it.
 * Returns { files: Map<relPath, string>, marketplace: string, groups, problems: [] }.
 */
function build(root = DEFAULT_ROOT) {
  const problems = [];
  const groups = readGroups(root);
  const onDisk = fs.readdirSync(path.join(root, "agents")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
  const seen = new Map();
  for (const g of groups) {
    if (!g.slug) problems.push("README group '" + g.title + "' gives an empty plugin name");
    for (const a of g.agents) {
      if (seen.has(a)) problems.push(a + ": listed in both '" + seen.get(a) + "' and '" + g.title + "'");
      seen.set(a, g.title);
      if (!onDisk.includes(a)) problems.push(a + ": in README group '" + g.title + "' but agents/" + a + ".md does not exist");
    }
  }
  for (const a of onDisk) if (!seen.has(a)) problems.push(a + ": agents/" + a + ".md is in no README group, so no group plugin carries it");
  const slugs = groups.map((g) => g.slug);
  for (const s of slugs) if (slugs.indexOf(s) !== slugs.lastIndexOf(s)) problems.push("two README groups map to the plugin name " + PREFIX + s);

  const fullManifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8"));
  const marketplacePath = path.join(root, ".claude-plugin", "marketplace.json");
  const market = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));

  const files = new Map();
  const entries = [];
  for (const g of groups) {
    const base = OUT_DIR + "/" + g.slug + "/";
    const agents = g.agents.filter((a) => onDisk.includes(a));
    const skills = new Set();
    let chars = 0;
    for (const a of agents) {
      const info = readAgent(root, a);
      files.set(base + "agents/" + a + ".md", info.raw);
      chars += info.description.length;
      for (const s of info.skills) skills.add(s);
    }
    for (const s of [...skills].sort()) {
      const src = path.join(root, "skills", s);
      if (!fs.existsSync(path.join(src, "SKILL.md"))) { problems.push(g.slug + ": an agent names skill '" + s + "', but skills/" + s + "/SKILL.md does not exist"); continue; }
      for (const f of listFiles(src)) files.set(base + "skills/" + s + "/" + f, fs.readFileSync(path.join(src, f), "utf8"));
    }
    const description =
      "Türkçe alt-ajanlar, yalnız '" + g.title + "' grubu (" + agents.length + " ajan): " + agents.join(", ") +
      ". Tam set (" + onDisk.length + " ajan, komutlar ve kanca) için turkce-ajanlar eklentisi.";
    const manifest = {
      $schema: "https://anthropic.com/claude-code/plugin.schema.json",
      name: PREFIX + g.slug,
      version: fullManifest.version,
      description,
      author: fullManifest.author,
      license: fullManifest.license,
      keywords: ["turkce", "turkish", "agents", "subagents", g.slug],
    };
    files.set(base + ".claude-plugin/plugin.json", JSON.stringify(manifest, null, 2) + "\n");
    entries.push({
      name: manifest.name,
      source: "./" + OUT_DIR + "/" + g.slug,
      description,
      version: fullManifest.version,
      license: fullManifest.license,
      category: "development",
      keywords: manifest.keywords,
    });
    g.descriptionChars = chars;
    g.skills = [...skills].sort();
  }

  // The full plugin keeps its place and its entry; only group entries are generated.
  const full = market.plugins.find((p) => p.name === fullManifest.name);
  if (!full) problems.push("marketplace.json has no entry for the full plugin '" + fullManifest.name + "'");
  const others = market.plugins.filter((p) => p.name !== fullManifest.name && !p.name.startsWith(PREFIX));
  market.plugins = [...(full ? [full] : []), ...entries, ...others];
  return { files, marketplace: JSON.stringify(market, null, 2) + "\n", marketplacePath, groups, problems, root };
}

/** Paths under eklentiler/ that exist on disk but would not be generated. */
function strayFiles(result) {
  return listFiles(path.join(result.root, OUT_DIR)).map((f) => OUT_DIR + "/" + f).filter((f) => !result.files.has(f));
}

/** Problems that make the committed group plugins differ from their sources. */
function check(root = DEFAULT_ROOT) {
  const r = build(root);
  const out = [...r.problems];
  for (const [rel, content] of r.files) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) out.push(rel + ": missing (run node arac/grup-eklentileri.js)");
    else if (fs.readFileSync(p, "utf8") !== content) out.push(rel + ": differs from its source (run node arac/grup-eklentileri.js)");
  }
  for (const f of strayFiles(r)) out.push(f + ": not generated from any source; remove it or run node arac/grup-eklentileri.js");
  if (fs.readFileSync(r.marketplacePath, "utf8") !== r.marketplace) out.push(".claude-plugin/marketplace.json: group entries are stale (run node arac/grup-eklentileri.js)");
  return out;
}

function write(root = DEFAULT_ROOT) {
  const r = build(root);
  if (r.problems.length) return r;
  let written = 0, same = 0, removed = 0;
  for (const [rel, content] of r.files) {
    const p = path.join(root, rel);
    if (fs.existsSync(p) && fs.readFileSync(p, "utf8") === content) { same++; continue; }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, "utf8");
    written++;
  }
  for (const f of strayFiles(r)) { fs.unlinkSync(path.join(root, f)); removed++; }
  // Directories left empty by a removed group or case.
  const prune = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(d, e.name));
    if (d !== path.join(root, OUT_DIR) && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
  };
  prune(path.join(root, OUT_DIR));
  if (fs.readFileSync(r.marketplacePath, "utf8") !== r.marketplace) { fs.writeFileSync(r.marketplacePath, r.marketplace, "utf8"); written++; }
  r.summary = { written, same, removed };
  return r;
}

/**
 * Description characters per group and their share of the full set. The text
 * Claude Code keeps in context is these descriptions; `claude plugin details`
 * turns them into tokens, and the README quotes its measured numbers.
 */
function report(r) {
  const totalChars = r.groups.reduce((n, g) => n + g.descriptionChars, 0);
  const lines = ["plugin".padEnd(32) + "agents  description chars  share  skills"];
  for (const g of r.groups) {
    const share = totalChars ? Math.round((100 * g.descriptionChars) / totalChars) : 0;
    lines.push((PREFIX + g.slug).padEnd(32) + String(g.agents.length).padStart(6) + String(g.descriptionChars).padStart(19) +
      (share + "%").padStart(7) + "  " + g.skills.join(", "));
  }
  lines.push("all groups".padEnd(32) + String(r.groups.reduce((n, g) => n + g.agents.length, 0)).padStart(6) +
    String(totalChars).padStart(19) + "   100%");
  return lines.join("\n");
}

module.exports = { build, check, write, report, readGroups, slugOf, OUT_DIR, PREFIX, MAX_GROUP_SHARE };

if (require.main === module) {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf("--root");
  const root = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : DEFAULT_ROOT;
  if (args.includes("--check")) {
    const problems = check(root);
    for (const p of problems) console.error("STALE " + p);
    console.log(problems.length ? problems.length + " problem(s) in the group plugins." : "Group plugins match their sources.");
    process.exit(problems.length ? 1 : 0);
  }
  const r = args.includes("--report") ? build(root) : write(root);
  for (const p of r.problems) console.error("ERROR " + p);
  if (r.problems.length) process.exit(1);
  if (r.summary) console.log(r.groups.length + " group plugins in " + OUT_DIR + "/ (" + r.summary.written + " written, " + r.summary.same + " unchanged, " + r.summary.removed + " removed)");
  console.log(report(r));
}
