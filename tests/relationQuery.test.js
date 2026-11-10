import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRelationQueries } from '../src/services/queryService.ts';

test('buildRelationQueries: 寻找同生态位替代品 (alternative)', () => {
  const seedRepo = {
    github_id: 101,
    full_name: 'psf/requests',
    owner: 'psf',
    name: 'requests',
    description: 'A simple HTTP library for Python',
    html_url: 'https://github.com/psf/requests',
    stars: 50000,
    language: 'Python',
    license_spdx: 'Apache-2.0',
    pushed_at: '2026-10-01T00:00:00Z',
    topics: ['http', 'client', 'python'],
  };

  const res = buildRelationQueries(seedRepo, 'alternative');
  assert.equal(res.queries.length, 2);
  assert.ok(res.queries[0].includes('requests alternative language:python'));
  assert.ok(res.filterDesc.includes('requests 的同生态位直接替代品'));
});

test('buildRelationQueries: 寻找轻量化与零依赖版本 (lightweight)', () => {
  const seedRepo = {
    github_id: 102,
    full_name: 'microsoft/qlib',
    owner: 'microsoft',
    name: 'qlib',
    description: 'An AI-oriented quantitative investment platform',
    html_url: 'https://github.com/microsoft/qlib',
    stars: 16000,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-10-01T00:00:00Z',
    topics: ['quantitative-finance', 'machine-learning'],
  };

  const res = buildRelationQueries(seedRepo, 'lightweight');
  assert.equal(res.queries.length, 2);
  assert.ok(res.queries[0].includes('lightweight minimal'));
  assert.ok(res.queries[1].includes('pure python zero dependency'));
  assert.ok(res.filterDesc.includes('轻量化'));
});

test('buildRelationQueries: 寻找上下游互补模块 (complementary)', () => {
  // 数据获取库 -> 互补：计量分析与策略回测
  const dataRepo = {
    github_id: 103,
    full_name: 'akfamily/akshare',
    owner: 'akfamily',
    name: 'akshare',
    description: 'AKShare is an elegant and simple financial data interface library',
    html_url: 'https://github.com/akfamily/akshare',
    stars: 12000,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-10-01T00:00:00Z',
    topics: ['stock', 'macro'],
  };

  const dataRes = buildRelationQueries(dataRepo, 'complementary');
  assert.ok(dataRes.queries[0].includes('panel regression econometrics OR backtesting'));
  assert.ok(dataRes.filterDesc.includes('下游计量分析与回测'));

  // 计量库 -> 互补：数据源与 LaTeX 导出
  const statRepo = {
    github_id: 104,
    full_name: 'bashtage/linearmodels',
    owner: 'bashtage',
    name: 'linearmodels',
    description: 'Panel data econometrics in Python',
    html_url: 'https://github.com/bashtage/linearmodels',
    stars: 800,
    language: 'Python',
    license_spdx: 'NCSA',
    pushed_at: '2026-10-01T00:00:00Z',
    topics: ['econometrics', 'panel-data'],
  };

  const statRes = buildRelationQueries(statRepo, 'complementary');
  assert.ok(statRes.queries[0].includes('macro data python OR regression table latex'));
  assert.ok(statRes.filterDesc.includes('上游数据源与下游 LaTeX'));
});
