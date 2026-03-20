"""
Cliente HTTP base com:
- Rate limiting (delay aleatório entre requests)
- Retry com backoff exponencial (tenacity)
- Headers de browser real
- Logging de erros no DB
"""

import asyncio
import random
import tomllib
from pathlib import Path

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
import logging

logger = logging.getLogger(__name__)

_cfg_path = Path(__file__).parent.parent / "config.toml"
with open(_cfg_path, "rb") as f:
    _cfg = tomllib.load(f)

CRAWL = _cfg["crawl"]

BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Referer": "https://divulgacandcontas.tse.jus.br/divulga/",
    "Origin": "https://divulgacandcontas.tse.jus.br",
    "Connection": "keep-alive",
}


async def jitter_sleep():
    """Pausa aleatória entre delay_min e delay_max segundos."""
    delay = random.uniform(CRAWL["delay_min"], CRAWL["delay_max"])
    await asyncio.sleep(delay)


class TSEClient:
    def __init__(self):
        self._client = httpx.AsyncClient(
            headers=BASE_HEADERS,
            timeout=CRAWL["timeout"],
            follow_redirects=True,
            http2=True,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self._client.aclose()

    async def get(self, url: str, params: dict | None = None) -> dict | list:
        await jitter_sleep()
        return await self._get_with_retry(url, params)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=4, max=60),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def _get_with_retry(self, url: str, params: dict | None) -> dict | list:
        r = await self._client.get(url, params=params)
        if r.status_code == 429:
            retry_after = int(r.headers.get("Retry-After", 30))
            logger.warning(f"429 rate limit — aguardando {retry_after}s")
            await asyncio.sleep(retry_after)
            raise httpx.HTTPStatusError("429", request=r.request, response=r)
        r.raise_for_status()
        return r.json()
