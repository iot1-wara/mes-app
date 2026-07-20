import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MachinesPage from "./pages/Machines.jsx";
import AlarmsPage from "./pages/Alarms.jsx";
import TracesPage from "./pages/Traces.jsx";
import EdgePage from "./pages/Edge.jsx";

export default function App() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 p-6 relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="machines/*" element={<MachinesPage />} />
          <Route path="alarms/*" element={<AlarmsPage />} />
          <Route path="traces/*" element={<TracesPage />} />
          <Route path="edge/*" element={<EdgePage />} />
        </Routes>
      </main>
    </div>
  );
}
