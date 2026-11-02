"""
中英文查询扩展生成器 (生成符合 GitHub Search API 语法的紧凑检索词)
"""
from typing import Dict, List
from repo_radar.models.query import ParsedQuery

# 中英文专业术语映射表
TERM_MAPPING: Dict[str, List[str]] = {
    "宏观数据": ["macroeconomic data", "macro data", "financial dataset"],
    "经济数据": ["economic data", "akshare", "financial data"],
    "面板回归": ["panel regression", "panel data", "fixed effects econometrics"],
    "因果推断": ["causal inference", "instrumental variables", "difference-in-differences"],
    "latex表格": ["latex table", "regression table latex", "stargazer"],
    "latex": ["latex", "typst", "typesetting"],
    "策略回测": ["backtesting", "quantitative trading", "algo trading"],
    "行情接入": ["market data", "financial feed", "stock quote"],
    "因子研究": ["alpha factor", "factor research", "quantitative investment"],
    "代码动画": ["manim animation", "mathematical animation", "motion graphics code"],
    "自动字幕": ["whisper subtitle", "speech to text srt", "video transcription"],
    "pdf解析": ["pdf parser", "pdf extraction", "paper reader"],
    "文献管理": ["citation manager", "zotero", "bibtex"],
}

class QueryExpander:
    def __init__(self, max_queries: int = 4):
        self.max_queries = max_queries

    def expand(self, parsed: ParsedQuery) -> List[str]:
        queries: List[str] = []
        lang_qualifier = f" language:{parsed.target_languages[0].lower()}" if parsed.target_languages else ""

        # 1. 直接组合英文核心能力词
        english_terms: List[str] = []
        for cap in parsed.required_capabilities:
            for key, val_list in TERM_MAPPING.items():
                if key in cap.lower() or cap.lower() in key:
                    english_terms.extend(val_list[:2])

        if english_terms:
            # 组合成 1-2 条主要的高相关性英文搜索
            top_en = " ".join(english_terms[:2])
            queries.append(f"{top_en}{lang_qualifier}".strip())
            if len(english_terms) > 2:
                sec_en = " ".join(english_terms[1:3])
                queries.append(f"{sec_en}{lang_qualifier}".strip())

        # 2. 原始目标关键词搜索
        clean_target = parsed.target.replace("，", " ").replace(",", " ")
        short_target = " ".join(clean_target.split()[:3])
        if short_target:
            queries.append(f"{short_target}{lang_qualifier}".strip())

        # 3. 如果有排除项或环境
        if parsed.environments and "Windows" in parsed.environments:
            if queries:
                queries.append(f"{queries[0]} windows".strip())

        # 去重并截断在最大允许数量内
        unique_queries = []
        for q in queries:
            q_clean = " ".join(q.split())
            if q_clean and q_clean not in unique_queries:
                unique_queries.append(q_clean)

        result = unique_queries[:self.max_queries]
        parsed.generated_github_queries = result
        return result
