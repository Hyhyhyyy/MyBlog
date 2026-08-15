// Generator: fetch real GitHub repos + READMEs and emit data.js.
// REPOS is pulled live from the GitHub API (public, non-fork, newest first),
// so re-running this keeps the showcase in sync with the latest project status.
// Run: node gen_projects.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER = 'Hyhyhyyy';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

// Live repo list: all public, non-fork repos, sorted by most recent push (latest first).
function fetchRepos() {
  const raw = sh(`gh api "users/${USER}/repos?per_page=100"`);
  const arr = JSON.parse(raw);
  return arr
    .filter((r) => !r.fork && r.name !== 'MyBlog')
    .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt))
    .map((r) => ({
      name: r.name,
      stars: r.stargazerCount || 0,
      lang: (r.primaryLanguage && r.primaryLanguage.name) || '',
      desc: r.description || '',
      url: r.html_url
    }));
}

const REPOS = fetchRepos();

// Featured cards (animated CardSwap) — curated flagship + newest research.
// These repos' READMEs are fetched and rendered inside the cards.
const FEATURED = [
  'KeLing2.0',
  'KeLing3.0',
  'Qwen3-VL-Med',
  'DUT-ultimate-website',
  'Token_Saver',
  'train_guard',
  'ChainPass'
];

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
    const b64 = sh(`gh api repos/${USER}/${name}/readme --jq .content`);
    if (!b64) return '';
    let branch = 'main';
    try {
      branch = sh(`gh api repos/${USER}/${name} --jq .default_branch`) || 'main';
    } catch (e) {}
    let text = Buffer.from(b64, 'base64').toString('utf8');
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = rewriteImages(text, name, branch);
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

const featured = FEATURED
  .map((name) => REPOS.find((r) => r.name === name))
  .filter(Boolean)
  .map((base) => ({ ...base, readme: readmes[base.name] || '' }));

const out =
  'window.PROJECTS = ' + JSON.stringify(featured, null, 2) + ';\n' +
  'window.ALL = ' + JSON.stringify(REPOS, null, 2) + ';\n';

fs.writeFileSync(path.join(__dirname, 'data.js'), out, 'utf8');
console.log('data.js written: ' + featured.length + ' featured, ' + REPOS.length + ' total');
console.log('REPOS:', REPOS.map((r) => r.name).join(', '));
