"""
GitHub REST API 客户端 (支持限流退避、条件请求 ETag 与内容哈希)
"""
import base64
import hashlib
import time
from typing import Any, Dict, List, Optional, Tuple
import requests

from repo_radar.config import settings
from repo_radar.models.repository import Repository
from repo_radar.models.evidence import EvidenceSnapshot

class GitHubAPIError(Exception):
    def __init__(self, message: str, status_code: int = None, reset_time: int = None):
        super().__init__(message)
        self.status_code = status_code
        self.reset_time = reset_time

class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.github_token
        self.api_base = settings.github_api_base.rstrip("/")
        self.session = requests.Session()
        self._etags: Dict[str, str] = {}  # url -> etag

    def _get_headers(self, etag: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Personal-RepoRadar/0.1.0",
        }
        if self.token:
            headers["Authorization"] = f"token {self.token}"
        if etag:
            headers["If-None-Match"] = etag
        return headers

    def _check_rate_limit(self, response: requests.Response) -> None:
        rem = response.headers.get("X-RateLimit-Remaining")
        reset = response.headers.get("X-RateLimit-Reset")
        if rem is not None and int(rem) == 0:
            reset_ts = int(reset) if reset else int(time.time() + 60)
            wait_seconds = max(0, reset_ts - int(time.time()))
            raise GitHubAPIError(
                f"GitHub API 配额已耗尽，请等待 {wait_seconds} 秒或在设置中配置 GITHUB_TOKEN",
                status_code=403,
                reset_time=reset_ts
            )

    def search_repositories(
        self,
        query: str,
        sort: str = "stars",
        order: str = "desc",
        per_page: int = 15,
        page: int = 1
    ) -> List[Repository]:
        """调用 GitHub Search API 搜索仓库"""
        url = f"{self.api_base}/search/repositories"
        params = {
            "q": query,
            "sort": sort,
            "order": order,
            "per_page": min(per_page, 50),
            "page": page
        }
        headers = self._get_headers()
        try:
            resp = self.session.get(url, params=params, headers=headers, timeout=settings.request_timeout)
            if resp.status_code == 403 or resp.status_code == 429:
                self._check_rate_limit(resp)
                resp.raise_for_status()
            
            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", [])
            results = []
            for item in items:
                results.append(self._parse_repo_json(item))
            return results
        except requests.exceptions.RequestException as e:
            raise GitHubAPIError(f"GitHub 搜索请求失败: {e}")

    def get_repository(self, owner: str, repo: str) -> Optional[Repository]:
        """获取单个仓库基础元数据"""
        url = f"{self.api_base}/repos/{owner}/{repo}"
        headers = self._get_headers()
        try:
            resp = self.session.get(url, headers=headers, timeout=settings.request_timeout)
            if resp.status_code == 404:
                return None
            if resp.status_code in (403, 429):
                self._check_rate_limit(resp)
            resp.raise_for_status()
            return self._parse_repo_json(resp.json())
        except requests.exceptions.RequestException as e:
            raise GitHubAPIError(f"获取仓库 {owner}/{repo} 失败: {e}")

    def get_readme_snapshot(self, owner: str, repo: str, github_id: int) -> Tuple[Optional[EvidenceSnapshot], bool]:
        """
        获取 README 文本证据快照
        返回: (EvidenceSnapshot, is_modified)
        如果 ETag 未变，返回 (None, False)
        """
        url = f"{self.api_base}/repos/{owner}/{repo}/readme"
        cached_etag = self._etags.get(url)
        headers = self._get_headers(etag=cached_etag)
        headers["Accept"] = "application/vnd.github.raw+json"

        try:
            resp = self.session.get(url, headers=headers, timeout=settings.request_timeout)
            if resp.status_code == 304:
                # 内容未修改，无消耗
                return None, False
            if resp.status_code == 404:
                return None, False
            if resp.status_code in (403, 429):
                self._check_rate_limit(resp)
            resp.raise_for_status()

            new_etag = resp.headers.get("ETag")
            if new_etag:
                self._etags[url] = new_etag

            readme_text = resp.text
            content_hash = hashlib.sha256(readme_text.encode("utf-8")).hexdigest()
            
            snapshot = EvidenceSnapshot(
                repo_github_id=github_id,
                content_hash=content_hash,
                readme_text=readme_text
            )
            return snapshot, True
        except requests.exceptions.RequestException as e:
            # 宽容处理 README 获取失败，不阻塞主流程
            return None, False

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """查询当前账号/IP 的配额使用状态"""
        url = f"{self.api_base}/rate_limit"
        try:
            resp = self.session.get(url, headers=self._get_headers(), timeout=10)
            if resp.status_code == 200:
                data = resp.json().get("resources", {})
                return {
                    "core_limit": data.get("core", {}).get("limit", 60),
                    "core_remaining": data.get("core", {}).get("remaining", 0),
                    "search_limit": data.get("search", {}).get("limit", 10),
                    "search_remaining": data.get("search", {}).get("remaining", 0),
                    "reset_time": data.get("search", {}).get("reset", 0),
                }
        except Exception:
            pass
        return {
            "core_limit": "未知",
            "core_remaining": "未知",
            "search_limit": "未知",
            "search_remaining": "未知",
            "reset_time": 0
        }

    def _parse_repo_json(self, item: Dict[str, Any]) -> Repository:
        license_info = item.get("license") or {}
        return Repository(
            github_id=item["id"],
            full_name=item["full_name"],
            owner=item.get("owner", {}).get("login", ""),
            name=item["name"],
            description=item.get("description"),
            html_url=item.get("html_url", f"https://github.com/{item['full_name']}"),
            default_branch=item.get("default_branch", "main"),
            stars=item.get("stargazers_count", 0),
            forks=item.get("forks_count", 0),
            open_issues=item.get("open_issues_count", 0),
            language=item.get("language"),
            license_spdx=license_info.get("spdx_id") if isinstance(license_info, dict) else None,
            pushed_at=item.get("pushed_at"),
            created_at=item.get("created_at"),
            updated_at=item.get("updated_at"),
            is_archived=item.get("archived", False),
            is_fork=item.get("fork", False),
            topics=item.get("topics", []) or [],
            homepage=item.get("homepage"),
        )
