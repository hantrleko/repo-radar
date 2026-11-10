import React, { useState } from 'react';
import { X, Layers, Save, Download, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import { Repository, EvidenceAnalysis, WorkflowPipeline } from '../types';
import { StorageService } from '../services/storageService';

interface WorkflowComposerModalProps {
  onClose: () => void;
  incomingRepo?: { repo: Repository; analysis: EvidenceAnalysis };
}

const TEMPLATES: Record<string, { title: string; domain: string; description: string; steps: { name: string; cap: string; hypothesis: string }[] }> = {
  macro_econometrics: {
    title: '宏观与金融计量工作流',
    domain: '金融与经济研究',
    description: '从中国/全球宏观与股票市场拉取时序，执行面板固定效应与因果推断回归，并导出顶刊 LaTeX 汇报表格。',
    steps: [
      { name: '1. 宏观数据获取', cap: '数据获取', hypothesis: '输出标准化日期索引 DataFrame / CSV' },
      { name: '2. 数据清洗与面板重构', cap: '数据清洗', hypothesis: '处理多重缺失值与双重差分平衡面板' },
      { name: '3. 面板与因果估计', cap: '计量估计', hypothesis: '输入平衡面板，输出回归系数与稳健标准误' },
      { name: '4. LaTeX / 表格导出', cap: '格式导出', hypothesis: '格式化为可直接编译的 .tex 表格代码' },
    ],
  },
  academic_research: {
    title: '学术研读与论文复现工作台',
    domain: '学术研究',
    description: '解析论文 PDF，抽取数学公式与引文网络，搭建独立复现环境并生成精美双栏论文排版。',
    steps: [
      { name: '1. PDF解析与公式抽取', cap: '数据清洗', hypothesis: '提取纯文本、矢量图与 LaTeX 数学公式' },
      { name: '2. 参考文献与引文管理', cap: '检索增强', hypothesis: '输出标准 BibTeX 引用条目' },
      { name: '3. 研究复现与模型计算', cap: '计量估计', hypothesis: '执行核心算法推导与假说检验' },
      { name: '4. 新一代排版导出', cap: '格式导出', hypothesis: 'Typst / LaTeX 编译输出出版级 PDF' },
    ],
  },
  quant_strategy: {
    title: '量化策略研发与验证管线',
    domain: '量化交易',
    description: '接入交易所深度行情与订单流，进行海量 Alpha 因子挖掘，跑通 CTA 事件驱动回测与风险归因。',
    steps: [
      { name: '1. 行情与深度数据接入', cap: '数据获取', hypothesis: '高频 Tick / K线数据时序流' },
      { name: '2. Alpha因子特征工程', cap: '内容生成', hypothesis: '计算因子 IC / RankIC 评价矩阵' },
      { name: '3. 事件驱动策略回测', cap: '计量估计', hypothesis: '模拟滑点、佣金与撮合订单' },
      { name: '4. 组合优化与风控归因', cap: '计量估计', hypothesis: '计算最大回撤、夏普比率与 CVaR' },
    ],
  },
  creative_media: {
    title: '数学可视化与演示短视频管线',
    domain: '视频与图片创作',
    description: '编写 Python 代码生成 3Blue1Brown 风格公式推导动画，自动转录并同步双语字幕，批量合成技术演示视频。',
    steps: [
      { name: '1. 数学逻辑与图表生成', cap: '可视化呈现', hypothesis: '生成 4K 矢量插画与几何变换帧' },
      { name: '2. 动态补间动画渲染', cap: '内容生成', hypothesis: '渲染 60FPS 讲解无声 MP4' },
      { name: '3. 语音识别与时间轴字幕', cap: '数据清洗', hypothesis: '输出精确对齐音轨的 .srt 字幕' },
      { name: '4. 视频音画剪辑合成', cap: '内容生成', hypothesis: '合成片头、动画轨、字幕与旁白音轨' },
    ],
  },
};

export const WorkflowComposerModal: React.FC<WorkflowComposerModalProps> = ({ onClose, incomingRepo }) => {
  const templateKeys = Object.keys(TEMPLATES);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(templateKeys[0]);
  const [currentSlots, setCurrentSlots] = useState<{ [index: number]: Repository }>({});
  const [toast, setToast] = useState('');

  const currentTemplate = TEMPLATES[selectedTemplateKey];

  const handleAssignRepo = (stepIndex: number) => {
    if (incomingRepo) {
      setCurrentSlots(prev => ({ ...prev, [stepIndex]: incomingRepo.repo }));
      setToast(`已将 ${incomingRepo.repo.name} 放入 [${currentTemplate.steps[stepIndex].name}] 槽位！`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleSavePipeline = () => {
    const pipeline: WorkflowPipeline = {
      id: `pipe_${Date.now()}`,
      title: currentTemplate.title,
      domain: currentTemplate.domain,
      description: currentTemplate.description,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      slots: currentTemplate.steps.map((st, i) => ({
        id: `slot_${i}`,
        step_name: st.name,
        capability: st.cap,
        repo: currentSlots[i],
        interface_hypothesis: st.hypothesis,
      })),
    };

    StorageService.savePipeline(pipeline);
    setToast('工作流方案已保存到本地工作台！');
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportMarkdown = () => {
    const lines = [
      `# 🛠️ 开源工作流方案：${currentTemplate.title}`,
      `> 领域：${currentTemplate.domain}`,
      `> 说明：${currentTemplate.description}`,
      '',
      '---',
      '',
      '## 模块拼接与数据交接规范',
      '',
    ];

    currentTemplate.steps.forEach((st, idx) => {
      const assigned = currentSlots[idx];
      lines.push(`### 环节 ${idx + 1}：${st.name}`);
      lines.push(`* **核心能力**：${st.cap}`);
      lines.push(`* **接口/交接假设**：\`${st.hypothesis}\``);
      if (assigned) {
        lines.push(`* **选定开源仓库**：[${assigned.full_name}](${assigned.html_url}) (⭐ ${assigned.stars.toLocaleString()})`);
      } else {
        lines.push(`* **选定开源仓库**：*(待定/暂无)*`);
      }
      lines.push('');
    });

    lines.push('---');
    lines.push('*由个人开源项目雷达 (RepoRadar CN) 工作流拼装台生成*');

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${selectedTemplateKey}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">研究工作流拼装台 (Workflow Composer)</h3>
              <p className="text-xs text-slate-400">组合垂直库构建端到端方案，明确模块间数据交接假设与接口规范</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模板选择与待插入项目提示 */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex flex-wrap gap-2">
            {templateKeys.map(key => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTemplateKey(key);
                  setCurrentSlots({});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  selectedTemplateKey === key
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {TEMPLATES[key].title}
              </button>
            ))}
          </div>

          {incomingRepo && (
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-300">
              <span>
                当前待装配项目：<strong className="text-white">{incomingRepo.repo.full_name}</strong> (能力:{' '}
                {incomingRepo.analysis.chinese_purpose.slice(0, 30)}...)
              </span>
              <span className="text-slate-400 text-[11px]">点击下方对应环节的「装配此仓库」</span>
            </div>
          )}

          {toast && (
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg animate-fade-in">
              {toast}
            </div>
          )}
        </div>

        {/* 槽位流水线展示 */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl mb-4">
            <h4 className="text-sm font-bold text-white mb-1">{currentTemplate.title}</h4>
            <p className="text-xs text-slate-400">{currentTemplate.description}</p>
          </div>

          <div className="space-y-3">
            {currentTemplate.steps.map((step, idx) => {
              const assigned = currentSlots[idx];
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                        步骤 {idx + 1}
                      </span>
                      <span className="font-bold text-white text-sm">{step.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        能力: {step.cap}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      数据交接假设：<code className="text-amber-300 font-mono text-[11px]">{step.hypothesis}</code>
                    </p>

                    {assigned && (
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已选定仓库: <a href={assigned.html_url} target="_blank" rel="noreferrer" className="underline font-bold text-white">{assigned.full_name}</a> (⭐ {assigned.stars.toLocaleString()})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {incomingRepo && (
                      <button
                        onClick={() => handleAssignRepo(idx)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                      >
                        装配此仓库
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer 操作栏 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            * 组合建议仅提供领域模块切分与接口假设，不假定第三方代码可无缝直接调用。
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出方案 Markdown</span>
            </button>

            <button
              onClick={handleSavePipeline}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-500/20 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存工作流方案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
