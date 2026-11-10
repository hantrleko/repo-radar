import React from 'react';
import { X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Repository, EvidenceAnalysis } from '../types';

interface CompareModalProps {
  items: { repo: Repository; analysis: EvidenceAnalysis }[];
  onClose: () => void;
  onClear: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({ items, onClose, onClear }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-lg font-bold text-white">多项目多维横向深度对比 ({items.length} 个)</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClear}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              清空
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-x-auto flex-1">
          <div className="grid grid-cols-1 md:grid-flow-col gap-4 min-w-[650px]">
            {items.map(({ repo, analysis }) => (
              <div
                key={repo.github_id}
                className="p-5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base hover:text-sky-400">
                        <a href={repo.html_url} target="_blank" rel="noreferrer" className="flex items-center space-x-1">
                          <span>{repo.name}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">{repo.full_name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                      ⭐ {repo.stars.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-lg text-xs text-slate-200 leading-relaxed">
                    <span className="text-slate-400 block mb-0.5 font-medium">用途定位:</span>
                    {analysis.chinese_purpose}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">开发语言:</span>
                      <span className="text-slate-200 font-medium">{repo.language || '未知'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">开源协议:</span>
                      <span className="text-slate-200 font-medium">{analysis.license_summary}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">Windows 证据:</span>
                      <span className={analysis.os_compatibility.Windows === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {analysis.os_compatibility.Windows}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">Linux 证据:</span>
                      <span className={analysis.os_compatibility.Linux === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {analysis.os_compatibility.Linux}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">GPU 依赖:</span>
                      <span className="text-slate-200 font-medium">{analysis.gpu_requirement}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">维护状态:</span>
                      <span className={analysis.maintenance_status === '活跃' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {analysis.maintenance_status}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                      <span className="text-slate-400">取证指纹:</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {analysis.commit_sha || analysis.readme_hash?.slice(0, 8) || '元数据级'}
                      </span>
                    </div>
                  </div>

                  {analysis.external_dependencies && analysis.external_dependencies.length > 0 && (
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1 font-medium">核心依赖包:</span>
                      <div className="flex flex-wrap gap-1">
                        {analysis.external_dependencies.slice(0, 6).map((dep, di) => (
                          <span key={di} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-sky-300">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.satisfied_conditions && analysis.satisfied_conditions.length > 0 && (
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1 font-medium">满足点:</span>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                        {analysis.satisfied_conditions.slice(0, 3).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-medium text-xs transition"
                >
                  访问 GitHub 仓库
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
