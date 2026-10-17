const fs = require('fs')
const path = require('path')

const TOKEN = process.env.GH_TOKEN
const OWNER = 'yansheng1014'
const REPO = 'bluebridge-review-submission'
const BRANCH = 'main'
const ROOT = '/root/开发/submission-task2'
const PREFIX = 'submissions/yansheng1014-task2'

const API = 'https://api.github.com'

async function gh(url, method, body) {
  const res = await fetch(API + url, {
    method,
    headers: {
      Authorization: 'token ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'dsh-agent',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  if (!res.ok) throw new Error(method + ' ' + url + ' -> ' + res.status + ' ' + text.slice(0, 300))
  return text ? JSON.parse(text) : null
}

function walk(dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

;(async () => {
  const ref = await gh('/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + BRANCH, 'GET')
  const baseCommit = ref.object.sha
  const commit = await gh('/repos/' + OWNER + '/' + REPO + '/git/commits/' + baseCommit, 'GET')
  const baseTree = commit.tree.sha
  console.log('BASE', baseCommit, baseTree)

  const files = walk(ROOT)
  const tree = []
  let i = 0
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const buf = fs.readFileSync(file)
    const isBinary = /\.(png|jpg|jpeg|gif|rpk|ico|zip|webp)$/i.test(file)
    const blob = await gh('/repos/' + OWNER + '/' + REPO + '/git/blobs', 'POST', isBinary
      ? { content: buf.toString('base64'), encoding: 'base64' }
      : { content: buf.toString('utf8'), encoding: 'utf-8' })
    tree.push({ path: PREFIX + '/' + rel, mode: '100644', type: 'blob', sha: blob.sha })
    i += 1
    if (i % 15 === 0) console.log('blobs', i + '/' + files.length)
  }
  console.log('BLOBS DONE', files.length)

  const newTree = await gh('/repos/' + OWNER + '/' + REPO + '/git/trees', 'POST', { base_tree: baseTree, tree })
  console.log('TREE', newTree.sha)

  const newCommit = await gh('/repos/' + OWNER + '/' + REPO + '/git/commits', 'POST', {
    message: 'task2: 静态壳改版（礼包码/颜色主题/每日任务）+ rpk + 截图',
    tree: newTree.sha,
    parents: [baseCommit]
  })
  console.log('COMMIT', newCommit.sha)

  const updated = await gh('/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + BRANCH, 'PATCH', { sha: newCommit.sha, force: false })
  console.log('REF', updated.object.sha)
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
