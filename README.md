# Zapier-SDK
## 1. The concept

Keep the original idea — an AI marketing agent that fires a full campaign from a trigger — but make it
**safe and reproducible to film** (no burning real ad spend live):

- **Trigger:** a new row in a **Google Sheet** "Campaign Queue" (`product`, `description`, `audience`,
  `image_url`, `link`).
- **Think:** an **LLM** (model-flexible — OpenAI / Anthropic / Gemini / Kimi) writes platform-native copy:
  a LinkedIn post, an X/Twitter thread, and an email subject+body.
- **Act (chained via the SDK):**
  1. **Schedule/draft social posts** (Buffer or LinkedIn/X) — demo-safe: schedule or draft, don't blast.
  2. **Draft the email campaign** (Gmail draft / Mailchimp draft) — again, draft not send, for safety.
  3. **Notify the team** (Slack channel message with the copy + links for approval).
  4. **Create a content-calendar card** (Notion / Trello / Zapier Tables).
  5. **Log the run back** to the Google Sheet (status, timestamps, post IDs) so nothing slips.
- **(Optional) Human-in-the-loop:** a Slack "Approve" step before anything goes fully live (great to show;
  it's a real Zapier platform feature).

---
## 2. What the Zapier SDK actually is (your on-camera talking points)

| Talking point | The accurate detail (use these lines) |
|---|---|
| **One interface, 9,000+ apps** | `@zapier/zapier-sdk` gives code/agents authenticated access to 9,000+ apps & 30,000+ actions, plus raw API access to ~3,000 more via `fetch`. |
| **No OAuth in your code** | You connect apps once (CLI/dashboard); Zapier manages OAuth, **token refresh, and retries**. Credentials **never reach the model / never leave Zapier**. |
| **Three action types per app** | Every app exposes `read`, `write`, and `search` actions. Call them as `zapier.apps.<app>.<type>.<action>()`. |
| **Discoverable at runtime** | `listApps`, `listActions`, `getActionInputFieldsSchema` let code/agents explore instead of hardcoding — the docs explicitly say *don't hallucinate method names; discover them*. |
| **Type-safe** | Per-app/per-action TypeScript types generated from the live catalog. |
| **Raw API escape hatch** | `zapier.fetch(...)` mirrors native `fetch` but is authenticated with the stored connection — hit any supported endpoint, even undocumented ones. |
| **Runs anywhere** | Standalone script, backend/serverless (client credentials), **inside Code by Zapier** (SDK pre-installed, up to **10-min** runtime), or as a **tool inside an AI agent** (Cursor / Claude Code / Codex). |
| **Governed & safe** | Org-level governance, audit trail, SOC 2 Type II; platform **AI Guardrails** (PII / prompt-injection / toxic-output scanning) and **human-in-the-loop** approvals. |
| **SDK vs MCP vs Agents** | **SDK** = code (full programmatic control + raw API). **MCP** = chat-based agents that can't run code (curated menu). **Zapier Agents** = no-code AI teammates. Same network, different surface. |

Status/credibility for the intro: SDK is in **open beta (2026)**, examples repo is **MIT** on GitHub
(`zapier/sdk`), built on Zapier's network running since **2012** (81B+ tasks automated).

---

## 3. Architecture / flow

```
  Google Sheets (trigger: new row)
        │  product, description, audience, image_url, link
        ▼
  ┌───────────────────────────────────────────────────────────┐
  │  Campaign Machine (one script, or one Code by Zapier step) │
  │                                                            │
  │  1) LLM  ── writes LinkedIn post / X thread / email copy   │  ← model-flexible (any provider)
  │  2) Zapier SDK ── chained actions (auth handled by Zapier):│
  │       • Buffer / LinkedIn  → schedule/draft social         │
  │       • Gmail / Mailchimp  → draft email campaign          │
  │       • Slack              → notify team (approval)         │
  │       • Notion / Trello    → content-calendar card         │
  │       • Google Sheets      → write status/IDs back         │
  └───────────────────────────────────────────────────────────┘
        │
        ▼
  Deliverables: scheduled posts, email draft, Slack post, calendar card, updated sheet, run log
```

---
## 4. Prereqs & setup (real commands)

```bash
# Node 20+ REQUIRED (the SDK's package engines demand it; on Node 16 you'll get EBADENGINE + runtime errors)
nvm use 20        # or: nvm install 20
mkdir campaign-machine && cd campaign-machine
npm init -y && npm pkg set type=module

# Install the SDK + dev CLI + TS types
npm install @zapier/zapier-sdk
npm install -D @zapier/zapier-sdk-cli @types/node typescript
# (Optional) tsx for `tsx src/*.ts`. NOTE: tsx pulls esbuild, whose postinstall downloads a native
# binary — that can fail behind a corporate TLS proxy. The runnable project avoids it by using `tsc` +
# `node dist/*.js` instead. Behind such a proxy, a scoped `.npmrc` with `strict-ssl=false` unblocks npm.

# Authenticate (opens browser). On a headless/CI box use: npx zapier-sdk login --non-interactive --headless
npx zapier-sdk login

# Connect the apps you'll use once (in the Zapier dashboard: Connections),
# then confirm they're visible to the SDK:
npx zapier-sdk list-connections
```

Add an `.env` for your LLM key (the SDK does NOT need app keys in code):

```bash
echo "OPENAI_API_KEY=sk-..." > .env        # or ANTHROPIC_API_KEY / GEMINI / KIMI_API_KEY
```

**Discover the exact action keys + input fields you'll call (do this on camera — it's a selling point):**

```bash
# What can this app do?  (verified CLI command names)
npx zapier-sdk list-actions slack
npx zapier-sdk list-actions google-sheets
npx zapier-sdk list-actions buffer
npx zapier-sdk list-actions gmail

# What inputs does a specific action need?  (positional: <app> <action-type> <action>)
npx zapier-sdk list-action-input-fields google-sheets write update_row
npx zapier-sdk get-action-input-fields-schema google-sheets write update_row

# Run a single action ad-hoc to prove a connection works:
npx zapier-sdk run-action slack
```

> **Why show discovery:** it demonstrates the SDK's "type-safe + runtime-discoverable" promise and means
> the demo won't break on a wrong action key. The exact keys below (e.g. `create_spreadsheet_row`) are
> plausible names — **confirm each with `list-actions` / `list-action-input-fields` before recording.**
