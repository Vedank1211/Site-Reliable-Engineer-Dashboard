import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./views/Overview";
import Incidents from "./views/Incidents";
import LoadTesting from "./views/LoadTesting";
import Services from "./views/Services";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/services" element={<Services />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/chaos" element={<LoadTesting />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
