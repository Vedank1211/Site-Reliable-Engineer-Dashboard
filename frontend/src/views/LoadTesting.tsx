import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Gauge,
  Network,
  Play,
  RotateCcw,
  ServerCrash,
  Terminal,
} from "lucide-react";
import { api, LoadTestPoint } from "../api";
import LineChart from "../components/LineChart";

const TARGETS = [
  "api-gateway",
  "product-service",
  "cart-service",
  "order-service",
];

export default function LoadTesting() {
  const [duration, setDuration] = useState(30);
  const [concurrency, setConcurrency] = useState(25);
  const [target, setTarget] = useState("api-gateway");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<LoadTestPoint[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [chaosLoading, setChaosLoading] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const appendLog = (line: string) => {
    setLog((prev) => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  useEffect(() => {
    if (!running) return;
    const poll = async () => {
      try {
        const data = await api.loadTestResults();
        setResults(data.results);
        setRunning(data.running);
        if (data.results.length > 0) {
          const last = data.results[data.results.length - 1];
          appendLog(
            `sec=${last.second} rps=${last.rps} err=${last.error_rate}% lat=${last.avg_latency_ms}ms`
          );
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [log]);

  const runChaos = async (
    key: string,
    fn: () => Promise<{ message: string }>
  ) => {
    setChaosLoading(key);
    try {
      const res = await fn();
      appendLog(res.message);
    } catch (e) {
      appendLog(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setChaosLoading(null);
    }
  };

  const startLoadTest = async () => {
    setResults([]);
    setLog([]);
    appendLog(`Starting load test: ${duration}s, ${concurrency} workers → ${target}`);
    try {
      await api.startLoadTest(duration, concurrency, target);
      setRunning(true);
      appendLog("Load test spawned (async)");
    } catch (e) {
      appendLog(`Failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  };

  const rpsSeries = results.map((r) => r.rps);
  const errSeries = results.map((r) => r.error_rate);

  return (
    <div className="space-y-8 max-w-6xl">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white">Chaos Engineering & Load Testing</h1>
        <p className="text-slate-500 mt-1">
          Inject failures, simulate latency, and stress-test the mesh
        </p>
      </motion.header>

      {/* Chaos panel */}
      <motion.section
        className="glass p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <ServerCrash className="w-4 h-4 text-critical" />
          Chaos Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-danger flex items-center gap-2"
            disabled={!!chaosLoading}
            onClick={() =>
              runChaos("kill", () => api.killService("product-service"))
            }
          >
            <ServerCrash className="w-4 h-4" />
            {chaosLoading === "kill" ? "…" : "Kill Product Service"}
          </button>
          <button
            className="btn-ghost flex items-center gap-2"
            disabled={!!chaosLoading}
            onClick={() => runChaos("db", () => api.slowDb())}
          >
            <Database className="w-4 h-4" />
            {chaosLoading === "db" ? "…" : "Simulate DB Latency"}
          </button>
          <button
            className="btn-ghost flex items-center gap-2"
            disabled={!!chaosLoading}
            onClick={() => runChaos("net", () => api.highLatency())}
          >
            <Network className="w-4 h-4" />
            {chaosLoading === "net" ? "…" : "Inject Network Delay"}
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            disabled={!!chaosLoading}
            onClick={() => runChaos("reset", () => api.reset())}
          >
            <RotateCcw className="w-4 h-4" />
            {chaosLoading === "reset" ? "…" : "Reset All (Heal)"}
          </button>
        </div>
      </motion.section>

      {/* Load test form */}
      <motion.section
        className="glass p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-accent-purple" />
          Load Test Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <label className="block">
            <span className="text-xs text-slate-500">Duration (seconds)</span>
            <input
              type="number"
              min={5}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/10 text-white font-mono text-sm focus:border-accent-purple/50 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Concurrency</span>
            <input
              type="number"
              min={1}
              max={500}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/10 text-white font-mono text-sm focus:border-accent-purple/50 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Target Service</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/10 text-white text-sm focus:border-accent-purple/50 outline-none"
            >
              {TARGETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={startLoadTest}
          disabled={running}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {running ? "Test Running…" : "Start Load Test"}
        </button>
      </motion.section>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-4">
          <h3 className="text-sm text-slate-400 mb-2">Requests Per Second</h3>
          <LineChart
            data={rpsSeries}
            width={400}
            height={120}
            color="#3b82f6"
            gradientId="rpsGrad"
            label="RPS"
          />
        </div>
        <div className="glass p-4">
          <h3 className="text-sm text-slate-400 mb-2">Error Rate (%)</h3>
          <LineChart
            data={errSeries}
            width={400}
            height={120}
            color="#ef4444"
            gradientId="lteGrad"
            threshold={5}
            showThreshold
            unit="%"
          />
        </div>
      </div>

      {/* Terminal */}
      <motion.div
        className="glass overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-charcoal-900/80">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-mono text-slate-500">load-test-output</span>
          {running && (
            <span className="ml-auto text-xs text-neon-green animate-pulse">● LIVE</span>
          )}
        </div>
        <div
          ref={terminalRef}
          className="h-48 overflow-y-auto p-4 font-mono text-xs text-slate-400 space-y-0.5 bg-black/40"
        >
          {log.length === 0 ? (
            <p className="text-slate-600">Waiting for load test output…</p>
          ) : (
            log.map((line, i) => (
              <div key={i} className="hover:text-slate-300">
                {line}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
