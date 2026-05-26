"""In-process request metrics for microservices."""

from __future__ import annotations

import time
from collections import deque

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.requests import Request
from starlette.responses import Response


class ServiceMetrics:
    def __init__(self, service_name: str) -> None:
        self.service_name = service_name
        self.request_count = 0
        self.error_count = 0
        self._latencies: deque[float] = deque(maxlen=200)
        self.started_at = time.time()

        self._req_total = Counter(
            "http_requests_total",
            "Total HTTP requests",
            ["service", "method", "path", "status"],
        )
        self._req_latency = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["service", "method", "path"],
            buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5),
        )

    def record(self, latency_ms: float, status_code: int) -> None:
        self.request_count += 1
        self._latencies.append(latency_ms)
        if status_code >= 500:
            self.error_count += 1

    def snapshot(self) -> dict:
        latencies = sorted(self._latencies)
        avg = sum(latencies) / len(latencies) if latencies else 0.0
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
        err_rate = (
            (self.error_count / self.request_count) * 100 if self.request_count else 0.0
        )
        return {
            "service": self.service_name,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate_pct": round(err_rate, 2),
            "avg_latency_ms": round(avg, 1),
            "p95_latency_ms": round(p95, 1),
            "uptime_seconds": int(time.time() - self.started_at),
        }

    def prometheus(self) -> Response:
        # Default global registry is fine for a single-process demo.
        payload = generate_latest()
        return Response(content=payload, media_type=CONTENT_TYPE_LATEST)


def install_metrics_middleware(app, metrics: ServiceMetrics) -> None:
    @app.middleware("http")
    async def _metrics_middleware(request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        metrics.record(elapsed_ms, response.status_code)

        path = request.url.path
        metrics._req_total.labels(
            service=metrics.service_name,
            method=request.method,
            path=path,
            status=str(response.status_code),
        ).inc()
        metrics._req_latency.labels(
            service=metrics.service_name, method=request.method, path=path
        ).observe(elapsed_ms / 1000.0)
        return response
