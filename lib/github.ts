const APP_GITHUB_REPO = process.env.APP_GITHUB_REPO;
const APP_GITHUB_BRANCH = process.env.APP_GITHUB_BRANCH ?? "main";

export async function ghFetch(path: string, options?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${APP_GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.headers ?? {}),
    },
  });
  return res;
}

export async function readJsonFile<T>(filePath: string): Promise<{ data: T; sha: string } | null> {
  const res = await ghFetch(`/contents/${filePath}?ref=${APP_GITHUB_BRANCH}`);
  if (!res.ok) return null;
  const file = await res.json();
  const data: T = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));
  return { data, sha: file.sha };
}

export async function writeJsonFile(filePath: string, data: unknown, sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf-8").toString("base64");
  return ghFetch(`/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({ message, content, sha, branch: APP_GITHUB_BRANCH }),
  });
}

/** Create a new file on GitHub (no existing sha). Use when the file doesn't exist yet. */
export async function createJsonFile(filePath: string, data: unknown, message: string) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf-8").toString("base64");
  return ghFetch(`/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({ message, content, branch: APP_GITHUB_BRANCH }),
  });
}

/**
 * Read a JSON file from GitHub, or return an empty array + no sha if it doesn't exist.
 * Use for optional data files (e.g. resellers.json) that may not yet exist in the repo.
 */
export async function readOrInitJsonFile<T extends unknown[]>(
  filePath: string
): Promise<{ data: T; sha: string | null }> {
  const result = await readJsonFile<T>(filePath);
  if (result) return result;
  return { data: [] as unknown as T, sha: null };
}

export { APP_GITHUB_REPO, APP_GITHUB_BRANCH };
