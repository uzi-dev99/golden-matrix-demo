# Astrolabio

Portfolio demo of an AI integration in a web app: a natal chart computed on the server, the exact prompt shown before it is sent, and a report streamed from a free OpenRouter model. Abstracted from a production project; the UI is in Spanish.

What it shows:

- **Demo login**: signed session cookie (HMAC, Web Crypto); no database.
- **Birth form with OpenStreetMap**: place search through a Nominatim proxy, Leaflet map with a draggable pin, time zone detected from the coordinates.
- **Natal chart**: planets, Placidus houses and aspects with `astronomy-engine`; wheel drawn with `@astrodraw/astrochart`.
- **Dynamic prompt injection**: system and user prompts built from versioned templates, with every injected value highlighted and fenced against prompt injection.
- **Model selector**: allow-list of free OpenRouter models.
- **Streaming report**: Server-Sent Events, stop button, model / latency / tokens / cost strip, clear errors for rate limits and empty completions.
- **PDF**: A4 print view of the chart and the report (browser print).

## Run locally

```bash
cp .env.example .env.local   # fill OPENROUTER_API_KEY, SESSION_SECRET, DEMO_PASSWORD
npm ci
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `node scripts/check-bundle.mjs` (fails if a secret reaches the client bundle).

Docker: `docker build -t astrolabio .` and run it with the same variables (`-p 3000:3000 --env-file .env.local`).

On a LAN over plain http (another machine opening `http://<server-ip>:3000`), set `SITE_URL=http://<server-ip>:3000`: the session cookie is Secure otherwise and the login would not stick. `localhost` works without it.

## Configuration

See `.env.example`. Default OpenRouter model: `nvidia/nemotron-3-ultra-550b-a55b:free`. The allow-list lives in `OPENROUTER_MODELS` (comma-separated); its first entry is the default. The API key is read only on the server and never sent to the browser. Report generation is rate limited per IP (`RATE_LIMIT_PER_HOUR`, in memory).

## Stack

Next.js 15 (App Router), TypeScript strict, Tailwind CSS 4, Zod, Luxon, Vitest.
