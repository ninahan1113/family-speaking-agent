# voice-turn

This Edge Function keeps the OpenAI key off the phone. It accepts one recorded audio clip, transcribes it, asks the coach model for a short correction and follow-up, then returns an MP3 voice reply.

Configure these Supabase Edge Function secrets:

- `OPENAI_API_KEY` (required)
- `OPENAI_TRANSCRIBE_MODEL` (optional, default `gpt-4o-transcribe`)
- `OPENAI_TEXT_MODEL` (optional, default `gpt-5.6-luna`; override with a model enabled for your account)
- `OPENAI_TTS_MODEL` (optional, default `gpt-4o-mini-tts`)
- `OPENAI_TTS_VOICE` (optional, default `marin`)

Deploy the function with the Supabase CLI from the project root:

```bash
supabase functions deploy voice-turn
supabase secrets set OPENAI_API_KEY=... 
```

Before testing, run `supabase/schema.sql` in the Supabase SQL editor and enable anonymous sign-ins under Authentication → Providers. The static site will use local mode until `SUPABASE_URL` and `SUPABASE_ANON_KEY` are added as GitHub Actions secrets.
