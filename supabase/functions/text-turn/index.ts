const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function openai(path: string, init: RequestInit) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(`https://api.openai.com/v1/${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`OpenAI ${path} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { text, context = {} } = await request.json();
    if (!String(text || "").trim()) return json({ error: "text is required" }, 400);
    const system = `You are Verve, a warm English speaking coach for Chinese learners. Have a real conversation, do not use a fixed script. Understand Chinese, English, and mixed input. The goal is understandable everyday or business English, not native-like perfection. Keep the conversation moving: acknowledge the learner's actual meaning, ask one relevant follow-up question, and give at most one high-value correction. If the learner uses Chinese, briefly provide a natural English version and invite them to say it. Return ONLY valid JSON with keys coach_text, feedback, suggested_english. coach_text must be 1-3 short English sentences. feedback is one concise Chinese sentence. suggested_english is a short sentence only when translation would help, otherwise an empty string.`;
    const result = await openai("responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-5.6-luna",
        instructions: system,
        input: JSON.stringify({ conversation: context.replies || [], training_context: context, learner_message: String(text).trim() }),
        temperature: 0.4,
      }),
    });
    const raw = String(result.output_text || "").trim().replace(/^```json\s*|\s*```$/g, "");
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { coach_text: raw }; }
    return json({ coach_text: parsed.coach_text || "Tell me a little more about that.", feedback: parsed.feedback || "先保持表达完整，再逐步增加细节。", suggested_english: parsed.suggested_english || "" });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "text turn failed" }, 500);
  }
});
