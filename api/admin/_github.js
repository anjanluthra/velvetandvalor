/**
 * Velvet & Valor — GitHub commit helper (git-as-CMS for content).
 * Publishes by committing files to the repo; Vercel's deploy then runs the blog
 * generators (see build step) and serves the result.
 *
 * Uses the Git Data API (blobs → tree → commit → ref) so multiple files land in
 * ONE atomic commit — no window where a post references a missing asset.
 *
 * Env: GITHUB_TOKEN (repo contents write). Optional: GITHUB_REPO (owner/name),
 *      GITHUB_BRANCH (default main), GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL.
 */
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'anjanluthra/velvetandvalor';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const AUTHOR = {
  name: process.env.GIT_AUTHOR_NAME || 'Velvet & Valor Content Engine',
  email: process.env.GIT_AUTHOR_EMAIL || 'content@velvet-valor.com',
};
const API = `https://api.github.com/repos/${REPO}`;

function isConfigured() {
  return Boolean(TOKEN);
}

async function gh(path, { method = 'GET', body } = {}) {
  if (!isConfigured()) throw new Error('GITHUB_TOKEN not set');
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`GitHub ${method} ${path} → ${r.status}: ${t.slice(0, 240)}`);
  }
  return r.json();
}

/** Read a file's decoded text from the branch (null if it doesn't exist). */
async function getFileText(path) {
  try {
    const data = await gh(`/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${BRANCH}`);
    if (!data || !data.content) return null;
    return Buffer.from(data.content, data.encoding || 'base64').toString('utf8');
  } catch (e) {
    if (/→ 404/.test(e.message)) return null;
    throw e;
  }
}

/**
 * Commit one or more files atomically.
 * files: [{ path, content (utf8 string), encoding? 'utf-8'|'base64' }]
 * Returns { commitSha, url }.
 */
async function commitFiles(files, message) {
  if (!files || !files.length) throw new Error('no files to commit');

  // 1. Current branch tip + its tree.
  const ref = await gh(`/git/ref/heads/${BRANCH}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  // 2. A blob per file.
  const treeItems = [];
  for (const f of files) {
    const isB64 = f.encoding === 'base64';
    const blob = await gh('/git/blobs', {
      method: 'POST',
      body: { content: f.content, encoding: isB64 ? 'base64' : 'utf-8' },
    });
    treeItems.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // 3. New tree on top of the base tree.
  const tree = await gh('/git/trees', {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree: treeItems },
  });

  // 4. New commit.
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [baseSha], author: AUTHOR, committer: AUTHOR },
  });

  // 5. Move the branch (fast-forward; last-write-wins — serialise generations).
  await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha } });

  return { commitSha: commit.sha, url: `https://github.com/${REPO}/commit/${commit.sha}` };
}

module.exports = { isConfigured, getFileText, commitFiles, REPO, BRANCH };
