# llm-compute-graph

**Agent Skill：生成大模型计算流程图（LLM Compute Graph）。**

用一张自包含 HTML（内嵌 SVG，JS 数据驱动）画出任意大模型的前向计算/结构流程图——整模型或某个子模块，双击即可在浏览器查看、缩放、复用。

这是一个标准的 **`SKILL.md` 格式技能（Agent Skill / Skills）**，不绑定任何厂商或产品：只要你的 agent 支持按 `SKILL.md` 发现技能（Claude Code / Claude Agent Skills、Cursor、DeepSeek Harness、以及其它 skill-aware 环境），把它放进对应的技能目录即可使用。

## 这是什么

- **`SKILL.md`**：技能入口，教 agent 如何按视觉规范、`nodes` 数组 schema、生成后校验清单去画图。前端格式：
  ```yaml
  ---
  name: llm-compute-graph
  description: 生成大模型计算流程图……
  whenToUse: 用户要「画/生成 XX 大模型（或其子模块）的计算流程图 / 架构图 / 结构示意图 / 前向计算图」时使用。
  ---
  ```
- **`template.html`**：通用自包含模板（decoder-only MoE 结构示意）。画一张新图 = 复制模板 → 重填 `nodes` 数组 + 更新右上角图例 → 自动排版出新的 HTML。
- **`scripts/validate.mjs`**：零依赖校验脚本（技能 frontmatter + 产出 HTML 自查）。

## 安装

把整个 `llm-compute-graph` 文件夹放进你 agent 的技能根目录即可（技能根目录因产品而异）：

| Agent | 用户级技能目录 | 项目级技能目录 |
|---|---|---|
| Claude Code / Agent Skills | `~/.claude/skills/` | `.claude/skills/` |
| Cursor 等 | 见对应文档 | `.cursor/` |
| DeepSeek Harness (DSH) | `~/.agents/skills/` | `.agents/skills/`、`.dsh/skills/` |

```bash
git clone https://github.com/<you>/llm-compute-graph.git
# 示例：装到 Claude Code 用户技能目录
cp -R ./llm-compute-graph ~/.claude/skills/
# 示例：装到 DSH 用户技能目录
cp -R ./llm-compute-graph ~/.agents/skills/
```

重新加载后，技能清单里就会出现 `llm-compute-graph`。

## 使用

对 agent 说类似：

> 画一下 DeepSeek-V3（或 Qwen / Llama / 某个子模块……）的计算流程图。

agent 会：
1. 读取本技能的 `template.html` 作为基座；
2. 先跟你确认要画的**范围**（整模型 / 某子模块 / 某段到算子级）与**细度**（模块 / 层 / 算子 / 到 head、d_head、top_k 级）；
3. 按需采集关键维度（`hidden_size / num_layers / n_experts / top_k / vocab`，细化时再加 `n_head / d_head / d_rep / intermediate_size`）；
4. 复制模板、重填 `nodes` 数组与图例，产出**自包含 HTML** 新文件，并写到**当前工作目录**，按校验清单自查。

> 产出的 HTML **默认放在你当前的工作目录**（DeepSeek Harness 下是 workspace 根，Claude Code 下是当前项目目录）；也可以让 agent 写到别的目录。

## 文件

| 文件 | 作用 |
|---|---|
| `SKILL.md` | 技能入口：绘制方法 + 视觉规范 + 生成后校验清单（agent 加载的主指令） |
| `template.html` | 通用可复用模板（内嵌 SVG + JS 数据驱动，重填 `nodes` + 图例即得新图） |
| `scripts/validate.mjs` | 零依赖校验脚本（技能 frontmatter + 产出 HTML 自查） |
| `README.md` | 本说明 |

## 视觉规范（速览）

纯白背景 · 黑色描边圆角框（第一行=模块名粗体，其后=等宽 shape 流 `a → b`）· 框间居中「线轴+箭头头」短箭头且尖端紧贴下方框顶边 · 虚线框=重复模块「×n」右上角黑底徽标 · 右上角固定图例（字母含义 + 模型确定维度的具体数字）。shape 中**不定值用字母**（`N`=batch、`T`/`S`=序列长），**模型确定维度用具体数字**并须在图例标明含义。

## License

[MIT](LICENSE)
