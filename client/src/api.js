const TOKEN_KEY = "choga_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers, credentials: "include" });
  if (res.status === 401) {
    clearToken();
    throw new Error("unauthorized");
  }
  return res;
}

export async function login(username, password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("invalid credentials");
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await request("/api/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

export async function checkAuth() {
  try {
    const res = await request("/api/me");
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSettings() {
  const res = await request("/api/settings");
  return res.json();
}

export async function saveSettings(data) {
  const res = await request("/api/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}
