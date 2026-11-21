import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Check,
  Database,
  CloudUpload,
  CloudDownload,
  Laptop,
  BrainCircuit,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { GitHubService } from '../services/githubService';
import { StorageService } from '../services/storageService';
import { GistSyncService } from '../services/gistSyncService';
import { LLMService } from '../services/llmService';
import { UserEnvProfile, LLMConfig } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'token_gist' | 'env_profile' | 'byok_llm'>('token_gist');

  // Tab 1: Token & Gist
  const [token, setToken] = useState('');
  const [inspectLimit, setInspectLimit] = useState(4);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null);
  const [gistId, setGistId] = useState('');
  const [gistStatus, setGistStatus] = useState<{ ok?: boolean; msg: string; url?: string }>({ msg: '' });
  const [isSyncingGist, setIsSyncingGist] = useState(false);

  // Tab 2: User Env Profile
  const [envProfile, setEnvProfile] = useState<UserEnvProfile>(() => StorageService.getUserEnvProfile());

  // Tab 3: BYOK LLM Config
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => StorageService.getLLMConfig());
  const [llmTestResult, setLlmTestResult] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const [isTestingLlm, setIsTestingLlm] = useState(false);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('repo_radar_gh_token') || '';
    const savedLimit = localStorage.getItem('repo_radar_inspect_limit');
    if (savedLimit) setInspectLimit(parseInt(savedLimit, 10));
    setToken(savedToken);
    setGistId(StorageService.getGistId());
    GitHubService.getRateLimit().then(setRateLimit);
  }, []);

  const handleSaveAll = () => {
    localStorage.setItem('repo_radar_gh_token', token.trim());
    localStorage.setItem('repo_radar_inspect_limit', inspectLimit.toString());
    StorageService.saveGistId(gistId);
    StorageService.saveUserEnvProfile(envProfile);
    StorageService.saveLLMConfig(llmConfig);
    setSaved(true);
    GitHubService.getRateLimit().then(setRateLimit);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = () => {
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

  const handlePushGist = async () => {
    setIsSyncingGist(true);
    setGistStatus({ msg: '正在加密打包本地收藏、笔记、订阅与工作流并上传至 GitHub Secret Gist...' });
    localStorage.setItem('repo_radar_gh_token', token.trim());
    const res = await GistSyncService.pushToGist(token, gistId);
    if (res.gistId) setGistId(res.gistId);
    setGistStatus({ ok: res.ok, msg: res.message, url: res.htmlUrl });
    setIsSyncingGist(false);
  };

  const handlePullGist = async () => {
    setIsSyncingGist(true);
    setGistStatus({ msg: '正在从 GitHub Secret Gist 拉取并恢复知识库...' });
    localStorage.setItem('repo_radar_gh_token', token.trim());
    const res = await GistSyncService.pullFromGist(token, gistId);
    setGistStatus({ ok: res.ok, msg: res.message });
    setEnvProfile(StorageService.getUserEnvProfile());
    setIsSyncingGist(false);
  };

  const handleProviderPreset = (provider: LLMConfig['provider']) => {
    if (provider === 'deepseek') {
      setLlmConfig({
        ...llmConfig,
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      });
    } else if (provider === 'openai') {
      setLlmConfig({
        ...llmConfig,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });
    } else {
      setLlmConfig({
        ...llmConfig,
        provider: 'ollama',
        base_url: 'http://localhost:11434/v1',
        model: 'qwen2.5:7b',
      });
    }
  };

  const handleTestLlm = async () => {
    setIsTestingLlm(true);
    setLlmTestResult({ msg: '正在连接大模型接口...' });
    const res = await LLMService.testConnection(llmConfig);
    setLlmTestResult({ ok: res.ok, msg: res.message });
    setIsTestingLlm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <KeyRound className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-white">V0.3 系统配置 · 云同步 · 环境画像 · BYOK双擎</h3>
              <p className="text-[11px] text-slate-400">所有密钥与配置仅保存在本地浏览器，绝不上传第三方服务器</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('token_gist')}
            className={`px-3 py-2.5 rounded-t-xl font-semibold flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'token_gist'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Token 与 Gist 云同步</span>
          </button>

          <button
            onClick={() => setActiveTab('env_profile')}
            className={`px-3 py-2.5 rounded-t-xl font-semibold flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'env_profile'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>本地环境画像碰撞</span>
          </button>

          <button
            onClick={() => setActiveTab('byok_llm')}
            className={`px-3 py-2.5 rounded-t-xl font-semibold flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'byok_llm'
                ? 'border-purple-500 text-purple-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>BYOK 大模型双擎</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'token_gist' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  GitHub Personal Access Token (推荐勾选 repo / gist 权限)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  用于实时深挖仓库目录树、Open Issues 避坑扫描，以及将知识库加密备份到你私有的 GitHub Secret Gist。
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">默认单次深度取证候选数</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={inspectLimit}
                    onChange={e => setInspectLimit(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <span className="font-mono text-sky-400 font-bold w-16 text-right">{inspectLimit} 个项目</span>
                </div>
              </div>

              {rateLimit && (
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-400">实时 GitHub Search API 剩余配额:</span>
                  <span className="font-mono font-bold text-sky-400">
                    {rateLimit.remaining} / {rateLimit.limit}
                  </span>
                </div>
              )}

              {/* GitHub Secret Gist 跨端云同步 */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <CloudUpload className="w-4 h-4 text-sky-400" />
                    <span>GitHub Secret Gist 无后端跨端云同步</span>
                  </span>
                  <span className="text-[11px] text-slate-500">私密快照 · 多设备漫游</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Secret Gist ID (首次备份自动生成，跨设备恢复时填入)</label>
                  <input
                    type="text"
                    value={gistId}
                    onChange={e => setGistId(e.target.value)}
                    placeholder="留空则首次点击备份时自动创建私密 Gist"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handlePushGist}
                    disabled={isSyncingGist}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold transition disabled:opacity-50"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>☁️ 一键备份到私密 Gist</span>
                  </button>

                  <button
                    onClick={handlePullGist}
                    disabled={isSyncingGist}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition disabled:opacity-50"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>📥 从 Gist 恢复本地库</span>
                  </button>
                </div>

                {gistStatus.msg && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between ${
                      gistStatus.ok === false
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <span>{gistStatus.msg}</span>
                    {gistStatus.url && (
                      <a
                        href={gistStatus.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline flex items-center space-x-1 ml-2 shrink-0"
                      >
                        <span>查看Gist</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'env_profile' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                💡 设定你的主力开发机画像后，雷达在深挖仓库时会自动将仓库依赖、最低显存要求、Linux 专属包及社区 Issue 与你的机器碰撞，亮出红黄绿灯预警。
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">主力操作系统</label>
                  <select
                    value={envProfile.os}
                    onChange={e => setEnvProfile({ ...envProfile, os: e.target.value as UserEnvProfile['os'] })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Windows">Windows 10 / 11</option>
                    <option value="macOS">macOS (Apple Silicon / Intel)</option>
                    <option value="Linux">Linux (Ubuntu / Debian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">本地 Python 版本</label>
                  <select
                    value={envProfile.python_version}
                    onChange={e => setEnvProfile({ ...envProfile, python_version: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="3.10">Python 3.10</option>
                    <option value="3.11">Python 3.11</option>
                    <option value="3.12">Python 3.12</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-semibold">配备 NVIDIA CUDA 独立显卡</span>
                  <input
                    type="checkbox"
                    checked={envProfile.has_nvidia_gpu}
                    onChange={e => setEnvProfile({ ...envProfile, has_nvidia_gpu: e.target.checked })}
                    className="rounded accent-emerald-500 w-4 h-4"
                  />
                </label>

                {envProfile.has_nvidia_gpu && (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>本地可用显存容量 (VRAM)</span>
                      <span className="font-mono font-bold text-emerald-400">{envProfile.vram_gb} GB</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="48"
                      step="2"
                      value={envProfile.vram_gb}
                      onChange={e => setEnvProfile({ ...envProfile, vram_gb: parseInt(e.target.value, 10) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-semibold block">排斥商业付费 API / 付费金融终端依赖</span>
                    <span className="text-[11px] text-slate-500">
                      开启后，若仓库强依赖 OpenAI Key / Wind / Tushare Pro 积分将自动高亮警告
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={envProfile.disallow_paid_api}
                    onChange={e => setEnvProfile({ ...envProfile, disallow_paid_api: e.target.checked })}
                    className="rounded accent-emerald-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'byok_llm' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-[11px]">
                🧠 <strong>BYOK (Bring Your Own Key) 双擎架构</strong>：未开启时系统使用 100% 离线确定性规则引擎；开启后将自动执行「复杂中文需求裂变」与「强制原文引证 (`exact_quote`) 校验」，找不到原文出处的模型结论会被校验器自动拦截。
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                <span className="font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>启用 BYOK 大模型语义裂变与强制引证精排</span>
                </span>
                <input
                  type="checkbox"
                  checked={llmConfig.enabled}
                  onChange={e => setLlmConfig({ ...llmConfig, enabled: e.target.checked })}
                  className="rounded accent-purple-500 w-4 h-4"
                />
              </label>

              <div className="flex gap-2">
                {(['deepseek', 'openai', 'ollama'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => handleProviderPreset(p)}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold transition ${
                      llmConfig.provider === p
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p === 'deepseek' ? '🚀 DeepSeek 官方' : p === 'openai' ? '🌐 OpenAI / 兼容接口' : '🏠 本地 Ollama'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">API Base URL</label>
                  <input
                    type="text"
                    value={llmConfig.base_url}
                    onChange={e => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                    placeholder="https://api.deepseek.com/v1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    API Key {llmConfig.provider === 'ollama' && '(本地 Ollama 可留空)'}
                  </label>
                  <input
                    type="password"
                    value={llmConfig.api_key}
                    onChange={e => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-300 font-semibold mb-1">模型名称 (Model)</label>
                    <input
                      type="text"
                      value={llmConfig.model}
                      onChange={e => setLlmConfig({ ...llmConfig, model: e.target.value })}
                      placeholder="deepseek-chat / gpt-4o-mini / qwen2.5:7b"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <button
                    onClick={handleTestLlm}
                    disabled={isTestingLlm}
                    className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold transition"
                  >
                    {isTestingLlm ? '测试中...' : '⚡ 测试连接'}
                  </button>
                </div>

                {llmTestResult.msg && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] ${
                      llmTestResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {llmTestResult.msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
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
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-sky-500/20"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              <span>{saved ? '全部设置已保存' : '保存全部设置'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
