import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import MachinesPage from "./pages/Machines";
import AlarmsPage from "./pages/Alarms";
import TracesPage from "./pages/Traces";
import OrdersPage from "./pages/Orders";
import EdgePage from "./pages/Edge";
import { api, setAuthToken, logoutUser, getAuthToken, setRenderCallback, setUserState } from "./api/client";

const publicPaths = ["/auth/login", "/auth/register"];

let renderApp = () => {};

function useUser() {
  const [key, setKey] = useState(0);
  const token = getAuthToken();
  useEffect(() => {
    setRenderCallback(() => setKey(k => k + 1));
  }, []);
  
  return token ? { token } : null;
}

export default function App() {
  const [authState, setAuthState] = useState(() => !!getAuthToken());
  
  useEffect(() => {
    const handler = () => setAuthState(!!getAuthToken());
    window.addEventListener("auth-change", handler);
    return () => window.removeEventListener("auth-change", handler);
  }, []);
  
  const u = authState ? { token: getAuthToken() } : null;
  const authed = !!u;
  console.log("[App] render, authed:", authed, "token:", u?.token?.substring(0, 20));

  if (!authed) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-100">
        <LoginScreen />
      </div>
    );
  }

  console.log("[App] auth state changed, re-rendering main layout");

  return (
    <>
      <ToastContainer />
      <div className="h-screen w-screen flex overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto relative">
          {authState && (
            <Routes>
              <Route path="/auth/*" element={<Navigate to="/" />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="machines/*" element={<MachinesPage />} />
              <Route path="orders/*" element={<OrdersPage />} />
              <Route path="alarms/*" element={<AlarmsPage />} />
              <Route path="traces/*" element={<TracesPage />} />
              <Route path="edge/*" element={<EdgePage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </main>
      </div>
    </>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    console.log("[App] submit called, mode:", mode, "form.username:", form?.username);
    setLoading(true);
    try {
      if (mode === "login") {
        console.log("[App] calling api.post /auth/login with:", JSON.stringify(form));
        const data = await api.post("/auth/login", form);
        console.log("[App] login response type:", typeof data, "keys:", Object.keys(data || {}), "accessToken:", !!data?.accessToken);
        if (data?.accessToken) {
          console.log("[App] login success, setting token");
          localStorage.setItem("mes_jwt", data.accessToken);
          setAuthToken(data.accessToken);
          window.dispatchEvent(new CustomEvent("auth-change"));
          console.log("[App] auth event dispatched");
        } else {
          const r = await fetch("/api/auth/bootstrap", { method: "POST" }).catch(() => null);
          if (r && r.ok) {
            showToast("Bootstrap completed, please log in with admin/admin123", "info");
          } else {
            showToast("Login failed. Creating user manually via bootstrap...", "error");
            await fetch("/api/auth/register", { 
              method: "POST", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: form.username, password: form.password })
            }).catch(() => null);
            const data = await api.post("/auth/login", form);
            if (data?.accessToken) {
              localStorage.setItem("mes_jwt", data.accessToken);
              setUserState(data.accessToken, data.user || {});
            }
          }
        }
      } else {
        await api.post("/auth/register", form);
        showToast("Registration successful. Please log in.", "success");
        setMode("login");
      }
    } catch (err: any) {
      console.error("[App] submit caught error:", err);
      showToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">MES <span className="text-brand-primary">Edge</span></h1>
        <p className="text-sm text-neutral-500 mt-2">Production Control System</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-card border border-neutral-200 p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 text-sm font-medium rounded-lg ${mode === "login" ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-600"}`}>Login</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 text-sm font-medium rounded-lg ${mode === "register" ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-600"}`}>Registrieren</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-neutral-700 mb-1.5">Benutzername</label>
            <input type="text" value={form.username} onChange={(e) => setForm(f => ({...f, username: e.target.value}))} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          </div>
          <div><label className="block text-sm font-medium text-neutral-700 mb-1.5">Passwort</label>
            <input type="password" value={form.password} onChange={(e) => setForm(f => ({...f, password: e.target.value}))} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-[var(--color-brand-primary-dark)] transition-colors disabled:opacity-50">
            {loading ? "..." : (mode === "login" ? "Anmelden" : "Registrieren")}
          </button>
        </form>
      </div>
    </div>
  );
}

function showToast(message, type = "info") {
  let container = document.getElementById("__toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "__toast-container";
    container.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999;width:300px;max-height:80vh;overflow-y:auto;";
    document.body.appendChild(container);
  }
  const colors = { error: "bg-red-500", info: "bg-blue-500", success: "bg-green-500" };
  const toast = document.createElement("div");
  toast.className = `${colors[type] || "bg-blue-500"} text-white px-4 py-3 rounded-lg shadow-lg mb-2 text-sm`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function ToastContainer() {
  useEffect(() => {
    const container = document.getElementById("__toast-container");
    if (!container) {
      const c = document.createElement("div");
      c.id = "__toast-container";
      c.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999;width:300px;max-height:80vh;overflow-y:auto;";
      document.body.appendChild(c);
    }
  }, []);
  return null;
}
