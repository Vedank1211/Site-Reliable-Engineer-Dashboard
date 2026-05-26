import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { api, Incident } from "../api";

function SeverityBadge({ severity }: { severity: Incident["severity"] }) {
  const map = {
    Critical: "severity-critical",
    Warning: "severity-warning",
    Info: "severity-info",
  };
  return (
    <span className={map[severity]}>
      {severity}
    </span>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Incidents() {
  const [active, setActive] = useState<Incident[]>([]);
  const [resolved, setResolved] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await api.incidents();
      setActive(data.active);
      setResolved(data.resolved);
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const id = setInterval(fetchIncidents, 5000);
    return () => clearInterval(id);
  }, [fetchIncidents]);

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await api.resolveIncident(id);
      await fetchIncidents();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white">Incidents</h1>
        <p className="text-slate-500 mt-1">Active alerts and resolution history</p>
      </motion.header>

      <div className="flex items-center gap-3">
        <button onClick={fetchIncidents} className="btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <span className="text-sm text-slate-500">
          {active.length} active · {resolved.length} recent resolved
        </span>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-critical" />
          Active Incidents
        </h2>

        {loading && active.length === 0 ? (
          <p className="text-slate-500">Loading…</p>
        ) : active.length === 0 ? (
          <motion.div
            className="glass p-8 text-center text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CheckCircle2 className="w-10 h-10 text-neon-green mx-auto mb-3 opacity-80" />
            No active incidents — all systems nominal
          </motion.div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {active.map((inc) => (
                <motion.li
                  key={inc.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, height: 0 }}
                  className="glass p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-l-critical/50"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={inc.severity} />
                      {inc.service && (
                        <span className="text-xs font-mono text-slate-500 bg-charcoal-900 px-2 py-0.5 rounded">
                          {inc.service}
                        </span>
                      )}
                      <span className="text-xs text-slate-600">{formatTime(inc.timestamp)}</span>
                    </div>
                    <p className="text-slate-200">{inc.message}</p>
                    <p className="text-xs text-slate-600 font-mono">ID: {inc.id}</p>
                  </div>
                  <button
                    onClick={() => handleResolve(inc.id)}
                    disabled={resolving === inc.id}
                    className="btn-primary shrink-0 disabled:opacity-50"
                  >
                    {resolving === inc.id ? "Resolving…" : "Resolve"}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recently Resolved
          </h2>
          <ul className="space-y-2 opacity-60">
            {resolved.map((inc) => (
              <li key={inc.id} className="glass p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-neon-green shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 truncate">{inc.message}</p>
                  <p className="text-xs text-slate-600">{formatTime(inc.timestamp)}</p>
                </div>
                <SeverityBadge severity={inc.severity} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
