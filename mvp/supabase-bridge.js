let client = null;
let anonymousUser = null;

try {
  const config = window.VERVE_SUPABASE_CONFIG;
  if (config?.url && config?.anonKey && !config.url.includes("YOUR_PROJECT_REF")) {
    client = { url: config.url.replace(/\/$/, ""), anonKey: config.anonKey, accessToken: null };
  }
} catch {
  // Local/demo mode intentionally works without Supabase configuration.
}

window.verveCloud = {
  get configured() {
    return Boolean(client);
  },
  async ensureAnonymousUser() {
    if (!client) return null;
    if (anonymousUser) return anonymousUser;
    const response = await fetch(`${client.url}/auth/v1/signup`, { method: "POST", headers: { apikey: client.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ data: {} }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.msg || data?.message || "Supabase anonymous sign-in failed");
    client.accessToken = data?.access_token || null;
    anonymousUser = data?.user || null;
    return anonymousUser;
  },
  async invoke(name, body, isForm = false) {
    if (!client) return null;
    await this.ensureAnonymousUser();
    const headers = { apikey: client.anonKey };
    if (client.accessToken) headers.Authorization = `Bearer ${client.accessToken}`;
    if (!isForm) headers["Content-Type"] = "application/json";
    const response = await fetch(`${client.url}/functions/v1/${name}`, { method: "POST", headers, body: isForm ? body : JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || data?.message || `Function ${name} failed`);
    return data;
  },
  async voiceTurn(blob, context = {}) {
    if (!client) return null;
    const form = new FormData();
    form.append("audio", blob, blob.name || "voice.webm");
    form.append("context", JSON.stringify(context));
    return this.invoke("voice-turn", form, true);
  },
  async textTurn(text, context = {}) {
    if (!client) return null;
    return this.invoke("dynamic-service", { text, context });
  },
  async saveState(state) {
    if (!client) return;
    try {
      await this.ensureAnonymousUser();
      if (!anonymousUser) return;
      await client.from("practice_sessions").upsert({
        user_id: anonymousUser.id,
        state,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Cloud sync is best-effort; localStorage remains the source of truth for the pilot.
    }
  },
};
