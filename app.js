const els = {
  apiBadge: document.getElementById("apiBadge"),
  btnOpenSettings: document.getElementById("btnOpenSettings"),
  settingsDialog: document.getElementById("settingsDialog"),
  backendUrlInput: document.getElementById("backendUrlInput"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnResetSettings: document.getElementById("btnResetSettings"),
  settingsStatus: document.getElementById("settingsStatus"),
  sendForm: document.getElementById("sendForm"),
  deviceId: document.getElementById("deviceId"),
  temp: document.getElementById("temp"),
  hum: document.getElementById("hum"),
  soil: document.getElementById("soil"),
  postStatus: document.getElementById("postStatus"),
  btnLatest: document.getElementById("btnLatest"),
  btnHistory: document.getElementById("btnHistory"),
  limit: document.getElementById("limit"),
  fetchStatus: document.getElementById("fetchStatus"),
  latestBox: document.getElementById("latestBox"),
  historyBody: document.getElementById("historyBody")
};

const STORAGE_KEY = "iot_backend_config_v1";

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.style.color = isError ? "var(--err)" : "var(--ok)";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeBaseUrl(url) {
  if (!url) return null;
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function getDefaultConfig() {
  const base = window.__IOT_APP_CONFIG__ || {};
  return {
    backendBaseUrl: base.backendBaseUrl ?? null,
    endpoints: base.endpoints || { readings: "/api/v1/readings", latest: "/api/v1/readings/latest" },
    ingestApiKey: base.ingestApiKey || ""
  };
}

function loadUserConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      backendBaseUrl: normalizeBaseUrl(parsed.backendBaseUrl) ?? null,
      ingestApiKey: String(parsed.ingestApiKey || "")
    };
  } catch {
    return null;
  }
}

function saveUserConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function clearUserConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

function getEffectiveConfig() {
  const def = getDefaultConfig();
  const usr = loadUserConfig();

  const backendBaseUrl = (usr && usr.backendBaseUrl) ? usr.backendBaseUrl : normalizeBaseUrl(def.backendBaseUrl);
  const ingestApiKey = (usr && typeof usr.ingestApiKey === "string") ? usr.ingestApiKey : String(def.ingestApiKey || "");

  return {
    backendBaseUrl,
    endpoints: def.endpoints,
    ingestApiKey
  };
}

function updateBadge() {
  const cfg = getEffectiveConfig();
  if (cfg.backendBaseUrl) {
    els.apiBadge.textContent = `API: ${cfg.backendBaseUrl}`;
  } else {
    els.apiBadge.textContent = "API: not set (open API Settings)";
  }
}

function timeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(t) };
}

async function apiFetch(path, options = {}) {
  const cfg = getEffectiveConfig();
  if (!cfg.backendBaseUrl) {
    throw new Error("Backend API base URL is not configured. Open API Settings and save the URL.");
  }

  const url = cfg.backendBaseUrl + path;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (cfg.ingestApiKey && path === cfg.endpoints.readings && options.method === "POST") {
    headers["X-API-Key"] = cfg.ingestApiKey;
  }

  const { controller, cancel } = timeout(8000);
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(`${res.status} ${res.statusText}: ${msg}`);
    }
    return body;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out");
    throw e;
  } finally {
    cancel();
  }
}

function renderLatest(reading) {
  els.latestBox.textContent = reading ? JSON.stringify(reading, null, 2) : "(no data)";
}

function renderHistory(rows) {
  els.historyBody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    const time = r.created_at || r.captured_at || "";
    const timeStr = time ? new Date(time).toLocaleString() : "";
    tr.innerHTML = `
      <td>${escapeHtml(timeStr)}</td>
      <td>${escapeHtml(r.device_id)}</td>
      <td>${escapeHtml(String(r.temperature))}</td>
      <td>${escapeHtml(String(r.humidity))}</td>
      <td>${escapeHtml(String(r.soil_moisture))}</td>
    `;
    els.historyBody.appendChild(tr);
  }
}

function openSettings() {
  const cfg = getEffectiveConfig();
  els.backendUrlInput.value = cfg.backendBaseUrl || "";
  els.apiKeyInput.value = cfg.ingestApiKey || "";
  setStatus(els.settingsStatus, "", false);
  els.settingsDialog.showModal();
}

function validateAndSaveSettings() {
  const url = normalizeBaseUrl(els.backendUrlInput.value);
  const apiKey = String(els.apiKeyInput.value || "").trim();

  if (!url) {
    setStatus(els.settingsStatus, "Please enter a valid http(s) URL for the backend API base.", true);
    return;
  }

  saveUserConfig({ backendBaseUrl: url, ingestApiKey: apiKey });
  updateBadge();
  setStatus(els.settingsStatus, "Saved. You can close this window.", false);
}

function resetSettings() {
  clearUserConfig();
  updateBadge();
  els.backendUrlInput.value = "";
  els.apiKeyInput.value = "";
  setStatus(els.settingsStatus, "Reset to defaults for this browser.", false);
}

els.btnOpenSettings.addEventListener("click", openSettings);
els.btnSaveSettings.addEventListener("click", validateAndSaveSettings);
els.btnResetSettings.addEventListener("click", resetSettings);

document.getElementById("btnCloseSettings")?.addEventListener("click", () => {
  if (els.settingsDialog.open) els.settingsDialog.close();
});

// POST handler
els.sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus(els.postStatus, "Sending…", false);

  const payload = {
    device_id: els.deviceId.value.trim(),
    temperature: Number(els.temp.value),
    humidity: Number(els.hum.value),
    soil_moisture: Number(els.soil.value)
  };

  try {
    const cfg = getEffectiveConfig();
    const data = await apiFetch(cfg.endpoints.readings, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setStatus(els.postStatus, "Sent successfully ✅", false);
    renderLatest(data);
  } catch (err) {
    setStatus(els.postStatus, err.message, true);
    if (String(err.message || "").includes("not configured")) openSettings();
  }
});

// GET latest
els.btnLatest.addEventListener("click", async () => {
  setStatus(els.fetchStatus, "Fetching latest…", false);
  try {
    const cfg = getEffectiveConfig();
    const deviceId = encodeURIComponent(els.deviceId.value.trim());
    const data = await apiFetch(`${cfg.endpoints.latest}?device_id=${deviceId}`, { method: "GET" });
    setStatus(els.fetchStatus, "Latest loaded ✅", false);
    renderLatest(data);
  } catch (err) {
    setStatus(els.fetchStatus, err.message, true);
    if (String(err.message || "").includes("not configured")) openSettings();
  }
});

// GET history
els.btnHistory.addEventListener("click", async () => {
  setStatus(els.fetchStatus, "Fetching history…", false);
  try {
    const cfg = getEffectiveConfig();
    const deviceId = encodeURIComponent(els.deviceId.value.trim());
    const limit = Math.min(2000, Math.max(1, Number(els.limit.value || 50)));
    const data = await apiFetch(`${cfg.endpoints.readings}?device_id=${deviceId}&limit=${limit}`, { method: "GET" });
    setStatus(els.fetchStatus, "History loaded ✅", false);
    renderHistory(data);
  } catch (err) {
    setStatus(els.fetchStatus, err.message, true);
    if (String(err.message || "").includes("not configured")) openSettings();
  }
});

function bootstrap() {
  updateBadge();
  const cfg = getEffectiveConfig();
  if (!cfg.backendBaseUrl) {
    setTimeout(() => openSettings(), 150);
  }
}

bootstrap();
