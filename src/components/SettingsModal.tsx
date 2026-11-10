import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, RefreshCw, Sliders, Database } from 'lucide-react';
import { GitHubService } from '../services/githubService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [token, setToken] = useState('');
  const [inspectLimit, setInspectLimit] = useState(4);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('repo_radar_gh_token') || '';
    const savedLimit = localStorage.getItem('repo_radar_inspect_limit');
    if (savedLimit) setInspectLimit(parseInt(savedLimit, 10));
    setToken(savedToken);
    GitHubService.getRateLimit().then(setRateLimit);
  }, []);

  const handleSave = () => {
    localStorage.setItem('repo_radar_gh_token', token.trim());
    localStorage.setItem('repo_radar_inspect_limit', inspectLimit.toString());
    setSaved(true);
    GitHubService.getRateLimit().then(setRateLimit);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = () => {
    // 清除以 etag_ 和 readme_cache_ 开头的缓存
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('etag_') || k.startsWith('readme_cache_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    alert(`已清理 ${keysToRemove.length} 条本地 ETag 与 README 缓存！`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">系统、Token与取证配置</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">GitHub Personal Access Token (可选)</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Token 仅加密缓存在浏览器本地，用于将 GitHub Search 配额从 10次/分提升至 30次/分，Core API 配额提至 5000次/时。
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">默认单次深度取证候选数</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="2"
                max="8"
                value={inspectLimit}
                onChange={e => setInspectLimit(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="font-mono text-sky-400 font-bold w-12 text-right">{inspectLimit} 个项目</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              单次点击「深度取证」时自动并发抓取并分析 README 与依赖清单的数量。
            </p>
          </div>

          {rateLimit && (
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400">实时 Search API 剩余配额:</span>
              <span className="font-mono font-bold text-sky-400">
                {rateLimit.remaining} / {rateLimit.limit}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleClearCache}
              className="text-slate-400 hover:text-amber-400 transition flex items-center space-x-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>清理本地 ETag 缓存</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                关闭
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center space-x-1 transition shadow-lg shadow-sky-500/20"
              >
                {saved ? <Check className="w-4 h-4" /> : null}
                <span>{saved ? '已保存' : '保存设置'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
