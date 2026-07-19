# haggle.

**AI that calls moving companies — and negotiates for you.**

Built for [Hack-Nation Global AI Hackathon 2026](https://hack-nation.ai) · Challenge 1: The Negotiator (sponsored by ElevenLabs).

---

## The problem

Germans typically pay €2,000–4,000 for a residential move. Everyone knows to shop around — but nobody actually negotiates. It takes hours and it's uncomfortable.

Existing tools (aggregators, AI quote-collectors) help you *collect* quotes. **They don't negotiate.**

## What haggle does

haggle is a voice AI agent that runs two negotiation rounds against every mover:

- **Round 1:** Calls each mover, collects an initial quote, logs it via webhook.
- **Round 2:** Calls each mover back with the best competing price injected as a dynamic variable — the AI plays them against each other until one caves.

In our demo, haggle negotiated a Mannheim → Berlin move down from €2,400 to €1,800. **€600 saved on a single move.**

## Architecture

```
React UI  →  FastAPI  →  ElevenLabs Conversational AI  →  Twilio  →  Mover phone
                ↑                                                       │
                └──────────  webhook /log_quote  ◄──────────────────────┘
```

- **Voice AI:** ElevenLabs Conversational AI + Gemini 2.5 Flash + dynamic variables
- **Telephony:** Twilio Programmable Voice (real outbound calls, real SIDs)
- **Orchestration:** FastAPI (Python 3.13), async multi-round negotiation loop
- **Event routing:** Webhook + ngrok tunnel — quotes logged per active job/round
- **Frontend:** React + Vite + Tailwind, live-streaming transcripts, per-card audio playback

## Repo layout

```
haggle/
├── backend/     — FastAPI + ElevenLabs orchestrator
└── frontend/    — React + Vite live dashboard
```

## Run locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # on Windows
pip install fastapi uvicorn httpx python-dotenv elevenlabs pydantic
cp .env.example .env         # then fill in your keys
uvicorn main:app --reload --port 8000
```

Expose the backend so ElevenLabs can hit the webhook:

```bash
ngrok http 8000
```

Update the ElevenLabs `log_quote` tool URL to `https://<your-ngrok>.ngrok-free.dev/webhook/log_quote`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/, fill in the move form, click **Start haggling →**.

## Environment variables

Create `backend/.env`:

```
ELEVENLABS_API_KEY=sk_...
MOVER_NEGOTIATOR_AGENT_ID=agent_...
MOVER_NEGOTIATOR_PHONE_ID=phnum_...
BACKEND_URL=http://localhost:8000
```

## Proof

Zero mock data. Every artifact is auditable:

- **Twilio call SIDs** — every outbound call logged in Twilio console
- **ElevenLabs conversations** — every call replayable with full transcript in ElevenLabs history
- **Webhook trace** — every quote logged with payload, mover match, round assignment

## Team

Built solo by [Sanjeev Veeramani](https://github.com/sanjeevveeramani) — M.Sc. Applied Data Science, SRH Heidelberg.

## License

MIT
