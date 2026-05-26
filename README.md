# SRE E-Commerce Dashboard

Production-style microservices e-commerce stack with a real-time SRE observability dashboard. Simulates service health, metrics, incidents, chaos engineering, and load testing.

## Folder Structure

```
cloud-cursor/
├── docker-compose.yml          # Full stack orchestration
├── README.md
├── backend/                      # API Gateway + SRE simulator (FastAPI)
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── services/
│   ├── product-service/          # Port 5001
│   ├── cart-service/             # Port 5002
│   └── order-service/            # Port 5003
├── observability/
│   ├── prometheus/prometheus.yml
│   ├── alertmanager/alertmanager.yml
│   └── grafana/provisioning/
└── frontend/                     # React + Vite dashboard
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api.ts
        ├── App.tsx
        ├── components/
        │   ├── Layout.tsx
        │   ├── Sidebar.tsx
        │   ├── LineChart.tsx
        │   ├── TrafficMap.tsx
        │   └── ResourceBar.tsx
        └── views/
            ├── Overview.tsx
            ├── Incidents.tsx
            └── LoadTesting.tsx
```

## Quick Start

### Option A — Docker (full stack)

```bash
docker compose up --build -d
```

| Service        | URL                          |
|----------------|------------------------------|
| Dashboard API  | http://localhost:8080        |
| Frontend       | http://localhost:5173 (dev)  |
| Grafana        | http://localhost:3000 (admin/admin) |
| Prometheus     | http://localhost:9090        |
| Jaeger UI      | http://localhost:16686       |
| Alertmanager   | http://localhost:9093        |

### Option B — Local development

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

**Microservices** (so the dashboard probes real `product-service`, `cart-service`, `order-service`):

```powershell
# From repo root — opens 3 terminals
.\scripts\start-microservices.ps1
```

Or manually per service:

```bash
cd services/product-service && pip install -r requirements.txt && uvicorn app:app --port 5001
cd services/cart-service    && pip install -r requirements.txt && uvicorn app:app --port 5002
cd services/order-service   && pip install -r requirements.txt && uvicorn app:app --port 5003
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` → `http://localhost:8080`.

Use **Microservices** in the sidebar to see live vs simulated data provenance per service.

Or set `VITE_API_URL=http://localhost:8080` in `frontend/.env`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Success rate, latency, errors, users |
| GET | `/services/status` | Per-service HTTP status (live probe + chaos overlay) |
| GET | `/services/detail` | Full provenance: URLs, payloads, `/metrics` per service |
| GET | `/incidents` | Active & resolved incidents |
| POST | `/incidents/{id}/resolve` | Resolve incident |
| POST | `/simulate/kill-service` | `{"service": "product-service"}` |
| POST | `/simulate/slow-db` | DB latency simulation |
| POST | `/simulate/high-latency` | Network delay simulation |
| POST | `/simulate/reset` | Heal all services |
| POST | `/load-test` | `{"duration", "concurrency", "target"}` |
| GET | `/load-test/results` | Load test time series |

Interactive API docs: http://localhost:8080/docs

## Dashboard Views

1. **Overview** — Metrics bento grid, SVG charts, traffic map, resource bars
2. **Incidents** — Severity feed with resolve actions
3. **Chaos & Load** — Failure injection + load test terminal

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** FastAPI, Uvicorn
- **Infra:** PostgreSQL 16, Redis 7, Prometheus, Grafana, Alertmanager, Jaeger
