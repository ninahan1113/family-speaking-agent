const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const openai = async (path: string, init: RequestInit) => {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`OpenAI ${path} failed: ${response.status} ${await response.text()}`);
  return response;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) return json({ error: "audio file is required" }, 400);
    let context: Record<string, unknown> = {};
    try { context = JSON.parse(String(form.get("context") || "{}")); } catch { /* optional */ }

    const transcriptionForm = new FormData();
    transcriptionForm.append("file", audio, audio.name || "voice.webm");
    transcriptionForm.append("model", Deno.env.get("OPENAI_TRANSCRIBE_MODEL") || "gpt-4o-transcribe");
    transcriptionForm.append("response_format", "json");
    const transcription = await openai("audio/transcriptions", { method: "POST", body: transcriptionForm });
    const transcript = String((await transcription.json()).text || "").trim();
    if (!transcript) return json({ error: "No speech detected" }, 422);

    const system = `You are Verve, a warm English speaking coach for Chinese learners. The goal is understandable everyday or business English, not native-like perfection. Respond in simple English. If the learner's intent is clear, keep it and improve only one high-value issue. If they answer in Chinese, translate their intent into one short English sentence and invite them to repeat it. Return ONLY valid JSON with keys coach_text and feedback. coach_text should be 1-2 short sentences and a gentle follow-up question. feedback should be one concise Chinese sentence about pronunciation, grammar, word choice, or clarity; do not invent a pronunciation issue without evidence.`;
    const input = JSON.stringify({ context, learner_said: transcript });
    const response = await openai("responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-5.6-luna",
        instructions: system,
        input,
        temperature: 0.3,
      }),
    });
    const responseJson = await response.json();
    const outputText = String(responseJson.output_text || "").trim();
    let coachText = "Good job. Could you say that one more time in a complete sentence?";
    let feedback = "先把重点说完整，再逐步增加细节。";
    try {
      const parsed = JSON.parse(outputText.replace(/^```json\s*|\s*```$/g, ""));
      coachText = String(parsed.coach_text || coachText);
      feedback = String(parsed.feedback || feedback);
    } catch { /* retain safe fallback */ }

    const speech = await openai("audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts",
        voice: Deno.env.get("OPENAI_TTS_VOICE") || "marin",
        input: coachText,
        response_format: "mp3",
      }),
    });
    const audioBytes = new Uint8Array(await speech.arrayBuffer());
    let binary = "";
    for (let i = 0; i < audioBytes.length; i += 0x8000) binary += String.fromCharCode(...audioBytes.subarray(i, i + 0x8000));
    return json({ transcript, coach_text: coachText, feedback, audio_base64: btoa(binary) });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "voice turn failed" }, 500);
  }
});
