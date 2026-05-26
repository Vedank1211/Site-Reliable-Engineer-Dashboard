import { motion } from "framer-motion";

const regions = [
  { id: "us-east", x: "22%", y: "38%", label: "US-East", load: 0.9 },
  { id: "us-west", x: "12%", y: "42%", label: "US-West", load: 0.6 },
  { id: "eu", x: "48%", y: "32%", label: "EU", load: 0.85 },
  { id: "apac", x: "72%", y: "45%", label: "APAC", load: 0.75 },
  { id: "sa", x: "32%", y: "68%", label: "SA", load: 0.4 },
  { id: "au", x: "78%", y: "72%", label: "AU", load: 0.35 },
];

export default function TrafficMap() {
  return (
    <div className="relative w-full h-56 rounded-xl overflow-hidden bg-charcoal-900/50 border border-white/[0.04]">
      {/* Subtle grid / map background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 24px 24px, 24px 24px",
        }}
      />

      {/* Abstract continent shapes */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200">
        <ellipse cx="80" cy="80" rx="50" ry="35" fill="#3b82f6" />
        <ellipse cx="200" cy="70" rx="45" ry="30" fill="#8b5cf6" />
        <ellipse cx="300" cy="90" rx="55" ry="40" fill="#3b82f6" />
        <ellipse cx="130" cy="130" rx="35" ry="25" fill="#8b5cf6" />
      </svg>

      {regions.map((r, i) => (
        <motion.div
          key={r.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: r.x, top: r.y }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <motion.div
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-green/20"
            animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2 + r.load, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-neon-green shadow-lg shadow-neon-green/50"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ opacity: r.load }}
          />
          <span className="absolute left-4 top-0 text-[10px] text-slate-500 whitespace-nowrap">
            {r.label}
          </span>
        </motion.div>
      ))}

      <div className="absolute bottom-3 left-3 text-xs text-slate-500">
        Global Traffic Visualizer · Live
      </div>
    </div>
  );
}
