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
  async saveState(state) {
    if (!client) return;
    try {
      if (!anonymousUser) {
        const { data } = await client.auth.signInAnonymously();
        anonymousUser = data?.user;
      }
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
