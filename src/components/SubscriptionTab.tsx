import React from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export const SubscriptionTab: React.FC = () => {
  const activeSubs = [
    { name: '前沿宏观与面板计量', domain: '金融与经济研究', query: 'panel data econometrics python', freq: '每周一' },
    { name: '学术论文解析与LaTeX工具', domain: '学术研究', query: 'pdf extraction latex python', freq: '每周一' },
    { name: '量化策略回测与因子', domain: '量化交易', query: 'quantitative trading backtesting python', freq: '每周一' },
    { name: 'AI动画与视频字幕创作', domain: '视频与图片创作', query: 'manim whisper video python', freq: '每周一' },
  ];

  const recentEvents = [
    { type: '✨ 新发现', name: 'cindyjiang456-data/Covid-Economic-Panel-Analysis', detail: 'Panel data analysis of U.S. economic performance using Python, fixed/random effects', date: '今日' },
    { type: '✨ 新发现', name: 'morenoler/healthvalue-atlas', detail: 'Health economics atlas: 46 countries, panel econometrics, World Bank data', date: '今日' },
    { type: '✨ 新发现', name: 'BertilBraun/Pdf-Extraction', detail: 'Extracts mathematical content from PDFs and formats as rich LaTeX Markdown', date: '今日' },
    { type: '✨ 新发现', name: 'VarunSingh022/AlphaLab', detail: 'Institutional-grade quantitative trading framework for research & backtesting', date: '今日' },
    { type: '✨ 新发现', name: 'docxology/democreate', detail: 'Turns declarative demo specs into 4K videos with Whisper subtitle sync and Manim', date: '今日' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <RefreshCw className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">🔄 持续订阅与云端巡检中心</h2>
            <p className="text-sm text-slate-400">
              由 GitHub Actions 工作流在云端定时自动执行，即使电脑关机也能持续感知新发布与 README 变更。
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>云端巡检机制运行中：</span>
          </div>
          <p>
            • 监控周期：每周一凌晨由 GitHub Actions 自动苏醒。<br />
            • 哈希变更感知：仅当仓库 README 内容哈希实质变动时更新分析。<br />
            • 简报生成：每次更新自动生成最新的 <code className="text-sky-300">LATEST_RADAR_DIGEST.md</code> 提交到仓库。
          </p>
        </div>
      </div>

      {/* 活跃订阅 */}
      <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">📋 活跃跟踪订阅</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeSubs.map((sub, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm">{sub.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {sub.domain}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 truncate">查询: {sub.query}</p>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>更新频率: {sub.freq}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 变动事件流 */}
      <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">🔔 最新捕获的变动流 (Recent Events)</h3>
        <div className="space-y-3">
          {recentEvents.map((ev, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sky-400">{ev.type}</span>
                  <a
                    href={`https://github.com/${ev.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-white hover:underline"
                  >
                    {ev.name}
                  </a>
                </div>
                <p className="text-slate-300">{ev.detail}</p>
              </div>
              <span className="text-slate-500 shrink-0">{ev.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
