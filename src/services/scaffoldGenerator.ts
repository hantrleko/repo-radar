import type { WorkflowSlot } from '../types/index.ts';

const KNOWN_PIP_PACKAGE_MAP: Record<string, string> = {
  akshare: 'akshare',
  linearmodels: 'linearmodels',
  statsmodels: 'statsmodels',
  pyfixest: 'pyfixest',
  manim: 'manim',
  pymupdf: 'PyMuPDF',
  'pdf-extraction': 'pypdf',
  whisper: 'openai-whisper',
  'faster-whisper': 'faster-whisper',
  vnpy: 'vnpy',
  qlib: 'pyqlib',
  backtrader: 'backtrader',
  ccxt: 'ccxt',
  moviepy: 'moviepy',
};

export class ScaffoldGenerator {
  /**
   * 汇总工作流各槽位仓库与外部依赖，生成去重后的统一 requirements.txt
   */
  public static generateUnifiedRequirements(title: string, slots: WorkflowSlot[]): string {
    const pkgSet = new Set<string>(['pandas>=2.0.0', 'numpy>=1.24.0']);
    const stageComments: string[] = [];

    for (const slot of slots) {
      if (!slot.repo) continue;
      const repoNameLower = slot.repo.name.toLowerCase();
      const mappedPkg = KNOWN_PIP_PACKAGE_MAP[repoNameLower] || repoNameLower.replace(/[^a-z0-9_-]/g, '');
      if (mappedPkg) {
        pkgSet.add(mappedPkg);
      }

      if (slot.analysis?.external_dependencies) {
        for (const dep of slot.analysis.external_dependencies) {
          const cleanDep = dep.toLowerCase().trim();
          if (cleanDep === 'pytorch') pkgSet.add('torch');
          else if (cleanDep === 'sklearn') pkgSet.add('scikit-learn');
          else if (cleanDep) pkgSet.add(cleanDep);
        }
      }

      stageComments.push(`# [${slot.step_name}] -> ${slot.repo.full_name} (${slot.repo.html_url})`);
    }

    const lines = [
      `# =====================================================================`,
      `# 个人开源项目雷达 (RepoRadar CN V0.3) 自动合成环境清单`,
      `# 工作流名称: ${title}`,
      `# 生成时间: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
      `# 建议使用虚拟环境安装: uv pip install -r requirements.txt`,
      `# =====================================================================`,
      ...stageComments,
      '',
      ...Array.from(pkgSet).sort(),
      '',
    ];

    return lines.join('\n');
  }

  /**
   * 生成带数据流转接口骨架的 Python 启动脚本 (pipeline_starter.py)
   */
  public static generatePythonStarterScript(title: string, domain: string, slots: WorkflowSlot[]): string {
    const lines: string[] = [
      `"""`,
      `工作流脚手架: ${title}`,
      `所属领域: ${domain}`,
      `由 个人开源项目雷达 (RepoRadar CN V0.3) 自动生成`,
      `安全声明: 本脚本仅提供模块衔接骨架与接口假设，请核对各库官方文档后填充业务逻辑。`,
      `"""`,
      `from typing import Any, Dict`,
      `import pandas as pd`,
      ``,
    ];

    slots.forEach((slot, idx) => {
      const stepNum = idx + 1;
      const repoName = slot.repo ? slot.repo.full_name : '待定模块 (Unassigned)';
      const repoUrl = slot.repo ? slot.repo.html_url : 'N/A';
      const importName = slot.repo
        ? (KNOWN_PIP_PACKAGE_MAP[slot.repo.name.toLowerCase()] || slot.repo.name.toLowerCase()).replace(/-/g, '_')
        : 'todo_module';

      lines.push(`def step_${stepNum}_stage(upstream_payload: Any = None) -> Any:`);
      lines.push(`    """`);
      lines.push(`    环节 ${stepNum}: ${slot.step_name}`);
      lines.push(`    核心能力: ${slot.capability}`);
      lines.push(`    选定仓库: ${repoName} (${repoUrl})`);
      lines.push(`    接口/交接假设: ${slot.interface_hypothesis}`);
      lines.push(`    """`);
      lines.push(`    print(f"[*] 正在执行 ${slot.step_name} (使用 ${repoName})...")`);
      if (slot.repo) {
        lines.push(`    # TODO: 取消下方注释并调用 ${slot.repo.name} 核心接口`);
        lines.push(`    # import ${importName}`);
      } else {
        lines.push(`    # TODO: 尚未在此槽位选定具体开源仓库`);
      }
      lines.push(`    result = {"stage": ${stepNum}, "hypothesis": "${slot.interface_hypothesis}", "data": upstream_payload}`);
      lines.push(`    return result`);
      lines.push(``);
    });

    lines.push(`def run_pipeline() -> Dict[str, Any]:`);
    lines.push(`    print("=== 启动研究工作流: ${title} ===")`);
    lines.push(`    payload = None`);
    slots.forEach((_, idx) => {
      lines.push(`    payload = step_${idx + 1}_stage(payload)`);
    });
    lines.push(`    print("=== 工作流执行完毕 ===")`);
    lines.push(`    return payload`);
    lines.push(``);
    lines.push(`if __name__ == "__main__":`);
    lines.push(`    run_pipeline()`);

    return lines.join('\n');
  }

  /**
   * 生成可直接用 VS Code / JupyterLab 打开的 .ipynb 交互式研究笔记
   */
  public static generateJupyterNotebook(title: string, domain: string, slots: WorkflowSlot[]): string {
    const cells: any[] = [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          `# 🛠️ ${title}\n`,
          `> **领域**: ${domain} | **生成工具**: 个人开源项目雷达 (RepoRadar CN V0.3)\n\n`,
          `本 Notebook 由工作流拼装台自动生成，包含选定开源项目的环境依赖安装与分步数据交接骨架。`,
        ],
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# 1. 环境依赖一键安装 (按需取消注释执行)\n`,
          `# !pip install ${slots
            .filter(s => s.repo)
            .map(s => KNOWN_PIP_PACKAGE_MAP[s.repo!.name.toLowerCase()] || s.repo!.name.toLowerCase())
            .join(' ')} pandas numpy`,
        ],
      },
    ];

    slots.forEach((slot, idx) => {
      const repoInfo = slot.repo
        ? `[${slot.repo.full_name}](${slot.repo.html_url}) (⭐ ${slot.repo.stars})`
        : '*(暂未指派仓库)*';

      cells.push({
        cell_type: 'markdown',
        metadata: {},
        source: [
          `## ${slot.step_name}\n`,
          `- **核心能力**: \`${slot.capability}\`\n`,
          `- **选定开源仓库**: ${repoInfo}\n`,
          `- **数据交接假设**: \`${slot.interface_hypothesis}\``,
        ],
      });

      const pkgName = slot.repo
        ? (KNOWN_PIP_PACKAGE_MAP[slot.repo.name.toLowerCase()] || slot.repo.name.toLowerCase()).replace(/-/g, '_')
        : 'your_library';

      cells.push({
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# 步骤 ${idx + 1}: ${slot.step_name}\n`,
          `# import ${pkgName}\n`,
          `import pandas as pd\n\n`,
          `print("Executing Step ${idx + 1}: ${slot.step_name}")\n`,
          `# TODO: 在此编写基于 ${slot.repo ? slot.repo.name : '选定库'} 的代码，确保输出满足: ${slot.interface_hypothesis}`,
        ],
      });
    });

    const notebook = {
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3',
        },
        language_info: {
          name: 'python',
          version: '3.11',
        },
      },
      nbformat: 4,
      nbformat_minor: 5,
    };

    return JSON.stringify(notebook, null, 2);
  }
}
