#!/usr/bin/env node
/**
 * bicim-kontrol-test.js — biçim denetleyicisinin her kuralını yakaladığını ve
 * bilinen tuzaklarda (sürüm no, kod bloğu, saatli damga, dosya adı) SUSTUĞUNU gösterir;
 * sonra kanca modunu gerçek stdin/stdout ile dener.
 *   node arac/bicim-kontrol-test.js
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");
const { denetle, turkceMi, atlanacakYol } = require("./bicim-kontrol.js");

let gecen = 0, kalan = [];
const ol = (ad, kosul, ek) => { if (kosul) { gecen++; console.log("  ok   " + ad); } else { kalan.push(ad); console.log("  HATA " + ad + (ek ? "  -> " + ek : "")); } };
const kurallar = (metin) => denetle(metin).map((b) => b.kural);

console.log("— Yakalamalı —");
ol("R1 ondalık nokta + birim", kurallar("Süre 4.5 saat sürdü ve maliyet 3.3 USD oldu.").join() === "R1,R1");
ol("R1 yüzde önde ondalık nokta", kurallar("Başarı %96.5 çıktı.").includes("R1"));
ol("R2 yüzde sonda", kurallar("Başarı oranı 96% oldu.").includes("R2"));
ol("R2 yüzde boşluklu", kurallar("Oran % 96 civarında.").includes("R2"));
ol("R3 İngilizce tarih (Sep 8, 2026)", kurallar("Toplantı Sep 8, 2026 günü yapıldı.").includes("R3"));
ol("R3 İngilizce tarih (8 September 2026)", kurallar("Rapor 8 September 2026 tarihli.").includes("R3"));
ol("R3 ISO tarih düzyazıda (tarihinde)", kurallar("Denetim 2026-09-08 tarihinde bitti.").includes("R3"));
ol("R3 ISO tarih düzyazıda ('de)", kurallar("Denetim 2026-09-08'de bitti.").includes("R3"));
ol("R3 ISO önerisi Türkçe", denetle("Denetim 2026-09-08 tarihinde bitti.")[0].oner === "8 Eylül 2026");
ol("R4 binlik virgül", kurallar("Toplam 1,234,567 satır okundu.").includes("R4"));
ol("satır numarası doğru", denetle("ilk satır\nikinci 96% satır").every((b) => b.satir === 2));

console.log("— Susmalı —");
ol("doğru Türkçe biçim temiz", kurallar("Oran %96,5; süre 4,5 saat; 1.234.567 satır; 8 Eylül 2026.").length === 0);
ol("sürüm numarası", kurallar("PowerShell 5.1 ve Node 20.11 kullan; sürüm 2.1.263 yüklü.").length === 0);
ol("v önekli sürüm", kurallar("v1.2 ile geldi.").length === 0);
ol("bölüm numarası", kurallar("Bölüm 3.2 başlığına bak.").length === 0);
ol("satır içi kod", kurallar("Kodda `4.5 saat` ve `96%` yazıyor.").length === 0);
ol("çitli kod bloğu", kurallar("Örnek:\n```\noran = 96%\nsure = 4.5 saat\n```\nbitti").length === 0);
ol("URL ve bağlantı hedefi", kurallar("Bkz. https://example.com/2026-09-08/rapor.md ve [x](docs/2026-09-08.md).").length === 0);
ol("saatli zaman damgası", kurallar("**2026-09-07 12:46** — push edildi.").length === 0);
ol("ISO tarih dosya adı içinde", kurallar("Görev dosyası 2026-09-08-gece-bakimi.md kuyrukta.").length === 0);
ol("ISO tarih veri alanı olarak (son push)", kurallar("1.563 yıldız, MIT, son push 2026-09-04.").length === 0);
ol("ISO tarih parantezli damga", kurallar("*(2026-09-07 — README başında İngilizce blok)*").length === 0);
ol("plugin tanım klasörleri atlanır", atlanacakYol("D:\\r\\skills\\turkce-rapor\\SKILL.md") && atlanacakYol("/r/agents/x.md") && atlanacakYol("/p/.claude/agents/x.md"));
ol("frontmatter atlanır", kurallar("---\ndate: 2026-09-08\n---\nGövde temiz.").length === 0);
ol("tablo ayıracı atlanır", kurallar("| a | b |\n|---|---|\n| 1 | 2 |").length === 0);
ol("İngilizce belge Türkçe sayılmaz", !turkceMi("This document has 96% success and 4.5 hours of work."));
ol("Türkçe belge tanınır", turkceMi("Bu belge Türkçe: çğış."));
ol("üretilmiş/geçici yollar atlanır", atlanacakYol("D:\\x\\_eski\\a.md") && atlanacakYol("/r/web/index.md") && !atlanacakYol("D:\\Claude Projeleri\\raporlar\\a.md"));

console.log("— Kanca modu (gerçek süreç) —");
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "bicim-"));
const md = path.join(gecici, "rapor.md");
fs.writeFileSync(md, "# Özet\n\nBaşarı oranı 96% ve süre 4.5 saat; iş 2026-09-08'de bitti.\n", "utf8");
function kanca(girdi) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, "bicim-kontrol.js")], { input: JSON.stringify(girdi), encoding: "utf8" });
  return { kod: r.status, out: r.stdout };
}
const k1 = kanca({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: md, content: "" }, tool_response: {} });
let j1 = null; try { j1 = JSON.parse(k1.out); } catch {}
ol("bulgulu dosyada JSON uyarı üretir, çıkış 0", k1.kod === 0 && j1 && j1.hookSpecificOutput && j1.hookSpecificOutput.hookEventName === "PostToolUse", k1.out.slice(0, 120));
ol("uyarı üç bulguyu da sayıyor", j1 && /3 bulgu/.test(j1.hookSpecificOutput.additionalContext), j1 && j1.hookSpecificOutput.additionalContext.split("\n")[0]);
fs.writeFileSync(md, "# Özet\n\nBaşarı oranı %96 ve süre 4,5 saat; iş 8 Eylül 2026 bitti.\n", "utf8");
const k2 = kanca({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: md }, tool_response: {} });
ol("temiz dosyada sessiz", k2.kod === 0 && k2.out === "");
const k3 = kanca({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: md.replace(/\.md$/, ".txt") } });
ol(".md dışı dosyada sessiz", k3.kod === 0 && k3.out === "");
const k4 = cp.spawnSync(process.execPath, [path.join(__dirname, "bicim-kontrol.js")], { input: "bozuk json", encoding: "utf8" });
ol("bozuk girdi akışı bozmaz (çıkış 0, çıktı yok)", k4.status === 0 && k4.stdout === "");
fs.rmSync(gecici, { recursive: true, force: true });

console.log("\n" + gecen + " geçti, " + kalan.length + " kaldı.");
process.exit(kalan.length ? 1 : 0);
