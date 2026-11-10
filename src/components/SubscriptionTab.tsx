import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Clock, Plus, Trash2, CheckCircle2, Filter, BellRing, Sparkles } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { GitHubService } from '../services/githubService';
import { Subscription, ChangeEvent } from '../types';

export const SubscriptionTab: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('全部');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [isNewSubModalOpen, setIsNewSubModalOpen] = useState(false);

  // 新建表单
  const [newSubName, setNewSubName] = useState('');
  const [newSubQuery, setNewSubQuery] = useState('');
  const [newSubDomain, setNewSubDomain] = useState('金融与经济研究');

  const reloadData = () => {
    setSubscriptions(StorageService.getSubscriptions());
    setEvents(StorageService.getChangeEvents());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // 执行增量巡检 (方向三)
  const handleRunIncrementalScan = async () => {
    setIsScanning(true);
    setScanMessage('正在连接 GitHub API 轮询活跃订阅并比对内容哈希...');

    const activeSubs = subscriptions.filter(s => s.is_active);
    let newEventsCount = 0;

    for (const sub of activeSubs) {
      try {
        const remoteRepos = await GitHubService.searchRemote(sub.query_str, 5);
        for (const item of remoteRepos) {
          const r = item.repo;
          const diffEvents = await GitHubService.checkRepoForDiff(r, sub.last_pushed_watermark);

          for (const ev of diffEvents) {
            ev.subscription_id = sub.id;
            StorageService.addChangeEvent(ev);
            newEventsCount++;
          }

          // 更新水印
          if (r.pushed_at && (!sub.last_pushed_watermark || r.pushed_at > sub.last_pushed_watermark)) {
            StorageService.updateSubscriptionWatermark(sub.id, r.pushed_at);
          }
        }
      } catch (err) {
        console.warn(`Scan error for ${sub.name}:`, err);
      }
    }

    reloadData();
    setIsScanning(false);
    setScanMessage(`增量巡检完毕！共发现 ${newEventsCount} 个变动事件，水印已自动推进。`);
    setTimeout(() => setScanMessage(''), 4500);
  };

  const handleCreateSub = () => {
    if (!newSubName.trim() || !newSubQuery.trim()) return;
    const sub: Subscription = {
      id: `sub_${Date.now()}`,
      name: newSubName.trim(),
      query_str: newSubQuery.trim(),
      domain: newSubDomain,
      frequency: '每周一',
      is_active: true,
      last_checked_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    StorageService.saveSubscription(sub);
    setNewSubName('');
    setNewSubQuery('');
    setIsNewSubModalOpen(false);
    reloadData();
  };

  const handleDeleteSub = (id: string) => {
    StorageService.deleteSubscription(id);
    reloadData();
  };

  const handleMarkAllRead = () => {
    StorageService.markAllEventsRead();
    reloadData();
  };

  const filteredEvents = events.filter(e => {
    if (filterType === '全部') return true;
    return e.change_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* 顶部总览卡片 */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>🔄 持续订阅与增量巡检中心</span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  真实数据驱动
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                支持浏览器直连增量巡检，也可由云端 GitHub Actions 自动苏醒定时同步
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsNewSubModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>新建监控订阅</span>
            </button>

            <button
              onClick={handleRunIncrementalScan}
              disabled={isScanning}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? '正在增量巡检...' : '⚡ 立即增量巡检'}</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>自动化双模巡检保障：</span>
          </div>
          <p className="text-slate-400">
            • <strong>浏览器端即时巡检</strong>：使用当前浏览器配置的 Token 对所有活跃订阅进行实时差量检查，比对 README 哈希与 pushed_at 水位。<br />
            • <strong>云端 7×24h 定时巡检</strong>：每周一凌晨由 GitHub Actions 无人唤醒，自动生成并在仓库提交最新的 <code className="text-sky-300">LATEST_RADAR_DIGEST.md</code> 报告。
          </p>
        </div>
      </div>

      {/* 活跃订阅管理 */}
      <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center justify-between">
          <span>📋 活跃跟踪订阅 ({subscriptions.length} 条)</span>
          <span className="text-xs text-slate-400 font-normal">基于 GitHub API 水位线推进</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subscriptions.map(sub => (
            <div key={sub.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-sm">{sub.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {sub.domain}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">查询: {sub.query_str}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>水位: {sub.last_pushed_watermark ? sub.last_pushed_watermark.slice(0, 10) : '未记录'}</span>
                </div>
                <button
                  onClick={() => handleDeleteSub(sub.id)}
                  className="text-slate-500 hover:text-rose-400 transition"
                  title="删除该订阅"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 变动事件流 */}
      <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">🔔 增量变动事件流 (Change Events)</h3>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
            >
              <option value="全部">全部类型</option>
              <option value="新发现">新发现</option>
              <option value="README功能变化">README功能变化</option>
              <option value="新版本">新版本</option>
              <option value="归档或转移">归档或转移</option>
            </select>

            <button
              onClick={handleMarkAllRead}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
            >
              全部标记已读
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl text-slate-500 text-xs">
            暂无匹配的变动事件。点击上方【⚡ 立即增量巡检】即可触发实时差量比对。
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredEvents.map(ev => {
              const badgeColors: Record<string, string> = {
                '新发现': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                'README功能变化': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                '新版本': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                '归档或转移': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                '许可证变化': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
              };

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColors[ev.change_type] || 'bg-slate-700 text-slate-300'}`}>
                        {ev.change_type}
                      </span>
                      <a
                        href={`https://github.com/${ev.repo_full_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-white hover:underline"
                      >
                        {ev.repo_full_name}
                      </a>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{ev.detail}</p>
                  </div>
                  <span className="text-slate-500 shrink-0 text-[11px]">{ev.occurred_at || '近期'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新建订阅弹窗 */}
      {isNewSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">➕ 新建持续监控订阅</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">订阅名称</label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  placeholder="例如: 宏观因果推断工具"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">检索关键词或表达式</label>
                <input
                  type="text"
                  value={newSubQuery}
                  onChange={e => setNewSubQuery(e.target.value)}
                  placeholder="例如: causal inference python difference-in-differences"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">归属领域</label>
                <select
                  value={newSubDomain}
                  onChange={e => setNewSubDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="金融与经济研究">金融与经济研究</option>
                  <option value="学术研究">学术研究</option>
                  <option value="量化交易">量化交易</option>
                  <option value="视频与图片创作">视频与图片创作</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsNewSubModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreateSub}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition shadow-lg shadow-sky-500/20"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
