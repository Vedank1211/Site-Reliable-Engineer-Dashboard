import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  ExternalLink,
  Radio,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api, ServicesDetailResponse } from "../api";
import ServiceMesh from "../components/ServiceMesh";

const LABELS: Record<string, string> = {
  "product-service": "Product Service",
  "cart-service": "Cart Service",
  "order-service": "Order Service",
};

function SourceBadge({ source }: { source: string }) {
  if (source === "live")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-neon-green/15 text-neon-green border border-neon-green/30">
        <Wifi className="w-3 h-3" /> LIVE
      </span>
    );
  if (source === "simulated_overlay")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-400/15 text-amber-300 border border-amber-400/30">
        <Radio className="w-3 h-3" /> LIVE + CHAOS
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-critical/15 text-red-300 border border-critical/30">
      <WifiOff className="w-3 h-3" /> UNREACHABLE
    </span>
  );
}

export default function Services() {
  const [detail, setDetail] = useState<ServicesDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await api.servicesDetail();
        setDetail(data);
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const summary = detail?.summary;

  return (
    <div className="space-y-8 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Microservices</h1>
        <p className="text-slate-500 mt-1">
          Data provenance for SRE — see which metrics come from real services vs simulation
        </p>
      </header>

      {summary && (
        <motion.div className="flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass px-4 py-2 rounded-xl text-sm border border-neon-green/20">
            <span className="text-neon-green font-semibold">{summary.live}</span>
            <span className="text-slate-500 ml-2">live probes</span>
          </div>
          <div className="glass px-4 py-2 rounded-xl text-sm border border-critical/20">
            <span className="text-red-300 font-semibold">{summary.unreachable}</span>
            <span className="text-slate-500 ml-2">unreachable</span>
          </div>
          {summary.chaos_overridden > 0 && (
            <div className="glass px-4 py-2 rounded-xl text-sm border border-amber-400/20">
              <span className="text-amber-300 font-semibold">{summary.chaos_overridden}</span>
              <span className="text-slate-500 ml-2">chaos overlay active</span>
            </div>
          )}
        </motion.div>
      )}

      {detail && <ServiceMesh gateway={detail.gateway} services={detail.services} />}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-5 h-5 text-accent-purple" />
          Service registry
        </h2>

        {loading && !detail && (
          <p className="text-slate-500">Probing microservices on ports 5001–5003…</p>
        )}

        {detail?.services.map((svc, i) => (
          <motion.article
            key={svc.name}
            className="glass p-6 border border-white/[0.04]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {LABELS[svc.name] ?? svc.name}
                </h3>
                <p className="text-sm font-mono text-slate-400 mt-1">{svc.url}</p>
              </div>
              <SourceBadge source={svc.source} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <p className="text-slate-600 text-xs">Live HTTP</p>
                <p className="font-mono text-white">{svc.live_status ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs">Effective (dashboard)</p>
                <p
                  className={`font-mono ${
                    svc.effective_status === 200 ? "text-neon-green" : "text-critical"
                  }`}
                >
                  {svc.effective_status}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-xs">Probe latency</p>
                <p className="font-mono text-white">{svc.probe_latency_ms}ms</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs">Last check</p>
                <p className="font-mono text-slate-400 text-xs">
                  {new Date(svc.last_check).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {svc.chaos_overridden && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
                Chaos simulation is masking live status {svc.live_status} → showing{" "}
                {svc.effective_status} to the dashboard. The service may still be running at{" "}
                {svc.url}.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg bg-charcoal-900/80 p-4 border border-white/[0.04]">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Live payload ({svc.endpoints.root})
                </p>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                  {svc.payload
                    ? JSON.stringify(svc.payload, null, 2)
                    : "— service not reachable —"}
                </pre>
              </div>
              <div className="rounded-lg bg-charcoal-900/80 p-4 border border-white/[0.04]">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> Service metrics ({svc.endpoints.metrics})
                </p>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                  {svc.metrics
                    ? JSON.stringify(svc.metrics, null, 2)
                    : "— no /metrics (offline) —"}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(svc.endpoints).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {key}
                </a>
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      {detail && (
        <div className="glass p-4 text-xs text-slate-500">
          <p className="text-slate-400 font-medium mb-2">How data flows to this dashboard</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              API gateway ({detail.gateway.url}) polls each microservice <code>/health</code>,{" "}
              <code>/</code>, and <code>/metrics</code> every 3s.
            </li>
            <li>
              Overview aggregates metrics from live services when reachable; otherwise falls back
              to simulated values (labeled on Overview).
            </li>
            <li>
              Chaos controls overlay effective status without hiding the underlying live probe.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
