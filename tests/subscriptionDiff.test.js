import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../src/services/githubService.ts';

test('checkRepoForDiff: 单纯 Star 变化不产生变动事件 (避免无意义刷新)', async () => {
  const repo = {
    github_id: 201,
    full_name: 'test/stable-lib',
    owner: 'test',
    name: 'stable-lib',
    description: 'A stable library',
    html_url: 'https://github.com/test/stable-lib',
    stars: 1500, // 从 1000 涨到 1500
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-10-01T00:00:00Z',
    is_archived: false,
    topics: [],
  };

  const oldPushedAt = '2026-10-01T00:00:00Z'; // pushed_at 相同
  const events = await GitHubService.checkRepoForDiff(repo, oldPushedAt, undefined);

  assert.equal(events.length, 0, 'Star 变化不应触发任何 ChangeEvent');
});

test('checkRepoForDiff: 检测到新代码推送触发【新版本】事件', async () => {
  const repo = {
    github_id: 202,
    full_name: 'test/fast-iter',
    owner: 'test',
    name: 'fast-iter',
    description: 'Rapidly updated tool',
    html_url: 'https://github.com/test/fast-iter',
    stars: 300,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-11-05T12:00:00Z', // 较新
    is_archived: false,
    topics: [],
  };

  const oldPushedAt = '2026-10-01T00:00:00Z';
  const events = await GitHubService.checkRepoForDiff(repo, oldPushedAt, undefined);

  assert.equal(events.length, 1);
  assert.equal(events[0].change_type, '新版本');
  assert.ok(events[0].detail.includes('2026-11-05'));
});

test('checkRepoForDiff: 官方归档状态触发【归档或转移】事件', async () => {
  const repo = {
    github_id: 203,
    full_name: 'test/deprecated-proj',
    owner: 'test',
    name: 'deprecated-proj',
    description: 'Old deprecated project',
    html_url: 'https://github.com/test/deprecated-proj',
    stars: 4000,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-01-01T00:00:00Z',
    is_archived: true, // 归档
    topics: [],
  };

  const oldPushedAt = '2026-01-01T00:00:00Z';
  const events = await GitHubService.checkRepoForDiff(repo, oldPushedAt, undefined);

  const archiveEvent = events.find(e => e.change_type === '归档或转移');
  assert.ok(archiveEvent, '应产生归档或转移事件');
  assert.ok(archiveEvent.detail.includes('只读锁定'));
});

test('checkRepoForDiff: README 内容重大修改触发【README功能变化】事件', async () => {
  const repo = {
    github_id: 204,
    full_name: 'test/evolving-tool',
    owner: 'test',
    name: 'evolving-tool',
    description: 'Tool with new features in README',
    html_url: 'https://github.com/test/evolving-tool',
    stars: 800,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-10-01T00:00:00Z',
    is_archived: false,
    topics: [],
  };

  // 模拟 fetchRepoReadme 返回新文本
  const originalFetchReadme = GitHubService.fetchRepoReadme;
  GitHubService.fetchRepoReadme = async () => ({
    text: '# Evolving Tool\nNow supporting Windows 11 with DirectML GPU acceleration.',
  });

  try {
    const oldReadmeHash = 'old-stale-hash-12345';
    const events = await GitHubService.checkRepoForDiff(repo, '2026-10-01T00:00:00Z', oldReadmeHash);

    const readmeEvent = events.find(e => e.change_type === 'README功能变化');
    assert.ok(readmeEvent, '应产生 README功能变化 事件');
    assert.ok(readmeEvent.detail.includes('README 内容重大变更'));
  } finally {
    GitHubService.fetchRepoReadme = originalFetchReadme;
  }
});
