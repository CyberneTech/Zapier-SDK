# Campaign Machine — Zapier SDK demo (runnable)

Turn **one Google Sheet row** into a full multi-channel campaign across **~5 apps**
(Buffer → Gmail → Notion → Slack → Google Sheets) from **one script**, with **zero OAuth code**.
This is the runnable companion to `../campaign-agent-demo-build.md`.

> Status: **verified**. Type-checks against `@zapier/zapier-sdk@0.81.0` and runs end-to-end in **mock
> mode** (no login needed). Flip `MOCK=false` to hit real apps.

## Requirements
- **Node ≥ 20** (the SDK requires it). If you use nvm: `nvm use` (reads `.nvmrc`).

## Install
```bash
nvm use            # Node 20+
npm install
```
> If your machine is behind a corporate TLS proxy and npm errors with
> `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, this project ships a scoped `.npmrc` with `strict-ssl=false`
> as a local workaround (remove it if you don't need it).

## Run (mock mode — safe, no accounts)
```bash
npm run campaign          # builds, then runs the full 5-app chain with fake connections
```
You'll see it read a product, write copy, and chain all 5 app calls (with the exact inputs it would send),
then update the sheet row. `GO_LIVE=false` (default) keeps everything as drafts/scheduled.

## Run live (real apps)
```bash
npx zapier-sdk login                 # one-time auth (opens browser)
npx zapier-sdk list-connections      # confirm your connected apps
# connect any missing app: npx zapier-sdk create-connection <app>

# discover the exact action keys + inputs for each app (don't guess):
MOCK=false npm run discover -- buffer
MOCK=false npx zapier-sdk list-actions google-sheets
MOCK=false npx zapier-sdk list-action-input-fields google-sheets write update_row

# then run for real (fill .env from .env.example first):
cp .env.example .env                 # set MOCK=false, SHEET_ID, SLACK_CHANNEL, etc.
MOCK=false npm run campaign
```

## What's inside
| File | Purpose |
|---|---|
| `src/campaign.ts` | The hero: reads a product → LLM copy → chains 5 apps → updates the sheet |
| `src/zapier-client.ts` | Thin wrapper over the SDK (`findFirstConnection`, `runAction`, `fetch`) + a mock |
| `src/llm.ts` | Model-flexible copywriter (mock copy, or OpenAI-compatible when `MOCK=false`) |
| `src/discover.ts` | Runtime discovery: `listActions` / `getActionInputFieldsSchema` |
| `src/raw-fetch.ts` | Raw API escape hatch: `zapier.fetch(url, { connection })` |
| `data/sample-queue.json` / `campaign-queue.csv` | Sample "Campaign Queue" data / Google Sheet template |

## Real Zapier SDK API used (verified against v0.81.0)
```ts
import { createZapierSdk } from "@zapier/zapier-sdk";
const zapier = createZapierSdk();                                   // uses your CLI login

const { data: conn } = await zapier.findFirstConnection({ appKey: "slack", owner: "me" });

// lower-level runAction:
await zapier.runAction({ appKey: "slack", actionType: "write", actionKey: "channel_message",
                         connectionId: conn.id, inputs: { channel: "#launches", text: "hi" } });

// or the app proxy:
const slack = zapier.apps.slack({ connectionId: conn.id });
await slack.write.channel_message({ inputs: { channel: "#launches", text: "hi" } });

// raw API (full URL + connection in init):
const res = await zapier.fetch("https://slack.com/api/conversations.list", { connection: String(conn.id) });
```

## Notes
- Uses `tsc` + `node` (not `tsx`) to avoid a native-binary postinstall that can fail behind proxies.
  In a normal environment `tsx src/campaign.ts` also works.
- The SDK is pre-installed inside **Code by Zapier** steps (`zapier` is a global there) — see
  `../campaign-agent-demo-build.md` §6.5.
