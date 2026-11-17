export const SITE_NAME = "The Pearl Registry";
export const SITE_TAGLINE = "The definitive encyclopedia of Tom Pearl";
export const MAIN_ARTICLE = "tom-pearl";

export const REPO = process.env.GITHUB_REPO || "langluaa/pearlregistry";
export const REPO_OWNER = REPO.split("/")[0];
export const BRANCH = process.env.GITHUB_BRANCH || "main";
export const CONTENT_DIR = "content/pages";

/** GitHub logins allowed to edit: the repository owner, plus anyone listed in REGISTRY_EDITORS. */
export function editorLogins(): string[] {
  const extra = (process.env.REGISTRY_EDITORS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [REPO_OWNER, ...extra].map((s) => s.toLowerCase());
}
