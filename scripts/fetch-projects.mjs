// Refresh the static snapshot of public GitHub repositories for the
// "项目与作品" (Projects & Works) section. Run manually or in CI:
//   GITHUB_TOKEN=xxx node scripts/fetch-projects.mjs
// The snapshot is committed so the site renders without a runtime API call.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USER = "Hyhyhyyy";
const TOKEN = process.env.GITHUB_TOKEN || "";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "hyhy-growth-archive",
};
if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

async function fetchAllRepos() {
  const repos = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&sort=updated`,
      { headers },
    );
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} ${res.statusText}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

function toProject(r) {
  return {
    slug: r.name,
    name: r.name,
    description: r.description || "",
    url: r.html_url,
    homepage: r.homepage || "",
    language: r.language || "",
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    topics: Array.isArray(r.topics) ? r.topics : [],
    createdAt: r.created_at,
    updatedAt: r.pushed_at || r.updated_at,
  };
}

async function main() {
  const repos = await fetchAllRepos();
  const projects = repos
    .filter((r) => !r.fork && !r.archived)
    .map(toProject)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const outPath = path.resolve(process.cwd(), "data/projects.json");
  await writeFile(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), user: USER, projects }, null, 2),
    "utf8",
  );
  console.log(`Wrote ${projects.length} projects to ${outPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
