import { motion } from "framer-motion";
import type { ServiceDetail } from "../api";

const LABELS: Record<string, string> = {
  "product-service": "Product",
  "cart-service": "Cart",
  "order-service": "Order",
};

function sourceColor(source: string) {
  if (source === "live") return "border-neon-green/40 bg-neon-green/10 text-neon-green";
  if (source === "simulated_overlay")
    return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  return "border-critical/40 bg-critical/10 text-red-300";
}

function statusDot(effective: number, live: number | null) {
  if (effective === 503) return "bg-critical";
  if (live !== null && live !== effective) return "bg-amber-400";
  return "bg-neon-green";
}

interface Props {
  gateway: { name: string; url: string; port: number };
  services: ServiceDetail[];
}

export default function ServiceMesh({ gateway, services }: Props) {
  return (
    <motion.div
      className="relative rounded-xl border border-white/[0.06] bg-charcoal-900/50 p-6 min-h-[280px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Gateway */}
      <motion.div
        className="mx-auto w-fit px-5 py-3 rounded-xl border border-accent-purple/40 bg-accent-purple/10"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <p className="text-xs text-slate-500 uppercase tracking-wider">Gateway</p>
        <p className="font-semibold text-white">{gateway.name}</p>
        <p className="text-xs font-mono text-slate-400">
          :{gateway.port} · probes downstream
        </p>
      </motion.div>

      {/* Connector lines */}
      <svg className="absolute left-0 right-0 top-[88px] h-16 w-full pointer-events-none">
        <line x1="50%" y1="0" x2="18%" y2="100%" stroke="rgba(139,92,246,0.35)" strokeWidth="2" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(139,92,246,0.35)" strokeWidth="2" />
        <line x1="50%" y1="0" x2="82%" y2="100%" stroke="rgba(139,92,246,0.35)" strokeWidth="2" />
      </svg>

      {/* Microservices */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {services.map((svc) => (
          <motion.div
            key={svc.name}
            className={`rounded-xl border p-4 ${sourceColor(svc.source)}`}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${statusDot(
                  svc.effective_status,
                  svc.live_status
                )}`}
              />
              <span className="font-semibold text-white">
                {LABELS[svc.name] ?? svc.name}
              </span>
            </motion.div>
            <p className="text-xs font-mono opacity-80">:{svc.port}</p>
            <p className="text-[10px] uppercase tracking-wide mt-2 opacity-90">
              {svc.source === "simulated_overlay"
                ? "Live + chaos overlay"
                : svc.source}
            </p>
            <p className="text-xs mt-1 font-mono">
              effective {svc.effective_status}
              {svc.live_status != null && svc.live_status !== svc.effective_status && (
                <span className="opacity-70"> · live {svc.live_status}</span>
              )}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <p className="text-xs text-slate-600 mt-6 text-center">
        Arrows = API gateway HTTP probes every poll cycle
      </p>
    </motion.div>
  );
}
