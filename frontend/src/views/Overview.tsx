import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Radio,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { api, Metrics, ServicesStatus } from "../api";
import LineChart from "../components/LineChart";
import TrafficMap from "../components/TrafficMap";
import ResourceBar from "../components/ResourceBar";

const SERVICE_LABELS: Record<string, string> = {
  "product-service": "Product",
  "cart-service": "Cart",
  "order-service": "Order",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  live_microservices: "Live microservices",
  "live_microservices+chaos": "Live + chaos overlay",
  simulated: "Simulated (services offline)",
};

export default function Overview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<ServicesStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const [m, s] = await Promise.all([api.metrics(), api.servicesStatus()]);
        setMetrics(m);
        setStatus(s);
      } catch {
        /* backend offline */
      } finally {
        setLoading(false);
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const isHealthy = status?.overall === "healthy";
  const resources = metrics?.resources ?? { cpu: 0, memory: 0, storage: 0 };

  const metricCards = metrics
    ? [
        {
          label: "Success Rate",
          value: `${metrics.success_rate}%`,
          icon: TrendingUp,
          color: metrics.success_rate > 98 ? "text-neon-green" : "text-amber-400",
          sub: "last 5m",
        },
        {
          label: "Avg Latency",
          value: `${metrics.avg_latency}ms`,
          icon: Clock,
          color: metrics.avg_latency < 300 ? "text-neon-green" : "text-critical",
          sub: "p50",
        },
        {
          label: "Error Rate",
          value: `${metrics.error_rate}%`,
          icon: TrendingDown,
          color: metrics.error_rate < 1 ? "text-neon-green" : "text-critical",
          sub: "5xx + timeouts",
        },
        {
          label: "Active Users",
          value: metrics.active_users.toLocaleString(),
          icon: Users,
          color: "text-accent-blue",
          sub: "concurrent",
        },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-slate-500 mt-1">Real-time health & telemetry for e-commerce mesh</p>
        </div>

        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl glass border ${
            isHealthy ? "border-neon-green/30" : "border-critical/40"
          }`}
        >
          <motion.span
            className={`w-3 h-3 rounded-full ${
              isHealthy ? "bg-neon-green" : "bg-critical"
            }`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              boxShadow: isHealthy
                ? "0 0 12px rgba(34, 255, 136, 0.8)"
                : "0 0 12px rgba(239, 68, 68, 0.8)",
            }}
          />
          <span className="font-semibold text-white capitalize">
            {loading ? "Connecting…" : status?.overall ?? "Unknown"}
          </span>
          <Activity className={`w-4 h-4 ${isHealthy ? "text-neon-green" : "text-critical"}`} />
        </div>
      </motion.header>

      {metrics?.data_source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl glass border border-accent-purple/20"
        >
          <Radio className="w-4 h-4 text-accent-purple" />
          <span className="text-sm text-slate-400">
            Metrics source:{" "}
            <span className="text-white font-medium">
              {DATA_SOURCE_LABELS[metrics.data_source] ?? metrics.data_source}
            </span>
            {metrics.services_online != null && (
              <span className="text-slate-500 ml-2">
                ({metrics.services_online}/{metrics.services_total} services reachable)
              </span>
            )}
          </span>
          <Link
            to="/services"
            className="ml-auto text-xs text-accent-blue hover:underline flex items-center gap-1"
          >
            <Server className="w-3 h-3" /> View microservice provenance
          </Link>
        </motion.div>
      )}

      {/* Service pills */}
      {status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-3"
        >
          {Object.entries(status.services).map(([name, code]) => {
            const live = status.live_services?.[name];
            const masked = live != null && live !== code;
            return (
              <motion.div
                key={name}
                className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 ${
                  code === 200
                    ? "bg-neon-green/10 border-neon-green/30 text-neon-green"
                    : "bg-critical/10 border-critical/30 text-red-300"
                }`}
              >
                <Zap className="w-4 h-4" />
                {SERVICE_LABELS[name] ?? name}
                <span className="font-mono text-xs opacity-70">{code}</span>
                {masked && (
                  <span className="text-[10px] text-amber-400 font-mono">live:{live}</span>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Metrics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="glass glass-hover p-5 relative overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="flex items-start justify-between">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-xs text-slate-600">{card.sub}</span>
            </div>
            <p className="text-slate-500 text-sm mt-4">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
        {loading && !metrics && (
          <div className="col-span-4 text-center text-slate-500 py-8">
            Waiting for API at localhost:8080…
          </div>
        )}
      </div>

      {/* Charts */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">
            Latency over Time (P95)
          </h3>
          <p className="text-xs text-slate-600 mb-4">Rolling 24-sample window</p>
          <LineChart
            data={metrics?.latency_history ?? []}
            width={480}
            height={140}
            color="#22ff88"
            gradientId="latGrad"
            unit="ms"
            label="P95"
          />
        </div>
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Error Rate over Time</h3>
          <p className="text-xs text-slate-600 mb-4">Critical threshold at 1.0%</p>
          <LineChart
            data={metrics?.error_history ?? []}
            width={480}
            height={140}
            color="#8b5cf6"
            gradientId="errGrad"
            threshold={1.0}
            showThreshold
            unit="%"
            label="Errors"
          />
        </div>
      </motion.div>

      {/* Traffic + Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 glass p-6"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Global Traffic Visualizer</h3>
          <TrafficMap />
        </motion.div>

        <motion.div
          className="glass p-6 space-y-6"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-sm font-semibold text-slate-300">Resource Allocation</h3>
          <ResourceBar
            label="CPU"
            value={resources.cpu}
            color="#22ff88"
            icon={<Cpu className="w-4 h-4" />}
          />
          <ResourceBar
            label="Memory"
            value={resources.memory}
            color="#8b5cf6"
            icon={<MemoryStick className="w-4 h-4" />}
          />
          <ResourceBar
            label="Storage"
            value={resources.storage}
            color="#3b82f6"
            icon={<HardDrive className="w-4 h-4" />}
          />
        </motion.div>
      </div>
    </div>
  );
}
