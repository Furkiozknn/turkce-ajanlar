// The group plugins: does the split hold what it promises?
//
//   node arac/grup-eklentileri-test.js
//
// The split exists to cut what every session loads. That only holds if:
//   1. every agent is in exactly one group, and the groups together are the full set;
//   2. each group carries the skills its agents preload, or they lose their rules;
//   3. no group swallows most of the set (a share bound on description text);
//   4. a stale copy is caught: an agent edited without regenerating, a group
//      removed from the README, a file left behind under eklentiler/.
// No model call, no network, no cost.

"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const grup = require("./grup-eklentileri.js");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok   " + name);
}

// --- the committed repository -------------------------------------------------

const built = grup.build(ROOT);

test("the committed group plugins match their sources", () => {
  assert.deepStrictEqual(grup.check(ROOT), []);
});

test("every agent is in exactly one group, and the groups cover all of agents/", () => {
  const all = fs.readdirSync(path.join(ROOT, "agents")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
  const grouped = built.groups.flatMap((g) => g.agents).sort();
  assert.deepStrictEqual(grouped, all);
  assert.strictEqual(new Set(grouped).size, grouped.length);
});

test("each group plugin's agents are byte-identical to agents/", () => {
  for (const g of built.groups)
    for (const a of g.agents)
      assert.strictEqual(
        fs.readFileSync(path.join(ROOT, grup.OUT_DIR, g.slug, "agents", a + ".md"), "utf8"),
        fs.readFileSync(path.join(ROOT, "agents", a + ".md"), "utf8"),
        g.slug + "/" + a,
      );
});

test("every skill an agent preloads ships in that agent's group plugin", () => {
  for (const g of built.groups)
    for (const a of g.agents) {
      const fm = fs.readFileSync(path.join(ROOT, "agents", a + ".md"), "utf8").match(/^skills:\s*(.*)$/m);
      for (const s of fm ? JSON.parse(fm[1]) : [])
        assert.ok(fs.existsSync(path.join(ROOT, grup.OUT_DIR, g.slug, "skills", s, "SKILL.md")), g.slug + " lacks skill " + s + " for " + a);
    }
});

test("each group plugin is valid JSON, named and versioned like its marketplace entry", () => {
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
  const full = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8"));
  assert.strictEqual(market.plugins[0].name, full.name, "the full plugin stays the first entry");
  for (const g of built.groups) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, grup.OUT_DIR, g.slug, ".claude-plugin", "plugin.json"), "utf8"));
    const entry = market.plugins.find((p) => p.name === manifest.name);
    assert.ok(entry, manifest.name + " is not in marketplace.json");
    assert.strictEqual(entry.source, "./" + grup.OUT_DIR + "/" + g.slug);
    assert.strictEqual(manifest.version, full.version);
    assert.match(manifest.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  }
  assert.strictEqual(market.plugins.length, 1 + built.groups.length);
});

test("no group carries more than " + Math.round(grup.MAX_GROUP_SHARE * 100) + "% of the description text the full set loads", () => {
  const total = built.groups.reduce((n, g) => n + g.descriptionChars, 0);
  for (const g of built.groups)
    assert.ok(g.descriptionChars / total <= grup.MAX_GROUP_SHARE, g.slug + ": " + g.descriptionChars + " of " + total);
});

test("eval cases travel with their agent's group", () => {
  for (const c of fs.readdirSync(path.join(ROOT, "evals")).filter((d) => d !== "results")) {
    const agentNames = fs.readdirSync(path.join(ROOT, "agents")).map((f) => f.replace(/\.md$/, ""));
    const owner = grup.evalOwner(c, agentNames);
    assert.ok(owner, "evals/" + c + " belongs to no agent");
    const g = built.groups.find((x) => x.agents.includes(owner));
    assert.ok(fs.existsSync(path.join(ROOT, grup.OUT_DIR, g.slug, "evals", c, "prompt.md")), c + " not copied into " + g.slug);
  }
});

test("group names fold Turkish letters into a plugin name", () => {
  assert.strictEqual(grup.slugOf("Güvenlik ve gizlilik"), "guvenlik");
  assert.strictEqual(grup.slugOf("Keşif"), "kesif");
  assert.strictEqual(grup.slugOf("Süreç ve ortam"), "surec");
  assert.strictEqual(grup.slugOf("API ve dayanıklılık"), "api");
});

test("an eval case belongs to the longest agent name it starts with", () => {
  assert.strictEqual(grup.evalOwner("veri-raporcu-csv", ["veri", "veri-raporcu"]), "veri-raporcu");
  assert.strictEqual(grup.evalOwner("baska-bir-sey", ["veri"]), null);
});

// --- drift is caught, on a throwaway copy ------------------------------------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "turkce-grup-"));
try {
  for (const p of ["README.md", "agents", "skills", "evals", "evals-bash", ".claude-plugin", grup.OUT_DIR])
    if (fs.existsSync(path.join(ROOT, p))) fs.cpSync(path.join(ROOT, p), path.join(tmp, p), { recursive: true });

  test("the copy starts clean", () => assert.deepStrictEqual(grup.check(tmp), []));

  test("an agent edited without regenerating is reported", () => {
    const f = path.join(tmp, "agents", "veri-raporcu.md");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8") + "\nek satir\n");
    assert.ok(grup.check(tmp).some((s) => s.includes("eklentiler/veri/agents/veri-raporcu.md")));
    grup.write(tmp);
    assert.deepStrictEqual(grup.check(tmp), []);
  });

  test("a file nobody generated under eklentiler/ is reported, and removed on write", () => {
    const stray = path.join(tmp, grup.OUT_DIR, "veri", "agents", "eski-ajan.md");
    fs.writeFileSync(stray, "---\nname: eski-ajan\n---\n");
    assert.ok(grup.check(tmp).some((s) => s.includes("eski-ajan.md")));
    grup.write(tmp);
    assert.ok(!fs.existsSync(stray));
  });

  test("an agent dropped from the README groups fails the build instead of vanishing", () => {
    const readme = path.join(tmp, "README.md");
    fs.writeFileSync(readme, fs.readFileSync(readme, "utf8").replace(/^\| `veri-raporcu`.*\n/m, ""));
    const problems = grup.build(tmp).problems;
    assert.ok(problems.some((s) => s.startsWith("veri-raporcu:") && s.includes("no README group")), problems.join("\n"));
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("\n" + passed + " checks passed.");
console.log(grup.report(built));
