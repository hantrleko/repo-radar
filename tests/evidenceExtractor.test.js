import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceExtractor } from '../src/services/evidenceExtractor.ts';

test('EvidenceExtractor: 准确提取 Windows 兼容性证据并附带切片', () => {
  const dummyRepo = {
    github_id: 9901,
    full_name: 'test/win-tool',
    owner: 'test',
    name: 'win-tool',
    description: 'A tool supporting Windows and Linux',
    html_url: 'https://github.com/test/win-tool',
    stars: 50,
    language: 'Python',
    license_spdx: 'MIT',
    pushed_at: '2026-10-01T00:00:00Z',
    topics: [],
  };

  const readme = `# Win Tool
Tested and fully supported on Windows 11 and Linux Ubuntu via pip install.
Requires NVIDIA CUDA for GPU acceleration.`;

  const analysis = EvidenceExtractor.extractFromReadme(dummyRepo, readme);

  assert.equal(analysis.os_compatibility.Windows, '支持');
  assert.equal(analysis.os_compatibility.Linux, '支持');
  assert.equal(analysis.os_compatibility.macOS, '未知'); // 零幻觉
  assert.equal(analysis.gpu_requirement, '必须');
  assert.ok(analysis.evidence_snippets.length > 0);
  assert.ok(analysis.evidence_snippets[0].includes('Windows'));
});

test('EvidenceExtractor: 未提及环境时 100% 标记为未知（绝无幻觉）', () => {
  const dummyRepo = {
    github_id: 9902,
    full_name: 'test/pure-math',
    owner: 'test',
    name: 'pure-math',
    description: 'Pure math algorithms',
    html_url: 'https://github.com/test/pure-math',
    stars: 120,
    language: 'Python',
    license_spdx: 'BSD-3-Clause',
    pushed_at: '2026-09-01T00:00:00Z',
    topics: [],
  };

  const readme = `# Pure Math
A collection of statistical algorithms implemented in pure Python.
No special dependencies.`;

  const analysis = EvidenceExtractor.extractFromReadme(dummyRepo, readme);

  assert.equal(analysis.os_compatibility.Windows, '未知');
  assert.equal(analysis.os_compatibility.Linux, '未知');
  assert.equal(analysis.os_compatibility.macOS, '未知');
  assert.equal(analysis.gpu_requirement, '无需');
});

test('EvidenceExtractor: 提取核心依赖与商业 API 依赖', () => {
  const dummyRepo = {
    github_id: 9903,
    full_name: 'test/ai-econometrics',
    owner: 'test',
    name: 'ai-econometrics',
    description: 'Econometric forecasting with PyTorch and Pandas',
    html_url: 'https://github.com/test/ai-econometrics',
    stars: 200,
    language: 'Python',
    license_spdx: 'Apache-2.0',
    pushed_at: '2026-10-10T00:00:00Z',
    topics: [],
  };

  const readme = `# AI Econometrics
Uses pandas and statsmodels with optional GPU acceleration.
Requires setting OPENAI_API_KEY for LLM summary.`;

  const analysis = EvidenceExtractor.extractFromReadme(dummyRepo, readme);

  assert.ok(analysis.external_dependencies.includes('pandas'));
  assert.ok(analysis.external_dependencies.includes('statsmodels'));
  assert.equal(analysis.gpu_requirement, '可选');
  assert.ok(analysis.unsatisfied_conditions.some(c => c.includes('OpenAI API')));
});
