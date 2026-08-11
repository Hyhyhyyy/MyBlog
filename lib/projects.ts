// The projects snapshot is committed as data/projects.json and bundled at
// build time. Refresh it with `node scripts/fetch-projects.mjs` (optionally
// with GITHUB_TOKEN) — no runtime GitHub API call is needed.
import projectsData from "../data/projects.json";

export interface Project {
  slug: string;
  name: string;
  description: string;
  url: string;
  homepage: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsData {
  generatedAt: string | null;
  user: string;
  projects: Project[];
  note?: string;
}

const data = projectsData as ProjectsData;

export function getProjects(): Project[] {
  return Array.isArray(data.projects) ? data.projects : [];
}

export function getProject(slug: string): Project | null {
  return getProjects().find((p) => p.slug === slug) ?? null;
}

export function getGeneratedAt(): string | null {
  return data.generatedAt ?? null;
}
