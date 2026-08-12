let client = null;
let anonymousUser = null;

try {
  const configModule = await import("./supabase-config.js");
  const config = configModule.default || window.VERVE_SUPABASE_CONFIG;
  if (config?.url && config?.anonKey && !config.url.includes("YOUR_PROJECT_REF")) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    client = createClient(config.url, config.anonKey);
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
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    anonymousUser = data?.user || null;
    return anonymousUser;
  },
  async voiceTurn(blob, context = {}) {
    if (!client) return null;
    await this.ensureAnonymousUser();
    const form = new FormData();
    form.append("audio", blob, blob.name || "voice.webm");
    form.append("context", JSON.stringify(context));
    const { data, error } = await client.functions.invoke("voice-turn", { body: form });
    if (error) throw error;
    return data;
  },
  async textTurn(text, context = {}) {
    if (!client) return null;
    await this.ensureAnonymousUser();
    // The first dashboard deployment updated the existing function named
    // dynamic-service; keep the client aligned with that live endpoint.
    const { data, error } = await client.functions.invoke("dynamic-service", {
      body: { text, context },
    });
    if (error) throw error;
    return data;
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
