"""
LLM 统一适配层 (支持 OpenAI/DeepSeek 兼容协议、本地 Ollama 及无模型稳健降级)
"""
import json
from typing import Any, Dict, Optional
import requests

from repo_radar.config import settings
from repo_radar.models.query import ParsedQuery
from repo_radar.models.repository import Repository
from repo_radar.models.evidence import EvidenceAnalysis

class LLMAdapter:
    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.provider = provider or settings.llm_provider
        self.api_key = api_key or settings.llm_api_key
        self.base_url = (base_url or settings.llm_base_url).rstrip("/")
        self.model = model or settings.llm_model

    def is_available(self) -> bool:
        """检查是否有可用的大模型配置"""
        return bool(self.api_key or "ollama" in (self.provider or "").lower() or "localhost" in self.base_url)

    def _call_chat_completion(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.is_available():
            return None

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": settings.token_budget_per_summary,
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            return None
        return None

    def parse_query_intent(self, raw_query: str) -> Optional[ParsedQuery]:
        system_prompt = (
            "你是一个专业的开源项目搜索意图解析器。请将用户的自然语言需求转换为结构化 JSON。\n"
            "输出必须为纯合法 JSON，包含以下字段：\n"
            "- target: 字符串，核心目标\n"
            "- required_capabilities: 字符串列表，硬性要求的功能点\n"
            "- preferences: 字符串列表，偏好条件（如轻量、有GUI）\n"
            "- environments: 字符串列表，环境（如 Windows, Linux, Python）\n"
            "- exclusions: 字符串列表，排除条件（如 不要付费）\n"
            "- target_languages: 字符串列表，编程语言\n"
            "严禁添加用户未提及的假设。"
        )
        content = self._call_chat_completion(system_prompt, f"用户需求: {raw_query}")
        if not content:
            return None

        try:
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed_json = json.loads(cleaned)
            return ParsedQuery(
                original_query=raw_query,
                target=parsed_json.get("target", ""),
                required_capabilities=parsed_json.get("required_capabilities", []),
                preferences=parsed_json.get("preferences", []),
                environments=parsed_json.get("environments", []),
                exclusions=parsed_json.get("exclusions", []),
                target_languages=parsed_json.get("target_languages", []),
            )
        except Exception:
            return None
