const API_BASE = "/api";

let authToken = "";
let currentUser: any = null;
let toastListeners: Array<(msg: string, type: string) => void> = [];
let renderAppCb: (() => void) | null = null;

export function setRenderCallback(cb: () => void) {
  renderAppCb = cb;
}

export function setAuthToken(token: string) {
  authToken = token;
}

export function setUserState(t: string, u: any) {
  currentUser = u || null;
  setAuthToken(t || "");
  if (renderAppCb) renderAppCb();
}

export function logoutUser() {
  localStorage.removeItem("mes_jwt");
  setAuthToken("");
  currentUser = null;
  authToken = "";
}

export function getAuthToken(): string { return authToken; }
export function getUserState(): any { return currentUser; }

export function showToast(message: string, type = "info") {
  const toasts = document.getElementById("__toast-container");
  if (toasts) {
    const el = document.createElement("div");
    const colors = {
      info: "border-blue-500 bg-white text-neutral-800",
      success: "border-green-500 bg-green-50 text-green-900",
      error: "border-red-500 bg-red-50 text-red-900",
      warning: "border-yellow-500 bg-yellow-50 text-yellow-900"
    };
    el.className = `px-4 py-3 rounded-lg shadow-lg border-l-4 ${colors[type] || colors.info} mb-2 flex items-center gap-2`;
    el.textContent = message;
    el.dataset.id = String(Date.now());
    toasts.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(() => el.remove(), 300); }, 3500);
  }
}

export function subscribeToToast(cb: (msg: string, type: string) => void) {
  toastListeners.push(cb);
  return () => { toastListeners = toastListeners.filter(l => l !== cb); };
}

type FetchConfig = Record<string, any>;

async function request(endpoint: string, options: FetchConfig = {}): Promise<any> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers
  };
  // FormData → let browser set Content-Type with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const config: FetchConfig = {
    headers,
    ...options,
  };
  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let res: Response;
  try {
    res = await fetch(url, config);
  } catch (err: any) {
    const msg = err.message || "Network error";
    showToast(`Verbindungsfehler: ${msg}`, "error");
    throw new Error(msg);
  }

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch {}
    const msg = body?.message || `HTTP ${res.status}`;
  
    if (res.status === 401) {
      showToast("Session abgelaufen. Bitte neu anmelden.", "warning");
    } else if (res.status !== 200 && res.status !== 201) {
      showToast(msg, "error");
    }

    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

  async function requestText(endpoint: string, options: FetchConfig = {}): Promise<string> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers
    };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const config: FetchConfig = {
      headers,
      ...options,
    };
    if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    let res: Response;
    try {
      res = await fetch(url, config);
    } catch (err: any) {
      const msg = err.message || "Network error";
      showToast(`Verbindungsfehler: ${msg}`, "error");
      throw new Error(msg);
    }

    if (!res.ok) {
      let body: any;
      try { body = await res.json(); } catch {}
      const msg = body?.message || `HTTP ${res.status}`;
      showToast(msg, "error");
      const err = new Error(msg) as Error & { status: number };
      err.status = res.status;
      throw err;
    }

    return res.text();
  }

export const api = {
  get: (endpoint: string, body?: any, extra?: any) => request(endpoint, { method: "GET", body, ...extra }),
  post: (endpoint: string, body: any, extra?: any) => request(endpoint, { method: "POST", body, ...extra }),
  patch: (endpoint: string, body: any) => request(endpoint, { method: "PATCH", body }),
  del: (endpoint: string) => request(endpoint, { method: "DELETE" }),
  getText: (endpoint: string, extra?: any) => requestText(endpoint, { method: "GET", ...extra }),
};
