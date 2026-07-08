import type { ActionType } from "./types.js";

export interface ActionResult {
  data: unknown;
}

/**
 * A thin interface over the parts of the Zapier SDK the demo uses. The SAME
 * orchestration (campaign.ts) runs against either the live SDK or a mock, so you
 * can demo the full flow with no login, then flip MOCK=false to hit real apps.
 */
export interface ZapierClient {
  mode: "mock" | "live";
  findConnectionId(appKey: string): Promise<string>;
  action(
    appKey: string,
    actionType: ActionType,
    action: string,
    inputs: Record<string, unknown>,
    connectionId: string,
  ): Promise<ActionResult>;
  raw(url: string, connectionId: string, init?: RequestInit): Promise<unknown>;
}

export async function createClient(): Promise<ZapierClient> {
  const MOCK = process.env.MOCK !== "false";
  return MOCK ? createMockClient() : createLiveClient();
}

/** Real Zapier SDK. Requires `npx zapier-sdk login` + connected apps. */
async function createLiveClient(): Promise<ZapierClient> {
  const { createZapierSdk } = await import("@zapier/zapier-sdk");
  const zapier = createZapierSdk();

  return {
    mode: "live",
    async findConnectionId(appKey) {
      const { data } = await zapier.findFirstConnection({ appKey, owner: "me", isExpired: false });
      if (!data) throw new Error(`No connection for "${appKey}". Connect it in the Zapier dashboard.`);
      return String(data.id);
    },
    async action(appKey, actionType, action, inputs, connectionId) {
      // Lower-level runAction (most stable). Equivalent proxy form:
      //   const app = zapier.apps[appKey.replace(/-/g, "_")]({ connectionId });
      //   const { data } = await app[actionType][action]({ inputs });
      const { data } = await zapier.runAction({
        appKey,
        actionType,
        actionKey: action,
        connectionId,
        inputs,
      });
      return { data };
    },
    async raw(url, connectionId, init) {
      const res = await zapier.fetch(url, { ...init, connection: connectionId });
      return res.json();
    },
  };
}

/** Mock: logs the exact calls it WOULD make and returns realistic fake ids. */
function createMockClient(): ZapierClient {
  let counter = 0;
  const fakeId = (prefix: string) => `${prefix}_${(++counter).toString().padStart(3, "0")}`;
  const trim = (o: Record<string, unknown>) => {
    const s = JSON.stringify(o);
    return s.length > 140 ? s.slice(0, 137) + "..." : s;
  };

  return {
    mode: "mock",
    async findConnectionId(appKey) {
      const id = `conn_${appKey.replace(/-/g, "_")}`;
      console.log(`   · connection resolved: ${appKey.padEnd(14)} → ${id}`);
      return id;
    },
    async action(appKey, actionType, action, inputs, connectionId) {
      console.log(`   → ${appKey}.${actionType}.${action}  [${connectionId}]`);
      console.log(`       inputs: ${trim(inputs)}`);
      return { data: { id: fakeId(appKey.replace(/-/g, "_")) } };
    },
    async raw(url, connectionId) {
      console.log(`   → fetch ${url}  [${connectionId}]`);
      return { ok: true, url };
    },
  };
}
