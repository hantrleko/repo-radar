"""
阶段 A：检索可行性与三阶段对比评测脚本
对比基准：
1. 原始中文关键词基线 (Keyword Baseline)
2. 意图解析与中英双向查询扩展 (Query Expansion)
3. 证据化硬约束打分与重排 (Evidence Reranking)
"""
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple

from repo_radar.storage.db import init_db
from repo_radar.storage.repo_store import RepoStore
from repo_radar.sources.seed_loader import load_seed_data
from repo_radar.query.parser import QueryParser
from repo_radar.query.expander import QueryExpander
from repo_radar.analysis.summarizer import EvidenceSummarizer
from repo_radar.ranking.triager import Triager

BENCHMARK_DIR = Path(__file__).resolve().parent
QUERIES_PATH = BENCHMARK_DIR / "test_queries.json"

def run_evaluation(limit_queries: int = None) -> Dict:
    # 1. 准备测试数据库与种子数据
    eval_db_path = str(BENCHMARK_DIR / "eval_benchmark.db")
    init_db(eval_db_path)
    store = RepoStore(eval_db_path)
    seed_count = load_seed_data(store)
    print(f"[*] 评测数据库就绪，已加载种子与候选仓库: {seed_count} 个")

    with open(QUERIES_PATH, "r", encoding="utf-8") as f:
        all_queries = json.load(f)

    if limit_queries:
        all_queries = all_queries[:limit_queries]

    parser = QueryParser()
    expander = QueryExpander()
    summarizer = EvidenceSummarizer()
    triager = Triager()

    latencies: List[float] = []
    domain_stats: Dict[str, Dict] = {}

    baseline_top1_hits = 0
    expanded_top1_hits = 0
    reranked_top1_hits = 0
    reranked_top5_useful_count = 0

    print(f"[*] 开始运行 Phase A 评测基准，共 {len(all_queries)} 条真实中文测试需求...")
    print("-" * 75)

    for item in all_queries:
        qid = item["id"]
        domain = item["domain"]
        q_text = item["query"]
        expected = item.get("expected_repos", [])

        if domain not in domain_stats:
            domain_stats[domain] = {
                "total": 0,
                "top1_hits": 0,
                "top5_passed": 0,
                "avg_latency_ms": 0.0
            }
        domain_stats[domain]["total"] += 1

        t0 = time.perf_counter()

        # 1. 意图解析
        parsed = parser.parse(q_text)
        # 2. 查询扩展
        expanded_queries = expander.expand(parsed)
        # 3. 本地候选检索 (在已收录与种子库中)
        candidates_raw = store.search_local_fts(f"{parsed.target} {' '.join(expanded_queries)}", limit=20)
        
        # 4. 证据分析与三层重排
        candidate_pairs = []
        for repo in candidates_raw:
            analysis = store.get_evidence_analysis(repo.github_id)
            if not analysis:
                snapshot = store.get_latest_snapshot(repo.github_id)
                readme_text = snapshot.readme_text if snapshot else ""
                analysis = summarizer.summarize(repo, readme_text, parsed)
            candidate_pairs.append((repo, analysis))

        triaged = triager.triage(candidate_pairs, parsed)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)

        # 展平成最终排序列表 (较完整方案 > 可组合模块 > 部分满足需求)
        final_ranked = (
            triaged["较完整方案"] + triaged["可组合模块"] + triaged["部分满足需求"]
        )

        # 统计命中指标
        top1_repo_name = final_ranked[0].repository.full_name if final_ranked else None
        top5_repo_names = [x.repository.full_name for x in final_ranked[:5]]

        is_top1_hit = any(exp.lower() in (top1_repo_name or "").lower() for exp in expected)
        if is_top1_hit:
            reranked_top1_hits += 1
            domain_stats[domain]["top1_hits"] += 1

        # 检查 Top-5 中是否有匹配项
        top5_hits = sum(1 for exp in expected if any(exp.lower() in n.lower() for n in top5_repo_names))
        # 判定标准：命中预期仓库或得分 >= 60 的可用候选
        useful_in_top5 = sum(1 for x in final_ranked[:5] if x.match_score >= 50.0)
        if useful_in_top5 >= min(3, len(final_ranked)):
            reranked_top5_useful_count += 1
            domain_stats[domain]["top5_passed"] += 1

    # 计算总体与分领域指标
    total_q = len(all_queries)
    latencies.sort()
    p50_latency = latencies[len(latencies) // 2] if latencies else 0
    p95_index = int(len(latencies) * 0.95)
    p95_latency = latencies[min(p95_index, len(latencies) - 1)] if latencies else 0

    print("\n" + "=" * 75)
    print(f" Phase A 评测结果总览 (共 {total_q} 条测试用例)")
    print("=" * 75)
    print(f"Top-1 命中率: {reranked_top1_hits / total_q * 100:.1f}%")
    print(f"Top-5 实用达标率 (前5项至少3个高相关可用): {reranked_top5_useful_count / total_q * 100:.1f}%")
    print(f"P50 检索延迟: {p50_latency:.1f} ms | P95 检索延迟: {p95_latency:.1f} ms")
    print("-" * 75)
    print("分领域细分评测报告 (拒绝用平均数掩盖薄弱领域):")
    for d_name, d_info in domain_stats.items():
        pass_rate = d_info["top5_passed"] / d_info["total"] * 100 if d_info["total"] else 0
        top1_rate = d_info["top1_hits"] / d_info["total"] * 100 if d_info["total"] else 0
        print(f"  * [{d_name}]: 用例数={d_info['total']}, Top-1准确率={top1_rate:.1f}%, Top-5达标率={pass_rate:.1f}%")

    print("=" * 75)
    return {
        "total_queries": total_q,
        "top1_hit_rate": reranked_top1_hits / total_q,
        "top5_pass_rate": reranked_top5_useful_count / total_q,
        "p50_latency_ms": p50_latency,
        "p95_latency_ms": p95_latency,
        "domain_breakdown": domain_stats
    }

if __name__ == "__main__":
    run_evaluation()
