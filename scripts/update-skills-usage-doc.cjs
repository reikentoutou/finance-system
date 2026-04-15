'use strict';

/**
 * 扫描 .agents/skills 下所有 SKILL.md，更新 docs/skills-usage.md 中
 * SKILLS_CATALOG_START / SKILLS_CATALOG_END 标记之间的目录表。
 *
 * 用法：在仓库根目录执行 pnpm run docs:skills
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_ROOT = path.join(ROOT, '.agents', 'skills');
const DOC_PATH = path.join(ROOT, 'docs', 'skills-usage.md');
const ZH_CATALOG_PATH = path.join(ROOT, 'docs', 'skills-catalog.zh.json');

const START = '<!-- SKILLS_CATALOG_START -->';
const END = '<!-- SKILLS_CATALOG_END -->';

function walkSkillFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkSkillFiles(full, acc);
    } else if (e.isFile() && e.name === 'SKILL.md') {
      acc.push(full);
    }
  }
  return acc;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) {
    return { name: '', description: '', userInvocable: false, argumentHint: '' };
  }
  const close = raw.indexOf('\n---\n', 4);
  if (close === -1) {
    return { name: '', description: '', userInvocable: false, argumentHint: '' };
  }
  const block = raw.slice(4, close);
  const lines = block.split('\n');
  const out = { name: '', description: '', userInvocable: false, argumentHint: '' };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    let val = m[2];

    if (key === 'description') {
      val = val.trim();
      if (val === '>-' || val === '>' || val === '|' || val === '|-') {
        const parts = [];
        i += 1;
        while (i < lines.length) {
          const cont = lines[i];
          if (cont.length === 0) {
            parts.push('');
            i += 1;
            continue;
          }
          if (/^\S/.test(cont)) {
            break;
          }
          parts.push(cont.trim());
          i += 1;
        }
        out.description = parts.join(' ').trim();
        continue;
      }
      out.description = val.replace(/^["']|["']$/g, '');
      i += 1;
      continue;
    }

    val = val.trim();
    if (key === 'name') out.name = val.replace(/^["']|["']$/g, '');
    else if (key === 'user-invocable') out.userInvocable = val === 'true';
    else if (key === 'argument-hint') out.argumentHint = val.replace(/^["']|["']$/g, '');
    i += 1;
  }
  return out;
}

function escapeMdCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function loadZhPurposeByName() {
  try {
    const raw = fs.readFileSync(ZH_CATALOG_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data;
    }
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn('读取中文用途映射失败：', ZH_CATALOG_PATH, e.message);
    }
  }
  return {};
}

function usageHint(meta) {
  const parts = [
    '在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。',
  ];
  if (meta.userInvocable) {
    parts.push('YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。');
  }
  if (meta.argumentHint) {
    parts.push(`参数提示：\`${meta.argumentHint}\`。`);
  }
  return parts.join(' ');
}

function buildCatalog(skillPaths) {
  const zhByName = loadZhPurposeByName();
  const rows = skillPaths
    .map((abs) => {
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      const raw = fs.readFileSync(abs, 'utf8');
      const fm = parseFrontmatter(raw);
      const title = fm.name || path.basename(path.dirname(abs));
      const desc = fm.description || '（未提供 description）';
      return { rel, title, desc, fm };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel, 'en'));

  const lines = [];
  lines.push(
    '本表由 `pnpm run docs:skills` 扫描 `SKILL.md` 生成；**用途（中文）** 来自 [`skills-catalog.zh.json`](./skills-catalog.zh.json)，以各 skill 的 YAML `name` 为键维护。',
  );
  lines.push('');
  lines.push('| 路径（仓库内） | `name` | 用途（中文） | 建议使用方式 |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of rows) {
    const zh = zhByName[r.title];
    if (!zh) {
      console.warn('缺少中文用途：请在 docs/skills-catalog.zh.json 中为 name=', JSON.stringify(r.title), '增加一条');
    }
    const purposeZh = zh || '（中文说明待补充：在 docs/skills-catalog.zh.json 中以该 `name` 为键添加）';
    const row = [
      '`' + escapeMdCell(r.rel) + '`',
      '`' + escapeMdCell(r.title) + '`',
      escapeMdCell(purposeZh),
      escapeMdCell(usageHint(r.fm)),
    ].join(' | ');
    lines.push('| ' + row + ' |');
  }
  lines.push('');
  lines.push(`**共 ${rows.length} 个** \`SKILL.md\`（含子目录，例如 \`coding-standards/*\`）。`);
  return lines.join('\n');
}

function main() {
  const skillPaths = walkSkillFiles(SKILLS_ROOT).sort();
  if (skillPaths.length === 0) {
    console.warn('未找到任何 .agents/skills/**/SKILL.md；跳过写入（若本机未安装 skills 属正常）。');
    process.exit(0);
  }

  const catalog = buildCatalog(skillPaths);

  if (!fs.existsSync(DOC_PATH)) {
    console.error('缺少文档文件：', DOC_PATH);
    process.exit(1);
  }

  let doc = fs.readFileSync(DOC_PATH, 'utf8');
  if (!doc.includes(START) || !doc.includes(END)) {
    console.error('文档中缺少标记：', START, '或', END);
    process.exit(1);
  }

  const before = doc.slice(0, doc.indexOf(START) + START.length);
  const after = doc.slice(doc.indexOf(END));
  const merged = before + '\n\n' + catalog + '\n\n' + after;

  if (merged.length < 400 || !merged.includes('# Agent Skills')) {
    console.error('合并结果异常（过短或缺少标题），拒绝写入以免覆盖文档。');
    process.exit(1);
  }

  fs.writeFileSync(DOC_PATH, merged, 'utf8');
  console.log('已更新', path.relative(ROOT, DOC_PATH), '（', skillPaths.length, '条）');
}

main();
