import os
import sys
from pathlib import Path

from fastapi import FastAPI

_root = Path(__file__).resolve().parent
sys.path.insert(0, str(_root if (_root / "shared").exists() else _root.parent))
from shared.metrics import ServiceMetrics, install_metrics_middleware  # noqa: E402

app = FastAPI(title="Cart Service", version="1.0.0")
SERVICE_NAME = os.getenv("SERVICE_NAME", "cart-service")
PORT = int(os.getenv("PORT", "5002"))
metrics = ServiceMetrics(SERVICE_NAME)
install_metrics_middleware(app, metrics)


@app.get("/health")
async def health():
    return {"status": "ok", "service": SERVICE_NAME, "port": PORT}


@app.get("/")
async def root():
    return {"service": SERVICE_NAME, "carts": 42}


@app.get("/metrics")
async def service_metrics():
    return metrics.prometheus()
