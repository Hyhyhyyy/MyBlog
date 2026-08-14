// Generator: fetch real GitHub READMEs for featured repos and emit data.js.
// Run: node gen_projects.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER = 'Hyhyhyyy';

// All public repos (name, stars, language, description) — order as returned by API.
const REPOS = [
  { name: 'README-beautifier2.0', stars: 1, lang: 'Python', desc: 'README 美化技能：基于纯 SMIL 动画横幅一键美化 GitHub 仓库首页，方法平台无关，支持批量生成动画 Hero、主题图标与着陆页。' },
  { name: 'README-beautifier1.0', stars: 1, lang: 'Python', desc: 'README 美化工具：一键生成动画横幅、主题图标与着陆页，提供多种视觉模板与配色。' },
  { name: 'Qwen3-VL-Med', stars: 1, lang: 'Python', desc: 'Qwen3-VL 医疗微调研究：含全量微调配置、四组 LoRA 冻结消融、评测与隐私门禁，已脱敏无临床数据。' },
  { name: 'MLP-2048', stars: 1, lang: 'C++', desc: 'MLP 2048 合成游戏：基于 EasyX 图形库、以《小马宝莉》为主题的 C++ 2048 合成游戏，含六大角色关卡、剧情 CG、技能与背景音乐。' },
  { name: 'Hyhyhyyy', stars: 1, lang: 'JavaScript', desc: '个人成长档案主页：汇总项目、学习与校园经历的开源 Profile，由真实 GitHub 数据生成贡献热力图与统计卡片。' },
  { name: 'Token_Saver', stars: 1, lang: 'Python', desc: 'Token 节省框架 SkillForge · Token Saver：基于 FastAPI + SQLite + Docker，提供 Prompt 压缩、语义缓存复用、调用用量统计与可视化看板。' },
  { name: 'DUT-ultimate-website', stars: 2, lang: 'JavaScript', desc: '大连理工大学黑蚁极限飞盘队官网：展示球队介绍、教练与队员、活动动态、比赛战报与招新信息，基于云开发部署。' },
  { name: 'KeLing3.0', stars: 2, lang: 'Kotlin', desc: '课灵多端知识管理学习助手：覆盖笔记、收藏与复习等学习闭环，在 2.0 基础上优化交互细节、性能与跨端一致性。' },
  { name: 'KeLing2.0', stars: 4, lang: 'Kotlin', desc: '课灵 2.0 知识管理学习助手：Kotlin + React 单体仓库，内置知识卡片、标签体系与跨端同步，是课灵系列中星标最多的版本。' },
  { name: 'md-converter', stars: 1, lang: 'JavaScript', desc: '文档格式转换工具：轻量前端应用，支持 Markdown 与 PDF / DOCX 互转，保留标题、列表、代码块与基础样式，纯本地运行。' },
  { name: 'train_guard', stars: 1, lang: 'Python', desc: '大模型训练守护工具包：训练前检查、训练中监控、可靠性层与训练后验收，内置 CLI、Python API、Web 看板与 SSH 终端，核心零依赖。' },
  { name: 'ChainPass', stars: 1, lang: 'Java', desc: '区块链跨境身份与支付平台：基于 W3C DID 与可验证凭证，支持多币种钱包、实时汇率转换与合规风控的跨境支付。' },
  { name: 'claude-code', stars: 1, lang: '', desc: '一份 claude-code 的复制。' }
];

const FEATURED = ['KeLing2.0', 'DUT-ultimate-website', 'KeLing3.0', 'Token_Saver', 'train_guard', 'ChainPass'];

// Rewrite relative image paths (incl. SVG) to absolute raw.githubusercontent URLs
// so they render inside the card. Absolute http/data URLs are left untouched.
function rewriteImages(text, name, branch) {
  const base = `https://raw.githubusercontent.com/${USER}/${name}/${branch}/`;
  const fix = (url) => {
    if (/^(https?:|data:|#)/i.test(url)) return url;
    const p = url.replace(/^\.\//, '').replace(/^\//, '');
    return base + p;
  };
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => `![${alt}](${fix(url)})`);
  text = text.replace(/<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*)>/gi,
    (_m, pre, q, url, post) => `<img${pre}src=${q}${fix(url)}${q}${post}>`);
  return text;
}

function getReadme(name) {
  try {
    const b64 = execSync(`gh api repos/${USER}/${name}/readme --jq .content`, { encoding: 'utf8' }).trim();
    if (!b64) return '';
    let branch = 'main';
    try {
      branch = (execSync(`gh api repos/${USER}/${name} --jq .default_branch`, { encoding: 'utf8' }).trim()) || 'main';
    } catch (e) {}
    let text = Buffer.from(b64, 'base64').toString('utf8');
    // Keep markdown syntax (so it can be rendered); only strip raw HTML hazards.
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = rewriteImages(text, name, branch);
    // Trim to a paragraph-friendly slice so the rendered card stays tidy.
    const MAX = 1100;
    if (text.length > MAX) {
      const cut = text.lastIndexOf('\n\n', MAX);
      text = (cut > MAX * 0.6 ? text.slice(0, cut) : text.slice(0, MAX)).trim();
    }
    return text;
  } catch (e) {
    return '';
  }
}

const readmes = {};
for (const name of FEATURED) readmes[name] = getReadme(name);

const withUrl = REPOS.map((r) => ({ ...r, url: `https://github.com/${USER}/${r.name}` }));
const featured = FEATURED.map((name) => {
  const base = withUrl.find((r) => r.name === name);
  return { ...base, readme: readmes[name] || '' };
});

const out =
  'window.PROJECTS = ' + JSON.stringify(featured, null, 2) + ';\n' +
  'window.ALL = ' + JSON.stringify(withUrl, null, 2) + ';\n';

fs.writeFileSync(path.join(__dirname, 'data.js'), out, 'utf8');
console.log('data.js written: ' + featured.length + ' featured, ' + withUrl.length + ' total');
