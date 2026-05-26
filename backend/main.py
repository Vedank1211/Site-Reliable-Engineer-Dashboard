"""
SRE E-Commerce API Gateway & Simulator
Simulates microservice health, metrics, incidents, and load testing.
"""

from __future__ import annotations

import asyncio
import math
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from service_probe import (
    SERVICES,
    aggregate_live_metrics,
    get_service_urls,
    probe_all,
)

app = FastAPI(
    title="SRE E-Commerce API Gateway",
    description="Mock API gateway with SRE simulation controls",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global simulation state
# ---------------------------------------------------------------------------

state: dict[str, Any] = {
    "kill_service": None,
    "slow_db": False,
    "high_latency": False,
    "incidents": [],
    "load_test_running": False,
    "load_test_results": [],
    "metrics_history": {
        "latency_p95": [],
        "error_rate": [],
    },
    "resource_usage": {
        "cpu": 34.2,
        "memory": 58.7,
        "storage": 41.3,
    },
}

# Seed baseline time-series (last 24 points)
_base_latency = [118, 125, 132, 128, 135, 142, 138, 145, 140, 142, 139, 136, 141, 143, 140, 138, 142, 145, 141, 139, 142, 144, 141, 142]
_base_errors = [0.02, 0.03, 0.02, 0.04, 0.03, 0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.02, 0.03, 0.04, 0.03, 0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.03, 0.04, 0.04]
state["metrics_history"]["latency_p95"] = list(_base_latency)
state["metrics_history"]["error_rate"] = list(_base_errors)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_history(key: str, value: float, max_len: int = 24) -> None:
    hist = state["metrics_history"][key]
    hist.append(round(value, 2))
    if len(hist) > max_len:
        del hist[0 : len(hist) - max_len]


def _create_incident(severity: str, message: str, service: str | None = None) -> dict:
    incident = {
        "id": str(uuid.uuid4())[:8],
        "severity": severity,
        "message": message,
        "service": service,
        "timestamp": _now_iso(),
        "resolved": False,
    }
    state["incidents"].insert(0, incident)
    return incident


def _is_degraded() -> bool:
    return bool(
        state["kill_service"]
        or state["slow_db"]
        or state["high_latency"]
        or any(not i["resolved"] and i["severity"] == "Critical" for i in state["incidents"])
    )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class KillServiceRequest(BaseModel):
    service: str = Field(..., description="product-service | cart-service | order-service")


class LoadTestRequest(BaseModel):
    duration: int = Field(30, ge=5, le=300, description="Duration in seconds")
    concurrency: int = Field(10, ge=1, le=500)
    target: str = Field("api-gateway", description="Target service name")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    service_details = await probe_all(_sim_state())
    live_agg = aggregate_live_metrics(service_details)
    degraded = _is_degraded()
    slow = state["slow_db"]
    high_lat = state["high_latency"]
    killed = state["kill_service"]

    if live_agg and not degraded:
        success_rate = live_agg["success_rate"]
        avg_latency = live_agg["avg_latency"]
        error_rate = live_agg["error_rate"]
        data_source = "live_microservices"
        active_users = random.randint(4200, 8900)
        cpu = round(random.uniform(28, 42), 1)
        mem = round(random.uniform(52, 64), 1)
        storage = round(random.uniform(38, 48), 1)
    elif live_agg and degraded:
        success_rate = round(min(live_agg["success_rate"], random.uniform(82.0, 94.5)), 2)
        avg_latency = round(max(live_agg["avg_latency"], random.uniform(680, 2400)), 0)
        error_rate = round(max(live_agg["error_rate"], random.uniform(2.5, 12.8)), 2)
        data_source = "live_microservices+chaos"
        active_users = random.randint(120, 890)
        cpu = round(random.uniform(72, 96), 1)
        mem = round(random.uniform(78, 94), 1)
        storage = round(random.uniform(55, 82), 1)
    else:
        if degraded:
            success_rate = round(random.uniform(82.0, 94.5), 2) if (slow or killed) else round(random.uniform(95.0, 98.5), 2)
            avg_latency = round(random.uniform(680, 2400), 0) if (slow or high_lat) else round(random.uniform(320, 580), 0)
            error_rate = round(random.uniform(2.5, 12.8), 2) if (slow or killed) else round(random.uniform(0.8, 3.5), 2)
            active_users = random.randint(120, 890)
            cpu = round(random.uniform(72, 96), 1)
            mem = round(random.uniform(78, 94), 1)
            storage = round(random.uniform(55, 82), 1)
        else:
            success_rate = round(random.uniform(99.7, 99.99), 2)
            avg_latency = round(random.uniform(128, 158), 0)
            error_rate = round(random.uniform(0.01, 0.08), 2)
            active_users = random.randint(4200, 8900)
            cpu = round(random.uniform(28, 42), 1)
            mem = round(random.uniform(52, 64), 1)
            storage = round(random.uniform(38, 48), 1)
        data_source = "simulated"

    state["resource_usage"] = {"cpu": cpu, "memory": mem, "storage": storage}
    lat_p95 = (live_agg["p95_latency"] if live_agg else avg_latency * 1.35)
    _append_history("latency_p95", lat_p95)
    _append_history("error_rate", error_rate)

    return {
        "success_rate": success_rate,
        "avg_latency": avg_latency,
        "error_rate": error_rate,
        "active_users": active_users,
        "resources": state["resource_usage"],
        "latency_history": state["metrics_history"]["latency_p95"],
        "error_history": state["metrics_history"]["error_rate"],
        "data_source": data_source,
        "live_aggregate": live_agg,
        "services_online": sum(1 for s in service_details if s["source"] == "live"),
        "services_total": len(service_details),
    }


@app.get("/services/status")
async def services_status():
    details = await probe_all(_sim_state())
    statuses = {s["name"]: s["effective_status"] for s in details}
    live_statuses = {s["name"]: s["live_status"] for s in details}

    degraded_flags = (
        state["slow_db"]
        or state["high_latency"]
        or state["kill_service"]
        or any(v == 503 for v in statuses.values())
    )
    overall = "degraded" if degraded_flags else "healthy"

    return {
        "overall": overall,
        "services": statuses,
        "live_services": live_statuses,
        "timestamp": _now_iso(),
        "data_source": "live_probe",
    }


@app.get("/services/detail")
async def services_detail():
    details = await probe_all(_sim_state())
    urls = get_service_urls()
    live_count = sum(1 for s in details if s["source"] in ("live", "simulated_overlay"))

    return {
        "gateway": {
            "name": "api-gateway",
            "url": "http://localhost:8080",
            "port": 8080,
            "source": "live",
            "role": "SRE dashboard API — probes downstream microservices",
        },
        "services": details,
        "urls": urls,
        "timestamp": _now_iso(),
        "summary": {
            "live": live_count,
            "unreachable": sum(1 for s in details if s["source"] == "unreachable"),
            "chaos_overridden": sum(1 for s in details if s["chaos_overridden"]),
        },
    }


@app.get("/incidents")
async def get_incidents():
    active = [i for i in state["incidents"] if not i["resolved"]]
    resolved = [i for i in state["incidents"] if i["resolved"]]
    return {"active": active, "resolved": resolved[:20], "all": state["incidents"][:50]}


@app.post("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    for inc in state["incidents"]:
        if inc["id"] == incident_id:
            if inc["resolved"]:
                return {"message": "Already resolved", "incident": inc}
            inc["resolved"] = True
            inc["resolved_at"] = _now_iso()
            return {"message": "Incident resolved", "incident": inc}
    raise HTTPException(status_code=404, detail="Incident not found")


@app.post("/simulate/kill-service")
async def simulate_kill_service(body: KillServiceRequest):
    if body.service not in SERVICES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid service. Choose from: {', '.join(SERVICES)}",
        )
    state["kill_service"] = body.service
    _create_incident(
        "Critical",
        f"{body.service} is unreachable — health checks failing",
        body.service,
    )
    return {"message": f"Simulated kill on {body.service}", "state": _sim_state()}


@app.post("/simulate/slow-db")
async def simulate_slow_db():
    state["slow_db"] = True
    _create_incident("Critical", "PostgreSQL query latency exceeded 2s P99 threshold", "postgres")
    return {"message": "Slow database simulation enabled", "state": _sim_state()}


@app.post("/simulate/high-latency")
async def simulate_high_latency():
    state["high_latency"] = True
    _create_incident("Warning", "Network latency spike detected on inter-service mesh", None)
    return {"message": "High latency simulation enabled", "state": _sim_state()}


@app.post("/simulate/reset")
async def simulate_reset():
    state["kill_service"] = None
    state["slow_db"] = False
    state["high_latency"] = False
    for inc in state["incidents"]:
        if not inc["resolved"]:
            inc["resolved"] = True
            inc["resolved_at"] = _now_iso()
    state["metrics_history"]["latency_p95"] = list(_base_latency)
    state["metrics_history"]["error_rate"] = list(_base_errors)
    return {"message": "All simulations reset — system healed", "state": _sim_state()}


@app.get("/simulate/state")
async def get_sim_state():
    return _sim_state()


def _sim_state() -> dict:
    return {
        "kill_service": state["kill_service"],
        "slow_db": state["slow_db"],
        "high_latency": state["high_latency"],
    }


# ---------------------------------------------------------------------------
# Load testing
# ---------------------------------------------------------------------------


async def _run_load_test(duration: int, concurrency: int, target: str) -> None:
    state["load_test_running"] = True
    state["load_test_results"] = []
    degraded = _is_degraded()
    start = time.monotonic()
    tick = 0

    while time.monotonic() - start < duration:
        t = tick
        base_rps = concurrency * random.uniform(8, 14)
        if degraded:
            rps = base_rps * random.uniform(0.2, 0.55)
            err = random.uniform(8, 35) if state["kill_service"] else random.uniform(3, 18)
            lat = random.uniform(400, 1800)
        else:
            rps = base_rps * random.uniform(0.85, 1.15)
            err = random.uniform(0.01, 0.6)
            lat = random.uniform(95, 220)

        # Inject sine wave for visual interest
        wave = 1 + 0.12 * math.sin(t * 0.4)
        rps *= wave

        point = {
            "timestamp": _now_iso(),
            "second": tick,
            "rps": round(rps, 1),
            "error_rate": round(err, 2),
            "avg_latency_ms": round(lat, 0),
            "concurrency": concurrency,
            "target": target,
        }
        state["load_test_results"].append(point)
        tick += 1
        await asyncio.sleep(1)

    state["load_test_running"] = False


@app.post("/load-test")
async def start_load_test(body: LoadTestRequest):
    if state["load_test_running"]:
        raise HTTPException(status_code=409, detail="Load test already running")

    asyncio.create_task(_run_load_test(body.duration, body.concurrency, body.target))
    return {
        "message": "Load test started",
        "duration": body.duration,
        "concurrency": body.concurrency,
        "target": body.target,
    }


@app.get("/load-test/results")
async def load_test_results():
    return {
        "running": state["load_test_running"],
        "results": state["load_test_results"],
    }


@app.get("/load-test/status")
async def load_test_status():
    return {
        "running": state["load_test_running"],
        "count": len(state["load_test_results"]),
    }


# Bootstrap a couple of informational incidents on startup
@app.on_event("startup")
async def seed_incidents():
    if not state["incidents"]:
        _create_incident("Info", "Scheduled deployment v2.4.1 completed successfully", None)
        _create_incident("Warning", "Redis memory usage above 70% on shard-2", "redis")
