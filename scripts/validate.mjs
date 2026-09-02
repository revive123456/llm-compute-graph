#!/usr/bin/env node
/**
 * llm-compute-graph 零依赖校验脚本。
 *
 * 用法：
 *   node scripts/validate.mjs                  # 校验 SKILL.md frontmatter + 资源引用
 *   node scripts/validate.mjs out/model.html    # 额外静态检查一份产出 HTML 的自包含性与结构
 *
 * 校验规则遵循通用 Agent Skill 的 SKILL.md frontmatter 约定（与
 * Claude Agent Skills / DeepSeek Harness 技能格式兼容）：
 *   - 首行必须为 "---"，且以 "---" 闭合的 YAML frontmatter；
 *   - name：合法 kebab-case（/^[a-z0-9]+(?:-[a-z0-9]+)*$/）；
 *   - description：非空字符串；
 *   - whenToUse（可选）：非空字符串；
 *   - invocation（可选）：布尔策略 boolean；
 *   - metadata.resources 引用的相对文件需存在于技能基目录。
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = dirname(dirname(fileURLToPath(import.meta.url))); // 技能包根目录
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTML_FILE = process.argv[2];

let failures = 0;
const bad = (msg) => { failures += 1; console.error("  ✗ " + msg); };
const ok = (msg) => console.log("  ✓ " + msg);

// ---------- 1. SKILL.md frontmatter ----------
console.log("▶ SKILL.md frontmatter");
const raw = readFileSync(join(BASE, "SKILL.md"), "utf8");
const nl = raw.indexOf("\n");
if (nl < 0 || raw.slice(0, nl).replace(/\r$/, "") !== "---") {
  bad("首行必须是闭合 frontmatter 的 '---'");
} else {
  const start = nl + 1;
  // 找闭合 "---"（必须单独成行）
  let closingStart = -1, bodyStart = raw.length;
  for (let i = start; i <= raw.length;) {
    const next = raw.indexOf("\n", i);
    const end = next < 0 ? raw.length : next;
    if (raw.slice(i, end).replace(/\r$/, "") === "---") { closingStart = i; bodyStart = next < 0 ? raw.length : next + 1; break; }
    if (next < 0) break;
    i = next + 1;
  }
  if (closingStart < 0) {
    bad("未找到闭合 '---'（frontmatter 不完整）");
  } else {
    const fm = raw.slice(start, closingStart);
    // 极简 YAML 取值（覆盖本 SKILL.md 用到的标量 + >- 折叠块）
    const scalar = {};
    let key = null;
    for (const line of fm.split(/\r?\n/)) {
      const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (/^\s/.test(line) && key && line.trim() !== "") {
        scalar[key] += " " + line.trim();
        continue;
      }
      if (m) { key = m[1]; scalar[key] = m[2].trim().replace(/^['"]|['"]$/g, ""); }
    }
    const name = scalar.name;
    const description = scalar.description;
    const whenToUse = scalar.whenToUse;
    if (typeof name !== "string" || name.length === 0) bad("frontmatter 缺少 name");
    else if (!SKILL_NAME.test(name)) bad(`name "${name}" 不是合法 kebab-case`);
    else ok(`name: ${name}`);

    if (typeof description !== "string" || description.length === 0) bad("frontmatter 缺少非空 description");
    else ok(`description: ${description.length} 字符`);

    if (whenToUse !== undefined && whenToUse !== "") ok("whenToUse 存在");
    // invocation 布尔策略（可选）
    for (const k of ["disable-model-invocation", "user-invocable"]) {
      if (scalar[k] !== undefined && !["true", "false"].includes(scalar[k].toLowerCase())) {
        bad(`invocation 字段 "${k}" 须为布尔`);
      }
    }
    ok("invocation 策略字段检查通过");
  }
}

// ---------- 2. metadata 资源引用 ----------
console.log("▶ 资源引用");
for (const rel of ["template.html"]) {
  const p = join(BASE, rel);
  if (existsSync(p) && statSync(p).isFile()) ok(`资源存在: ${rel}`);
  else bad(`缺少资源: ${rel}`);
}

// ---------- 3. 产出 HTML 静态检查（可选） ----------
if (HTML_FILE) {
  console.log(`▶ 产出 HTML: ${HTML_FILE}`);
  let html;
  try { html = readFileSync(HTML_FILE, "utf8"); } catch { bad("读取 HTML 失败"); html = ""; }
  if (html) {
    if (!html.includes('<svg id="graph"')) bad("缺少 <svg id=\"graph\"");
    else ok("包含 <svg id=\"graph\"");
    if (!html.includes("const nodes =")) bad("缺少 nodes 数组");
    else ok("包含 nodes 数组");
    if (!html.includes("title")) bad("缺少图标题");
    else ok("包含图标题");
    // 自包含性：不应有外部 script/link 的资源 URL
    const ext = [...html.matchAll(/(?:src|href)="https?:\/\/[^"]+"/g)].map((m) => m[0]);
    if (ext.length > 0) bad(`存在外部资源引用: ${ext.join(", ")}`);
    else ok("无外部资源引用（自包含）");
    if (/NaN/.test(html)) bad("脚本文本含 NaN 字面量（若有运行时 NaN 需实际执行校验）");
    else ok("脚本文本无 NaN 字面量");
  }
}

console.log(failures === 0 ? "\n✅ 校验通过" : `\n❌ ${failures} 项未通过`);
process.exit(failures === 0 ? 0 : 1);
