import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceExtractor } from '../src/services/evidenceExtractor.ts';
import { ScaffoldGenerator } from '../src/services/scaffoldGenerator.ts';
import { GistSyncService } from '../src/services/gistSyncService.ts';
import { StorageService } from '../src/services/storageService.ts';

test('V0.3 维度一: 目录树嗅探器 (analyzeRepoTree) 准确识别复现脚本与工程骨架', () => {
  const treePaths = [
    'README.md',
    'examples/panel_demo.py',
    'notebooks/tutorial.ipynb',
    'tests/test_feols.py',
    'Dockerfile',
    '.github/workflows/ci.yml',
    'replication/table2_did.do',
  ];

  const insight = EvidenceExtractor.analyzeRepoTree(treePaths);
  assert.equal(insight.has_examples, true);
  assert.equal(insight.has_notebooks, true);
  assert.equal(insight.has_tests, true);
  assert.equal(insight.has_dockerfile, true);
  assert.equal(insight.has_ci_workflows, true);
  assert.equal(insight.has_replication_scripts, true);
  assert.ok(insight.detected_artifacts.includes('论文/数据复现脚本'));
});

test('V0.3 维度一: Issue 避坑雷达 (analyzeIssues) 准确归类 Windows 编译与显存报错', () => {
  const rawIssues = [
    {
      number: 42,
      title: 'Build failed on Windows 11 with MSVC DLL error',
      html_url: 'https://github.com/test/repo/issues/42',
    },
    {
      number: 55,
      title: 'CUDA out of memory error when running on 8GB VRAM GPU',
      html_url: 'https://github.com/test/repo/issues/55',
    },
  ];

  const painPoints = EvidenceExtractor.analyzeIssues(rawIssues);
  assert.equal(painPoints.length, 2);
  assert.equal(painPoints[0].category, 'Windows兼容');
  assert.equal(painPoints[1].category, '显存/算力');
});

test('V0.3 维度一 & 二: 四大垂直领域深水区探针与本地环境画像碰撞预警', () => {
  const mediaRepo = {
    github_id: 3001,
    full_name: 'ai-lab/video-gen',
    owner: 'ai-lab',
    name: 'video-gen',
    description: 'High resolution diffusion video generation',
    html_url: 'https://github.com/ai-lab/video-gen',
    stars: 3200,
    language: 'Python',
    license_spdx: 'Apache-2.0',
    pushed_at: '2026-11-01T00:00:00Z',
    topics: ['video', 'diffusion'],
  };

  const readme = `# Video Gen
Requires NVIDIA CUDA GPU with at least 24 GB VRAM.
Note: The model weights are released under CC-BY-NC (non-commercial research only).
See arXiv:2503.12345 for details.`;

  const userProfile = {
    os: 'Windows',
    python_version: '3.11',
    has_nvidia_gpu: true,
    vram_gb: 12, // 本地只有 12GB 显存，低于项目要求的 24GB
    disallow_paid_api: true,
  };

  const analysis = EvidenceExtractor.extractFromReadme(
    mediaRepo,
    readme,
    'torch\nuvloop',
    [],
    [],
    userProfile
  );

  assert.ok(analysis.domain_probe);
  assert.equal(analysis.domain_probe.domain, '视频与图片创作');
  assert.equal(analysis.domain_probe.media_license_split?.weight_commercial_safe, '非商用/受限');
  assert.equal(analysis.domain_probe.media_license_split?.min_vram_gb, 24);
  assert.equal(analysis.domain_probe.academic_metadata?.arxiv_id, '2503.12345');

  // 校验环境画像碰撞出显存不足红灯 & Windows 下 uvloop 预警
  assert.ok(analysis.env_alerts);
  assert.ok(analysis.env_alerts.some(a => a.level === 'danger' && a.reason.includes('24GB')));
  assert.ok(analysis.env_alerts.some(a => a.level === 'warning' && a.reason.includes('uvloop')));
});

test('V0.3 维度三: BYOK 大模型强制原文引证核验器 (verifyGroundedQuotes) 100% 拦截捏造引文', () => {
  const readme = `# PanelEst
Supports two-way fixed effects (TWFE) and clustered standard errors out of the box.`;

  const llmClaims = [
    {
      claim: '支持双向固定效应与聚类标准误',
      exact_quote: 'two-way fixed effects (TWFE) and clustered standard errors',
    },
    {
      claim: '内置分布式 GPU 加速回测',
      exact_quote: 'distributed multi-GPU backtesting engine', // README 中根本不存在的幻觉引文
    },
  ];

  const verified = EvidenceExtractor.verifyGroundedQuotes(llmClaims, readme);
  assert.equal(verified[0].verified, true, '真实存在于原文的引文应核验通过');
  assert.equal(verified[1].verified, false, '捏造的引文必须被拦截标为 false');
});

test('V0.3 维度四: 工作流脚手架生成器输出去重 requirements.txt 与合法 .ipynb', () => {
  const slots = [
    {
      id: 'slot_0',
      step_name: '1. 数据获取',
      capability: '数据获取',
      interface_hypothesis: '输出标准 DataFrame',
      repo: {
        github_id: 1,
        full_name: 'akfamily/akshare',
        owner: 'akfamily',
        name: 'akshare',
        description: 'Financial data',
        html_url: 'https://github.com/akfamily/akshare',
        stars: 10000,
        language: 'Python',
        license_spdx: 'MIT',
        pushed_at: '2026-10-01',
        topics: [],
      },
      analysis: {
        external_dependencies: ['pandas', 'requests'],
      },
    },
  ];

  const reqTxt = ScaffoldGenerator.generateUnifiedRequirements('宏观计量管线', slots);
  assert.ok(reqTxt.includes('akshare'));
  assert.ok(reqTxt.includes('requests'));

  const pyScript = ScaffoldGenerator.generatePythonStarterScript('宏观计量管线', '金融与经济研究', slots);
  assert.ok(pyScript.includes('def step_1_stage'));
  assert.ok(pyScript.includes('akfamily/akshare'));

  const ipynbRaw = ScaffoldGenerator.generateJupyterNotebook('宏观计量管线', '金融与经济研究', slots);
  const ipynb = JSON.parse(ipynbRaw);
  assert.equal(ipynb.nbformat, 4);
  assert.ok(ipynb.cells.length >= 4);
});

test('V0.3 维度五: Awesome 清单批量解析与四大领域自动分类 & Gist 快照导出恢复', () => {
  const sampleAwesomeMd = `# Awesome Research
- [vnpy](https://github.com/vnpy/vnpy) - 基于Python的开源量化交易策略回测与实盘框架
- [pyfixest](https://github.com/py-econometrics/pyfixest) - Fast high-dimensional fixed effects and causal inference DID econometrics
- [manim](https://github.com/3b1b/manim) - Animation engine for explanatory math videos
`;

  const parsed = GistSyncService.parseAwesomeMarkdown(sampleAwesomeMd);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].inferred_domain, '量化交易');
  assert.equal(parsed[1].inferred_domain, '金融与经济研究');
  assert.equal(parsed[2].inferred_domain, '视频与图片创作');

  // 测试快照导出与导入
  const snap = StorageService.exportFullSnapshot();
  const imported = StorageService.importFullSnapshot(snap);
  assert.ok(imported.subscriptionsCount >= 1);
});
