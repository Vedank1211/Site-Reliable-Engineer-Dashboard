"""Probe live microservices and merge with chaos simulation overlays."""

from __future__ import annotations

import os
import random
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx

SERVICES = ("product-service", "cart-service", "order-service")

DEFAULT_URLS: dict[str, str] = {
    "product-service": "http://localhost:5001",
    "cart-service": "http://localhost:5002",
    "order-service": "http://localhost:5003",
}

SERVICE_PORTS: dict[str, int] = {
    "product-service": 5001,
    "cart-service": 5002,
    "order-service": 5003,
}


def get_service_urls() -> dict[str, str]:
    return {
        "product-service": os.getenv(
            "PRODUCT_SERVICE_URL", DEFAULT_URLS["product-service"]
        ).rstrip("/"),
        "cart-service": os.getenv("CART_SERVICE_URL", DEFAULT_URLS["cart-service"]).rstrip(
            "/"
        ),
        "order-service": os.getenv(
            "ORDER_SERVICE_URL", DEFAULT_URLS["order-service"]
        ).rstrip("/"),
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _port_from_url(url: str, fallback: int) -> int:
    parsed = urlparse(url)
    return parsed.port or fallback


async def _fetch_json(client: httpx.AsyncClient, url: str) -> tuple[int, Any | None, float]:
    start = time.perf_counter()
    try:
        response = await client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000
        body = response.json() if response.content else None
        return response.status_code, body, round(elapsed_ms, 1)
    except httpx.RequestError:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return 0, None, round(elapsed_ms, 1)


async def _fetch_text(client: httpx.AsyncClient, url: str) -> tuple[int, str | None, float]:
    start = time.perf_counter()
    try:
        response = await client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return response.status_code, response.text, round(elapsed_ms, 1)
    except httpx.RequestError:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return 0, None, round(elapsed_ms, 1)


def _effective_status(
    name: str,
    live_status: int,
    sim_state: dict[str, Any],
) -> int:
    killed = sim_state.get("kill_service")
    degraded = sim_state.get("slow_db") or sim_state.get("high_latency") or killed

    if killed == name:
        return 503
    if live_status == 0:
        return 503
    if degraded and killed != name and live_status == 200:
        return 503 if random.random() > 0.85 else 200
    return live_status if live_status else 503


async def probe_service(
    client: httpx.AsyncClient,
    name: str,
    base_url: str,
    sim_state: dict[str, Any],
) -> dict[str, Any]:
    port = _port_from_url(base_url, SERVICE_PORTS[name])
    health_status, health_body, health_ms = await _fetch_json(client, f"{base_url}/health")
    root_status, root_body, root_ms = await _fetch_json(client, f"{base_url}/")
    metrics_status, metrics_text, metrics_ms = await _fetch_text(client, f"{base_url}/metrics")

    live_status = health_status if health_status else 503
    reachable = health_status == 200

    if reachable:
        source = "live"
    else:
        source = "unreachable"

    effective = _effective_status(name, live_status, sim_state)
    chaos_active = effective != live_status and live_status != 0

    if chaos_active and source == "live":
        display_source = "simulated_overlay"
    elif not reachable:
        display_source = "unreachable"
    else:
        display_source = "live"

    return {
        "name": name,
        "url": base_url,
        "port": port,
        "source": display_source,
        "live_status": live_status if live_status else None,
        "effective_status": effective,
        "chaos_overridden": chaos_active,
        "probe_latency_ms": health_ms,
        "last_check": _now_iso(),
        "health": health_body,
        "payload": root_body,
        "payload_status": root_status if root_status else None,
        "metrics": metrics_text if metrics_status == 200 else None,
        "metrics_status": metrics_status if metrics_status else None,
        "endpoints": {
            "health": f"{base_url}/health",
            "root": f"{base_url}/",
            "metrics": f"{base_url}/metrics",
        },
    }


async def probe_all(sim_state: dict[str, Any]) -> list[dict[str, Any]]:
    urls = get_service_urls()
    timeout = httpx.Timeout(2.0, connect=1.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        results = []
        for name in SERVICES:
            results.append(await probe_service(client, name, urls[name], sim_state))
        return results


def aggregate_live_metrics(services: list[dict[str, Any]]) -> dict[str, Any] | None:
    # With Prometheus-format metrics, aggregation is done in PromQL (recording rules).
    # The API continues to expose raw per-service /metrics for scraping and debugging.
    return None
