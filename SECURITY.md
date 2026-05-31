# Sicherheit / Security

## Scope

This is a **speculative-design demo**. There is no production system, no user accounts, and **no real personal data**:

- **All data is mocked / synthetic.** Personas, letters, file references (Aktenzeichen) and authority responses look realistic but are entirely fabricated. No real PII flows through the app. The mock backend simulates REST responses and persists locally in the browser (`localStorage`) — nothing is sent to a real authority.
- **The only secret is `ANTHROPIC_API_KEY`.** It is read server-side only (`src/lib/ai/client.ts`), is **never** bundled to the browser, and must **never be committed** — `.env` / `.env*` are gitignored (only `.env.example`, a placeholder, is tracked). If you self-deploy, set the key as an environment variable in your host (e.g. Vercel) and set your own budget/rate limits (see [`README.md`](README.md) → "Kosten & Missbrauch" and `src/lib/ai/rate-limit.ts`).
- The public AI routes are login-less by design but rate-limited and size-capped; the blast radius is API spend / availability, not a data breach.

## Reporting a concern

If you find a security concern (e.g. an accidentally committed secret, or an injection/abuse vector in the AI routes), please **open a private security advisory on GitHub** for this repository rather than a public issue. We'll respond as soon as we can.
