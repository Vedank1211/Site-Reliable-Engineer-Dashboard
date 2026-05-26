import { NavLink } from "react-router-dom";
import { Activity, AlertTriangle, FlaskConical, Layers, Server } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { to: "/", label: "Overview", icon: Activity },
  { to: "/services", label: "Microservices", icon: Server },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/chaos", label: "Chaos & Load", icon: FlaskConical },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/[0.06] rounded-none flex flex-col z-50">
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-accent-purple/30 to-accent-blue/30">
            <Layers className="w-6 h-6 text-accent-purple" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight">SRE Dashboard</h1>
            <p className="text-xs text-slate-500">E-Commerce Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-accent-purple/20 to-accent-blue/10 text-white border border-accent-purple/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? "text-accent-purple" : ""}`} />
                {label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <motion.div
        className="p-4 m-4 rounded-xl bg-charcoal-900/80 border border-white/[0.04] text-xs text-slate-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-slate-400 font-medium mb-1">Observability</p>
        <p>Prometheus :9090</p>
        <p>Grafana :3000</p>
        <p>Jaeger :16686</p>
      </motion.div>
    </aside>
  );
}
