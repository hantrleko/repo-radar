import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, RefreshCw } from 'lucide-react';
import { GitHubService } from '../services/githubService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [token, setToken] = useState('');
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('repo_radar_gh_token') || '';
    setToken(savedToken);
    GitHubService.getRateLimit().then(setRateLimit);
  }, []);

  const handleSave = () => {
    localStorage.setItem('repo_radar_gh_token', token.trim());
    setSaved(true);
    GitHubService.getRateLimit().then(setRateLimit);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">系统与 GitHub 配额设置</h3>
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
              Token 仅保存在当前浏览器的 localStorage 中，不会上传服务器。配置后 Search API 配额将从 10次/分提升至 30次/分。
            </p>
          </div>

          {rateLimit && (
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400">当前 Search API 剩余配额:</span>
              <span className="font-mono font-bold text-sky-400">
                {rateLimit.remaining} / {rateLimit.limit}
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center space-x-1 transition"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              <span>{saved ? '已保存' : '保存设置'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
