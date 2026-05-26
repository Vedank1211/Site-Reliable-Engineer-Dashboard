const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Metrics {
  success_rate: number;
  avg_latency: number;
  error_rate: number;
  active_users: number;
  resources: { cpu: number; memory: number; storage: number };
  latency_history: number[];
  error_history: number[];
  data_source?: "live_microservices" | "live_microservices+chaos" | "simulated";
  live_aggregate?: {
    success_rate: number;
    avg_latency: number;
    p95_latency: number;
    error_rate: number;
    total_requests: number;
    contributing_services: string[];
  } | null;
  services_online?: number;
  services_total?: number;
}

export interface ServicesStatus {
  overall: "healthy" | "degraded";
  services: Record<string, number>;
  live_services?: Record<string, number | null>;
  timestamp: string;
  data_source?: string;
}

export interface ServiceDetail {
  name: string;
  url: string;
  port: number;
  source: "live" | "simulated_overlay" | "unreachable";
  live_status: number | null;
  effective_status: number;
  chaos_overridden: boolean;
  probe_latency_ms: number;
  last_check: string;
  health: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  payload_status: number | null;
  metrics: Record<string, unknown> | null;
  metrics_status: number | null;
  endpoints: { health: string; root: string; metrics: string };
}

export interface ServicesDetailResponse {
  gateway: {
    name: string;
    url: string;
    port: number;
    source: string;
    role: string;
  };
  services: ServiceDetail[];
  urls: Record<string, string>;
  timestamp: string;
  summary: { live: number; unreachable: number; chaos_overridden: number };
}

export interface Incident {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  message: string;
  service: string | null;
  timestamp: string;
  resolved: boolean;
  resolved_at?: string;
}

export interface LoadTestPoint {
  timestamp: string;
  second: number;
  rps: number;
  error_rate: number;
  avg_latency_ms: number;
  concurrency: number;
  target: string;
}

export interface SimState {
  kill_service: string | null;
  slow_db: boolean;
  high_latency: boolean;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  metrics: () => request<Metrics>("/metrics"),
  servicesStatus: () => request<ServicesStatus>("/services/status"),
  servicesDetail: () => request<ServicesDetailResponse>("/services/detail"),
  incidents: () =>
    request<{ active: Incident[]; resolved: Incident[]; all: Incident[] }>("/incidents"),
  resolveIncident: (id: string) =>
    request<{ message: string; incident: Incident }>(`/incidents/${id}/resolve`, {
      method: "POST",
    }),
  killService: (service: string) =>
    request<{ message: string; state: SimState }>("/simulate/kill-service", {
      method: "POST",
      body: JSON.stringify({ service }),
    }),
  slowDb: () =>
    request<{ message: string; state: SimState }>("/simulate/slow-db", { method: "POST" }),
  highLatency: () =>
    request<{ message: string; state: SimState }>("/simulate/high-latency", {
      method: "POST",
    }),
  reset: () =>
    request<{ message: string; state: SimState }>("/simulate/reset", { method: "POST" }),
  simState: () => request<SimState>("/simulate/state"),
  startLoadTest: (duration: number, concurrency: number, target: string) =>
    request<{ message: string }>("/load-test", {
      method: "POST",
      body: JSON.stringify({ duration, concurrency, target }),
    }),
  loadTestResults: () =>
    request<{ running: boolean; results: LoadTestPoint[] }>("/load-test/results"),
  loadTestStatus: () =>
    request<{ running: boolean; count: number }>("/load-test/status"),
};
