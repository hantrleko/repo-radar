"""
自然语言需求解析器 (支持规则引擎与 LLM 智能抽取无缝降级)
"""
import re
from typing import List, Optional
from repo_radar.models.query import ParsedQuery

class QueryParser:
    def __init__(self, llm_adapter = None):
        self.llm_adapter = llm_adapter

    def parse(self, raw_query: str) -> ParsedQuery:
        raw_query = raw_query.strip()
        if not raw_query:
            return ParsedQuery(original_query="")

        # 若配置了可用 LLM，尝试模型抽取；失败或未配置则使用规则引擎
        if self.llm_adapter and self.llm_adapter.is_available():
            try:
                parsed = self.llm_adapter.parse_query_intent(raw_query)
                if parsed:
                    return parsed
            except Exception:
                pass

        return self._rule_based_parse(raw_query)

    def _rule_based_parse(self, text: str) -> ParsedQuery:
        parsed = ParsedQuery(original_query=text)

        # 1. 语言抽取
        langs = []
        lang_patterns = [
            (r"\bpython\b", "Python"),
            (r"\brust\b", "Rust"),
            (r"\br\b|r语言", "R"),
            (r"\bc\+\+\b", "C++"),
            (r"\bgo\b|golang", "Go"),
            (r"\btypescript\b|ts\b", "TypeScript"),
            (r"\bjavascript\b|js\b", "JavaScript"),
        ]
        for pattern, lang in lang_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                langs.append(lang)
        parsed.target_languages = langs

        # 2. 运行环境抽取
        envs = []
        if re.search(r"windows|win\b|win10|win11", text, re.IGNORECASE):
            envs.append("Windows")
        if re.search(r"linux|ubuntu", text, re.IGNORECASE):
            envs.append("Linux")
        if re.search(r"macos|mac\b|apple silicon|m1|m2|m3", text, re.IGNORECASE):
            envs.append("macOS")
        if re.search(r"gpu|cuda|显卡", text, re.IGNORECASE):
            envs.append("GPU")
        parsed.environments = envs

        # 3. 排除条件抽取
        exclusions = []
        exclude_matches = re.findall(r"(?:不要|无需|不要有|排除|禁止|免)(付费[^\s，,。]+|api key|外挂[^\s，,。]+)", text, re.IGNORECASE)
        for em in exclude_matches:
            exclusions.append(em.strip())
        parsed.exclusions = exclusions

        # 4. 偏好抽取
        prefs = []
        if re.search(r"轻量|简单|开箱即用|小而美", text):
            prefs.append("轻量简单")
        if re.search(r"gui|图形界面|桌面端|web界面", text, re.IGNORECASE):
            prefs.append("有图形界面")
        if re.search(r"中文|支持中文|汉化", text):
            prefs.append("中文优先")
        parsed.preferences = prefs

        # 5. 必需能力抽取 (常见关键词模式匹配)
        capabilities = []
        capability_keywords = [
            ("宏观数据", ["宏观数据", "经济数据", "统计局", "cpi", "gdp"]),
            ("面板回归", ["面板回归", "固定效应", "随机效应", "panel regression", "panel data"]),
            ("因果推断", ["因果推断", "did", "双重差分", "断点回归", "iv2sls", "工具变量"]),
            ("LaTeX表格/导出", ["latex", "latex表格", "排版", "导出表格"]),
            ("策略回测", ["回测", "backtest", "cta", "策略研发"]),
            ("行情数据", ["行情", "tick", "k线", "stock data", "股票数据"]),
            ("数学动画", ["动画", "manim", "可视化公式", "视频生成"]),
            ("字幕生成", ["字幕", "whisper", "语音识别", "asr", "srt"]),
            ("PDF解析", ["pdf", "pdf阅读", "论文解析", "pdf提取"]),
        ]
        for cap_name, kws in capability_keywords:
            for kw in kws:
                if kw in text.lower():
                    capabilities.append(cap_name)
                    break
        parsed.required_capabilities = capabilities

        # 核心目标提炼
        clean_target = re.sub(r"我想找|能否|最好能|可以|在|上运行|的项目", "", text).strip()
        parsed.target = clean_target[:40] if clean_target else text[:40]

        return parsed
