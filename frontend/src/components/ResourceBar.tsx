import { motion } from "framer-motion";

interface ResourceBarProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export default function ResourceBar({ label, value, color, icon }: ResourceBarProps) {
  const isHigh = value > 75;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <motion.div className="flex items-center justify-between text-sm" layout={false}>
        <span className="flex items-center gap-2 text-slate-400">
          {icon}
          {label}
        </span>
        <span className={`font-mono font-medium ${isHigh ? "text-critical" : "text-slate-300"}`}>
          {value.toFixed(1)}%
        </span>
      </motion.div>
      <div className="h-2 rounded-full bg-charcoal-900 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
